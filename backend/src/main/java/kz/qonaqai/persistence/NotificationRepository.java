package kz.qonaqai.persistence;
import kz.qonaqai.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop50ByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    void deleteByEventIdAndOwnerId(Long eventId, Long ownerId);
}
