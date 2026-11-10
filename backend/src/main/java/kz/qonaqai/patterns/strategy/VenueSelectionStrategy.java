package kz.qonaqai.patterns.strategy;

import kz.qonaqai.domain.*;
import java.math.BigDecimal;
import java.util.List;

/** Strategy: interchangeable ranking algorithms, independent of HTTP/UI. */
public interface VenueSelectionStrategy {
    StrategyId id();
    List<Venue> rank(List<Venue> venues, int guests, BigDecimal budget);
}
