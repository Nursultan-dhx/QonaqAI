package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.service.VenueService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:qonaq-test;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Transactional
// These integration tests use real collaborators; no runtime Mockito agent is needed.
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class, TransactionalTestExecutionListener.class})
class ApplicationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired VenueService venues;
    private MockHttpSession demoSession;

    @BeforeEach
    void enterDemo() throws Exception {
        demoSession = session(auth("demo", Map.of(), null)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mode").value("DEMO")));
    }
    private Map<String,Object> draft() {
        var d=new LinkedHashMap<String,Object>();
        d.put("title","Выпускной AITU");d.put("type","GRADUATION");d.put("date",LocalDate.now().plusDays(30).toString());
        d.put("guests",80);d.put("budget",2000000);d.put("description","Демонстрация");d.put("strategy","ECONOMY");d.put("venueId",null);
        return d;
    }
    private JsonNode create(Map<String,Object> data) throws Exception {
        return create(demoSession, data);
    }
    private JsonNode create(MockHttpSession session, Map<String,Object> data) throws Exception {
        var response=mvc.perform(post("/api/events").session(session).contentType("application/json").content(mapper.writeValueAsString(data)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.event.ownerId").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(response);
    }
    @Test void bootstrapIncludesVerifiedCatalogAndDemoUser() throws Exception {
        mvc.perform(get("/api/bootstrap").session(demoSession)).andExpect(status().isOk())
            .andExpect(jsonPath("$.profile.mode").value("DEMO"))
            .andExpect(jsonPath("$.venues.length()").value(5));
    }
    @Test void createReloadEditSelectAndDelete() throws Exception {
        var data=draft();var created=create(data);long id=created.path("event").path("id").asLong();
        var candidate=venues.find("",80,StrategyId.ECONOMY,null).getFirst();
        data.put("title","Обновлённый выпускной");data.put("venueId",candidate.id());
        mvc.perform(put("/api/events/"+id).session(demoSession).contentType("application/json").content(mapper.writeValueAsString(data)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.event.venueId").value(candidate.id()));
        mvc.perform(get("/api/events").session(demoSession)).andExpect(jsonPath("$[0].title").value("Обновлённый выпускной"));
        mvc.perform(delete("/api/events/"+id).session(demoSession)).andExpect(status().isNoContent());
        mvc.perform(get("/api/events").session(demoSession)).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void observerPersistsBothMeaningfulReactions() throws Exception {
        var result=create(draft());
        assertThat(result.path("notifications").size()).isEqualTo(2);
        mvc.perform(get("/api/notifications").session(demoSession)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
        assertThat(result.path("notifications").toString()).contains("Подбор", "создано");
    }
    @Test void strategiesProduceDifferentOrdersWithoutInventingPrices() {
        var economical=venues.find("",80,StrategyId.ECONOMY,null);
        var spacious=venues.find("",80,StrategyId.QUALITY,null);
        assertThat(economical).hasSize(5);
        assertThat(economical.getFirst().capacity()).isLessThanOrEqualTo(economical.getLast().capacity());
        assertThat(spacious.getFirst().area()).isGreaterThanOrEqualTo(spacious.getLast().area());
        assertThat(economical.getFirst().id()).isNotEqualTo(spacious.getFirst().id());
        assertThat(economical).allMatch(v->v.price()==null);
    }
    @Test void capacityFilterExcludesSmallVenues() {
        assertThat(venues.find("",400,StrategyId.ECONOMY,BigDecimal.valueOf(1000)))
            .allMatch(v->v.capacity()>=400).isNotEmpty();
        assertThat(venues.find("",9999,StrategyId.QUALITY,null)).isEmpty();
    }
    @Test void searchIsCaseInsensitive() {
        assertThat(venues.find("RITZ",1,StrategyId.ECONOMY,null)).hasSize(1);
    }
    @Test void emptyTitleIsRejected() throws Exception { var data=draft();data.put("title"," ");invalid(data,"title"); }
    @Test void zeroGuestsAreRejected() throws Exception { var data=draft();data.put("guests",0);invalid(data,"guests"); }
    @Test void negativeBudgetIsRejected() throws Exception { var data=draft();data.put("budget",-1);invalid(data,"budget"); }
    @Test void pastDateIsRejected() throws Exception { var data=draft();data.put("date",LocalDate.now().minusDays(1).toString());invalid(data,"date"); }
    @Test void oversizedSelectedVenueIsRejected() throws Exception {
        var data=draft();data.put("guests",9999);data.put("venueId",venues.find("",1,StrategyId.ECONOMY,null).getFirst().id());
        mvc.perform(post("/api/events").session(demoSession).contentType("application/json").content(mapper.writeValueAsString(data)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }
    @Test void unknownEventAndMalformedInputReturnHelpfulErrors() throws Exception {
        mvc.perform(delete("/api/events/99999").session(demoSession)).andExpect(status().isNotFound());
        mvc.perform(post("/api/events").session(demoSession).contentType("application/json").content("{\"date\":\"broken\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(get("/api/venues").param("guests","-1")).andExpect(status().isBadRequest());
    }
    private void invalid(Map<String,Object> data,String field) throws Exception {
        mvc.perform(post("/api/events").session(demoSession).contentType("application/json").content(mapper.writeValueAsString(data)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors."+field).exists());
    }

    @Test void registrationLoginAndLogoutReplaceTheSession() throws Exception {
        mvc.perform(get("/api/bootstrap")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/events")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/venues")).andExpect(status().isOk());

        auth("register", Map.of("name", " ", "email", "wrong", "password", "short"), null)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.email").exists())
            .andExpect(jsonPath("$.errors.password").exists());

        String oldSessionId = demoSession.getId();
        var accountSession = session(auth("register", registration(" Аида ", " AIDA@example.com "), demoSession)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Аида"))
            .andExpect(jsonPath("$.mode").value("ACCOUNT"))
            .andExpect(jsonPath("$.email").doesNotExist())
            .andExpect(jsonPath("$.passwordHash").doesNotExist()));
        assertThat(demoSession.isInvalid()).isTrue();
        assertThat(accountSession.getId()).isNotEqualTo(oldSessionId);

        auth("register", registration("Дубликат", "aida@EXAMPLE.com"), null)
            .andExpect(status().isConflict());
        var wrongPassword = auth("login", Map.of("email", "aida@example.com", "password", "wrong-password"), null)
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var unknownEmail = auth("login", Map.of("email", "missing@example.com", "password", "wrong-password"), null)
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(mapper.readTree(wrongPassword)).isEqualTo(mapper.readTree(unknownEmail));

        auth("logout", Map.of(), accountSession).andExpect(status().isNoContent());
        assertThat(accountSession.isInvalid()).isTrue();
        mvc.perform(get("/api/bootstrap").session(accountSession)).andExpect(status().isUnauthorized());

        var loginSession = session(auth("login", Map.of("email", "AIDA@Example.com", "password", "Demo-test-9876"), null)
            .andExpect(status().isOk()).andExpect(jsonPath("$.mode").value("ACCOUNT")));
        mvc.perform(get("/api/bootstrap").session(loginSession))
            .andExpect(status().isOk()).andExpect(jsonPath("$.profile.name").value("Аида"));
    }

    @Test void accountsAndSharedDemoHaveSeparateEventsAndNotifications() throws Exception {
        var demoDraft = draft();
        demoDraft.put("title", "Общее демо");
        long demoId = create(demoDraft).path("event").path("id").asLong();
        var first = session(auth("register", registration("Первый", "first@example.com"), null)
            .andExpect(status().isCreated()));
        var second = session(auth("register", registration("Второй", "second@example.com"), null)
            .andExpect(status().isCreated()));

        mvc.perform(get("/api/bootstrap").session(first))
            .andExpect(jsonPath("$.events.length()").value(0))
            .andExpect(jsonPath("$.notifications.length()").value(0));
        var firstDraft = draft();
        firstDraft.put("title", "План первого");
        long firstId = create(first, firstDraft).path("event").path("id").asLong();
        var secondDraft = draft();
        secondDraft.put("title", "План второго");
        var secondCreated = create(second, secondDraft);
        long secondId = secondCreated.path("event").path("id").asLong();
        assertThat(secondCreated.path("notifications")).hasSize(2);
        assertThat(secondCreated.path("notifications").toString()).doesNotContain("План первого", "Общее демо");

        rejectForeignEvent(second, firstId, secondDraft);
        rejectForeignEvent(second, demoId, secondDraft);
        rejectForeignEvent(demoSession, firstId, demoDraft);
        rejectForeignEvent(first, secondId, firstDraft);

        mvc.perform(get("/api/events").session(first))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(firstId));
        mvc.perform(get("/api/notifications").session(first))
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].eventId").value(firstId))
            .andExpect(jsonPath("$[0].ownerId").doesNotExist());
        mvc.perform(get("/api/bootstrap").session(demoSession))
            .andExpect(jsonPath("$.events.length()").value(1))
            .andExpect(jsonPath("$.events[0].id").value(demoId))
            .andExpect(jsonPath("$.notifications.length()").value(2))
            .andExpect(jsonPath("$.notifications[0].eventId").value(demoId));
    }

    private void rejectForeignEvent(MockHttpSession session, long id, Map<String, Object> data) throws Exception {
        mvc.perform(put("/api/events/" + id).session(session).contentType("application/json")
                .content(mapper.writeValueAsString(data))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/events/" + id).session(session)).andExpect(status().isNotFound());
    }

    private Map<String, String> registration(String name, String email) {
        return Map.of("name", name, "email", email, "password", "Demo-test-9876");
    }

    private ResultActions auth(String action, Map<String, String> body, MockHttpSession previous) throws Exception {
        var request = post("/api/auth/" + action).contentType("application/json")
            .content(mapper.writeValueAsString(body));
        if (previous != null) request.session(previous);
        return mvc.perform(request);
    }

    private MockHttpSession session(ResultActions response) {
        return (MockHttpSession) response.andReturn().getRequest().getSession(false);
    }
}
