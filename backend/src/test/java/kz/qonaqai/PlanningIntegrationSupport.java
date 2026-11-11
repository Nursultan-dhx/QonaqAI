package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:planning-56-test;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Transactional
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,TransactionalTestExecutionListener.class})
abstract class PlanningIntegrationSupport {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EntityManager em;
    MockHttpSession account() throws Exception {
        return (MockHttpSession)mvc.perform(post("/api/auth/register").contentType("application/json")
            .content(mapper.writeValueAsString(Map.of("name","Дастан","email",UUID.randomUUID()+"@example.test","password","Planning-test-9876"))))
            .andExpect(status().isCreated()).andReturn().getRequest().getSession(false);
    }
    JsonNode json(ResultActions response) throws Exception {
        return mapper.readTree(response.andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
    ResultActions send(String method,String path,MockHttpSession session,Object body) throws Exception {
        return mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method),path).session(session)
            .contentType("application/json").content(mapper.writeValueAsString(body)));
    }
    Map<String,Object> eventDraft() {
        return new LinkedHashMap<>(Map.of("title","Корпоратив команды","type","CORPORATE","date",LocalDate.now().plusDays(30).toString(),
            "guests",80,"budget",2000000,"strategy","ECONOMY","venueId",1));
    }
    long event(MockHttpSession session) throws Exception {
        return json(send("POST","/api/events",session,eventDraft()).andExpect(status().isCreated())).path("event").path("id").asLong();
    }
    void saveQuote(MockHttpSession session,long eventId) throws Exception {
        var quote=json(send("POST","/api/events/"+eventId+"/estimate/preview",session,Map.of("packageCode","BASIC","services",List.of()))
            .andExpect(status().isOk()));
        var current=json(mvc.perform(get("/api/events/"+eventId+"/package").session(session)).andExpect(status().isOk()));
        var body=new LinkedHashMap<String,Object>(); body.put("packageCode","BASIC"); body.put("services",List.of());
        body.put("expectedConfigurationVersion",current.path("configured").asBoolean()?current.path("configurationVersion").asLong():null);
        for (var key:List.of("packageCatalogVersion","serviceCatalogVersion","venueCatalogVersion")) body.put(key,quote.path(key).asText());
        body.put("expectedEventInputToken",quote.path("eventInputToken").asText()); body.put("expectedPricingToken",quote.path("pricingToken").asText());
        send("PUT","/api/events/"+eventId+"/package",session,body).andExpect(status().isOk());
    }
    JsonNode draft(MockHttpSession session,long id) throws Exception {
        return json(send("POST","/api/events/"+id+"/proposal-draft",session,Map.of()).andExpect(status().isOk()));
    }
    Map<String,Object> proposalBody(JsonNode draft) { return Map.of("title",draft.path("title").asText(),"body",draft.path("body").asText(),"sourceToken",draft.path("sourceToken").asText()); }
    JsonNode proposal(MockHttpSession session,long id) throws Exception {
        return json(send("POST","/api/events/"+id+"/proposals",session,proposalBody(draft(session,id))).andExpect(status().isCreated()));
    }
}
