package kz.qonaqai.domain;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class EventPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String title;
    @Enumerated(EnumType.STRING) private EventType type;
    private LocalDate date;
    private int guests;
    @Column(precision = 16, scale = 2) private BigDecimal budget;
    @Column(length = 2000) private String description;
    @Enumerated(EnumType.STRING) private StrategyId strategy;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="venue_id")
    @com.fasterxml.jackson.annotation.JsonIgnore private Venue venue;
    private Instant updatedAt;
    protected EventPlan() {}
    public EventPlan(EventDraft request, Venue venue) { update(request, venue); }
    public void update(EventDraft request, Venue venue) {
        title = request.title().strip(); type = request.type(); date = request.date();
        guests = request.guests(); budget = request.budget();
        description = request.description() == null ? "" : request.description().strip();
        strategy = request.strategy(); this.venue = venue; updatedAt = Instant.now();
    }
    @com.fasterxml.jackson.annotation.JsonProperty("venueId")
    public Long venueId() { return venue == null ? null : venue.id(); }
    public Long id() { return id; }
    public String title() { return title; }
    public int guests() { return guests; }
    public BigDecimal budget() { return budget; }
    public StrategyId strategy() { return strategy; }
}
