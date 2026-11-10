package kz.qonaqai.auth;

import kz.qonaqai.domain.Account;
import kz.qonaqai.persistence.AccountRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AccountService {
    private final AccountRepository accounts;
    private final PasswordHasher passwords;
    private final String dummyHash;

    public AccountService(AccountRepository accounts, PasswordHasher passwords) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.dummyHash = passwords.hash("QonaqAI absent account sentinel");
    }

    public SessionIdentity register(String name, String email, String password) {
        if (accounts.existsByEmail(email)) throw duplicateEmail();
        try {
            var account = accounts.saveAndFlush(new Account(name.strip(), email, passwords.hash(password)));
            return identity(account);
        } catch (DataIntegrityViolationException ex) {
            // A concurrent registration can commit after the existence check.
            if (accounts.existsByEmail(email)) throw duplicateEmail();
            throw ex;
        }
    }

    public SessionIdentity login(String email, String password) {
        var account = accounts.findByEmail(email);
        boolean matches = passwords.matches(password, account.map(Account::passwordHash).orElse(dummyHash));
        if (!matches || account.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверная почта или пароль");
        }
        return identity(account.orElseThrow());
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    private SessionIdentity identity(Account account) {
        return new SessionIdentity(account.id(), account.name());
    }

    private ResponseStatusException duplicateEmail() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Эта почта уже зарегистрирована");
    }
}
