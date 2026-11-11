package kz.qonaqai.domain.estimate;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.*;

@Entity
@Table(name="event_package_configuration",uniqueConstraints=@UniqueConstraint(
    name="uk_package_configuration_event",columnNames="event_id"))
public class EventPackageConfiguration {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="event_id",nullable=false,updatable=false)
    private EventPlan event;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=32) private PackageCode packageCode;
    @Version @Column(nullable=false) private Long version;
    @Column(nullable=false) private long revision;
    @Column(nullable=false) private Instant updatedAt;
    @OneToMany(mappedBy="configuration",cascade=CascadeType.ALL,orphanRemoval=true)
    private List<EventServiceSelection> selections=new ArrayList<>();
    @org.hibernate.annotations.OptimisticLock(excluded=true)
    @OneToMany(mappedBy="configuration",cascade=CascadeType.REMOVE)
    private List<EventEstimate> estimates=new ArrayList<>();

    protected EventPackageConfiguration() {}
    public EventPackageConfiguration(EventPlan event) { this.event=Objects.requireNonNull(event); }
    public void requireVersion(Long expected) {
        if (!Objects.equals(version,expected))
            throw new PackageConflictException("CONFIGURATION_CONFLICT",
                "Конфигурация была изменена в другой вкладке. Обновите данные.");
    }
    public void replace(PackageCode code,List<ServiceSelection> requested,Set<ServiceType> included) {
        if(code==null || requested==null) throw new ServiceValidationException("Нужны пакет и список услуг");
        var unique=new EnumMap<ServiceType,ServiceSelection>(ServiceType.class);
        for(var selection:requested) {
            if(selection==null || selection.type()==null)
                throw new ServiceValidationException("Выберите тип услуги");
            if(unique.putIfAbsent(selection.type(),selection)!=null)
                throw new ServiceValidationException("Услуга указана повторно");
            if(included.contains(selection.type())) throw new ServiceValidationException("Услуга уже включена в пакет");
            new EventServiceSelection(this,selection); // validate before mutating the persistent collection
        }
        selections.removeIf(item->!unique.containsKey(item.selection().type()));
        for(var selection:unique.values()) {
            var existing=selections.stream().filter(item->item.selection().type()==selection.type()).findFirst();
            if(existing.isPresent()) existing.get().update(selection);
            else selections.add(new EventServiceSelection(this,selection));
        }
        packageCode=code; revision++; updatedAt=Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
    public void remember(EventEstimate snapshot) { estimates.add(snapshot); }
    public Long id() { return id; }
    public Long eventId() { return event.id(); }
    public PackageCode packageCode() { return packageCode; }
    public Long version() { return version; }
    public long revision() { return revision; }
    public Instant updatedAt() { return updatedAt; }
    public List<ServiceSelection> selections() {
        return selections.stream().map(EventServiceSelection::selection)
            .sorted(Comparator.comparing(ServiceSelection::type)).toList();
    }
}
