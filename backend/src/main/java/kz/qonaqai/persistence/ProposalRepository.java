package kz.qonaqai.persistence;

import java.util.*;
import kz.qonaqai.domain.Proposal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProposalRepository extends JpaRepository<Proposal,Long> {
    List<Proposal> findAllByOwnerIdOrderByUpdatedAtDescIdDesc(Long ownerId);
    Optional<Proposal> findByIdAndOwnerId(Long id,Long ownerId);
    long countByOwnerId(Long ownerId);
}
