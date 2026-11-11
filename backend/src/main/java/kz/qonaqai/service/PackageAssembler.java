package kz.qonaqai.service;

import java.util.*;
import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.decorator.*;
import kz.qonaqai.patterns.factory.*;
import org.springframework.stereotype.Service;

@Service
public class PackageAssembler {
    private final PackageCatalog packages;
    private final ServiceCatalog services;
    private final ServiceCreatorRegistry creators;

    public PackageAssembler(PackageCatalog packages, ServiceCatalog services, ServiceCreatorRegistry creators) {
        this.packages = packages;
        this.services = services;
        this.creators = creators;
    }

    public EventPackage assemble(PackageCode code, List<ServiceSelection> selections, PricingContext context) {
        var definition = packages.require(code);
        if (selections == null || selections.size() > ServiceType.values().length)
            throw new ServiceValidationException("Передайте список уникальных дополнительных услуг");
        var seen = EnumSet.noneOf(ServiceType.class);
        for (ServiceSelection selection : selections) {
            if (selection == null || selection.type() == null)
                throw new ServiceValidationException("Выберите тип услуги");
            if (!seen.add(selection.type()))
                throw new ServiceValidationException("Услуга указана повторно: " + selection.type());
            if (definition.includedServiceTypes().contains(selection.type()))
                throw new ServiceValidationException("Услуга уже включена в пакет: " + selection.type());
        }
        EventPackage configured = switch (code) {
            case BASIC -> new BasicPackage(definition, services);
            case STANDARD -> new StandardPackage(definition, services);
            case PREMIUM -> new PremiumPackage(definition, services);
        };
        for (ServiceSelection selection : selections.stream().sorted(Comparator.comparing(ServiceSelection::type)).toList()) {
            // Reuse the original Factory Method. This loop assembles wrappers, never sums charges.
            var product = creators.require(selection.type()).create(selection, services.require(selection.type()), context);
            configured = decorate(configured, product);
        }
        return configured;
    }

    private EventPackage decorate(EventPackage wrapped, EventServiceProduct product) {
        return switch (product.type()) {
            case HOST -> new HostDecorator(wrapped, product);
            case PHOTOGRAPHY -> new PhotographerDecorator(wrapped, product);
            case DECOR -> new DecorationDecorator(wrapped, product);
            case MUSIC -> new MusicDecorator(wrapped, product);
            case CATERING -> new CateringDecorator(wrapped, product);
        };
    }
}
