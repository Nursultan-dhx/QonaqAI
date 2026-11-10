package kz.qonaqai.patterns.factory.products;

import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;

public final class PhotographerService extends AbstractServiceProduct {
    public PhotographerService(ServiceSelection selection, ServiceRate rate, PricingContext context) {
        super(selection, rate, context, ServiceType.PHOTOGRAPHY, PricingUnit.PER_HOUR);
        validate();
    }

    @Override protected int quantity() {
        return hourlyQuantity();
    }
}
