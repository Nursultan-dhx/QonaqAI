package kz.qonaqai.service;

import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.patterns.facade.ProposalFacade;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional
public class AccountDashboard {
    public record EventData(Long id,String title,EventType type,java.time.LocalDate date,int guests,
        java.math.BigDecimal budget,String description,StrategyId strategy,Long venueId,java.time.Instant updatedAt) {
        static EventData from(EventPlan event) {
            return new EventData(event.id(),event.title(),event.type(),event.date(),event.guests(),event.budget(),
                event.description(),event.strategy(),event.venueId(),event.updatedAt());
        }
    }
    public record EventItem(EventData event,String estimateStatus,String bookingStatus,int proposalCount) {}
    public record View(SessionIdentity.Profile profile,PlanService.Subscription subscription,List<EventItem> events,
        List<ProposalFacade.View> proposals,List<BookingService.View> bookings,List<Notification> notifications) {}
    private final EventService events;
    private final PackageConfigurationService packages;
    private final BookingService bookings;
    private final ProposalFacade proposals;
    private final PlanService plans;
    public AccountDashboard(EventService events,PackageConfigurationService packages,BookingService bookings,ProposalFacade proposals,PlanService plans) {
        this.events=events; this.packages=packages; this.bookings=bookings; this.proposals=proposals; this.plans=plans;
    }
    public View load(SessionIdentity identity) {
        var documents=proposals.all(identity); var history=bookings.history(identity);
        var projects=events.all(identity).stream().map(event->{
            var quote=packages.load(identity,event.id()).currentEstimate();
            String estimateStatus=quote==null?"MISSING":quote.freshness()==PackageConfigurationService.Freshness.OUTDATED || quote.catalogsChanged()
                ?"OUTDATED":quote.estimate().quoteComplete()?"CURRENT":"INCOMPLETE";
            String bookingStatus=history.stream().anyMatch(b->Objects.equals(b.eventId(),event.id()) && b.status()==kz.qonaqai.domain.booking.BookingStatus.CONFIRMED)
                ?"CONFIRMED":history.stream().anyMatch(b->Objects.equals(b.eventId(),event.id()))?"CANCELLED":"NONE";
            return new EventItem(EventData.from(event),estimateStatus,bookingStatus,(int)documents.stream().filter(p->p.eventId().equals(event.id())).count());
        }).toList();
        return new View(identity.profile(),plans.current(identity),projects,documents,history,events.notifications(identity));
    }
}
