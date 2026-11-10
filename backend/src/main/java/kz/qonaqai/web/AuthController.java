package kz.qonaqai.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kz.qonaqai.auth.AccountService;
import kz.qonaqai.auth.AuthSessions;
import kz.qonaqai.auth.SessionIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
@RequestMapping(path = "/api/auth", consumes = APPLICATION_JSON_VALUE)
public class AuthController {
    private final AccountService accounts;
    private final AuthSessions sessions;

    public AuthController(AccountService accounts, AuthSessions sessions) {
        this.accounts = accounts;
        this.sessions = sessions;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionIdentity.Profile register(@Valid @RequestBody Registration input, HttpServletRequest request) {
        return sessions.start(request, accounts.register(input.name(), input.email(), input.password()));
    }

    @PostMapping("/login")
    public SessionIdentity.Profile login(@Valid @RequestBody Credentials input, HttpServletRequest request) {
        return sessions.start(request, accounts.login(input.email(), input.password()));
    }

    @PostMapping("/demo")
    public SessionIdentity.Profile demo(HttpServletRequest request) {
        return sessions.start(request, SessionIdentity.DEMO);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        sessions.end(request);
    }

    public record Registration(
        @NotBlank(message = "Введите имя") @Size(max = 80, message = "Не более 80 символов") String name,
        @NotBlank(message = "Введите почту") @Email(message = "Проверьте адрес почты")
        @Size(max = 254, message = "Не более 254 символов") String email,
        @NotBlank(message = "Введите пароль")
        @Size(min = 10, max = 128, message = "Пароль должен содержать от 10 до 128 символов") String password
    ) {
        public Registration { email = AccountService.normalizeEmail(email); }
    }

    public record Credentials(
        @NotBlank(message = "Введите почту") @Email(message = "Проверьте адрес почты")
        @Size(max = 254, message = "Не более 254 символов") String email,
        @NotBlank(message = "Введите пароль") @Size(max = 128, message = "Не более 128 символов") String password
    ) {
        public Credentials { email = AccountService.normalizeEmail(email); }
    }
}
