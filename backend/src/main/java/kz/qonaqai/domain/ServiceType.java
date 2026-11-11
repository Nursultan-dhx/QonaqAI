package kz.qonaqai.domain;

public enum ServiceType {
    HOST(PricingUnit.FIXED),
    PHOTOGRAPHY(PricingUnit.PER_HOUR),
    DECOR(PricingUnit.FIXED),
    MUSIC(PricingUnit.PER_HOUR),
    CATERING(PricingUnit.PER_GUEST);

    private final PricingUnit pricingUnit;
    ServiceType(PricingUnit pricingUnit) { this.pricingUnit = pricingUnit; }
    public PricingUnit pricingUnit() { return pricingUnit; }
}
