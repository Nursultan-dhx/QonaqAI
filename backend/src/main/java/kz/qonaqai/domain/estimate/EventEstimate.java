package kz.qonaqai.domain.estimate;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import kz.qonaqai.domain.PackageCode;
import kz.qonaqai.service.EstimateService;
import org.hibernate.annotations.Immutable;

@Entity @Immutable
@Table(name="event_estimate",uniqueConstraints=@UniqueConstraint(
    name="uk_estimate_configuration_revision",columnNames={"configuration_id","revision"}))
public class EventEstimate {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="configuration_id",nullable=false,updatable=false) private EventPackageConfiguration configuration;
    @Column(nullable=false,updatable=false) private long revision;
    @Column(nullable=false,updatable=false) private Instant createdAt;
    @Embedded private EventInputSnapshot inputs;
    @Column(nullable=false,updatable=false,precision=16,scale=2) private BigDecimal additionalServicesSubtotal;
    @Enumerated(EnumType.STRING) @Column(nullable=false,updatable=false,length=32) private PackageCode packageCode;
    @Column(nullable=false,updatable=false,length=3) private String currency;
    @Column(nullable=false,updatable=false) private boolean quoteComplete;
    @Column(nullable=false,updatable=false) private boolean demoPrices;
    @Column(nullable=false,updatable=false,length=80) private String packageCatalogVersion;
    @Column(nullable=false,updatable=false,length=80) private String serviceCatalogVersion;
    @Column(nullable=false,updatable=false,length=80) private String venueCatalogVersion;
    @Column(nullable=false,updatable=false,precision=16,scale=2) private BigDecimal packageSubtotal;
    @Column(nullable=true,updatable=false,precision=16,scale=2) private BigDecimal venueCharge;
    @Column(nullable=false,updatable=false,precision=16,scale=2) private BigDecimal knownSubtotal;
    @Column(nullable=true,updatable=false,precision=16,scale=2) private BigDecimal totalCost;
    @Column(nullable=true,updatable=false,precision=16,scale=2) private BigDecimal remainingBudget;
    @Column(nullable=true,updatable=false,precision=16,scale=2) private BigDecimal budgetExcess;
    @Column(nullable=true,updatable=false,precision=20,scale=2) private BigDecimal budgetUsedPercent;
    @Enumerated(EnumType.STRING) @Column(nullable=false,updatable=false,length=32) private EstimateService.BudgetStatus budgetStatus;
    @Column(nullable=false,updatable=false,length=80) private String eventInputToken;
    @Column(nullable=false,updatable=false,length=80) private String pricingToken;
    @OneToMany(mappedBy="estimate",cascade=CascadeType.ALL)
    @OrderBy("lineOrder ASC") private List<SavedEstimateLine> lines=new ArrayList<>();
    protected EventEstimate() {}
    public EventEstimate(EventPackageConfiguration configuration,EventInputSnapshot inputs,EstimateService.Estimate q) {
        this.configuration=configuration; this.inputs=inputs;
        configuration.remember(this);
        revision=configuration.revision(); createdAt=configuration.updatedAt();
        packageCode=q.packageCode();
        currency=q.currency();
        quoteComplete=q.quoteComplete();
        demoPrices=q.demoPrices();
        packageCatalogVersion=q.packageCatalogVersion();
        serviceCatalogVersion=q.serviceCatalogVersion();
        venueCatalogVersion=q.venueCatalogVersion();
        packageSubtotal=q.packageSubtotal();
        venueCharge=q.venueCharge();
        knownSubtotal=q.knownSubtotal();
        totalCost=q.totalCost();
        remainingBudget=q.remainingBudget();
        budgetExcess=q.budgetExcess();
        budgetUsedPercent=q.budgetUsedPercent();
        budgetStatus=q.budgetStatus();
        eventInputToken=q.eventInputToken();
        pricingToken=q.pricingToken();

        additionalServicesSubtotal=q.lines().stream().filter(line->line.category()==EstimateLine.Category.ADDITIONAL_SERVICE)
            .map(EstimateLine::total).reduce(new BigDecimal("0.00"),BigDecimal::add);
        for(int i=0;i<q.lines().size();i++) lines.add(new SavedEstimateLine(this,i,q.lines().get(i)));
    }
    public Long id() { return id; }
    public long revision() { return revision; }
    public Instant createdAt() { return createdAt; }
    public EventInputSnapshot inputs() { return inputs; }
    public BigDecimal additionalServicesSubtotal() { return additionalServicesSubtotal; }
    public EstimateService.Estimate value() {
        return new EstimateService.Estimate(configuration.eventId(),inputs.venueId(),packageCode,currency,
            quoteComplete,demoPrices,packageCatalogVersion,serviceCatalogVersion,venueCatalogVersion,
            packageSubtotal,venueCharge,knownSubtotal,totalCost,inputs.budget(),remainingBudget,budgetExcess,
            budgetUsedPercent,budgetStatus,lines.stream().map(SavedEstimateLine::value).toList(),eventInputToken,pricingToken);
    }
}
