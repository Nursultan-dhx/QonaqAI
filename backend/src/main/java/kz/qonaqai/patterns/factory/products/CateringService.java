package kz.qonaqai.patterns.factory.products;

import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;

public final class CateringService extends AbstractServiceProduct {
    public CateringService(ServiceSelection selection, ServiceRate rate, PricingContext context) {
        super(selection, rate, context, ServiceType.CATERING, PricingUnit.PER_GUEST);
        validate();
    }

    @Override protected int quantity() {
        requireNoHours();
        return context.guestCount();
    }
}
