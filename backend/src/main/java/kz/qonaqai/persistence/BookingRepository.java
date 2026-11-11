package kz.qonaqai.persistence;

import java.time.Instant;
import java.util.*;
import kz.qonaqai.domain.booking.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking,Long> {
    boolean existsByEventIdAndStatus(Long eventId, BookingStatus status);
    @Query("select count(b) from Booking b where b.venue.id=:venueId and b.status=kz.qonaqai.domain.booking.BookingStatus.CONFIRMED and b.start < :end and :start < b.end")
    long countConflicts(@Param("venueId") Long venueId, @Param("start") Instant start, @Param("end") Instant end);
    @EntityGraph(attributePaths="venue")
    List<Booking> findAllByOwnerIdOrderByCreatedAtDescIdDesc(Long ownerId);
    Optional<Booking> findByIdAndOwnerId(Long id, Long ownerId);
    List<Booking> findAllByEventId(Long eventId);
    interface Route { Long getEventId(); Long getVenueId(); }
    @Query("select b.eventId as eventId, b.venue.id as venueId from Booking b where b.id=:id and (b.ownerId=:ownerId or (b.ownerId is null and :ownerId is null))")
    Optional<Route> findOwnedRoute(@Param("id") Long id, @Param("ownerId") Long ownerId);
}
