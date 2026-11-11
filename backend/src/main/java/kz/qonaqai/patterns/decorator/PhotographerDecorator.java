package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.patterns.factory.EventServiceProduct;

public final class PhotographerDecorator extends PackageServiceDecorator {
    public PhotographerDecorator(EventPackage wrapped, EventServiceProduct product) {
        super(wrapped, product, ServiceType.PHOTOGRAPHY);
    }
}
