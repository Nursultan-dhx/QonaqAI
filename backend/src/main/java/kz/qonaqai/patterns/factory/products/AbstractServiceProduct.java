package kz.qonaqai.patterns.factory.products;

import java.math.BigDecimal;
import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.patterns.factory.EventServiceProduct;

/** Shared immutable inputs and money arithmetic; concrete products validate quantity rules. */
public abstract class AbstractServiceProduct implements EventServiceProduct {
    private final ServiceSelection selection;
    private final ServiceRate rate;
    protected final PricingContext context;

    protected AbstractServiceProduct(ServiceSelection selection, ServiceRate rate, PricingContext context,
                                     ServiceType type, PricingUnit unit) {
        if (selection == null || rate == null || context == null)
            throw new ServiceValidationException("Не заданы параметры услуги");
        if (selection.type() != type || rate.serviceType() != type || rate.pricingUnit() != unit)
            throw new ServiceValidationException("Тип услуги и единица тарифа не совпадают");
        if (!rate.currency().equals(context.currency()))
            throw new ServiceValidationException("Валюты тарифа и мероприятия не совпадают");
        this.selection = selection;
        this.rate = rate;
        this.context = context;
    }

    @Override public final ServiceType type() { return selection.type(); }
    @Override public final ServiceSelection configuration() { return selection; }
    protected abstract int quantity();

    @Override public final void validate() {
        if (quantity() < 1) throw new ServiceValidationException("Количество услуги должно быть положительным");
    }

    protected final int fixedQuantity() {
        requireNoHours();
        return 1;
    }

    protected final void requireNoHours() {
        if (selection.hours() != null)
            throw new ServiceValidationException("Услуга «" + rate.displayName() + "» не принимает часы");
    }

    protected final int hourlyQuantity() {
        Integer hours = selection.hours();
        if (hours == null || hours < ServiceSelection.MIN_HOURS || hours > ServiceSelection.MAX_HOURS)
            throw new ServiceValidationException("Услуга «" + rate.displayName() + "»: укажите целое число часов от 1 до 12");
        return hours;
    }

    @Override public final ServiceCostLine costLine() {
        int quantity = quantity();
        return new ServiceCostLine(type(), rate.displayName(), rate.pricingUnit(), rate.unitPrice(),
            quantity, rate.unitPrice().multiply(BigDecimal.valueOf(quantity)), rate.currency(), rate.demoPrice());
    }
}
