package kz.qonaqai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class ServiceCatalogTest {
    private final ServiceCatalog catalog = new ServiceCatalog(new ObjectMapper());

    @Test void versionedResourceIsTheSourceOfAllFiveDemoRates() {
        assertThat(catalog.options().catalogVersion()).isEqualTo("demo-v1");
        assertThat(catalog.options().services()).hasSize(5);
        assertThat(catalog.options().services()).allMatch(rate -> rate.demoPrice() && rate.currency().equals("KZT"));
        assertThat(catalog.options().minHours()).isEqualTo(1);
        assertThat(catalog.options().maxHours()).isEqualTo(12);
        assertThat(catalog.require(ServiceType.CATERING).unitPrice()).isEqualTo(new BigDecimal("8000.00"));
        assertThatThrownBy(() -> catalog.options().services().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @ParameterizedTest @ValueSource(strings = {"0", "-1", "-0.01", "1.001"})
    void nonpositiveOrSubcentRatesAreRejected(String price) {
        assertThatThrownBy(() -> new ServiceRate(ServiceType.HOST, "Ведущий", "Демо", PricingUnit.FIXED,
            new BigDecimal(price), "KZT", true)).isInstanceOf(ServiceValidationException.class);
    }

    @Test void wrongPricingUnitIsRejected() {
        assertThatThrownBy(() -> new ServiceRate(ServiceType.HOST, "Ведущий", "Демо", PricingUnit.PER_GUEST,
            BigDecimal.ONE, "KZT", true)).isInstanceOf(ServiceValidationException.class);
    }

    @Test void missingDefinitionAndVersionAreRejected() {
        assertThatThrownBy(() -> new ServiceCatalog((ServiceCatalog.Definition) null))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new ServiceCatalog(new ServiceCatalog.Definition(" ", catalog.options().services())))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void missingServiceDefinitionIsRejected() {
        var rates = catalog.options().services().stream().filter(rate -> rate.serviceType() != ServiceType.MUSIC).toList();
        assertThatThrownBy(() -> new ServiceCatalog(new ServiceCatalog.Definition("demo-test", rates)))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("MUSIC");
    }

    @Test void duplicateServiceDefinitionsAreRejected() {
        var rates = new ArrayList<>(catalog.options().services());
        rates.add(rates.getFirst());
        assertThatThrownBy(() -> new ServiceCatalog(new ServiceCatalog.Definition("demo-test", rates)))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("Повторный тариф");
    }

    @Test void missingRateAndInvalidMetadataAreRejected() {
        assertThatThrownBy(() -> catalog.require(null)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new ServiceRate(null, "Ведущий", "Демо", PricingUnit.FIXED,
            BigDecimal.ONE, "KZT", true)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new ServiceRate(ServiceType.HOST, "", "Демо", PricingUnit.FIXED,
            BigDecimal.ONE, "KZT", true)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new ServiceRate(ServiceType.HOST, "Ведущий", "Демо", PricingUnit.FIXED,
            BigDecimal.ONE, "USD", true)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new ServiceRate(ServiceType.HOST, "Ведущий", "Демо", PricingUnit.FIXED,
            BigDecimal.ONE, "KZT", false)).isInstanceOf(ServiceValidationException.class);
    }
}
