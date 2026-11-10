package kz.qonaqai.persistence;
import kz.qonaqai.domain.EventPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;
public interface EventRepository extends JpaRepository<EventPlan, Long> {
    @EntityGraph(attributePaths="venue")
    List<EventPlan> findAllByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    Optional<EventPlan> findByIdAndOwnerId(Long id, Long ownerId);
}
