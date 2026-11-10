package kz.qonaqai.patterns.decorator;

import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.service.ServiceCatalog;

public abstract class BaseEventPackage implements EventPackage {
    private final PackageDefinition definition;
    private final List<EstimateLine> lines;

    protected BaseEventPackage(PackageDefinition definition, ServiceCatalog services, PackageCode expected) {
        if (definition == null || definition.packageCode() != expected)
            throw new ServiceValidationException("Определение не соответствует выбранному пакету");
        this.definition = definition;
        var items = new ArrayList<EstimateLine>();
        items.add(new EstimateLine("PACKAGE:" + expected, definition.displayName(), EstimateLine.Category.PACKAGE,
            PricingUnit.FIXED, 1, definition.basePrice(), definition.basePrice(), false,
            EstimateLine.PriceSource.DEMO, definition.currency()));
        for (ServiceType type : definition.includedServiceTypes()) {
            var rate = services.require(type);
            items.add(new EstimateLine("SERVICE:" + type, rate.displayName(), EstimateLine.Category.INCLUDED_SERVICE,
                rate.pricingUnit(), 1, new BigDecimal("0.00"), new BigDecimal("0.00"), true,
                EstimateLine.PriceSource.DEMO, definition.currency()));
        }
        lines = List.copyOf(items);
    }

    @Override public final BigDecimal cost() { return definition.basePrice(); }
    @Override public final List<EstimateLine> lines() { return lines; }
    @Override public final Set<ServiceType> includedServiceTypes() {
        return Set.copyOf(definition.includedServiceTypes());
    }
    @Override public final Set<ServiceType> selectedServiceTypes() { return Set.of(); }
}
