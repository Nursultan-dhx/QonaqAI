package kz.qonaqai;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import kz.qonaqai.persistence.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:services-test;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
@Transactional
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class, TransactionalTestExecutionListener.class})
class ServicePreviewIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EventRepository events;
    @Autowired NotificationRepository notifications;
    @Autowired VenueRepository venues;
    @Autowired EntityManager entityManager;

    private static final String EXAMPLE = """
        {"services":[{"type":"PHOTOGRAPHY","hours":3},{"type":"CATERING"}]}
        """;

    @Test void publicCatalogShowsFiveTrustedDemoPricesAndVersion() throws Exception {
        mvc.perform(get("/api/service-options")).andExpect(status().isOk())
            .andExpect(jsonPath("$.catalogVersion").value("demo-v1"))
            .andExpect(jsonPath("$.currency").value("KZT"))
            .andExpect(jsonPath("$.demoPrices").value(true))
            .andExpect(jsonPath("$.minHours").value(1))
            .andExpect(jsonPath("$.maxHours").value(12))
            .andExpect(jsonPath("$.services.length()").value(5))
            .andExpect(jsonPath("$.services[0].serviceType").value("HOST"))
            .andExpect(jsonPath("$.services[0].unitPrice").value(70000))
            .andExpect(jsonPath("$.services[0].demoPrice").value(true));
    }

    @Test void savedEventPreviewReturnsExactLinesAndDoesNotWrite() throws Exception {
        var owner = account("preview@example.com");
        long id = create(owner);
        // Compare persisted state on both sides (H2 rounds timestamps to database precision).
        entityManager.flush();
        entityManager.clear();
        var before = bootstrap(owner);
        long eventCount = events.count(), notificationCount = notifications.count();
        var tableNames = tables();
        var response = mvc.perform(post(path(id)).session(owner).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.eventId").value(id))
            .andExpect(jsonPath("$.catalogVersion").value("demo-v1"))
            .andExpect(jsonPath("$.currency").value("KZT"))
            .andExpect(jsonPath("$.demoPrices").value(true))
            .andExpect(jsonPath("$.lines[0].serviceType").value("PHOTOGRAPHY"))
            .andExpect(jsonPath("$.lines[0].quantity").value(3))
            .andExpect(jsonPath("$.lines[0].total").value(75000))
            .andExpect(jsonPath("$.lines[1].quantity").value(50))
            .andExpect(jsonPath("$.lines[1].total").value(400000))
            .andExpect(jsonPath("$.lines[1].demoPrice").value(true))
            .andExpect(jsonPath("$.servicesSubtotal").value(475000))
            .andExpect(jsonPath("$.totalEventCost").doesNotExist())
            .andExpect(jsonPath("$.withinBudget").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        entityManager.flush();
        entityManager.clear();
        assertThat(bootstrap(owner)).isEqualTo(before);
        assertThat(events.count()).isEqualTo(eventCount);
        assertThat(notifications.count()).isEqualTo(notificationCount);
        assertThat(tables()).isEqualTo(tableNames);
        assertThat(venues.findAll()).allMatch(venue -> venue.price() == null);
        System.out.println("SERVICE_PREVIEW_RESPONSE=" + response);
    }

    @Test void cateringUsesUpdatedPersistedGuestCount() throws Exception {
        var owner = demo();
        long id = create(owner);
        var draft = draft();
        draft.put("guests", 60);
        mvc.perform(put("/api/events/" + id).session(owner).contentType("application/json")
            .content(mapper.writeValueAsString(draft))).andExpect(status().isOk());
        mvc.perform(post(path(id)).session(owner).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isOk()).andExpect(jsonPath("$.lines[1].quantity").value(60))
            .andExpect(jsonPath("$.servicesSubtotal").value(555000));
    }

    @ParameterizedTest @ValueSource(strings = {
        "{}",
        "null",
        "{\"services\":null}",
        "{\"services\":[null]}",
        "{\"services\":[{}]}",
        "{\"services\":[{\"type\":null}]}",
        "{\"services\":[{\"type\":\"UNKNOWN\"}]}",
        "{\"services\":[{\"type\":0}]}",
        "{\"services\":[{\"type\":\"HOST\",\"hours\":1}]}",
        "{\"services\":[{\"type\":\"DECOR\",\"hours\":1}]}",
        "{\"services\":[{\"type\":\"CATERING\",\"hours\":1}]}",
        "{\"services\":[{\"type\":\"PHOTOGRAPHY\"}]}",
        "{\"services\":[{\"type\":\"MUSIC\",\"hours\":0}]}",
        "{\"services\":[{\"type\":\"MUSIC\",\"hours\":-1}]}",
        "{\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":13}]}",
        "{\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":1.5}]}",
        "{\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":\"3\"}]}",
        "{\"services\":[{\"type\":\"HOST\"},{\"type\":\"HOST\"}]}",
        "{\"services\":[{\"type\":\"PHOTOGRAPHY\",\"hours\":1,\"unitPrice\":1}]}",
        "{\"services\":[{\"type\":\"CATERING\",\"guestCount\":1}]}",
        "{\"services\":[{\"type\":\"CATERING\",\"quantity\":1}]}",
        "{\"services\":[],\"servicesSubtotal\":1}",
        "{\"services\":[],\"unitPrice\":1}",
        "{\"services\":[]} {}"
    })
    void invalidConfigurationsAndClientPricesAreRejected(String json) throws Exception {
        var owner = demo();
        long id = create(owner);
        mvc.perform(post(path(id)).session(owner).contentType("application/json").content(json))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void authenticationAndAccountOwnershipAreEnforced() throws Exception {
        var owner = account("owner@example.com");
        long id = create(owner);
        mvc.perform(post(path(id)).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isUnauthorized());
        var other = account("other@example.com");
        mvc.perform(post(path(id)).session(other).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isNotFound());
        mvc.perform(post(path(id)).session(demo()).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isNotFound());
        mvc.perform(post(path(999999L)).session(owner).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isNotFound());
    }

    @Test void sharedDemoSessionsShareOnlyNullOwnerEvents() throws Exception {
        var first = demo();
        long id = create(first);
        mvc.perform(post(path(id)).session(demo()).contentType("application/json").content(EXAMPLE))
            .andExpect(status().isOk()).andExpect(jsonPath("$.servicesSubtotal").value(475000));
        mvc.perform(post(path(id)).session(account("private@example.com"))
            .contentType("application/json").content(EXAMPLE)).andExpect(status().isNotFound());
    }

    @Test void emptySelectionIsAReadOnlyZeroPreview() throws Exception {
        var owner = demo();
        mvc.perform(post(path(create(owner))).session(owner).contentType("application/json")
            .content("{\"services\":[]}")).andExpect(status().isOk())
            .andExpect(jsonPath("$.lines.length()").value(0))
            .andExpect(jsonPath("$.servicesSubtotal").value(0));
    }

    private MockHttpSession demo() throws Exception {
        return session("/api/auth/demo", Map.of());
    }

    private MockHttpSession account(String email) throws Exception {
        return session("/api/auth/register", Map.of("name", "Тест", "email", email, "password", "Factory-test-9876"));
    }

    private MockHttpSession session(String path, Map<String, String> body) throws Exception {
        return (MockHttpSession) mvc.perform(post(path).contentType("application/json")
            .content(mapper.writeValueAsString(body))).andExpect(status().is2xxSuccessful())
            .andReturn().getRequest().getSession(false);
    }

    private Map<String, Object> draft() {
        return new LinkedHashMap<>(Map.of("title", "Проверка услуг", "type", "CORPORATE",
            "date", LocalDate.now().plusDays(30).toString(), "guests", 50,
            "budget", 2000000, "description", "", "strategy", "ECONOMY"));
    }

    private long create(MockHttpSession owner) throws Exception {
        return mapper.readTree(mvc.perform(post("/api/events").session(owner).contentType("application/json")
            .content(mapper.writeValueAsString(draft()))).andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString()).path("event").path("id").asLong();
    }

    private JsonNode bootstrap(MockHttpSession owner) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/bootstrap").session(owner)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
    }

    private List<?> tables() {
        return entityManager.createNativeQuery(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='PUBLIC' ORDER BY TABLE_NAME")
            .getResultList();
    }

    private String path(long id) { return "/api/events/" + id + "/services/preview"; }
}
