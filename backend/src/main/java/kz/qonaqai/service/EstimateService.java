package kz.qonaqai.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class EstimateService {
    public enum BudgetStatus { WITHIN_BUDGET, EXCEEDED, UNDETERMINED }
    public record Request(PackageCode packageCode, List<ServiceSelection> services) {}
    public record Estimate(Long eventId, Long venueId, PackageCode packageCode, String currency,
                           boolean quoteComplete, boolean demoPrices, String packageCatalogVersion,
                           String serviceCatalogVersion, String venueCatalogVersion,
                           BigDecimal packageSubtotal, BigDecimal venueCharge, BigDecimal knownSubtotal,
                           BigDecimal totalCost, BigDecimal eventBudget, BigDecimal remainingBudget,
                           BigDecimal budgetExcess, BigDecimal budgetUsedPercent, BudgetStatus budgetStatus,
                           List<EstimateLine> lines) {
        public Estimate { lines = List.copyOf(lines); }
    }

    private final EventRepository events;
    private final VenueRepository venues;
    private final PackageAssembler assembler;
    private final PackageCatalog packages;
    private final ServiceCatalog services;
    private final DemoVenueCatalog venueRates;

    public EstimateService(EventRepository events, VenueRepository venues, PackageAssembler assembler,
                           PackageCatalog packages, ServiceCatalog services, DemoVenueCatalog venueRates) {
        this.events = events;
        this.venues = venues;
        this.assembler = assembler;
        this.packages = packages;
        this.services = services;
        this.venueRates = venueRates;
    }

    public Estimate preview(SessionIdentity identity, Long eventId, Request request) {
        var event = events.findByIdAndOwnerId(eventId, identity.accountId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Мероприятие не найдено"));
        if (event.venueId() == null)
            throw new ServiceValidationException("Сначала выберите и сохраните площадку мероприятия");
        if (request == null) throw new ServiceValidationException("Передайте пакет и список услуг");
        var venue = venues.findById(event.venueId())
            .orElseThrow(() -> new ServiceValidationException("Выбранная площадка не найдена"));
        var configured = assembler.assemble(request.packageCode(), request.services(),
            new PricingContext(event.id(), event.guests(), "KZT"));

        // The outer Decorator is authoritative for both package charges and itemized lines.
        BigDecimal packageSubtotal = Money.amount(configured.cost());
        var packageLines = configured.lines();
        var rate = venueRates.find(venue.id());
        BigDecimal venueCharge = rate.map(DemoVenueRate::price).orElse(null);
        var lines = new ArrayList<EstimateLine>();
        lines.add(new EstimateLine("VENUE:" + venue.id(), rate.map(DemoVenueRate::displayLabel).orElse(venue.name() + " — аренда"),
            EstimateLine.Category.VENUE, PricingUnit.FIXED, 1, venueCharge, venueCharge, false,
            rate.isPresent() ? EstimateLine.PriceSource.DEMO : EstimateLine.PriceSource.UNKNOWN, "KZT"));
        lines.addAll(packageLines);
        boolean complete = rate.isPresent();
        BigDecimal knownSubtotal = Money.amount(packageSubtotal.add(complete ? venueCharge : BigDecimal.ZERO));
        BigDecimal budget = Money.positive(event.budget());
        boolean exceeded = knownSubtotal.compareTo(budget) > 0;
        BudgetStatus status = exceeded ? BudgetStatus.EXCEEDED
            : complete ? BudgetStatus.WITHIN_BUDGET : BudgetStatus.UNDETERMINED;
        BigDecimal remaining = complete ? Money.amount(budget.subtract(knownSubtotal).max(BigDecimal.ZERO)) : null;
        BigDecimal excess = exceeded ? Money.amount(knownSubtotal.subtract(budget))
            : complete ? new BigDecimal("0.00") : null;
        BigDecimal percent = complete ? knownSubtotal.multiply(new BigDecimal("100"))
            .divide(budget, 2, RoundingMode.HALF_UP) : null;
        return new Estimate(event.id(), venue.id(), request.packageCode(), "KZT", complete, true,
            packages.options().catalogVersion(), services.options().catalogVersion(), venueRates.catalogVersion(),
            packageSubtotal, venueCharge, knownSubtotal, complete ? knownSubtotal : null,
            budget, remaining, excess, percent, status, lines);
    }
}
