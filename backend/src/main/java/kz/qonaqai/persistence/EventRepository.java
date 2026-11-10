package kz.qonaqai.persistence;
import kz.qonaqai.domain.EventPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
public interface EventRepository extends JpaRepository<EventPlan, Long> {
    @EntityGraph(attributePaths="venue") List<EventPlan> findAllByOrderByUpdatedAtDesc();
}
