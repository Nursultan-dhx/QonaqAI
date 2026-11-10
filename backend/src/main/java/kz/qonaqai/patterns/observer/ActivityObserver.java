package kz.qonaqai.patterns.observer;

import kz.qonaqai.domain.Notification;
import kz.qonaqai.persistence.NotificationRepository;
import org.springframework.stereotype.Component;

@Component
public class ActivityObserver implements EventObserver {
    private final NotificationRepository notifications;
    public ActivityObserver(NotificationRepository notifications) { this.notifications=notifications; }
    @Override public void onEventChanged(EventChanged change) {
        notifications.save(new Notification(change.event().id(),"Мероприятие «"+change.event().title()+"» "+(change.created()?"создано":"изменено")+" и сохранено."));
    }
}
