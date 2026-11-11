package kz.qonaqai.patterns.factory.creators;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.EventServiceProduct;
import kz.qonaqai.patterns.factory.ServiceCreator;
import kz.qonaqai.patterns.factory.products.DecorationService;
import org.springframework.stereotype.Component;

@Component
public final class DecorationServiceCreator extends ServiceCreator {
    @Override public ServiceType type() { return ServiceType.DECOR; }

    @Override protected EventServiceProduct createProduct(
            ServiceSelection selection, ServiceRate rate, PricingContext context) {
        return new DecorationService(selection, rate, context);
    }
}
