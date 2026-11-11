package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.patterns.factory.EventServiceProduct;

public final class HostDecorator extends PackageServiceDecorator {
    public HostDecorator(EventPackage wrapped, EventServiceProduct product) {
        super(wrapped, product, ServiceType.HOST);
    }
}
