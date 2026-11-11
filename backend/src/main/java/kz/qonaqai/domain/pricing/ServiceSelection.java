package kz.qonaqai.domain.pricing;

import kz.qonaqai.domain.ServiceType;

/** Only selectable inputs. Prices and guest quantities are server-owned. */
public record ServiceSelection(ServiceType type, Integer hours) {
    public static final int MIN_HOURS = 1;
    public static final int MAX_HOURS = 12;
}
