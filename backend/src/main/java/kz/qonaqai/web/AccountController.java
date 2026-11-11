package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.domain.AccountPlan.Code;
import kz.qonaqai.service.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class AccountController {
    public record ChangePlan(@NotNull Code code) {}
    private final PlanService plans;
    private final AccountDashboard dashboard;
    private final AuthSessions sessions;
    public AccountController(PlanService plans,AccountDashboard dashboard,AuthSessions sessions) {
        this.plans=plans; this.dashboard=dashboard; this.sessions=sessions;
    }
    @GetMapping("/api/plans") public List<PlanService.Option> options(HttpServletRequest request) { sessions.require(request); return plans.options(); }
    @GetMapping("/api/account/plan") public PlanService.Subscription current(HttpServletRequest request) { return plans.current(sessions.require(request)); }
    @PutMapping("/api/account/plan") public PlanService.Subscription change(@Valid @RequestBody ChangePlan body,HttpServletRequest request) {
        return plans.change(sessions.require(request),body.code());
    }
    @GetMapping("/api/account/dashboard") public AccountDashboard.View dashboard(HttpServletRequest request) { return dashboard.load(sessions.require(request)); }
}
