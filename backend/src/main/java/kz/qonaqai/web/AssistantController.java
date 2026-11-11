package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.service.PlanningAssistant;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    public record Brief(@NotBlank @Size(max=2000) String text) {}
    private final PlanningAssistant assistant;
    private final AuthSessions sessions;
    public AssistantController(PlanningAssistant assistant, AuthSessions sessions) {
        this.assistant=assistant; this.sessions=sessions;
    }
    @PostMapping("/suggest")
    public PlanningAssistant.Suggestions suggest(@Valid @RequestBody Brief brief, HttpServletRequest request) {
        sessions.require(request);
        return assistant.suggest(brief.text());
    }
}
