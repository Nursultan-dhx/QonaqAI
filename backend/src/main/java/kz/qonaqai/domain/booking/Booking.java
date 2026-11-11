package kz.qonaqai.domain.booking;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.EventEstimate;

@Entity
@Table(name="booking", indexes={
    @Index(name="ix_booking_venue_interval", columnList="venue_id,status,start_at,end_at"),
    @Index(name="ix_booking_owner", columnList="owner_id,created_at"),
    @Index(name="ix_booking_event", columnList="event_id_snapshot")})
@org.hibernate.annotations.Check(constraints="start_at < end_at and ((status = 'CONFIRMED' and active_event_id is not null and active_event_id = event_id_snapshot) or (status = 'CANCELLED' and active_event_id is null))")
public class Booking {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Version private Long version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="event_id") private EventPlan event;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="estimate_id") private EventEstimate estimate;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="venue_id",nullable=false,updatable=false) private Venue venue;
    // Immutable identifiers and quoted terms survive deletion of a cancelled event and its package.
    @Column(name="event_id_snapshot",nullable=false,updatable=false) private Long eventId;
    @Column(nullable=false,updatable=false) private Long estimateIdSnapshot;
    @Column(nullable=false,updatable=false) private long estimateRevision;
    @Column(nullable=false,updatable=false,length=120) private String eventTitle;
    @Column(name="owner_id",updatable=false) private Long ownerId;
    @Column(name="active_event_id",unique=true) private Long activeEventId;
    @Column(name="start_at",nullable=false,updatable=false) private Instant start;
    @Column(name="end_at",nullable=false,updatable=false) private Instant end;
    @Column(nullable=false,updatable=false,length=40) private String timeZone;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) private BookingStatus status;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    private Instant cancelledAt;
    @Column(nullable=false,updatable=false,precision=16,scale=2) private BigDecimal quotedTotal;
    @Column(nullable=false,updatable=false,length=3) private String currency;
    protected Booking() {}
    public Booking(EventPlan event, Venue venue, EventEstimate estimate, Instant start, Instant end, String zone) {
        this.event=event; this.venue=venue; this.estimate=estimate;
        eventId=event.id(); activeEventId=event.id(); eventTitle=event.title(); ownerId=event.ownerId();
        estimateIdSnapshot=estimate.id(); estimateRevision=estimate.revision();
        quotedTotal=estimate.value().totalCost(); currency=estimate.value().currency();
        this.start=start; this.end=end; timeZone=zone; status=BookingStatus.CONFIRMED;
        createdAt=Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
    public void cancel() {
        if(status==BookingStatus.CANCELLED) return;
        status=BookingStatus.CANCELLED; activeEventId=null;
        cancelledAt=Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
    public void detachDeletedEvent() {
        if(status!=BookingStatus.CANCELLED) throw new IllegalStateException("Confirmed booking cannot lose its event");
        event=null; estimate=null;
    }
    public Long id() { return id; }
    public Long eventId() { return eventId; }
    public String eventTitle() { return eventTitle; }
    public Long venueId() { return venue.id(); }
    public String venueName() { return venue.name(); }
    public Long estimateId() { return estimateIdSnapshot; }
    public long estimateRevision() { return estimateRevision; }
    public Instant start() { return start; }
    public Instant end() { return end; }
    public String timeZone() { return timeZone; }
    public BookingStatus status() { return status; }
    public Instant createdAt() { return createdAt; }
    public Instant cancelledAt() { return cancelledAt; }
    public BigDecimal quotedTotal() { return quotedTotal; }
    public String currency() { return currency; }
}
