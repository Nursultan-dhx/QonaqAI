package kz.qonaqai.domain.pricing;

import java.math.BigDecimal;
import kz.qonaqai.domain.PricingUnit;
import kz.qonaqai.domain.ServiceType;

/** Immutable calculation output, also reusable by future package decorators. */
public record ServiceCostLine(ServiceType serviceType, String displayName, PricingUnit pricingUnit,
                              BigDecimal unitPrice, int quantity, BigDecimal total,
                              String currency, boolean demoPrice) {}
