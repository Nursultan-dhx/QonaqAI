package kz.qonaqai.domain;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@JsonAutoDetect(fieldVisibility=JsonAutoDetect.Visibility.ANY)
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private Long eventId;
    @Column(length=1000) private String message;
    private Instant createdAt;
    protected Notification() {}
    public Notification(Long eventId, String message) {
        this.eventId=eventId; this.message=message; createdAt=Instant.now();
    }
}
