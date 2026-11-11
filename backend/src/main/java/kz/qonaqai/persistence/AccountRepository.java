package kz.qonaqai.persistence;

import kz.qonaqai.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);
    boolean existsByEmail(String email);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Account a where a.id=:id")
    Optional<Account> findForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
