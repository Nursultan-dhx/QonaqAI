package kz.qonaqai.patterns.factory.creators;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.EventServiceProduct;
import kz.qonaqai.patterns.factory.ServiceCreator;
import kz.qonaqai.patterns.factory.products.HostService;
import org.springframework.stereotype.Component;

@Component
public final class HostServiceCreator extends ServiceCreator {
    @Override public ServiceType type() { return ServiceType.HOST; }

    @Override protected EventServiceProduct createProduct(
            ServiceSelection selection, ServiceRate rate, PricingContext context) {
        return new HostService(selection, rate, context);
    }
}
