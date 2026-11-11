package kz.qonaqai.domain.estimate;

import jakarta.persistence.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;

@Entity
@Table(name="event_service_selection", uniqueConstraints=@UniqueConstraint(
    name="uk_selection_configuration_type",columnNames={"configuration_id","service_type"}))
public class EventServiceSelection {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="configuration_id",nullable=false)
    private EventPackageConfiguration configuration;
    @Enumerated(EnumType.STRING) @Column(name="service_type",nullable=false,updatable=false,length=32)
    private ServiceType serviceType;
    private Integer hours;
    protected EventServiceSelection() {}

    public EventServiceSelection(EventPackageConfiguration owner,ServiceSelection selection) {
        configuration=owner; serviceType=selection.type(); update(selection);
    }
    public void update(ServiceSelection selection) {
        if (selection==null || selection.type()==null || selection.type()!=serviceType)
            throw new ServiceValidationException("Некорректный тип сохранённой услуги");
        Integer value=selection.hours();
        if (serviceType.pricingUnit()==PricingUnit.PER_HOUR) {
            if (value==null || value<ServiceSelection.MIN_HOURS || value>ServiceSelection.MAX_HOURS)
                throw new ServiceValidationException("Часы услуги должны быть от 1 до 12");
        } else if(value!=null) throw new ServiceValidationException("Эта услуга не принимает часы");
        hours=value;
    }
    public ServiceSelection selection() { return new ServiceSelection(serviceType,hours); }
}
