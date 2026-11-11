package kz.qonaqai.patterns.facade;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.patterns.builder.ProposalBuilder;
import kz.qonaqai.persistence.*;
import kz.qonaqai.service.PackageConfigurationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Facade coordinates ownership, saved quotes, Builder, persistence and activity notifications. */
@Service @Transactional
public class ProposalFacade {
    public record Draft(Long eventId,Long estimateId,String sourceToken,String title,String body) {}
    public record View(Long id,long version,Long eventId,Long estimateId,String title,String body,
        BigDecimal knownSubtotal,boolean quoteComplete,String freshness,Instant createdAt,Instant updatedAt) {}
    private record Source(EventPlan event,Venue venue,PackageConfigurationService.SavedQuote quote,String token) {}
    private final EventRepository events;
    private final VenueRepository venues;
    private final ProposalRepository proposals;
    private final NotificationRepository notifications;
    private final PackageConfigurationService packages;
    public ProposalFacade(EventRepository events,VenueRepository venues,ProposalRepository proposals,
            NotificationRepository notifications,PackageConfigurationService packages) {
        this.events=events; this.venues=venues; this.proposals=proposals; this.notifications=notifications; this.packages=packages;
    }
    public Draft draft(SessionIdentity identity,Long eventId) {
        var source=source(identity,eventId);
        return new Draft(eventId,source.quote().estimateId(),source.token(),source.event().title(),
            new ProposalBuilder().event(source.event()).venue(source.venue()).estimate(source.quote()).demoTerms().build());
    }
    public View create(SessionIdentity identity,Long eventId,String title,String body,String expectedSourceToken) {
        var source=source(identity,eventId);
        if (!source.token().equals(expectedSourceToken))
            throw conflict("PROPOSAL_SOURCE_CHANGED","Мероприятие или смета изменились. Создайте новый черновик предложения.");
        var quote=source.quote().estimate();
        var proposal=proposals.saveAndFlush(new Proposal(identity.accountId(),eventId,source.quote().estimateId(),
            source.token(),quote.knownSubtotal(),quote.quoteComplete(),title,body));
        notifications.save(new Notification(source.event(),"Предложение «"+proposal.title()+"» сохранено."));
        return view(identity,proposal);
    }
    public View edit(SessionIdentity identity,Long id,String title,String body,long expectedVersion) {
        var proposal=owned(identity,id);
        // Serialize document edits with event/package mutations, using the same event lock order.
        var event=events.findOwnedForUpdate(proposal.eventId(),identity.accountId());
        if (proposal.version()!=expectedVersion) throw conflict("PROPOSAL_VERSION_CONFLICT","Предложение изменено в другой вкладке. Обновите данные.");
        proposal.edit(title,body); proposals.flush();
        event.ifPresent(value->notifications.save(new Notification(value,"Предложение «"+proposal.title()+"» изменено.")));
        return view(identity,proposal);
    }
    public List<View> all(SessionIdentity identity) {
        return proposals.findAllByOwnerIdOrderByUpdatedAtDescIdDesc(identity.accountId()).stream().map(p->view(identity,p)).toList();
    }
    public View get(SessionIdentity identity,Long id) { return view(identity,owned(identity,id)); }
    private Proposal owned(SessionIdentity identity,Long id) {
        return proposals.findByIdAndOwnerId(id,identity.accountId()).orElseThrow(()->missing("Предложение не найдено"));
    }
    private Source source(SessionIdentity identity,Long eventId) {
        var event=events.findOwnedForUpdate(eventId,identity.accountId()).orElseThrow(()->missing("Мероприятие не найдено"));
        if (event.venueId()==null) throw conflict("PROPOSAL_NOT_READY","Сначала выберите площадку и сохраните смету.");
        var saved=packages.load(identity,eventId).currentEstimate();
        if (saved==null || saved.freshness()!=PackageConfigurationService.Freshness.CURRENT || saved.catalogsChanged())
            throw conflict("PROPOSAL_NOT_READY","Сначала сохраните актуальную смету мероприятия.");
        var venue=venues.findById(event.venueId()).orElseThrow(()->missing("Площадка не найдена"));
        return new Source(event,venue,saved,token(event,saved));
    }
    private String token(EventPlan event,PackageConfigurationService.SavedQuote saved) {
        return EstimateTokens.hash("proposal-v1",event.title(),event.type().name(),saved.estimateId().toString(),saved.estimate().pricingToken());
    }
    private View view(SessionIdentity identity,Proposal proposal) {
        String freshness="EVENT_REMOVED";
        var event=events.findByIdAndOwnerId(proposal.eventId(),identity.accountId());
        if (event.isPresent()) {
            var saved=packages.load(identity,proposal.eventId()).currentEstimate();
            freshness=saved!=null && saved.freshness()==PackageConfigurationService.Freshness.CURRENT && !saved.catalogsChanged()
                && token(event.get(),saved).equals(proposal.sourceToken()) ? "CURRENT" : "OUTDATED";
        }
        return new View(proposal.id(),proposal.version(),proposal.eventId(),proposal.estimateId(),proposal.title(),proposal.body(),
            proposal.knownSubtotal(),proposal.quoteComplete(),freshness,proposal.createdAt(),proposal.updatedAt());
    }
    private ResponseStatusException missing(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND,message); }
    private PackageConflictException conflict(String code,String message) { return new PackageConflictException(code,message); }
}
