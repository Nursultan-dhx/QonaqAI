package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.booking.*;
import kz.qonaqai.persistence.*;
import kz.qonaqai.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// No enclosing test transaction: each service invocation commits through its Spring proxy.
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:booking-tests;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@TestExecutionListeners(DependencyInjectionTestExecutionListener.class)
class BookingIntegrationTest {
    @Autowired BookingService bookings;
    @Autowired BookingRepository repository;
    @Autowired EventRepository eventRepository;
    @Autowired EventService events;
    @Autowired PackageConfigurationService packages;
    @Autowired EstimateService estimates;
    @Autowired VenueRepository venues;
    @Autowired ObjectMapper mapper;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager transactions;
    final List<Long> created=new ArrayList<>();
    final LocalDate date=LocalDate.now(BookingService.ZONE).plusDays(30);
    final SessionIdentity demo=SessionIdentity.DEMO;

    @AfterEach void cleanup() {
        repository.deleteAll();
        for(long id:created) if(eventRepository.existsById(id)) events.delete(demo,id);
    }
    EventDraft draft(Long venue, int guests, LocalDate day, BigDecimal budget) {
        return new EventDraft("Booking test",EventType.CORPORATE,day,guests,budget,"",StrategyId.ECONOMY,venue);
    }
    long event(long venue) {
        long id=events.save(demo,null,draft(venue,80,date,new BigDecimal("2000000"))).id();
        created.add(id); return id;
    }
    PackageConfigurationService.SaveRequest packageRequest(long id, Long version) {
        var quote=estimates.preview(demo,id,new EstimateService.Request(PackageCode.BASIC,List.of()));
        return new PackageConfigurationService.SaveRequest(PackageCode.BASIC,version,quote.packageCatalogVersion(),
            quote.serviceCatalogVersion(),quote.venueCatalogVersion(),quote.eventInputToken(),quote.pricingToken(),List.of());
    }
    long save(long id) { return packages.save(demo,id,packageRequest(id,null)).currentEstimate().estimateId(); }
    OffsetDateTime at(int hour) { return date.atTime(hour,0).atZone(BookingService.ZONE).toOffsetDateTime(); }
    BookingService.Request request(long estimate, int start, int end) { return new BookingService.Request(at(start),at(end),estimate); }
    BookingService.View confirm(long id,int start,int end) { return bookings.confirm(demo,id,request(save(id),start,end)); }
    void conflict(Runnable action, String code) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(BookingConflictException.class,ex->assertThat(ex.code()).isEqualTo(code));
    }
    MockHttpSession session(SessionIdentity identity) {
        var session=new MockHttpSession(); session.setAttribute(SessionIdentity.class.getName(),identity); return session;
    }

    @Test void successPersistsAndHistoryRetrievesQuotedRevision() throws Exception {
        long id=event(1); long estimate=save(id);
        var response=mvc.perform(post("/api/events/"+id+"/bookings").session(session(demo)).contentType("application/json")
            .content(mapper.writeValueAsString(request(estimate,18,22))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.timeZone").value("Asia/Almaty")).andExpect(jsonPath("$.estimateId").value(estimate))
            .andExpect(jsonPath("$.estimateRevision").value(1)).andReturn().getResponse();
        var returned=mapper.readTree(response.getContentAsString());
        var retrieved=mapper.readTree(mapper.writeValueAsString(bookings.history(demo).getFirst()));
        assertThat(retrieved).isEqualTo(returned);
        assertThat(repository.count()).isEqualTo(1);
        mvc.perform(get("/api/bookings").session(session(demo))).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(returned.path("id").asLong()));
    }
    @ParameterizedTest @ValueSource(strings={"17,19","18,22","19,21","17,23","21,23"})
    void overlappingIntervalsRejected(String hours) {
        confirm(event(1),18,22);
        var interval=hours.split(","); long other=event(1); long quote=save(other);
        conflict(()->bookings.confirm(demo,other,request(quote,Integer.parseInt(interval[0]),Integer.parseInt(interval[1]))),"VENUE_UNAVAILABLE");
        assertThat(repository.count()).isEqualTo(1);
    }
    @Test void adjacentIntervalsOnBothSidesAccepted() {
        confirm(event(1),18,22); confirm(event(1),16,18); confirm(event(1),22,23);
        assertThat(repository.count()).isEqualTo(3);
    }
    @Test void cancellationReleasesAvailabilityAndAllowsRebooking() {
        long id=event(1); var booking=confirm(id,18,22);
        assertThat(bookings.availability(1L,at(18),at(22)).available()).isFalse();
        var cancelled=bookings.cancel(demo,booking.id());
        assertThat(cancelled.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(bookings.cancel(demo,booking.id())).isEqualTo(cancelled);
        assertThat(bookings.availability(1L,at(18),at(22)).available()).isTrue();
        var next=bookings.confirm(demo,id,request(booking.estimateId(),18,22));
        assertThat(next.id()).isNotEqualTo(booking.id());
        assertThat(bookings.history(demo)).hasSize(2);
    }
    @Test void differentVenuesIndependent() {
        confirm(event(1),18,22); confirm(event(2),18,22);
        assertThat(repository.count()).isEqualTo(2);
    }
    @Test void oneActiveBookingPerEventEvenWithoutOverlap() {
        long id=event(1); var booking=confirm(id,18,20);
        conflict(()->bookings.confirm(demo,id,request(booking.estimateId(),20,22)),"EVENT_ALREADY_BOOKED");
    }
    @Test void anonymousAndForeignAccountsCannotConfirmReadOrCancelOwnedData() throws Exception {
        long id=event(1); var booking=confirm(id,18,22);
        var foreign=session(new SessionIdentity(999999L,"Other"));
        var payload=mapper.writeValueAsString(request(booking.estimateId(),18,22));
        mvc.perform(post("/api/events/"+id+"/bookings").contentType("application/json").content(payload)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/events/"+id+"/bookings").session(foreign).contentType("application/json").content(payload)).andExpect(status().isNotFound());
        mvc.perform(get("/api/bookings")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/bookings").session(foreign)).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(post("/api/bookings/"+booking.id()+"/cancel")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/bookings/"+booking.id()+"/cancel").session(foreign)).andExpect(status().isNotFound());
        mvc.perform(get("/api/venues/1/availability").param("start",at(18).toString()).param("end",at(22).toString())).andExpect(status().isUnauthorized());
        // Shared demo sessions see the same booking.
        mvc.perform(get("/api/bookings").session(session(demo))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }
    @ParameterizedTest @ValueSource(strings={"equal","reverse","past","long","wrongDate","missing","precision"})
    void invalidIntervalsRejected(String kind) throws Exception {
        long id=event(1); long estimate=save(id);
        var start=at(18); var end=at(22);
        switch(kind) {
            case "equal"->end=start;
            case "reverse"->end=at(17);
            case "past"->{ start=OffsetDateTime.now().minusHours(2); end=start.plusHours(1); }
            case "long"->end=start.plusHours(25);
            case "wrongDate"->{ start=start.plusDays(1); end=end.plusDays(1); }
            case "missing"->start=null;
            case "precision"->start=start.withNano(1);
        }
        mvc.perform(post("/api/events/"+id+"/bookings").session(session(demo)).contentType("application/json")
            .content(mapper.writeValueAsString(new BookingService.Request(start,end,estimate)))).andExpect(status().isBadRequest());
        assertThat(repository.count()).isZero();
    }
    @Test void explicitOffsetRequiredAndAvailabilityReturnsValidationAndNotFound() throws Exception {
        long id=event(1); long estimate=save(id);
        mvc.perform(post("/api/events/"+id+"/bookings").session(session(demo)).contentType("application/json")
            .content("{\"start\":\""+date+"T18:00:00\",\"end\":\""+at(22)+"\",\"estimateId\":"+estimate+"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/venues/1/availability").session(session(demo)).param("start",at(22).toString()).param("end",at(18).toString())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/venues/99999/availability").session(session(demo)).param("start",at(18).toString()).param("end",at(22).toString())).andExpect(status().isNotFound());
    }
    @Test void utcOffsetAndOvernightAreNormalizedToAlmatyDate() {
        long id=event(1); long estimate=save(id);
        var booking=bookings.confirm(demo,id,new BookingService.Request(at(23).withOffsetSameInstant(ZoneOffset.UTC),
            at(2).plusDays(1).withOffsetSameInstant(ZoneOffset.UTC),estimate));
        assertThat(booking.start()).isEqualTo(at(23).toInstant());
        assertThat(booking.end()).isEqualTo(at(2).plusDays(1).toInstant());
    }
    @Test void missingOutdatedAndSupersededEstimatesRejected() {
        long id=event(1);
        conflict(()->bookings.confirm(demo,id,request(1,18,22)),"ESTIMATE_OUTDATED");
        long old=save(id);
        var current=packages.save(demo,id,packageRequest(id,0L));
        conflict(()->bookings.confirm(demo,id,request(old,18,22)),"ESTIMATE_OUTDATED");
        events.save(demo,id,draft(1L,90,date,new BigDecimal("2000000")));
        conflict(()->bookings.confirm(demo,id,request(current.currentEstimate().estimateId(),18,22)),"ESTIMATE_OUTDATED");
    }
    @Test void incompleteEstimateRejected() {
        var venue=mapper.convertValue(Map.of("id",999,"name","Unknown DEMO rate","hall","Hall","capacity",100,"area",200),Venue.class);
        venues.saveAndFlush(venue);
        try {
            long id=event(999); long estimate=save(id);
            conflict(()->bookings.confirm(demo,id,request(estimate,18,22)),"ESTIMATE_INCOMPLETE");
            events.delete(demo,id);
        } finally { venues.deleteById(999L); }
    }
    @ParameterizedTest @ValueSource(strings={"date","venue","guests","budget","type","delete","package"})
    void confirmedBookingBlocksIncompatibleChanges(String field) {
        long id=event(1); confirm(id,18,22);
        conflict(()->{
            if(field.equals("delete")) { events.delete(demo,id); return; }
            if(field.equals("package")) { packages.save(demo,id,packageRequest(id,0L)); return; }
            var draft=draft(field.equals("venue")?2L:1L,field.equals("guests")?90:80,
                field.equals("date")?date.plusDays(1):date,new BigDecimal(field.equals("budget")?"3000000":"2000000"));
            if(field.equals("type")) draft=new EventDraft(draft.title(),EventType.WEDDING,date,80,draft.budget(),"",StrategyId.ECONOMY,1L);
            events.save(demo,id,draft);
        },"EVENT_BOOKED");
        assertThat(bookings.history(demo).getFirst().status()).isEqualTo(BookingStatus.CONFIRMED);
    }
    @Test void harmlessEditsAllowedAndCancelledHistorySurvivesEventDeletion() {
        long id=event(1); var booking=confirm(id,18,22);
        events.save(demo,id,new EventDraft("Renamed",EventType.CORPORATE,date,80,new BigDecimal("2000000"),"description",StrategyId.QUALITY,1L));
        bookings.cancel(demo,booking.id()); events.delete(demo,id);
        var history=bookings.history(demo).getFirst();
        assertThat(history.eventId()).isEqualTo(id);
        assertThat(history.estimateId()).isEqualTo(booking.estimateId());
        assertThat(history.quotedTotal()).isEqualByComparingTo(booking.quotedTotal());
        assertThat(history.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(bookings.cancel(demo,booking.id())).isEqualTo(history);
    }
    @Test void httpConflictsReturn409AndClearCode() throws Exception {
        long id=event(1); var first=confirm(id,18,22); long other=event(1); long quote=save(other);
        mvc.perform(post("/api/events/"+other+"/bookings").session(session(demo)).contentType("application/json")
            .content(mapper.writeValueAsString(request(quote,19,21)))).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("VENUE_UNAVAILABLE")).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(post("/api/bookings/"+first.id()+"/cancel").session(session(demo))).andExpect(status().isOk());
        mvc.perform(get("/api/venues/1/availability").session(session(demo)).param("start",at(18).toString()).param("end",at(22).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(true));
    }

    @RepeatedTest(3) void concurrentConflictingConfirmationsExactlyOneCommits() throws Exception {
        long first=event(1), second=event(1); long q1=save(first), q2=save(second);
        assertThat(race(first,q1,second,q2)).containsExactlyInAnyOrder("CONFIRMED","VENUE_UNAVAILABLE");
        assertThat(repository.count()).isEqualTo(1);
        assertThat(bookings.history(demo)).hasSize(1);
    }
    @Test void concurrentSameEventConfirmationsExactlyOneCommits() throws Exception {
        long id=event(1); long quote=save(id);
        assertThat(race(id,quote,id,quote)).containsExactlyInAnyOrder("CONFIRMED","EVENT_ALREADY_BOOKED");
        assertThat(repository.count()).isEqualTo(1);
    }
    @Test void concurrentDifferentVenuesBothCommit() throws Exception {
        long first=event(1), second=event(2); long q1=save(first), q2=save(second);
        assertThat(race(first,q1,second,q2)).containsOnly("CONFIRMED").hasSize(2);
        assertThat(repository.count()).isEqualTo(2);
    }
    List<String> race(long first,long q1,long second,long q2) throws Exception {
        var ready=new CountDownLatch(2); var go=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            // REQUIRES_NEW, separate worker threads/connections, and assertions after actual commits.
            Callable<String> a=()->writer(first,q1,ready,go);
            Callable<String> b=()->writer(second,q2,ready,go);
            var fa=executor.submit(a); var fb=executor.submit(b);
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue(); go.countDown();
            return List.of(fa.get(15,TimeUnit.SECONDS),fb.get(15,TimeUnit.SECONDS));
        } finally { go.countDown(); }
    }
    String writer(long id,long quote,CountDownLatch ready,CountDownLatch go) throws Exception {
        var tx=new TransactionTemplate(transactions);
        tx.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        try {
            return tx.execute(status->{
                ready.countDown();
                try { if(!go.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("Start timeout"); }
                catch(InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); }
                bookings.confirm(demo,id,request(quote,18,22)); return "CONFIRMED";
            });
        } catch(BookingConflictException ex) { return ex.code(); }
    }
}
