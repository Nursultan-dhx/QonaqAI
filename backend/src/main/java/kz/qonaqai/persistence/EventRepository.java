package kz.qonaqai.persistence;
import kz.qonaqai.domain.EventPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;
public interface EventRepository extends JpaRepository<EventPlan, Long> {
    @EntityGraph(attributePaths="venue")
    List<EventPlan> findAllByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from EventPlan e where e.id=:id and (e.ownerId=:ownerId or (e.ownerId is null and :ownerId is null))")
    Optional<EventPlan> findOwnedForUpdate(@org.springframework.data.repository.query.Param("id") Long id,
        @org.springframework.data.repository.query.Param("ownerId") Long ownerId);

    Optional<EventPlan> findByIdAndOwnerId(Long id, Long ownerId);
}
