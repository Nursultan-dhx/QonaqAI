package kz.qonaqai.patterns.decorator;

import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.domain.estimate.PackageDefinition;
import kz.qonaqai.service.ServiceCatalog;

public final class BasicPackage extends BaseEventPackage {
    public BasicPackage(PackageDefinition definition, ServiceCatalog services) {
        super(definition, services, PackageCode.BASIC);
    }
}
