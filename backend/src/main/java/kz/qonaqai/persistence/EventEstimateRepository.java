package kz.qonaqai.persistence;

import java.util.*;
import kz.qonaqai.domain.estimate.EventEstimate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventEstimateRepository extends JpaRepository<EventEstimate,Long> {
    Optional<EventEstimate> findFirstByConfiguration_IdOrderByRevisionDesc(Long configurationId);
    List<EventEstimate> findAllByConfiguration_IdOrderByRevisionDesc(Long configurationId);
}
