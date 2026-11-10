package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.patterns.factory.EventServiceProduct;

public final class CateringDecorator extends PackageServiceDecorator {
    public CateringDecorator(EventPackage wrapped, EventServiceProduct product) {
        super(wrapped, product, ServiceType.CATERING);
    }
}
