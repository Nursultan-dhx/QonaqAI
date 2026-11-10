package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.domain.estimate.PackageDefinition;
import kz.qonaqai.service.ServiceCatalog;

public final class StandardPackage extends BaseEventPackage {
    public StandardPackage(PackageDefinition definition, ServiceCatalog services) {
        super(definition, services, PackageCode.STANDARD);
    }
}
