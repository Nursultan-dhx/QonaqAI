package kz.qonaqai.domain.estimate;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import kz.qonaqai.domain.EventPlan;

@Embeddable
public class EventInputSnapshot {
    @Column(nullable=false, updatable=false) private LocalDate eventDate;
    @Column(nullable=false, updatable=false) private int guestCount;
    @Column(nullable=false, updatable=false) private Long venueIdSnapshot;
    @Column(nullable=false, updatable=false, precision=16, scale=2) private BigDecimal budgetSnapshot;

    protected EventInputSnapshot() {}
    public EventInputSnapshot(LocalDate date, int guests, Long venueId, BigDecimal budget) {
        eventDate=date; guestCount=guests; venueIdSnapshot=venueId; budgetSnapshot=Money.positive(budget);
    }
    public static EventInputSnapshot capture(EventPlan event) {
        return new EventInputSnapshot(event.date(),event.guests(),event.venueId(),event.budget());
    }
    public String token() {
        return EstimateTokens.hash("event-input-v1",String.valueOf(eventDate),String.valueOf(guestCount),
            String.valueOf(venueIdSnapshot),budgetSnapshot.toPlainString());
    }
    public boolean matches(EventPlan event) { return token().equals(capture(event).token()); }
    public Long venueId() { return venueIdSnapshot; }
    public BigDecimal budget() { return budgetSnapshot; }
    public Values values() { return new Values(eventDate,guestCount,venueIdSnapshot,budgetSnapshot); }
    public record Values(LocalDate date,int guests,Long venueId,BigDecimal budget) {}
}
