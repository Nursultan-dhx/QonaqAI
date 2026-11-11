package kz.qonaqai.patterns.factory.products;

import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;

public final class DecorationService extends AbstractServiceProduct {
    public DecorationService(ServiceSelection selection, ServiceRate rate, PricingContext context) {
        super(selection, rate, context, ServiceType.DECOR, PricingUnit.FIXED);
        validate();
    }

    @Override protected int quantity() {
        return fixedQuantity();
    }
}
