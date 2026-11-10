package kz.qonaqai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.decorator.EventPackage;
import kz.qonaqai.patterns.factory.*;
import kz.qonaqai.patterns.factory.creators.*;
import kz.qonaqai.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EstimateServiceTest {
    private final EventRepository events = mock(EventRepository.class);
    private final VenueRepository venues = mock(VenueRepository.class);
    private final EventPlan event = mock(EventPlan.class);
    private final ServiceCatalog services = new ServiceCatalog(new ObjectMapper());
    private final PackageCatalog packages = new PackageCatalog(new ObjectMapper(), services);
    private final DemoVenueCatalog venueRates = new DemoVenueCatalog(new ObjectMapper());
    private final ServiceCreatorRegistry creators = new ServiceCreatorRegistry(List.of(new HostServiceCreator(),
        new PhotographerServiceCreator(), new DecorationServiceCreator(), new MusicServiceCreator(), new CateringServiceCreator()));
    private final PackageAssembler assembler = new PackageAssembler(packages, services, creators);
    private final SessionIdentity owner = new SessionIdentity(7L, "Тест");

    @BeforeEach void context() {
        when(event.id()).thenReturn(3L);
        when(event.venueId()).thenReturn(1L);
        when(event.guests()).thenReturn(80);
        when(event.budget()).thenReturn(new BigDecimal("2000000.00"));
        when(events.findByIdAndOwnerId(3L, 7L)).thenReturn(Optional.of(event));
        var venue = mock(Venue.class);
        when(venue.id()).thenReturn(1L);
        when(venue.name()).thenReturn("The Ritz-Carlton, Astana");
        when(venues.findById(1L)).thenReturn(Optional.of(venue));
    }

    @Test void fullRequiredExampleIs1350000And675PercentOfBudget() {
        var result = service(venueRates).preview(owner, 3L, full());
        assertThat(result.packageSubtotal()).isEqualTo(new BigDecimal("850000.00"));
        assertThat(result.venueCharge()).isEqualTo(new BigDecimal("500000.00"));
        assertThat(result.totalCost()).isEqualTo(new BigDecimal("1350000.00"));
        assertThat(result.remainingBudget()).isEqualTo(new BigDecimal("650000.00"));
        assertThat(result.budgetExcess()).isEqualTo(new BigDecimal("0.00"));
        assertThat(result.budgetUsedPercent()).isEqualTo(new BigDecimal("67.50"));
        assertThat(result.budgetStatus()).isEqualTo(EstimateService.BudgetStatus.WITHIN_BUDGET);
        assertThat(result.quoteComplete()).isTrue();
        assertThat(result.lines()).hasSize(6);
        assertThat(sum(result.lines())).isEqualByComparingTo(result.totalCost());
        assertThat(result.lines().stream().filter(line -> line.category() == EstimateLine.Category.VENUE)).hasSize(1);
        assertThat(result.lines()).allMatch(line -> line.priceSource() == EstimateLine.PriceSource.DEMO);
        verify(events, never()).save(any());
    }

    @ParameterizedTest @CsvSource({"STANDARD,145000.00,645000.00,1", "PREMIUM,235000.00,735000.00,2"})
    void includedServicesHaveZeroAdditionalCharge(PackageCode code, String packageCost, String total, int included) {
        var result = service(venueRates).preview(owner, 3L,
            new EstimateService.Request(code, List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY, 2))));
        assertThat(result.packageSubtotal()).isEqualTo(new BigDecimal(packageCost));
        assertThat(result.totalCost()).isEqualTo(new BigDecimal(total));
        assertThat(result.lines().stream().filter(EstimateLine::included)).hasSize(included)
            .allMatch(line -> line.total().signum() == 0);
        assertThat(sum(result.lines())).isEqualByComparingTo(result.totalCost());
    }

    @ParameterizedTest @CsvSource({
        "530000.00,WITHIN_BUDGET,0.00,0.00", "2000000.00,WITHIN_BUDGET,1470000.00,0.00",
        "500000.00,EXCEEDED,0.00,30000.00"})
    void exactLowerAndExceededBudgetAreComparedOnTheServer(String budget, EstimateService.BudgetStatus status, String remaining, String excess) {
        when(event.budget()).thenReturn(new BigDecimal(budget));
        var result = service(venueRates).preview(owner, 3L, basic());
        assertThat(result.budgetStatus()).isEqualTo(status);
        assertThat(result.remainingBudget()).isEqualTo(new BigDecimal(remaining));
        assertThat(result.budgetExcess()).isEqualTo(new BigDecimal(excess));
    }

    @ParameterizedTest @CsvSource({"2000000,UNDETERMINED", "850000,UNDETERMINED", "500000,EXCEEDED"})
    void missingVenueRateKeepsTotalUnknownAndOnlyUsesKnownLowerBound(String budget, EstimateService.BudgetStatus status) {
        when(event.budget()).thenReturn(new BigDecimal(budget));
        var rates = new DemoVenueCatalog(new DemoVenueCatalog.Definition("missing-demo", List.of()));
        var result = service(rates).preview(owner, 3L, full());
        assertThat(result.quoteComplete()).isFalse();
        assertThat(result.totalCost()).isNull();
        assertThat(result.venueCharge()).isNull();
        assertThat(result.remainingBudget()).isNull();
        assertThat(result.budgetUsedPercent()).isNull();
        assertThat(result.knownSubtotal()).isEqualTo(new BigDecimal("850000.00"));
        assertThat(result.budgetStatus()).isEqualTo(status);
        assertThat(result.lines().getFirst().priceSource()).isEqualTo(EstimateLine.PriceSource.UNKNOWN);
        assertThat(result.lines().getFirst().total()).isNull();
        if (status == EstimateService.BudgetStatus.EXCEEDED)
            assertThat(result.budgetExcess()).isEqualTo(new BigDecimal("350000.00"));
        else assertThat(result.budgetExcess()).isNull();
    }

    @Test void changedQuantitiesAndPersistedGuestsChangeTheExistingProductCharges() {
        var first = service(venueRates).preview(owner, 3L, photo(2));
        var second = service(venueRates).preview(owner, 3L, photo(12));
        assertThat(first.totalCost()).isEqualTo(new BigDecimal("580000.00"));
        assertThat(second.totalCost()).isEqualTo(new BigDecimal("830000.00"));
        when(event.guests()).thenReturn(100);
        assertThat(service(venueRates).preview(owner, 3L, full()).totalCost()).isEqualTo(new BigDecimal("1510000.00"));
    }

    @Test void estimateCallsTheOuterComponentForBothCostAndLines() {
        var assembly = mock(PackageAssembler.class);
        var outer = mock(EventPackage.class);
        var lines = List.of(new EstimateLine("PACKAGE:BASIC", "Компонент", EstimateLine.Category.PACKAGE,
            PricingUnit.FIXED, 1, new BigDecimal("123.45"), new BigDecimal("123.45"), false,
            EstimateLine.PriceSource.DEMO, "KZT"));
        when(outer.cost()).thenReturn(new BigDecimal("123.45"));
        when(outer.lines()).thenReturn(lines);
        when(assembly.assemble(eq(PackageCode.BASIC), anyList(), any())).thenReturn(outer);
        var service = new EstimateService(events, venues, assembly, packages, services, venueRates);
        var result = service.preview(owner, 3L, basic());
        assertThat(result.totalCost()).isEqualTo(new BigDecimal("500123.45"));
        assertThat(result.lines()).containsAll(lines);
        verify(outer).cost();
        verify(outer).lines();
    }

    @Test void decimalAmountsRemainExactThroughTheCompleteEstimate() {
        var rates = services.options().services().stream().map(rate -> rate.serviceType() == ServiceType.PHOTOGRAPHY
            ? new ServiceRate(rate.serviceType(), rate.displayName(), rate.description(), rate.pricingUnit(),
                new BigDecimal("0.10"), "KZT", true) : rate).toList();
        var decimalServices = new ServiceCatalog(new ServiceCatalog.Definition("decimal-demo", rates));
        var service = new EstimateService(events, venues, new PackageAssembler(packages, decimalServices, creators),
            packages, decimalServices, venueRates);
        assertThat(service.preview(owner, 3L, photo(3)).totalCost()).isEqualTo(new BigDecimal("530000.30"));
    }

    @Test void missingVenueOrEventAreRejectedWithoutWrites() {
        when(event.venueId()).thenReturn(null);
        assertThatThrownBy(() -> service(venueRates).preview(owner, 3L, basic()))
            .isInstanceOf(ServiceValidationException.class).hasMessageContaining("площадку");
        assertThatThrownBy(() -> service(venueRates).preview(new SessionIdentity(8L, "Чужой"), 3L, basic()))
            .isInstanceOf(ResponseStatusException.class);
        verify(events, never()).save(any());
    }

    private EstimateService service(DemoVenueCatalog rates) {
        return new EstimateService(events, venues, assembler, packages, services, rates);
    }
    private EstimateService.Request basic() { return new EstimateService.Request(PackageCode.BASIC, List.of()); }
    private EstimateService.Request photo(int hours) {
        return new EstimateService.Request(PackageCode.BASIC, List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY, hours)));
    }
    private EstimateService.Request full() {
        return new EstimateService.Request(PackageCode.BASIC, List.of(new ServiceSelection(ServiceType.HOST, null),
            new ServiceSelection(ServiceType.PHOTOGRAPHY, 2), new ServiceSelection(ServiceType.MUSIC, 3),
            new ServiceSelection(ServiceType.CATERING, null)));
    }
    private BigDecimal sum(List<EstimateLine> lines) {
        return lines.stream().map(EstimateLine::total).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
