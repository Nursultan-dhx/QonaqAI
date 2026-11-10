package kz.qonaqai.service;

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
    public EventService(EventRepository events,VenueRepository venues,NotificationRepository notifications,EventSubject subject) {
        this.events=events;this.venues=venues;this.notifications=notifications;this.subject=subject;
    }
    @Transactional(readOnly=true) public List<EventPlan> all() { return events.findAllByOrderByUpdatedAtDesc(); }
    public EventPlan save(Long id,EventDraft draft) {
        Venue venue=draft.venueId()==null?null:venues.findById(draft.venueId()).orElseThrow(()->bad("Площадка не найдена"));
        if(venue!=null && venue.capacity()<draft.guests()) throw bad("Площадка не вмещает указанное количество гостей. Выберите другую площадку.");
        if(venue!=null && venue.price()!=null && venue.price().compareTo(draft.budget())>0) throw bad("Цена площадки превышает бюджет мероприятия.");
        EventPlan event;
        if(id==null) event=new EventPlan(draft,venue);
        else { event=events.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Мероприятие не найдено"));event.update(draft,venue); }
        events.saveAndFlush(event);
        subject.publish(new EventChanged(event,id==null));
        return event;
    }
    public void delete(Long id) {
        var event=events.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Мероприятие не найдено"));
        notifications.deleteByEventId(id); events.delete(event);
    }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
