package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.pricing.*;

public record EstimateLine(String code, String displayName, Category category, PricingUnit pricingUnit,
                           int quantity, BigDecimal unitPrice, BigDecimal total, boolean included,
                           PriceSource priceSource, String currency) {
    public enum Category { VENUE, PACKAGE, INCLUDED_SERVICE, ADDITIONAL_SERVICE }
    public enum PriceSource { DEMO, UNKNOWN }

    public EstimateLine {
        if (code == null || code.isBlank() || displayName == null || displayName.isBlank()
                || category == null || pricingUnit == null || priceSource == null
                || quantity < 1 || quantity > 10000 || !"KZT".equals(currency))
            throw new ServiceValidationException("Некорректная строка сметы");
        if (included != (category == Category.INCLUDED_SERVICE))
            throw new ServiceValidationException("Некорректный статус включённой услуги");
        if (priceSource == PriceSource.UNKNOWN) {
            if (category != Category.VENUE || unitPrice != null || total != null || included)
                throw new ServiceValidationException("Неизвестная цена допустима только для аренды");
        } else {
            unitPrice = Money.amount(unitPrice);
            total = Money.amount(total);
            if (unitPrice.multiply(BigDecimal.valueOf(quantity)).compareTo(total) != 0
                    || (included && total.signum() != 0))
                throw new ServiceValidationException("Сумма строки не соответствует тарифу и количеству");
        }
    }

    public static EstimateLine additional(ServiceCostLine line) {
        if (!line.demoPrice()) throw new ServiceValidationException("Ожидается DEMO-тариф услуги");
        return new EstimateLine("SERVICE:" + line.serviceType(), line.displayName(), Category.ADDITIONAL_SERVICE,
            line.pricingUnit(), line.quantity(), line.unitPrice(), line.total(), false, PriceSource.DEMO, line.currency());
    }
}
