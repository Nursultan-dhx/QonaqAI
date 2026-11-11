package kz.qonaqai.persistence;

import java.util.Optional;
import kz.qonaqai.domain.estimate.EventPackageConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PackageConfigurationRepository extends JpaRepository<EventPackageConfiguration,Long> {
    Optional<EventPackageConfiguration> findByEvent_Id(Long eventId);
}
