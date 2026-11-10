package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.service.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/api") @Validated
public class ApiController {
    private final VenueService venues;
    private final EventService events;
    private final AuthSessions sessions;
    public ApiController(VenueService venues, EventService events, AuthSessions sessions) {
        this.venues = venues;
        this.events = events;
        this.sessions = sessions;
    }
    @GetMapping("/bootstrap") public Map<String,Object> bootstrap(HttpServletRequest request) {
        var identity = sessions.require(request);
        return Map.of("profile", identity.profile(),
            "eventTypes",Arrays.stream(EventType.values()).map(t->Map.of("id",t.name(),"label",t.label)).toList(),
            "strategies",List.of(
                Map.of("id","ECONOMY","label","Экономный","description","Сначала опубликованная цена, затем минимальный запас мест. Если цена неизвестна, экономия не гарантируется."),
                Map.of("id","QUALITY","label","Больше пространства","description","Площадки с большей площадью зала на одного гостя. Это не рейтинг качества обслуживания.")),
            "venues",venues.find("",1,StrategyId.ECONOMY,null),
            "events",events.all(identity), "notifications",events.notifications(identity));
    }
    @GetMapping("/venues") public List<Venue> venues(
        @RequestParam(defaultValue="") @Size(max=200) String query,
        @RequestParam(defaultValue="1") @Min(1) @Max(10000) int guests,
        @RequestParam(defaultValue="ECONOMY") StrategyId strategy,
        @RequestParam(required=false) @DecimalMin("1") BigDecimal budget) {
        return venues.find(query,guests,strategy,budget);
    }
    @GetMapping("/events") public List<EventPlan> events(HttpServletRequest request) {
        return events.all(sessions.require(request));
    }
    @GetMapping("/notifications") public List<Notification> notifications(HttpServletRequest request) {
        return events.notifications(sessions.require(request));
    }
    @PostMapping("/events") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> create(@Valid @RequestBody EventDraft draft, HttpServletRequest request) {
        return save(sessions.require(request), null, draft);
    }
    @PutMapping("/events/{id}")
    public Map<String,Object> update(@PathVariable Long id, @Valid @RequestBody EventDraft draft, HttpServletRequest request) {
        return save(sessions.require(request), id, draft);
    }
    @DeleteMapping("/events/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        events.delete(sessions.require(request), id);
    }
    private Map<String,Object> save(SessionIdentity identity, Long id, EventDraft draft) {
        var event = events.save(identity, id, draft);
        return Map.of("event",event, "recommendations",venues.find("",event.guests(),event.strategy(),event.budget()),
            "notifications",events.notifications(identity));
    }
}
