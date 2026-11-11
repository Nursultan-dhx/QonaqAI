package kz.qonaqai;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.estimate.PackageConflictException;
import kz.qonaqai.patterns.facade.ProposalFacade;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AccountDashboardIntegrationTest extends PlanningIntegrationSupport {
    @Autowired ProposalFacade facade;
    @Test void accountStartsOnFreeAndPlanChoiceSurvivesJpaReload() throws Exception {
        var session=account();
        mvc.perform(get("/api/account/plan").session(session)).andExpect(jsonPath("$.plan.code").value("FREE"));
        send("PUT","/api/account/plan",session,Map.of("code","PRO")).andExpect(status().isOk())
            .andExpect(jsonPath("$.plan.maxProposals").value(100)).andExpect(jsonPath("$.demoBilling").value(true));
        em.flush(); em.clear();
        mvc.perform(get("/api/account/dashboard").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.subscription.plan.code").value("PRO"));
        assertThat(json(mvc.perform(get("/api/notifications").session(session))).toString()).contains("Деньги не списываются");
    }
    @Test void freeLimitIsEnforcedServerSideAndProCanSaveMore() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id);
        for (int i=0;i<3;i++) proposal(session,id);
        send("POST","/api/events/"+id+"/proposals",session,proposalBody(draft(session,id))).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("PLAN_LIMIT"));
        send("PUT","/api/account/plan",session,Map.of("code","PRO")).andExpect(status().isOk());
        proposal(session,id);
        mvc.perform(get("/api/account/plan").session(session)).andExpect(jsonPath("$.savedProposals").value(4));
    }
    @Test void downgradeRetainsExistingDocumentsAndAllowsEdits() throws Exception {
        var session=account(); send("PUT","/api/account/plan",session,Map.of("code","PRO")).andExpect(status().isOk());
        long id=event(session); saveQuote(session,id); var saved=proposal(session,id);
        for (int i=0;i<3;i++) proposal(session,id);
        send("PUT","/api/account/plan",session,Map.of("code","FREE")).andExpect(status().isOk());
        mvc.perform(get("/api/proposals").session(session)).andExpect(jsonPath("$.length()").value(4));
        send("PUT","/api/proposals/"+saved.path("id").asLong(),session,Map.of("title","После смены тарифа","body","Текст","expectedVersion",0))
            .andExpect(status().isOk());
    }
    @Test void exportIsAProFeatureAndChecksOwnership() throws Exception {
        var session=account(); var other=account(); long id=event(session); saveQuote(session,id); var saved=proposal(session,id);
        String path="/api/proposals/"+saved.path("id").asLong()+"/export";
        mvc.perform(get(path).session(session)).andExpect(status().isForbidden());
        send("PUT","/api/account/plan",session,Map.of("code","PRO")).andExpect(status().isOk());
        var exported=mvc.perform(get(path).session(session)).andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.containsString("attachment"))).andReturn().getResponse();
        assertThat(exported.getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).contains(saved.path("body").asText());
        mvc.perform(get(path).session(other)).andExpect(status().isNotFound());
    }
    @Test void dashboardContainsOnlyTheCurrentAccountsProjects() throws Exception {
        var session=account(); var other=account(); long id=event(session); saveQuote(session,id); proposal(session,id);
        mvc.perform(get("/api/account/dashboard").session(session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.events.length()").value(1)).andExpect(jsonPath("$.events[0].estimateStatus").value("CURRENT"))
            .andExpect(jsonPath("$.events[0].proposalCount").value(1));
        mvc.perform(get("/api/account/dashboard").session(other)).andExpect(jsonPath("$.events.length()").value(0))
            .andExpect(jsonPath("$.proposals.length()").value(0)).andExpect(jsonPath("$.notifications.length()").value(0));
    }
    @Test void dashboardSerializesEventValuesWhenJpaAlreadyHoldsAProxy() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id); proposal(session,id);
        em.flush(); em.clear();
        em.getReference(kz.qonaqai.domain.EventPlan.class,id);
        var response=mvc.perform(get("/api/account/dashboard").session(session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.events[0].event.title").value("Корпоратив команды")).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("hibernate_interceptor","hibernateLazyInitializer");
    }
    @Test void bookingChangesAppearInDashboardAndNotifications() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id);
        var saved=json(mvc.perform(get("/api/events/"+id+"/package").session(session)));
        var start=LocalDate.now().plusDays(30).atTime(17,0).atZone(ZoneId.of("Asia/Almaty")).toOffsetDateTime();
        var booking=json(send("POST","/api/events/"+id+"/bookings",session,Map.of("start",start.toString(),"end",start.plusHours(2).toString(),
            "estimateId",saved.path("currentEstimate").path("estimateId").asLong())).andExpect(status().isCreated()));
        mvc.perform(get("/api/account/dashboard").session(session)).andExpect(jsonPath("$.events[0].bookingStatus").value("CONFIRMED"));
        send("POST","/api/bookings/"+booking.path("id").asLong()+"/cancel",session,Map.of()).andExpect(status().isOk());
        var dashboard=json(mvc.perform(get("/api/account/dashboard").session(session)).andExpect(jsonPath("$.events[0].bookingStatus").value("CANCELLED")));
        assertThat(dashboard.path("notifications").toString()).contains("подтверждена","отменена");
    }
    @Test void sharedDemoCannotChangeAccountPlanAndAnonymousCannotReadDashboard() throws Exception {
        mvc.perform(get("/api/account/dashboard")).andExpect(status().isUnauthorized());
        var session=(org.springframework.mock.web.MockHttpSession)send("POST","/api/auth/demo",new org.springframework.mock.web.MockHttpSession(),Map.of())
            .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
        send("PUT","/api/account/plan",session,Map.of("code","PRO")).andExpect(status().isForbidden());
        var account=account(); send("PUT","/api/account/plan",account,Map.of("code","UNKNOWN")).andExpect(status().isBadRequest());
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void concurrentSavesAcrossEventsCannotExceedTheFreeQuota() throws Exception {
        var session=account(); long first=event(session); long second=event(session); saveQuote(session,first); saveQuote(session,second);
        proposal(session,first); proposal(session,first);
        var a=draft(session,first); var b=draft(session,second);
        var identity=(SessionIdentity)session.getAttribute(SessionIdentity.class.getName());
        var ready=new CountDownLatch(2); var start=new CountDownLatch(1);
        try (var executor=Executors.newFixedThreadPool(2)) {
            List<Future<String>> tasks=new ArrayList<>();
            for (var draft:List.of(a,b)) tasks.add(executor.submit(()->{
                ready.countDown(); start.await(10,TimeUnit.SECONDS);
                try { facade.create(identity,draft.path("eventId").asLong(),draft.path("title").asText(),draft.path("body").asText(),draft.path("sourceToken").asText()); return "SAVED"; }
                catch (PackageConflictException ex) { return ex.code(); }
            }));
            assertThat(ready.await(10,TimeUnit.SECONDS)).isTrue(); start.countDown();
            assertThat(List.of(tasks.get(0).get(20,TimeUnit.SECONDS),tasks.get(1).get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder("SAVED","PLAN_LIMIT");
        }
        mvc.perform(get("/api/account/plan").session(session)).andExpect(jsonPath("$.savedProposals").value(3));
    }
}
