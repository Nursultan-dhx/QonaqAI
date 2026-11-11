package kz.qonaqai.domain.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;

public record ServiceRate(ServiceType serviceType, String displayName, String description,
                          PricingUnit pricingUnit, BigDecimal unitPrice,
                          String currency, boolean demoPrice) {
    public ServiceRate {
        if (serviceType == null || pricingUnit == null)
            throw new ServiceValidationException("Укажите тип и единицу тарифа");
        if (serviceType.pricingUnit() != pricingUnit)
            throw new ServiceValidationException("Единица тарифа не соответствует типу услуги");
        if (displayName == null || displayName.isBlank() || description == null || description.isBlank())
            throw new ServiceValidationException("Тарифу нужны название и описание");
        if (unitPrice == null || unitPrice.signum() <= 0)
            throw new ServiceValidationException("Демонстрационная цена должна быть больше нуля");
        try {
            unitPrice = unitPrice.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new ServiceValidationException("Цена должна содержать не более двух знаков после запятой");
        }
        if (!"KZT".equals(currency) || !demoPrice)
            throw new ServiceValidationException("Каталог этой фазы поддерживает только демонстрационные цены KZT");
    }
}
