package kz.qonaqai.auth;

import java.io.Serializable;

public record SessionIdentity(Long accountId, String name) implements Serializable {
    public static final SessionIdentity DEMO = new SessionIdentity(null, "Демо");

    public Profile profile() {
        return new Profile(name, accountId == null ? "DEMO" : "ACCOUNT");
    }

    public record Profile(String name, String mode) {}
}
