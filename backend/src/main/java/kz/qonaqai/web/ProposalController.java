package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.patterns.facade.ProposalFacade;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProposalController {
    public record Create(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=16000) String body,
        @NotBlank @Size(max=80) String sourceToken) {}
    public record Edit(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=16000) String body,
        @NotNull @Min(0) Long expectedVersion) {}
    private final ProposalFacade proposals;
    private final AuthSessions sessions;
    public ProposalController(ProposalFacade proposals,AuthSessions sessions) { this.proposals=proposals; this.sessions=sessions; }
    @PostMapping("/api/events/{id}/proposal-draft")
    public ProposalFacade.Draft draft(@PathVariable Long id,HttpServletRequest request) { return proposals.draft(sessions.require(request),id); }
    @PostMapping("/api/events/{id}/proposals") @ResponseStatus(HttpStatus.CREATED)
    public ProposalFacade.View create(@PathVariable Long id,@Valid @RequestBody Create body,HttpServletRequest request) {
        return proposals.create(sessions.require(request),id,body.title(),body.body(),body.sourceToken());
    }
    @GetMapping("/api/proposals")
    public List<ProposalFacade.View> all(HttpServletRequest request) { return proposals.all(sessions.require(request)); }
    @GetMapping("/api/proposals/{id}")
    public ProposalFacade.View get(@PathVariable Long id,HttpServletRequest request) { return proposals.get(sessions.require(request),id); }
    @GetMapping(value="/api/proposals/{id}/export",produces="text/plain;charset=UTF-8")
    public ResponseEntity<String> export(@PathVariable Long id,HttpServletRequest request) {
        return ResponseEntity.ok().header("Content-Disposition","attachment; filename=proposal-"+id+".txt")
            .body(proposals.export(sessions.require(request),id));
    }
    @PutMapping("/api/proposals/{id}")
    public ProposalFacade.View edit(@PathVariable Long id,@Valid @RequestBody Edit body,HttpServletRequest request) {
        return proposals.edit(sessions.require(request),id,body.title(),body.body(),body.expectedVersion());
    }
}
