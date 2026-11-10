package kz.qonaqai.patterns.factory.products;

import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;

public final class HostService extends AbstractServiceProduct {
    public HostService(ServiceSelection selection, ServiceRate rate, PricingContext context) {
        super(selection, rate, context, ServiceType.HOST, PricingUnit.FIXED);
        validate();
    }

    @Override protected int quantity() {
        return fixedQuantity();
    }
}
