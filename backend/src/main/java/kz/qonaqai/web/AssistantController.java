package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.service.PlanningAssistant;
import kz.qonaqai.service.AssistantChatService;
import kz.qonaqai.service.GeminiClient;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    public record Brief(@NotBlank @Size(max=2000) String text) {}
    private final PlanningAssistant assistant;
    private final AuthSessions sessions;
    private final AssistantChatService chat;
    private final GeminiClient gemini;
    public AssistantController(PlanningAssistant assistant, AuthSessions sessions,AssistantChatService chat,GeminiClient gemini) {
        this.assistant=assistant; this.sessions=sessions; this.chat=chat; this.gemini=gemini;
    }
    @PostMapping("/suggest")
    public PlanningAssistant.Suggestions suggest(@Valid @RequestBody Brief brief, HttpServletRequest request) {
        sessions.require(request);
        return assistant.suggest(brief.text());
    }
    public record Conversation(@NotEmpty @Size(max=24) @Valid List<AssistantChatService.Turn> messages) {}
    @PostMapping("/chat")
    public AssistantChatService.Reply chat(@Valid @RequestBody Conversation conversation,HttpServletRequest request) {
        return chat.chat(sessions.require(request),conversation.messages());
    }
    @GetMapping("/status")
    public Map<String,Object> status(HttpServletRequest request) {
        sessions.require(request);
        return Map.of("configured",gemini.configured(),"provider","GEMINI","model",gemini.model());
    }
}
