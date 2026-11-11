package kz.qonaqai.service;

import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.patterns.observer.*;
import kz.qonaqai.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;

@Service
@Transactional
public class EventService {
    private final EventRepository events;
    private final VenueRepository venues;
    private final NotificationRepository notifications;
    private final EventSubject subject;
    private final PackageConfigurationRepository packages;
    private final BookingRepository bookings;
    public EventService(EventRepository events,VenueRepository venues,NotificationRepository notifications,EventSubject subject,PackageConfigurationRepository packages,BookingRepository bookings) {
        this.events=events;this.venues=venues;this.notifications=notifications;this.subject=subject;this.packages=packages;this.bookings=bookings;
    }
    @Transactional(readOnly = true)
    public List<EventPlan> all(SessionIdentity identity) {
        return events.findAllByOwnerIdOrderByUpdatedAtDesc(identity.accountId());
    }

    @Transactional(readOnly = true)
    public List<Notification> notifications(SessionIdentity identity) {
        return notifications.findTop50ByOwnerIdOrderByCreatedAtDesc(identity.accountId());
    }

    public EventPlan save(SessionIdentity identity, Long id, EventDraft draft) {
        EventPlan event = id == null ? null : findOwnedEvent(identity, id);
        if(event!=null && bookings.existsByEventIdAndStatus(id,kz.qonaqai.domain.booking.BookingStatus.CONFIRMED)
                && (!java.util.Objects.equals(event.venueId(),draft.venueId()) || !event.date().equals(draft.date())
                    || event.guests()!=draft.guests() || event.budget().compareTo(draft.budget())!=0 || event.type()!=draft.type()))
            throw new kz.qonaqai.domain.booking.BookingConflictException("EVENT_BOOKED",
                "Сначала отмените бронь, чтобы изменить дату, площадку, тип, гостей или бюджет");
        Venue venue=draft.venueId()==null?null:venues.findById(draft.venueId()).orElseThrow(()->bad("Площадка не найдена"));
        if(venue!=null && venue.capacity()<draft.guests()) throw bad("Площадка не вмещает указанное количество гостей. Выберите другую площадку.");
        if(venue!=null && venue.price()!=null && venue.price().compareTo(draft.budget())>0) throw bad("Цена площадки превышает бюджет мероприятия.");
        if (event == null) event = new EventPlan(draft, venue, identity.accountId());
        else event.update(draft, venue);
        events.saveAndFlush(event);
        subject.publish(new EventChanged(event,id==null));
        return event;
    }
    public void delete(SessionIdentity identity, Long id) {
        var event = findOwnedEvent(identity, id);
        if(bookings.existsByEventIdAndStatus(id,kz.qonaqai.domain.booking.BookingStatus.CONFIRMED))
            throw new kz.qonaqai.domain.booking.BookingConflictException("EVENT_BOOKED","Перед удалением мероприятия отмените бронь");
        bookings.findAllByEventId(id).forEach(kz.qonaqai.domain.booking.Booking::detachDeletedEvent);
        bookings.flush();
        notifications.deleteByEventIdAndOwnerId(id, identity.accountId());
        packages.findByEvent_Id(id).ifPresent(packages::delete);
        events.delete(event);
    }

    private EventPlan findOwnedEvent(SessionIdentity identity, Long id) {
        return events.findOwnedForUpdate(id, identity.accountId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Мероприятие не найдено"));
    }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
