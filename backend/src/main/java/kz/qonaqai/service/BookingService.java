package kz.qonaqai.service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.booking.*;
import kz.qonaqai.domain.pricing.ServiceValidationException;
import kz.qonaqai.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class BookingService {
    public static final ZoneId ZONE=ZoneId.of("Asia/Almaty");
    public record Request(OffsetDateTime start, OffsetDateTime end, Long estimateId) {}
    public record Availability(Long venueId, Instant start, Instant end, String timeZone, boolean available) {}
    public record View(Long id, Long eventId, String eventTitle, Long venueId, String venueName,
        Instant start, Instant end, String timeZone, BookingStatus status, Long estimateId,
        long estimateRevision, BigDecimal quotedTotal, String currency, Instant createdAt, Instant cancelledAt) {}
    private final EventRepository events;
    private final VenueRepository venues;
    private final BookingRepository bookings;
    private final PackageConfigurationService packages;
    private final EventEstimateRepository estimates;
    private final NotificationRepository notifications;
    public BookingService(EventRepository events, VenueRepository venues, BookingRepository bookings,
            PackageConfigurationService packages, EventEstimateRepository estimates, NotificationRepository notifications) {
        this.events=events; this.venues=venues; this.bookings=bookings; this.packages=packages; this.estimates=estimates;
        this.notifications=notifications;
    }
    @Transactional(readOnly=true)
    public Availability availability(Long venueId, OffsetDateTime start, OffsetDateTime end) {
        validate(start,end);
        if(!venues.existsById(venueId)) throw missing("Площадка не найдена");
        return new Availability(venueId,start.toInstant(),end.toInstant(),ZONE.getId(),
            bookings.countConflicts(venueId,start.toInstant(),end.toInstant())==0);
    }
    public View confirm(SessionIdentity identity, Long eventId, Request request) {
        // Every mutation follows event -> venue. The event lock also serializes package saves and event edits.
        var event=events.findOwnedForUpdate(eventId,identity.accountId()).orElseThrow(()->missing("Мероприятие не найдено"));
        if(request==null) throw invalid("Укажите интервал и сохранённую смету");
        validate(request.start(),request.end());
        if(!request.start().atZoneSameInstant(ZONE).toLocalDate().equals(event.date()))
            throw invalid("Начало бронирования должно совпадать с датой мероприятия в Asia/Almaty");
        if(event.venueId()==null) throw invalid("Сначала сохраните выбранную площадку");
        var saved=packages.load(identity,eventId);
        var quote=saved.currentEstimate();
        if(quote==null || !Objects.equals(quote.estimateId(),request.estimateId())
                || quote.freshness()!=PackageConfigurationService.Freshness.CURRENT || quote.catalogsChanged())
            throw conflict("ESTIMATE_OUTDATED","Сохраните актуальную смету и обновите данные перед бронированием");
        if(!quote.estimate().quoteComplete())
            throw conflict("ESTIMATE_INCOMPLETE","Для бронирования нужна полная сохранённая смета с ценой площадки");
        var venue=venues.findForUpdate(event.venueId()).orElseThrow(()->missing("Площадка не найдена"));
        if(bookings.existsByEventIdAndStatus(eventId,BookingStatus.CONFIRMED))
            throw conflict("EVENT_ALREADY_BOOKED","У мероприятия уже есть подтверждённая бронь");
        var start=request.start().toInstant(); var end=request.end().toInstant();
        if(bookings.countConflicts(venue.id(),start,end)>0)
            throw conflict("VENUE_UNAVAILABLE","Площадка уже занята на выбранное время. Проверьте другой интервал.");
        var estimate=estimates.findById(quote.estimateId()).orElseThrow();
        var booking=bookings.saveAndFlush(new Booking(event,venue,estimate,start,end,ZONE.getId()));
        notifications.save(new kz.qonaqai.domain.Notification(event,"DEMO-бронь площадки «"+venue.name()+"» подтверждена."));
        return view(booking);
    }
    @Transactional(readOnly=true)
    public List<View> history(SessionIdentity identity) {
        return bookings.findAllByOwnerIdOrderByCreatedAtDescIdDesc(identity.accountId()).stream().map(this::view).toList();
    }
    public View cancel(SessionIdentity identity, Long id) {
        // Project routing keys first, without loading a potentially stale Booking entity before obtaining locks.
        var route=bookings.findOwnedRoute(id,identity.accountId()).orElseThrow(()->missing("Бронирование не найдено"));
        var event=events.findOwnedForUpdate(route.getEventId(),identity.accountId());
        if(event.isPresent()) venues.findForUpdate(route.getVenueId()).orElseThrow();
        var booking=bookings.findByIdAndOwnerId(id,identity.accountId()).orElseThrow(()->missing("Бронирование не найдено"));
        if(event.isEmpty() && booking.status()!=BookingStatus.CANCELLED) throw new IllegalStateException("Missing booked event");
        boolean changed=booking.status()!=BookingStatus.CANCELLED;
        booking.cancel();
        bookings.flush();
        if (changed) event.ifPresent(value->notifications.save(new kz.qonaqai.domain.Notification(value,"DEMO-бронь площадки «"+booking.venueName()+"» отменена.")));
        return view(booking);
    }
    private void validate(OffsetDateTime start, OffsetDateTime end) {
        if(start==null || end==null) throw invalid("Укажите начало и конец с явным часовым смещением");
        if(!start.toInstant().isAfter(Instant.now())) throw invalid("Начало бронирования должно быть в будущем");
        if(!end.toInstant().isAfter(start.toInstant())) throw invalid("Конец должен быть позже начала");
        if(Duration.between(start.toInstant(),end.toInstant()).compareTo(Duration.ofHours(24))>0)
            throw invalid("Бронирование не может длиться больше 24 часов");
        if(start.getNano()%1000!=0 || end.getNano()%1000!=0) throw invalid("Точность времени — не более микросекунды");
    }
    private View view(Booking b) {
        return new View(b.id(),b.eventId(),b.eventTitle(),b.venueId(),b.venueName(),b.start(),b.end(),b.timeZone(),
            b.status(),b.estimateId(),b.estimateRevision(),b.quotedTotal(),b.currency(),b.createdAt(),b.cancelledAt());
    }
    private ServiceValidationException invalid(String message) { return new ServiceValidationException(message); }
    private BookingConflictException conflict(String code, String message) { return new BookingConflictException(code,message); }
    private ResponseStatusException missing(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND,message); }
}
