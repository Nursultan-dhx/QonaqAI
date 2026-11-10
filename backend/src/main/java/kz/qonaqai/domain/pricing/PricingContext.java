package kz.qonaqai.domain.pricing;

public record PricingContext(Long eventId, int guestCount, String currency) {
    public PricingContext {
        if (eventId == null || eventId < 1)
            throw new ServiceValidationException("Нужно сохранённое мероприятие");
        if (guestCount < 1 || guestCount > 10000)
            throw new ServiceValidationException("Количество гостей должно быть от 1 до 10 000");
        if (!"KZT".equals(currency))
            throw new ServiceValidationException("Поддерживается только валюта KZT");
    }
}
