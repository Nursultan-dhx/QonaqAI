package kz.qonaqai.persistence;
import kz.qonaqai.domain.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
public interface VenueRepository extends JpaRepository<Venue, Long> {}
