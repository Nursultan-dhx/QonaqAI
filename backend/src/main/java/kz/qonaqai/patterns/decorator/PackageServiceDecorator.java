package kz.qonaqai.patterns.decorator;

import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.patterns.factory.EventServiceProduct;

/** Structural Decorator: the wrapped component owns previous charges and lines. */
public abstract class PackageServiceDecorator implements EventPackage {
    protected final EventPackage wrapped;
    protected final EventServiceProduct product;

    protected PackageServiceDecorator(EventPackage wrapped, EventServiceProduct product, ServiceType supported) {
        if (wrapped == null || product == null || product.type() != supported)
            throw new ServiceValidationException("Декоратор не поддерживает этот продукт");
        product.validate();
        if (wrapped.includedServiceTypes().contains(supported))
            throw new ServiceValidationException("Услуга уже включена в пакет: " + supported);
        if (wrapped.selectedServiceTypes().contains(supported))
            throw new ServiceValidationException("Услуга указана повторно: " + supported);
        this.wrapped = wrapped;
        this.product = product;
    }

    @Override public final BigDecimal cost() {
        return Money.amount(wrapped.cost().add(product.cost()));
    }

    @Override public final List<EstimateLine> lines() {
        var lines = new ArrayList<>(wrapped.lines());
        lines.add(EstimateLine.additional(product.costLine()));
        return List.copyOf(lines);
    }

    @Override public final Set<ServiceType> includedServiceTypes() { return wrapped.includedServiceTypes(); }

    @Override public final Set<ServiceType> selectedServiceTypes() {
        var selected = EnumSet.noneOf(ServiceType.class);
        selected.addAll(wrapped.selectedServiceTypes());
        selected.add(product.type());
        return Set.copyOf(selected);
    }
}
