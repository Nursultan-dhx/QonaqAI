package kz.qonaqai.service;

import java.time.Instant;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional
public class PackageConfigurationService {
    public record SaveRequest(PackageCode packageCode,Long expectedConfigurationVersion,
                              String packageCatalogVersion,String serviceCatalogVersion,String venueCatalogVersion,
                              String expectedEventInputToken,String expectedPricingToken,List<ServiceSelection> services) {}
    public enum Freshness { CURRENT, OUTDATED }
    public record SavedQuote(Long estimateId,long revision,Instant createdAt,Freshness freshness,boolean catalogsChanged,
                             EventInputSnapshot.Values eventInputs,java.math.BigDecimal additionalServicesSubtotal,
                             EstimateService.Estimate estimate) {}
    public record SavedPackage(Long eventId,boolean configured,Long configurationId,Long configurationVersion,
                               PackageCode packageCode,List<ServiceSelection> services,Instant savedAt,
                               String currentEventInputToken,EventInputSnapshot.Values currentEventInputs,SavedQuote currentEstimate) {
        public SavedPackage { services=List.copyOf(services); }
    }
    private final EventRepository events;
    private final BookingRepository bookings;
    private final PackageConfigurationRepository configurations;
    private final EventEstimateRepository snapshots;
    private final EstimateService estimates;
    private final PackageCatalog packages;
    private final ServiceCatalog services;
    private final DemoVenueCatalog venueRates;
    public PackageConfigurationService(EventRepository events,PackageConfigurationRepository configurations,
            EventEstimateRepository snapshots,EstimateService estimates,PackageCatalog packages,
            ServiceCatalog services,DemoVenueCatalog venueRates,BookingRepository bookings) {
        this.bookings=bookings; this.events=events; this.configurations=configurations; this.snapshots=snapshots;
        this.estimates=estimates; this.packages=packages; this.services=services; this.venueRates=venueRates;
    }
    public SavedPackage load(SessionIdentity identity,Long eventId) {
        var event=owned(identity,eventId);
        var configuration=configurations.findByEvent_Id(eventId);
        if(configuration.isEmpty())
            return new SavedPackage(eventId,false,null,null,null,List.of(),null,EventInputSnapshot.capture(event).token(),EventInputSnapshot.capture(event).values(),null);
        return response(event,configuration.get(),latest(configuration.get()));
    }
    public SavedPackage save(SessionIdentity identity,Long eventId,SaveRequest request) {
        var event=owned(identity,eventId);
        if(bookings.existsByEventIdAndStatus(eventId,kz.qonaqai.domain.booking.BookingStatus.CONFIRMED))
            throw new kz.qonaqai.domain.booking.BookingConflictException("EVENT_BOOKED","Перед изменением пакета или сметы отмените бронь");
        if(request==null || request.packageCode()==null || request.services()==null)
            throw new ServiceValidationException("Передайте пакет и список услуг");
        if(request.expectedConfigurationVersion()!=null && request.expectedConfigurationVersion()<0)
            throw new ServiceValidationException("Версия конфигурации не может быть отрицательной");
        if(request.packageCatalogVersion()==null || request.serviceCatalogVersion()==null || request.venueCatalogVersion()==null
                || request.expectedEventInputToken()==null || request.expectedPricingToken()==null)
            throw new ServiceValidationException("Сначала выполните актуальный предварительный расчёт");
        var configuration=configurations.findByEvent_Id(eventId).orElseGet(()->new EventPackageConfiguration(event));
        configuration.requireVersion(request.expectedConfigurationVersion());
        if(!packages.options().catalogVersion().equals(request.packageCatalogVersion())
                || !services.options().catalogVersion().equals(request.serviceCatalogVersion())
                || !venueRates.catalogVersion().equals(request.venueCatalogVersion()))
            throw new PackageConflictException("CATALOG_CHANGED","Тарифы изменились. Пересчитайте смету.");
        if(!EventInputSnapshot.capture(event).token().equals(request.expectedEventInputToken()))
            throw new PackageConflictException("EVENT_CHANGED","Параметры мероприятия изменились. Пересчитайте смету.");
        // Reuse the existing calculator inside this write transaction, under the event lock.
        var quote=estimates.preview(identity,eventId,new EstimateService.Request(request.packageCode(),request.services()));
        if(!quote.pricingToken().equals(request.expectedPricingToken()))
            throw new PackageConflictException("PRICING_CHANGED","Конфигурация или тарифы изменились. Пересчитайте смету.");
        configuration.replace(request.packageCode(),request.services(),Set.copyOf(packages.require(request.packageCode()).includedServiceTypes()));
        configurations.saveAndFlush(configuration);
        var snapshot=new EventEstimate(configuration,EventInputSnapshot.capture(event),quote);
        snapshots.saveAndFlush(snapshot);
        return response(event,configuration,snapshot);
    }
    public List<SavedQuote> history(SessionIdentity identity,Long eventId) {
        var event=owned(identity,eventId);
        return configurations.findByEvent_Id(eventId).map(configuration->
            snapshots.findAllByConfiguration_IdOrderByRevisionDesc(configuration.id()).stream()
                .map(snapshot->view(event,snapshot)).toList()).orElseGet(List::of);
    }
    private kz.qonaqai.domain.EventPlan owned(SessionIdentity identity,Long eventId) {
        return events.findOwnedForUpdate(eventId,identity.accountId())
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Мероприятие не найдено"));
    }
    private EventEstimate latest(EventPackageConfiguration configuration) {
        return snapshots.findFirstByConfiguration_IdOrderByRevisionDesc(configuration.id())
            .orElseThrow(()->new IllegalStateException("Missing saved estimate"));
    }
    private SavedPackage response(kz.qonaqai.domain.EventPlan event,EventPackageConfiguration configuration,EventEstimate snapshot) {
        return new SavedPackage(event.id(),true,configuration.id(),configuration.version(),configuration.packageCode(),
            configuration.selections(),configuration.updatedAt(),EventInputSnapshot.capture(event).token(),EventInputSnapshot.capture(event).values(),view(event,snapshot));
    }
    private SavedQuote view(kz.qonaqai.domain.EventPlan event,EventEstimate snapshot) {
        var quote=snapshot.value(); // No Factory Method/Decorator calculation on GET.
        boolean changed=!quote.packageCatalogVersion().equals(packages.options().catalogVersion())
            || !quote.serviceCatalogVersion().equals(services.options().catalogVersion())
            || !quote.venueCatalogVersion().equals(venueRates.catalogVersion());
        return new SavedQuote(snapshot.id(),snapshot.revision(),snapshot.createdAt(),
            snapshot.inputs().matches(event)?Freshness.CURRENT:Freshness.OUTDATED,changed,
            snapshot.inputs().values(),snapshot.additionalServicesSubtotal(),quote);
    }
}
