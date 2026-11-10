package kz.qonaqai.service;

import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.ServiceCreatorRegistry;
import kz.qonaqai.persistence.EventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ServicePreviewService {
    public record Request(List<ServiceSelection> services) {}
    public record Preview(Long eventId, String catalogVersion, String currency, boolean demoPrices,
                          List<ServiceCostLine> lines, BigDecimal servicesSubtotal) {
        public Preview { lines = List.copyOf(lines); }
    }

    private final EventRepository events;
    private final ServiceCatalog catalog;
    private final ServiceCreatorRegistry creators;

    public ServicePreviewService(EventRepository events, ServiceCatalog catalog, ServiceCreatorRegistry creators) {
        this.events = events;
        this.catalog = catalog;
        this.creators = creators;
    }

    public Preview preview(SessionIdentity identity, Long eventId, Request request) {
        var event = events.findByIdAndOwnerId(eventId, identity.accountId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Мероприятие не найдено"));
        if (request == null || request.services() == null)
            throw new ServiceValidationException("Передайте список services (можно пустой)");
        if (request.services().size() > ServiceType.values().length)
            throw new ServiceValidationException("Можно выбрать каждую услугу только один раз");
        var selected = EnumSet.noneOf(ServiceType.class);
        for (ServiceSelection selection : request.services()) {
            if (selection == null || selection.type() == null)
                throw new ServiceValidationException("Выберите тип услуги");
            if (!selected.add(selection.type()))
                throw new ServiceValidationException("Услуга указана повторно: " + selection.type());
        }
        var context = new PricingContext(event.id(), event.guests(), "KZT");
        var lines = new ArrayList<ServiceCostLine>();
        for (ServiceSelection selection : request.services()) {
            var creator = creators.require(selection.type());
            var product = creator.create(selection, catalog.require(selection.type()), context);
            lines.add(product.costLine());
        }
        BigDecimal subtotal = lines.stream().map(ServiceCostLine::total)
            .reduce(new BigDecimal("0.00"), BigDecimal::add);
        return new Preview(event.id(), catalog.options().catalogVersion(), "KZT", true, lines, subtotal);
    }
}
