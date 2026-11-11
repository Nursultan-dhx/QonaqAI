package kz.qonaqai.domain.estimate;

import java.math.BigDecimal;
import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.pricing.ServiceValidationException;

public record PackageDefinition(PackageCode packageCode, String displayName, String description,
                                BigDecimal basePrice, List<ServiceType> includedServiceTypes,
                                String currency, boolean demoPrice) {
    public PackageDefinition {
        if (packageCode == null || displayName == null || displayName.isBlank()
                || description == null || description.isBlank() || includedServiceTypes == null)
            throw new ServiceValidationException("Неполное определение пакета");
        var included = EnumSet.noneOf(ServiceType.class);
        for (ServiceType type : includedServiceTypes) {
            if (type == null || !included.add(type) || type.pricingUnit() != PricingUnit.FIXED)
                throw new ServiceValidationException("Включённые услуги должны быть уникальными фиксированными услугами");
        }
        includedServiceTypes = List.copyOf(includedServiceTypes);
        basePrice = Money.positive(basePrice);
        if (!"KZT".equals(currency) || !demoPrice)
            throw new ServiceValidationException("Пакеты этой фазы используют только DEMO-тарифы KZT");
    }
}
