package kz.qonaqai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.decorator.HostDecorator;
import kz.qonaqai.patterns.factory.creators.HostServiceCreator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class EstimateCatalogTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final ServiceCatalog services = new ServiceCatalog(mapper);
    private final PackageCatalog packages = new PackageCatalog(mapper, services);

    @Test void demoVenueRatesCoverTheActualStableIdsAndRitzPrice() throws Exception {
        var rates = new DemoVenueCatalog(mapper);
        try (var source = getClass().getResourceAsStream("/catalog.json")) {
            for (var venue : mapper.readTree(source)) {
                assertThat(rates.find(venue.path("id").asLong())).isPresent();
                assertThat(venue.path("price").isNull()).isTrue();
            }
        }
        assertThat(rates.find(1L).orElseThrow().price()).isEqualTo(new BigDecimal("500000.00"));
        assertThat(rates.find(999L)).isEmpty();
        assertThat(rates.catalogVersion()).isEqualTo("demo-venues-v1");
    }

    @Test void catalogsRequireVersionAndDefinitionLists() {
        assertThatThrownBy(() -> new PackageCatalog((PackageCatalog.Definition) null, services))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new PackageCatalog(new PackageCatalog.Definition("", List.of()), services))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new DemoVenueCatalog((DemoVenueCatalog.Definition) null))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new DemoVenueCatalog(new DemoVenueCatalog.Definition("demo", null)))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void packageCatalogRejectsMissingAndDuplicateCodes() {
        assertThatThrownBy(() -> new PackageCatalog(new PackageCatalog.Definition("demo", List.of(packages.require(PackageCode.BASIC))), services))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("отсутствуют");
        var items = new ArrayList<>(packages.options().packages());
        items.add(items.getFirst());
        assertThatThrownBy(() -> new PackageCatalog(new PackageCatalog.Definition("demo", items), services))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("повторное");
    }

    @Test void packageDefinitionsRejectInconsistentInclusionsAndCurrency() {
        assertThatThrownBy(() -> definition(List.of(ServiceType.DECOR, ServiceType.DECOR), "KZT", true))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> definition(List.of(ServiceType.PHOTOGRAPHY), "KZT", true))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> definition(Arrays.asList((ServiceType) null), "KZT", true))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> definition(List.of(), "USD", true)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> definition(List.of(), "KZT", false)).isInstanceOf(ServiceValidationException.class);
    }

    @ParameterizedTest @ValueSource(strings = {"-1", "0", "1.001", "100000000000000.00"})
    void invalidVenueAndPackageRatesAreRejected(String value) {
        var amount = new BigDecimal(value);
        assertThatThrownBy(() -> rate(1L, amount, "KZT", EstimateLine.PriceSource.DEMO))
            .isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new PackageDefinition(PackageCode.BASIC, "Базовый", "Демо", amount, List.of(), "KZT", true))
            .isInstanceOf(ServiceValidationException.class);
    }

    @Test void demoVenueRatesRejectDuplicatesInvalidIdsCurrencySourceAndMissingPrice() {
        var rate = rate(1L, BigDecimal.ONE, "KZT", EstimateLine.PriceSource.DEMO);
        assertThatThrownBy(() -> new DemoVenueCatalog(new DemoVenueCatalog.Definition("demo", List.of(rate, rate))))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("повторный");
        assertThatThrownBy(() -> rate(null, BigDecimal.ONE, "KZT", EstimateLine.PriceSource.DEMO)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> rate(1L, null, "KZT", EstimateLine.PriceSource.DEMO)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> rate(1L, BigDecimal.ONE, "USD", EstimateLine.PriceSource.DEMO)).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> rate(1L, BigDecimal.ONE, "KZT", EstimateLine.PriceSource.UNKNOWN)).isInstanceOf(ServiceValidationException.class);
    }

    @Test void decoratorRejectsAggregateOverflowEvenIfEachRateIsValid() {
        var maximum = new PackageDefinition(PackageCode.BASIC, "Базовый", "Демо",
            new BigDecimal("99999999999999.99"), List.of(), "KZT", true);
        var base = new kz.qonaqai.patterns.decorator.BasicPackage(maximum, services);
        var host = new HostServiceCreator().create(new ServiceSelection(ServiceType.HOST, null),
            services.require(ServiceType.HOST), new PricingContext(3L, 80, "KZT"));
        assertThatThrownBy(() -> new HostDecorator(base, host).cost()).isInstanceOf(ServiceValidationException.class);
    }

    @Test void lineContractRejectsFalseTotalsAndFalseIncludedCharges() {
        assertThatThrownBy(() -> new EstimateLine("TEST", "Тест", EstimateLine.Category.ADDITIONAL_SERVICE,
            PricingUnit.PER_HOUR, 2, new BigDecimal("1.00"), new BigDecimal("1.00"), false,
            EstimateLine.PriceSource.DEMO, "KZT")).isInstanceOf(ServiceValidationException.class);
        assertThatThrownBy(() -> new EstimateLine("TEST", "Тест", EstimateLine.Category.INCLUDED_SERVICE,
            PricingUnit.FIXED, 1, BigDecimal.ONE, BigDecimal.ONE, true,
            EstimateLine.PriceSource.DEMO, "KZT")).isInstanceOf(ServiceValidationException.class);
    }

    private PackageDefinition definition(List<ServiceType> included, String currency, boolean demo) {
        return new PackageDefinition(PackageCode.BASIC, "Базовый", "Демо", BigDecimal.ONE, included, currency, demo);
    }
    private DemoVenueRate rate(Long id, BigDecimal price, String currency, EstimateLine.PriceSource source) {
        return new DemoVenueRate(id, price, currency, source, "Учебная аренда");
    }
}
