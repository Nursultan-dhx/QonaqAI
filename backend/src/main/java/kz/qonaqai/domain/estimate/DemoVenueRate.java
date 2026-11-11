package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import kz.qonaqai.domain.pricing.ServiceValidationException;

public record DemoVenueRate(Long venueId, BigDecimal price, String currency,
                            EstimateLine.PriceSource priceSource, String displayLabel) {
    public DemoVenueRate {
        if (venueId == null || venueId < 1 || displayLabel == null || displayLabel.isBlank())
            throw new ServiceValidationException("Тарифу площадки нужны стабильный ID и подпись");
        price = Money.positive(price);
        if (!"KZT".equals(currency) || priceSource != EstimateLine.PriceSource.DEMO)
            throw new ServiceValidationException("Тариф аренды должен иметь источник DEMO и валюту KZT");
    }
}
