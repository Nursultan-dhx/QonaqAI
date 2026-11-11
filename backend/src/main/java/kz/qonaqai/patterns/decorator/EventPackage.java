package kz.qonaqai.patterns.decorator;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import kz.qonaqai.domain.ServiceType;
import kz.qonaqai.domain.estimate.EstimateLine;

public interface EventPackage {
    BigDecimal cost();
    List<EstimateLine> lines();
    Set<ServiceType> includedServiceTypes();
    /** Explicit paid additions; included entitlements are represented separately. */
    Set<ServiceType> selectedServiceTypes();
}
