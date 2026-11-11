package kz.qonaqai.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** A user-editable document with an immutable reference to the saved quote used to build it. */
@Entity
public class Proposal {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Version private long version;
    @Column(updatable=false) private Long ownerId;
    @Column(nullable=false,updatable=false) private Long eventId;
    @Column(nullable=false,updatable=false) private Long estimateId;
    @Column(nullable=false,updatable=false,length=80) private String sourceToken;
    @Column(nullable=false,updatable=false,precision=16,scale=2) private BigDecimal knownSubtotal;
    @Column(nullable=false,updatable=false) private boolean quoteComplete;
    @Column(nullable=false,length=120) private String title;
    @Column(nullable=false,length=16000) private String body;
    @Column(nullable=false,updatable=false) private Instant createdAt;
    @Column(nullable=false) private Instant updatedAt;
    protected Proposal() {}
    public Proposal(Long ownerId, Long eventId, Long estimateId, String sourceToken,
            BigDecimal knownSubtotal, boolean quoteComplete, String title, String body) {
        this.ownerId=ownerId; this.eventId=eventId; this.estimateId=estimateId; this.sourceToken=sourceToken;
        this.knownSubtotal=knownSubtotal; this.quoteComplete=quoteComplete; this.createdAt=Instant.now().truncatedTo(ChronoUnit.MICROS);
        edit(title,body);
    }
    public void edit(String title, String body) { this.title=title.strip(); this.body=body.strip(); updatedAt=Instant.now().truncatedTo(ChronoUnit.MICROS); }
    public Long id() { return id; }
    public Long eventId() { return eventId; }
    public Long estimateId() { return estimateId; }
    public long version() { return version; }
    public String sourceToken() { return sourceToken; }
    public String title() { return title; }
    public String body() { return body; }
    public BigDecimal knownSubtotal() { return knownSubtotal; }
    public boolean quoteComplete() { return quoteComplete; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }
}
