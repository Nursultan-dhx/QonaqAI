package kz.qonaqai.patterns.strategy;

import kz.qonaqai.domain.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.*;

@Component
public class QualityStrategy implements VenueSelectionStrategy {
    @Override public StrategyId id() { return StrategyId.QUALITY; }
    @Override public List<Venue> rank(List<Venue> venues, int guests, BigDecimal budget) {
        // Objective space per guest is used, never invented ratings or reviews.
        return venues.stream().sorted(Comparator
            .comparing((Venue v) -> v.area()==null ? null : v.area()/Math.max(1,guests),
                Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(Venue::name)).toList();
    }
}
