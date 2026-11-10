package kz.qonaqai.service;

import kz.qonaqai.domain.*;
import kz.qonaqai.persistence.VenueRepository;
import kz.qonaqai.patterns.strategy.VenueSelectionStrategy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly=true)
public class VenueService {
    private final VenueRepository repository;
    private final Map<StrategyId, VenueSelectionStrategy> strategies;
    public VenueService(VenueRepository repository,List<VenueSelectionStrategy> strategies) {
        this.repository=repository;
        this.strategies=strategies.stream().collect(Collectors.toMap(VenueSelectionStrategy::id, Function.identity()));
    }
    public List<Venue> find(String query,int guests,StrategyId strategy,BigDecimal budget) {
        var term=query==null?"":query.strip().toLowerCase(Locale.ROOT);
        var candidates=repository.findAll().stream()
            .filter(v -> v.capacity()>=guests)
            .filter(v -> term.isEmpty() || (v.name()+" "+v.hall()+" "+v.address()).toLowerCase(Locale.ROOT).contains(term))
            .filter(v -> budget==null || v.price()==null || v.price().compareTo(budget)<=0)
            .toList();
        return strategies.get(strategy).rank(candidates,guests,budget);
    }
}
