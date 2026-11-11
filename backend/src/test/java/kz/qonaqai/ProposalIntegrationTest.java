package kz.qonaqai;

import java.util.*;
import kz.qonaqai.domain.Venue;
import kz.qonaqai.persistence.VenueRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProposalIntegrationTest extends PlanningIntegrationSupport {
    @Autowired VenueRepository venues;
    @Test void assistantRequiresSessionAndDoesNotCreateEvents() throws Exception {
        mvc.perform(post("/api/assistant/suggest").contentType("application/json").content("{\"text\":\"Корпоратив завтра\"}"))
            .andExpect(status().isUnauthorized());
        var session=account();
        send("POST","/api/assistant/suggest",session,Map.of("text","Корпоратив завтра на 80 гостей, бюджет 2 млн"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.provider").value("DEMO_RULES"))
            .andExpect(jsonPath("$.fields.guests").value(80));
        mvc.perform(get("/api/events").session(session)).andExpect(jsonPath("$.length()").value(0));
        send("POST","/api/assistant/suggest",session,Map.of("text"," ")).andExpect(status().isBadRequest());
    }
    @Test void draftRequiresSavedCurrentQuoteAndDoesNotSaveTheDocument() throws Exception {
        var session=account(); long id=event(session);
        send("POST","/api/events/"+id+"/proposal-draft",session,Map.of()).andExpect(status().isConflict());
        saveQuote(session,id);
        var draft=draft(session,id);
        assertThat(draft.path("body").asText()).contains("ПЛОЩАДКА","ПАКЕТ И СМЕТА","DEMO","Итого:");
        mvc.perform(get("/api/proposals").session(session)).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void editedDocumentSurvivesJpaReloadAndHasActivityNotification() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id);
        var saved=proposal(session,id); long proposalId=saved.path("id").asLong();
        em.flush(); em.clear();
        assertThat(json(mvc.perform(get("/api/proposals/"+proposalId).session(session)).andExpect(status().isOk()))).isEqualTo(saved);
        send("PUT","/api/proposals/"+proposalId,session,Map.of("title","Для команды","body","Наш отредактированный текст","expectedVersion",0))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        em.flush(); em.clear();
        mvc.perform(get("/api/proposals/"+proposalId).session(session)).andExpect(jsonPath("$.title").value("Для команды"))
            .andExpect(jsonPath("$.body").value("Наш отредактированный текст")).andExpect(jsonPath("$.freshness").value("CURRENT"));
        assertThat(json(mvc.perform(get("/api/notifications").session(session))).toString()).contains("Предложение");
    }
    @Test void changingEventRejectsOldDraftAndMarksSavedProposalOutdated() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id);
        var oldDraft=draft(session,id); var saved=proposal(session,id);
        var changed=eventDraft(); changed.put("guests",90);
        send("PUT","/api/events/"+id,session,changed).andExpect(status().isOk());
        mvc.perform(get("/api/proposals/"+saved.path("id").asLong()).session(session)).andExpect(jsonPath("$.freshness").value("OUTDATED"));
        saveQuote(session,id);
        send("POST","/api/events/"+id+"/proposals",session,proposalBody(oldDraft)).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("PROPOSAL_SOURCE_CHANGED"));
    }
    @Test void staleVersionCannotOverwriteAnotherEdit() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id); var saved=proposal(session,id);
        var edit=Map.of("title","Первая правка","body","Текст","expectedVersion",0);
        send("PUT","/api/proposals/"+saved.path("id").asLong(),session,edit).andExpect(status().isOk());
        send("PUT","/api/proposals/"+saved.path("id").asLong(),session,edit).andExpect(status().isConflict());
    }
    @Test void anotherAccountCannotReadEditOrGenerateTheOwnersDocuments() throws Exception {
        var owner=account(); var other=account(); long id=event(owner); saveQuote(owner,id); var saved=proposal(owner,id);
        mvc.perform(get("/api/proposals/"+saved.path("id").asLong()).session(other)).andExpect(status().isNotFound());
        send("POST","/api/events/"+id+"/proposal-draft",other,Map.of()).andExpect(status().isNotFound());
        send("PUT","/api/proposals/"+saved.path("id").asLong(),other,Map.of("title","Чужое","body","Текст","expectedVersion",0)).andExpect(status().isNotFound());
        mvc.perform(get("/api/proposals").session(other)).andExpect(jsonPath("$.length()").value(0));
    }
    @Test void deletingEventRetainsTheSavedDocumentWithExplicitStatus() throws Exception {
        var session=account(); long id=event(session); saveQuote(session,id); var saved=proposal(session,id);
        mvc.perform(delete("/api/events/"+id).session(session)).andExpect(status().isNoContent());
        em.flush(); em.clear();
        mvc.perform(get("/api/proposals/"+saved.path("id").asLong()).session(session))
            .andExpect(jsonPath("$.body").value(saved.path("body").asText())).andExpect(jsonPath("$.freshness").value("EVENT_REMOVED"));
    }
    @Test void incompleteQuoteNeverBecomesAFabricatedFullTotal() throws Exception {
        venues.saveAndFlush(mapper.convertValue(Map.of("id",999,"name","Тестовый зал","hall","Зал","address","Астана","capacity",100,"area",200),Venue.class));
        var session=account(); long id=event(session); var changed=eventDraft(); changed.put("venueId",999);
        send("PUT","/api/events/"+id,session,changed).andExpect(status().isOk()); saveQuote(session,id);
        var saved=proposal(session,id);
        assertThat(saved.path("quoteComplete").asBoolean()).isFalse();
        assertThat(saved.path("body").asText()).contains("цена по запросу","Известная часть").doesNotContain("Итого:");
    }
}
