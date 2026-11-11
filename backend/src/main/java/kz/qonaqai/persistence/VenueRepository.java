package kz.qonaqai.persistence;
import kz.qonaqai.domain.Venue;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface VenueRepository extends JpaRepository<Venue, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Venue v where v.id=:id")
    Optional<Venue> findForUpdate(@Param("id") Long id);
}
