package kz.qonaqai.patterns.strategy;

import kz.qonaqai.domain.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.*;

@Component
public class EconomyStrategy implements VenueSelectionStrategy {
    @Override public StrategyId id() { return StrategyId.ECONOMY; }
    @Override public List<Venue> rank(List<Venue> venues, int guests, BigDecimal budget) {
        // Unknown prices are not estimated. Fit is a fallback, not a promise of savings.
        return venues.stream().sorted(Comparator
            .comparing((Venue v) -> v.price()==null)
            .thenComparing(v -> v.price(), Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparingInt(v -> v.capacity()-guests)
            .thenComparing(Venue::name)).toList();
    }
}
