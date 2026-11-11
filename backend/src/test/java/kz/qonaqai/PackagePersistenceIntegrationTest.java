package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.persistence.*;
import kz.qonaqai.service.*;
import kz.qonaqai.patterns.factory.*;
import kz.qonaqai.patterns.factory.creators.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:saved-test;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Transactional
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,TransactionalTestExecutionListener.class})
class PackagePersistenceIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EntityManager em;
    @Autowired PackageConfigurationRepository configurations;
    @Autowired EventEstimateRepository snapshots;
    @Autowired EventRepository events;
    @Autowired VenueRepository venues;
    @Autowired PackageCatalog packages;
    @Autowired ServiceCatalog rates;
    @Autowired DemoVenueCatalog venueRates;
    @Autowired PackageConfigurationService storage;

    @ParameterizedTest @EnumSource(PackageCode.class)
    void saveLoadAndReplaceCreateImmutableRevisions(PackageCode code) throws Exception {
        var session=demo();
        long id=create(session);
        mvc.perform(get(path(id)).session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(false));
        var request=body(id,session,code,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,3),
            new ServiceSelection(ServiceType.CATERING,null)),null);
        var saved=save(id,session,request);
        assertThat(saved.path("configurationVersion").asLong()).isZero();
        assertThat(saved.path("currentEstimate").path("revision").asLong()).isEqualTo(1);
        var first=saved.path("currentEstimate").path("estimate");
        em.flush(); em.clear();
        var loaded=load(id,session);
        assertThat(loaded).isEqualTo(saved);
        var next=body(id,session,PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.MUSIC,2)),0L);
        var updated=save(id,session,next);
        assertThat(updated.path("configurationVersion").asLong()).isEqualTo(1);
        assertThat(updated.path("currentEstimate").path("revision").asLong()).isEqualTo(2);
        em.flush(); em.clear();
        var history=mapper.readTree(mvc.perform(get(path(id)+"/estimates").session(session))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(history.size()).isEqualTo(2);
        assertThat(history.get(1).path("estimate")).isEqualTo(first);
        assertThat(load(id,session).path("services")).hasSize(1);
    }

    @ParameterizedTest @ValueSource(strings={"guests","venueId","budget","date"})
    void changedEventInputsMarkSavedSnapshotOutdated(String field) throws Exception {
        var session=demo(); long id=create(session);
        var saved=save(id,session,body(id,session,PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2)),null));
        var draft=draft();
        draft.put(field,switch(field) {
            case "guests"->90; case "venueId"->2; case "budget"->1000000;
            default->LocalDate.now().plusDays(31).toString();
        });
        mvc.perform(put("/api/events/"+id).session(session).contentType("application/json")
            .content(mapper.writeValueAsString(draft))).andExpect(status().isOk());
        var loaded=load(id,session);
        assertThat(loaded.path("currentEstimate").path("freshness").asText()).isEqualTo("OUTDATED");
        assertThat(loaded.path("currentEstimate").path("estimate")).isEqualTo(saved.path("currentEstimate").path("estimate"));
    }

    @Test void staleConfigurationCatalogEventAndPricingTokensAreConflicts() throws Exception {
        var session=demo(); long id=create(session);
        var body=body(id,session,PackageCode.BASIC,List.of(),null);
        save(id,session,body);
        conflict(id,session,body,"CONFIGURATION_CONFLICT");
        var update=body(id,session,PackageCode.BASIC,List.of(),0L);
        update.put("serviceCatalogVersion","wrong"); conflict(id,session,update,"CATALOG_CHANGED");
        update=body(id,session,PackageCode.BASIC,List.of(),0L);
        update.put("expectedEventInputToken","wrong"); conflict(id,session,update,"EVENT_CHANGED");
        update=body(id,session,PackageCode.BASIC,List.of(),0L);
        update.put("expectedPricingToken","wrong"); conflict(id,session,update,"PRICING_CHANGED");
        assertThat(load(id,session).path("configurationVersion").asLong()).isZero();
    }

    @ParameterizedTest @ValueSource(strings={
        "{\"type\":\"HOST\",\"hours\":1}",
        "{\"type\":\"PHOTOGRAPHY\",\"hours\":0}",
        "{\"type\":\"PHOTOGRAPHY\",\"hours\":13}",
        "{\"type\":\"CATERING\",\"quantity\":10}",
        "{\"type\":\"PHOTOGRAPHY\",\"hours\":1.5}",
        "{\"type\":\"PHOTOGRAPHY\",\"hours\":\"2\"}",
        "{\"type\":\"UNKNOWN\"}","null"})
    void invalidSaveSelectionsDoNotWrite(String service) throws Exception {
        var session=demo();long id=create(session);
        var body=body(id,session,PackageCode.BASIC,List.of(),null);
        body.put("services",List.of(mapper.readTree(service)));
        mvc.perform(put(path(id)).session(session).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
        assertThat(load(id,session).path("configured").asBoolean()).isFalse();
    }

    @Test void duplicateIncludedAndAuthoritativePropertiesAreRejected() throws Exception {
        var session=demo();long id=create(session);
        var body=body(id,session,PackageCode.BASIC,List.of(),null);
        body.put("services",List.of(Map.of("type","HOST"),Map.of("type","HOST")));
        mvc.perform(put(path(id)).session(session).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
        body=body(id,session,PackageCode.STANDARD,List.of(),null);
        body.put("services",List.of(Map.of("type","DECOR")));
        mvc.perform(put(path(id)).session(session).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
        for(String key:List.of("unitPrice","budget","ownerId","totalCost","guestCount")) {
            body=body(id,session,PackageCode.BASIC,List.of(),null); body.put(key,1);
            mvc.perform(put(path(id)).session(session).contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
        }
    }

    @Test void accountsAndDemoAreIsolatedAndAnonymousIsRejected() throws Exception {
        var demo=demo();long demoId=create(demo);
        var account=account("saved-owner@example.com");long accountId=create(account);
        mvc.perform(get(path(accountId))).andExpect(status().isUnauthorized());
        mvc.perform(get(path(accountId)).session(demo)).andExpect(status().isNotFound());
        mvc.perform(get(path(demoId)).session(account)).andExpect(status().isNotFound());
        mvc.perform(get(path(accountId)).session(account("saved-other@example.com"))).andExpect(status().isNotFound());
        var saved=save(demoId,demo,body(demoId,demo,PackageCode.STANDARD,List.of(),null));
        assertThat(load(demoId,demo()).path("configurationId")).isEqualTo(saved.path("configurationId"));
        mvc.perform(put(path(accountId)).session(demo).contentType("application/json").content("{}"))
            .andExpect(status().isNotFound());
    }

    @Test void historicalReadsDoNotCallCalculatorAndRateChangesCreateANewRevision() throws Exception {
        var session=demo();long id=create(session);
        save(id,session,body(id,session,PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2)),null));
        var newRates=new ServiceCatalog(new ServiceCatalog.Definition("demo-v2",rates.options().services().stream()
            .map(rate->rate.serviceType()==ServiceType.PHOTOGRAPHY ? new ServiceRate(rate.serviceType(),rate.displayName(),
                rate.description(),rate.pricingUnit(),new java.math.BigDecimal("30000"),"KZT",true):rate).toList()));
        var noCalculation=mock(EstimateService.class);
        var read=new PackageConfigurationService(events,configurations,snapshots,noCalculation,packages,newRates,venueRates);
        var loaded=read.load(SessionIdentity.DEMO,id);
        assertThat(loaded.currentEstimate().catalogsChanged()).isTrue();
        assertThat(loaded.currentEstimate().estimate().totalCost()).isEqualByComparingTo("580000");
        read.history(SessionIdentity.DEMO,id);
        verifyNoInteractions(noCalculation);
        var creators=new ServiceCreatorRegistry(List.of(new PhotographerServiceCreator()));
        var calculator=new EstimateService(events,venues,new PackageAssembler(packages,newRates,creators),packages,newRates,venueRates);
        var current=calculator.preview(SessionIdentity.DEMO,id,new EstimateService.Request(PackageCode.BASIC,List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2))));
        var replacement=new PackageConfigurationService(events,configurations,snapshots,calculator,packages,newRates,venueRates);
        replacement.save(SessionIdentity.DEMO,id,new PackageConfigurationService.SaveRequest(PackageCode.BASIC,0L,
            current.packageCatalogVersion(),current.serviceCatalogVersion(),current.venueCatalogVersion(),
            current.eventInputToken(),current.pricingToken(),List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,2))));
        em.flush();em.clear();
        var history=replacement.history(SessionIdentity.DEMO,id);
        assertThat(history.get(0).estimate().totalCost()).isEqualByComparingTo("590000");
        assertThat(history.get(1).estimate().totalCost()).isEqualByComparingTo("580000");
        assertThat(history.get(1).estimate().lines().stream().filter(line->line.code().equals("SERVICE:PHOTOGRAPHY")).findFirst().orElseThrow().unitPrice())
            .isEqualByComparingTo("25000");
    }

    @ParameterizedTest @ValueSource(strings={"packageCatalogVersion","serviceCatalogVersion","venueCatalogVersion"})
    void everyCatalogVersionIsAnExpectedPrecondition(String key) throws Exception {
        var session=demo();long id=create(session);
        var request=body(id,session,PackageCode.BASIC,List.of(),null);
        request.put(key,"stale");
        conflict(id,session,request,"CATALOG_CHANGED");
        assertThat(load(id,session).path("configured").asBoolean()).isFalse();
    }

    @Test void incompleteQuoteWithUnknownRentSurvivesJpaReload() throws Exception {
        venues.saveAndFlush(mapper.convertValue(Map.of("id",999,"name","Unknown DEMO rate","hall","Hall","capacity",100,"area",200),Venue.class));
        var session=demo();long id=create(session);
        var changed=draft();changed.put("venueId",999);
        mvc.perform(put("/api/events/"+id).session(session).contentType("application/json")
            .content(mapper.writeValueAsString(changed))).andExpect(status().isOk());
        var saved=save(id,session,body(id,session,PackageCode.BASIC,List.of(),null));
        em.flush();em.clear();
        var loaded=load(id,session);
        assertThat(loaded.path("currentEstimate").path("estimate")).isEqualTo(saved.path("currentEstimate").path("estimate"));
        assertThat(loaded.path("currentEstimate").path("estimate").path("totalCost").isNull()).isTrue();
        assertThat(loaded.path("currentEstimate").path("estimate").path("budgetStatus").asText()).isEqualTo("UNDETERMINED");
    }

    @Test void deletingAnEventExplicitlyRemovesOnlyItsOwnedDependentSnapshots() throws Exception {
        var session=demo();long id=create(session);
        save(id,session,body(id,session,PackageCode.BASIC,List.of(),null));
        mvc.perform(delete("/api/events/"+id).session(session)).andExpect(status().isNoContent());
        em.flush();
        assertThat(configurations.findByEvent_Id(id)).isEmpty();
    }

    Map<String,Object> body(long id,MockHttpSession session,PackageCode code,List<ServiceSelection> selections,Long version) throws Exception {
        var quote=mapper.readTree(mvc.perform(post("/api/events/"+id+"/estimate/preview").session(session)
            .contentType("application/json").content(mapper.writeValueAsString(Map.of("packageCode",code,"services",selections))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var body=new LinkedHashMap<String,Object>();
        body.put("packageCode",code);body.put("services",selections);body.put("expectedConfigurationVersion",version);
        for(String key:List.of("packageCatalogVersion","serviceCatalogVersion","venueCatalogVersion")) body.put(key,quote.path(key).asText());
        body.put("expectedEventInputToken",quote.path("eventInputToken").asText());body.put("expectedPricingToken",quote.path("pricingToken").asText());
        return body;
    }
    JsonNode save(long id,MockHttpSession session,Map<String,Object> body) throws Exception {
        return mapper.readTree(mvc.perform(put(path(id)).session(session).contentType("application/json")
            .content(mapper.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    JsonNode load(long id,MockHttpSession session) throws Exception {
        return mapper.readTree(mvc.perform(get(path(id)).session(session)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    void conflict(long id,MockHttpSession session,Map<String,Object> body,String code) throws Exception {
        mvc.perform(put(path(id)).session(session).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value(code));
    }
    MockHttpSession demo() throws Exception { return auth("/api/auth/demo",Map.of()); }
    MockHttpSession account(String email) throws Exception { return auth("/api/auth/register",Map.of("name","Тест","email",email,"password","Persistence-test-9876")); }
    MockHttpSession auth(String path,Map<String,String> body) throws Exception {
        return (MockHttpSession)mvc.perform(post(path).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().is2xxSuccessful()).andReturn().getRequest().getSession(false);
    }
    Map<String,Object> draft() { return new LinkedHashMap<>(Map.of("title","Сохранённая смета","type","CORPORATE","date",LocalDate.now().plusDays(30).toString(),
        "guests",80,"budget",2000000,"strategy","ECONOMY","venueId",1)); }
    long create(MockHttpSession session) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/events").session(session).contentType("application/json")
            .content(mapper.writeValueAsString(draft()))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString())
            .path("event").path("id").asLong();
    }
    String path(long id) { return "/api/events/"+id+"/package"; }
}
