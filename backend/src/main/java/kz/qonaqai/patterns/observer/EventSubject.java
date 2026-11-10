package kz.qonaqai.patterns.observer;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class EventSubject {
    private final List<EventObserver> observers;
    public EventSubject(List<EventObserver> observers) { this.observers=List.copyOf(observers); }
    public void publish(EventChanged change) {
        // Explicit Observer implementation; Spring only supplies the subscriber instances.
        observers.forEach(observer -> observer.onEventChanged(change));
    }
}
