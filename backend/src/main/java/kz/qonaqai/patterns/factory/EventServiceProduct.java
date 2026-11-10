package kz.qonaqai.patterns.factory;

import java.math.BigDecimal;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.pricing.ServiceCostLine;
import kz.qonaqai.domain.pricing.ServiceSelection;

public interface EventServiceProduct {
    ServiceType type();
    ServiceSelection configuration();
    void validate();
    ServiceCostLine costLine();
    default BigDecimal cost() { return costLine().total(); }
}
