package kz.qonaqai.domain.pricing;

/** Invalid service selection or trusted pricing configuration. */
public class ServiceValidationException extends IllegalArgumentException {
    public ServiceValidationException(String message) { super(message); }
}
