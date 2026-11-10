package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.patterns.factory.EventServiceProduct;

public final class DecorationDecorator extends PackageServiceDecorator {
    public DecorationDecorator(EventPackage wrapped, EventServiceProduct product) {
        super(wrapped, product, ServiceType.DECOR);
    }
}
