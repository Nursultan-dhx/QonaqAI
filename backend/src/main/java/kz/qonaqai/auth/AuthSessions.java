package kz.qonaqai.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AuthSessions {
    private static final String IDENTITY = SessionIdentity.class.getName();

    public SessionIdentity require(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            try {
                if (session.getAttribute(IDENTITY) instanceof SessionIdentity identity) return identity;
            } catch (IllegalStateException ex) {
                // Another request signed out before this one obtained its identity.
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Войдите в аккаунт или откройте демоверсию");
    }

    public SessionIdentity.Profile start(HttpServletRequest request, SessionIdentity identity) {
        end(request);
        request.getSession(true).setAttribute(IDENTITY, identity);
        return identity.profile();
    }

    public void end(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            try {
                session.invalidate();
            } catch (IllegalStateException ex) {
                // A concurrent request already ended the same session.
            }
        }
    }
}
