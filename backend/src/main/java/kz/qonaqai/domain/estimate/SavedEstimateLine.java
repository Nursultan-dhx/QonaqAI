package kz.qonaqai.domain.estimate;

import jakarta.persistence.*;
import java.math.BigDecimal;
import kz.qonaqai.domain.PricingUnit;
import org.hibernate.annotations.Immutable;

@Entity @Immutable
@Table(name="estimate_line_snapshot",uniqueConstraints={
    @UniqueConstraint(name="uk_estimate_line_order",columnNames={"estimate_id","line_order"}),
    @UniqueConstraint(name="uk_estimate_line_code",columnNames={"estimate_id","code"})})
public class SavedEstimateLine {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="estimate_id",nullable=false,updatable=false) private EventEstimate estimate;
    @Column(name="line_order",nullable=false,updatable=false) private int lineOrder;
    @Column(nullable=false,updatable=false,length=80) private String code;
    @Column(nullable=false,updatable=false,length=300) private String displayName;
    @Enumerated(EnumType.STRING) @Column(nullable=false,updatable=false,length=32) private EstimateLine.Category category;
    @Enumerated(EnumType.STRING) @Column(nullable=false,updatable=false,length=32) private PricingUnit pricingUnit;
    @Column(nullable=false,updatable=false) private int quantity;
    @Column(updatable=false,precision=16,scale=2) private BigDecimal unitPrice;
    @Column(updatable=false,precision=16,scale=2) private BigDecimal total;
    @Column(nullable=false,updatable=false) private boolean included;
    @Enumerated(EnumType.STRING) @Column(nullable=false,updatable=false,length=32) private EstimateLine.PriceSource priceSource;
    @Column(nullable=false,updatable=false,length=3) private String currency;
    protected SavedEstimateLine() {}
    public SavedEstimateLine(EventEstimate owner,int order,EstimateLine line) {
        estimate=owner; lineOrder=order; code=line.code(); displayName=line.displayName(); category=line.category();
        pricingUnit=line.pricingUnit(); quantity=line.quantity(); unitPrice=line.unitPrice(); total=line.total();
        included=line.included(); priceSource=line.priceSource(); currency=line.currency();
    }
    public EstimateLine value() {
        return new EstimateLine(code,displayName,category,pricingUnit,quantity,unitPrice,total,included,priceSource,currency);
    }
}
