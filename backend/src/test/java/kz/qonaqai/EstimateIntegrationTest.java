package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import kz.qonaqai.domain.Venue;
import kz.qonaqai.persistence.*;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:estimate-test;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc @Transactional
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class, TransactionalTestExecutionListener.class})
class EstimateIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EntityManager entityManager;
    @Autowired EventRepository events;
    @Autowired VenueRepository venues;
    @Autowired NotificationRepository notifications;

    private static final String FULL = """
        {"packageCode":"BASIC","services":[{"type":"HOST"},{"type":"PHOTOGRAPHY","hours":2},
        {"type":"MUSIC","hours":3},{"type":"CATERING"}]}
        """;

    @Test void publicMetadataShowsThreeTrustedPackagesAndInclusions() throws Exception {
        mvc.perform(get("/api/package-options")).andExpect(status().isOk())
            .andExpect(jsonPath("$.catalogVersion").value("demo-packages-v1"))
            .andExpect(jsonPath("$.demoPrices").value(true))
            .andExpect(jsonPath("$.currency").value("KZT"))
            .andExpect(jsonPath("$.packages.length()").value(3))
            .andExpect(jsonPath("$.packages[0].basePrice").value(30000))
            .andExpect(jsonPath("$.packages[0].includedServiceTypes.length()").value(0))
            .andExpect(jsonPath("$.packages[1].basePrice").value(95000))
            .andExpect(jsonPath("$.packages[1].includedServiceTypes[0]").value("DECOR"))
            .andExpect(jsonPath("$.packages[2].basePrice").value(185000))
            .andExpect(jsonPath("$.packages[2].includedServiceTypes.length()").value(2));
    }

    @Test void ownedBasicPreviewCalculatesRequiredExampleWithoutPersistingAnything() throws Exception {
        var owner = account("estimate@example.com");
        long id = create(owner, 1L, 2000000);
        entityManager.flush();
        entityManager.clear();
        var before = bootstrap(owner);
        long eventCount = events.count(), notificationCount = notifications.count();
        var tables = tables();
        var json = mvc.perform(post(path(id)).session(owner).contentType("application/json").content(FULL))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.eventId").value(id))
            .andExpect(jsonPath("$.packageCode").value("BASIC"))
            .andExpect(jsonPath("$.packageSubtotal").value(850000))
            .andExpect(jsonPath("$.venueCharge").value(500000))
            .andExpect(jsonPath("$.totalCost").value(1350000))
            .andExpect(jsonPath("$.eventBudget").value(2000000))
            .andExpect(jsonPath("$.remainingBudget").value(650000))
            .andExpect(jsonPath("$.budgetUsedPercent").value(67.5))
            .andExpect(jsonPath("$.budgetStatus").value("WITHIN_BUDGET"))
            .andExpect(jsonPath("$.quoteComplete").value(true))
            .andExpect(jsonPath("$.demoPrices").value(true))
            .andExpect(jsonPath("$.lines.length()").value(6))
            .andExpect(jsonPath("$.lines[0].priceSource").value("DEMO"))
            .andExpect(jsonPath("$.serviceCatalogVersion").value("demo-v1"))
            .andExpect(jsonPath("$.venueCatalogVersion").value("demo-venues-v1"))
            .andReturn().getResponse().getContentAsString();
        var response = mapper.readTree(json);
        var sum = java.math.BigDecimal.ZERO;
        for (var line : response.path("lines")) sum = sum.add(line.path("total").decimalValue());
        assertThat(sum).isEqualByComparingTo("1350000");
        entityManager.flush();
        entityManager.clear();
        assertThat(bootstrap(owner)).isEqualTo(before);
        assertThat(events.count()).isEqualTo(eventCount);
        assertThat(notifications.count()).isEqualTo(notificationCount);
        assertThat(tables()).isEqualTo(tables);
        assertThat(venues.findAll()).allMatch(venue -> venue.price() == null);
        System.out.println("ESTIMATE_RESPONSE=" + json);
    }

    @ParameterizedTest @CsvSource({"STANDARD,645000,1", "PREMIUM,735000,2"})
    void includedServicesAreListedWithoutDuplicateCharges(String code, int total, int included) throws Exception {
        var owner = demo();
        long id = create(owner, 1L, 2000000);
        var response = mvc.perform(post(path(id)).session(owner).contentType("application/json")
            .content("{\"packageCode\":\"" + code + "\",\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":2}]}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCost").value(total))
            .andReturn().getResponse().getContentAsString();
        int count = 0;
        for (var line : mapper.readTree(response).path("lines")) {
            if (line.path("included").asBoolean()) {
                count++;
                assertThat(line.path("total").decimalValue()).isEqualByComparingTo("0");
            }
        }
        assertThat(count).isEqualTo(included);
    }

    @ParameterizedTest @CsvSource({"530000,WITHIN_BUDGET,0", "2000000,WITHIN_BUDGET,1470000", "500000,EXCEEDED,0"})
    void savedBudgetDeterminesStatusAndPreviewIsAllowedWhenExceeded(int budget, String status, int remaining) throws Exception {
        var owner = demo();
        mvc.perform(post(path(create(owner, 1L, budget))).session(owner).contentType("application/json")
            .content("{\"packageCode\":\"BASIC\",\"services\":[]}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.budgetStatus").value(status))
            .andExpect(jsonPath("$.remainingBudget").value(remaining));
    }

    @ParameterizedTest @ValueSource(strings = {
        "{}", "null", "{\"packageCode\":null,\"services\":[]}",
        "{\"packageCode\":\"UNKNOWN\",\"services\":[]}", "{\"packageCode\":0,\"services\":[]}",
        "{\"packageCode\":\"BASIC\"}", "{\"packageCode\":\"BASIC\",\"services\":null}",
        "{\"packageCode\":\"BASIC\",\"services\":[null]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":null}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"UNKNOWN\"}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"HOST\"},{\"type\":\"HOST\"}]}",
        "{\"packageCode\":\"STANDARD\",\"services\":[{\"type\":\"DECOR\"}]}",
        "{\"packageCode\":\"PREMIUM\",\"services\":[{\"type\":\"HOST\"}]}",
        "{\"packageCode\":\"PREMIUM\",\"services\":[{\"type\":\"DECOR\"}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"MUSIC\"}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"MUSIC\",\"hours\":0}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"MUSIC\",\"hours\":-1}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"MUSIC\",\"hours\":13}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":1.5}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":\"2\"}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"HOST\",\"hours\":1}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"CATERING\",\"quantity\":1}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"CATERING\",\"guestCount\":1}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[{\"type\":\"HOST\",\"unitPrice\":1}]}",
        "{\"packageCode\":\"BASIC\",\"services\":[],\"eventBudget\":999999}",
        "{\"packageCode\":\"BASIC\",\"services\":[],\"venueCharge\":0}",
        "{\"packageCode\":\"BASIC\",\"services\":[],\"basePrice\":0}",
        "{\"packageCode\":\"BASIC\",\"services\":[],\"currency\":\"USD\"}",
        "{\"packageCode\":\"BASIC\",\"services\":[]} {}"
    })
    void invalidOrClientAuthoritativeFieldsAreRejected(String body) throws Exception {
        var owner = demo();
        mvc.perform(post(path(create(owner, 1L, 2000000))).session(owner).contentType("application/json").content(body))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void includedRequestHasAClearValidationMessage() throws Exception {
        var owner = demo();
        mvc.perform(post(path(create(owner, 1L, 2000000))).session(owner).contentType("application/json")
            .content("{\"packageCode\":\"STANDARD\",\"services\":[{\"type\":\"DECOR\"}]}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Услуга уже включена в пакет: DECOR"));
    }

    @Test void missingVenueIsAValidationError() throws Exception {
        var owner = demo();
        mvc.perform(post(path(create(owner, null, 2000000))).session(owner).contentType("application/json").content(FULL))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Сначала выберите и сохраните площадку мероприятия"));
    }

    @Test void authenticationOwnershipAndMissingEventAreEnforced() throws Exception {
        var owner = account("owner-estimate@example.com");
        long id = create(owner, 1L, 2000000);
        mvc.perform(post(path(id)).contentType("application/json").content(FULL)).andExpect(status().isUnauthorized());
        mvc.perform(post(path(id)).session(account("foreign-estimate@example.com")).contentType("application/json").content(FULL))
            .andExpect(status().isNotFound());
        mvc.perform(post(path(id)).session(demo()).contentType("application/json").content(FULL)).andExpect(status().isNotFound());
        mvc.perform(post(path(999999L)).session(owner).contentType("application/json").content(FULL)).andExpect(status().isNotFound());
    }

    @Test void sharedDemoAndFactoryMethodEndpointRemainCompatible() throws Exception {
        var owner = demo();
        long id = create(owner, 1L, 2000000);
        mvc.perform(post(path(id)).session(demo()).contentType("application/json").content(FULL))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCost").value(1350000));
        mvc.perform(post("/api/events/" + id + "/services/preview").session(owner).contentType("application/json")
            .content("{\"services\":[{\"type\":\"CATERING\"}]}")).andExpect(status().isOk())
            .andExpect(jsonPath("$.servicesSubtotal").value(640000))
            .andExpect(jsonPath("$.totalCost").doesNotExist());
        mvc.perform(post(path(id)).session(account("private-estimate@example.com")).contentType("application/json").content(FULL))
            .andExpect(status().isNotFound());
    }

    @ParameterizedTest @CsvSource({"2000000,UNDETERMINED", "500000,EXCEEDED"})
    void missingDemoTariffReturnsAnIncompleteEstimateWithoutInventingRent(int budget, String status) throws Exception {
        // A new factual venue can exist without a demonstration tariff. Only this disposable test DB is changed.
        var venue = mapper.readValue("""
            {"id":999,"name":"Новая площадка","hall":"Зал","capacity":100,"area":200,"price":null}
            """, Venue.class);
        venues.saveAndFlush(venue);
        var owner = demo();
        mvc.perform(post(path(create(owner, 999L, budget))).session(owner).contentType("application/json").content(FULL))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.quoteComplete").value(false))
            .andExpect(jsonPath("$.totalCost").isEmpty())
            .andExpect(jsonPath("$.venueCharge").isEmpty())
            .andExpect(jsonPath("$.remainingBudget").isEmpty())
            .andExpect(jsonPath("$.knownSubtotal").value(850000))
            .andExpect(jsonPath("$.budgetStatus").value(status))
            .andExpect(jsonPath("$.lines[0].priceSource").value("UNKNOWN"))
            .andExpect(jsonPath("$.lines[0].total").isEmpty());
    }

    private MockHttpSession demo() throws Exception { return session("/api/auth/demo", Map.of()); }
    private MockHttpSession account(String email) throws Exception {
        return session("/api/auth/register", Map.of("name", "Тест", "email", email, "password", "Decorator-test-9876"));
    }
    private MockHttpSession session(String path, Map<String,String> body) throws Exception {
        return (MockHttpSession) mvc.perform(post(path).contentType("application/json").content(mapper.writeValueAsString(body)))
            .andExpect(status().is2xxSuccessful()).andReturn().getRequest().getSession(false);
    }
    private long create(MockHttpSession owner, Long venueId, int budget) throws Exception {
        var body = new LinkedHashMap<String,Object>(Map.of("title","Смета мероприятия","type","CORPORATE",
            "date",LocalDate.now().plusDays(30).toString(),"guests",80,"budget",budget,"strategy","ECONOMY"));
        body.put("venueId", venueId);
        return mapper.readTree(mvc.perform(post("/api/events").session(owner).contentType("application/json")
            .content(mapper.writeValueAsString(body))).andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString()).path("event").path("id").asLong();
    }
    private JsonNode bootstrap(MockHttpSession owner) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/bootstrap").session(owner)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
    }
    private List<?> tables() {
        return entityManager.createNativeQuery(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='PUBLIC' ORDER BY TABLE_NAME").getResultList();
    }
    private String path(long id) { return "/api/events/" + id + "/estimate/preview"; }
}
