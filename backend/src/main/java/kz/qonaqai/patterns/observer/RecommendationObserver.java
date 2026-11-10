package kz.qonaqai.patterns.observer;

import kz.qonaqai.domain.Notification;
import kz.qonaqai.persistence.NotificationRepository;
import kz.qonaqai.service.VenueService;
import org.springframework.stereotype.Component;

@Component
public class RecommendationObserver implements EventObserver {
    private final VenueService venues;
    private final NotificationRepository notifications;
    public RecommendationObserver(VenueService venues,NotificationRepository notifications) {
        this.venues=venues; this.notifications=notifications;
    }
    @Override public void onEventChanged(EventChanged change) {
        var event=change.event();
        int count=venues.find("",event.guests(),event.strategy(),event.budget()).size();
        notifications.save(new Notification(event.id(),"Подбор для «"+event.title()+"» обновлён. Подходящих площадок: "+count+". Цены уточняются у площадки."));
    }
}
