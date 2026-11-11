package kz.qonaqai.patterns.factory;

import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;

public abstract class ServiceCreator {
    public abstract ServiceType type();

    /** Common workflow. Product construction is delegated to the overridden Factory Method. */
    public final EventServiceProduct create(ServiceSelection selection, ServiceRate trustedRate,
                                            PricingContext context) {
        if (selection == null || selection.type() == null)
            throw new ServiceValidationException("Выберите тип услуги");
        if (trustedRate == null || context == null)
            throw new ServiceValidationException("Не заданы тариф или контекст мероприятия");
        if (selection.type() != type() || trustedRate.serviceType() != type())
            throw new ServiceValidationException("Создатель не поддерживает выбранный тип услуги");
        EventServiceProduct product = createProduct(selection, trustedRate, context);
        if (product == null || product.type() != type() || !selection.equals(product.configuration()))
            throw new IllegalStateException("Создатель вернул продукт другого типа или конфигурации");
        product.validate();
        return product;
    }

    protected abstract EventServiceProduct createProduct(
        ServiceSelection selection, ServiceRate trustedRate, PricingContext context);
}
