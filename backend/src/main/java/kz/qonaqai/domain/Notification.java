package kz.qonaqai.domain;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@JsonAutoDetect(fieldVisibility=JsonAutoDetect.Visibility.ANY)
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private Long eventId;
    @Column(updatable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore private Long ownerId;
    @Column(length=1000) private String message;
    private Instant createdAt;
    protected Notification() {}
    public Notification(EventPlan event, String message) {
        this.eventId = event.id();
        this.ownerId = event.ownerId();
        this.message = message;
        this.createdAt = Instant.now();
    }
}
