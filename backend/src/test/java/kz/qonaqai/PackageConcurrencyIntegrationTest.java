package kz.qonaqai;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.estimate.*;
import kz.qonaqai.domain.pricing.*;
import kz.qonaqai.persistence.*;
import kz.qonaqai.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:package-concurrency;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"})
@TestExecutionListeners(DependencyInjectionTestExecutionListener.class)
class PackageConcurrencyIntegrationTest {
    @Autowired PackageConfigurationService storage;
    @Autowired EstimateService estimates;
    @Autowired EventService events;
    @Autowired EventEstimateRepository snapshots;
    @Autowired PackageConfigurationRepository configurations;
    @Autowired JdbcTemplate jdbc;
    @Autowired EventRepository eventRepository;
    @Autowired PlatformTransactionManager transactions;
    long id;

    @BeforeEach void fixture() {
        id=new TransactionTemplate(transactions).execute(status->events.save(SessionIdentity.DEMO,null,
            new EventDraft("Concurrency",EventType.CORPORATE,
                LocalDate.now().plusDays(30),80,new java.math.BigDecimal("2000000"),"",StrategyId.ECONOMY,1L)).id());
    }
    @AfterEach void cleanup() { events.delete(SessionIdentity.DEMO,id); }

    @Test void concurrentInitialSavesCreateOneCurrentConfiguration() throws Exception {
        var request=request(null,2);
        var result=race(request);
        assertThat(result).containsExactlyInAnyOrder("SAVED","CONFLICT");
        var loaded=storage.load(SessionIdentity.DEMO,id);
        assertThat(loaded.configurationVersion()).isEqualTo(0);
        assertThat(storage.history(SessionIdentity.DEMO,id)).hasSize(1);
        assertThat(configurations.findByEvent_Id(id)).isPresent();
    }

    @Test void concurrentUpdatesRejectTheStaleWriter() throws Exception {
        storage.save(SessionIdentity.DEMO,id,request(null,2));
        assertThat(race(request(0L,3))).containsExactlyInAnyOrder("SAVED","CONFLICT");
        assertThat(storage.load(SessionIdentity.DEMO,id).configurationVersion()).isEqualTo(1);
        assertThat(storage.history(SessionIdentity.DEMO,id)).hasSize(2);
    }

    @Test void failedSnapshotInsertionRollsBackSelectionsVersionAndPreservesPriorSnapshot() {
        var before=storage.save(SessionIdentity.DEMO,id,request(null,2));
        jdbc.execute("ALTER TABLE event_estimate ADD CONSTRAINT test_snapshot_failure CHECK(revision<2)");
        try {
            assertThatThrownBy(()->storage.save(SessionIdentity.DEMO,id,request(0L,3)))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            var loaded=storage.load(SessionIdentity.DEMO,id);
            assertThat(loaded).isEqualTo(before);
            assertThat(storage.history(SessionIdentity.DEMO,id)).hasSize(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM event_service_selection",Long.class)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM estimate_line_snapshot",Long.class)).isEqualTo(3);
        } finally { jdbc.execute("ALTER TABLE event_estimate DROP CONSTRAINT test_snapshot_failure"); }
        assertThat(storage.save(SessionIdentity.DEMO,id,request(0L,3)).configurationVersion()).isEqualTo(1);
    }

    @Test void eventEditAndQuoteSaveUseTheSameRowLockAndRejectOldInputs() throws Exception {
        var old=request(null,2);
        var locked=new CountDownLatch(1);
        var release=new CountDownLatch(1);
        var saveStarted=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var edit=executor.submit(()->new TransactionTemplate(transactions).execute(status->{
                eventRepository.findOwnedForUpdate(id,null).orElseThrow();
                locked.countDown();
                try { if(!release.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("Missing release"); }
                catch(InterruptedException ex) { throw new IllegalStateException(ex); }
                return events.save(SessionIdentity.DEMO,id,new EventDraft("Edited",EventType.CORPORATE,
                    LocalDate.now().plusDays(30),90,new java.math.BigDecimal("2000000"),"",StrategyId.ECONOMY,1L));
            }));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();
            var save=executor.submit(()->{
                saveStarted.countDown();
                try { storage.save(SessionIdentity.DEMO,id,old); return "SAVED"; }
                catch(PackageConflictException ex) { return ex.code(); }
            });
            assertThat(saveStarted.await(5,TimeUnit.SECONDS)).isTrue();
            release.countDown();
            edit.get(10,TimeUnit.SECONDS);
            assertThat(save.get(10,TimeUnit.SECONDS)).isEqualTo("EVENT_CHANGED");
            assertThat(storage.load(SessionIdentity.DEMO,id).configured()).isFalse();
        } finally { release.countDown(); }
    }

    List<String> race(PackageConfigurationService.SaveRequest request) throws Exception {
        var start=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<String> writer=()->{
                start.await();
                try { storage.save(SessionIdentity.DEMO,id,request); return "SAVED"; }
                catch(PackageConflictException ex) { return "CONFLICT"; }
            };
            var first=executor.submit(writer); var second=executor.submit(writer); start.countDown();
            return List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS));
        }
    }
    PackageConfigurationService.SaveRequest request(Long version,int hours) {
        var selections=List.of(new ServiceSelection(ServiceType.PHOTOGRAPHY,hours));
        var quote=estimates.preview(SessionIdentity.DEMO,id,new EstimateService.Request(PackageCode.BASIC,selections));
        return new PackageConfigurationService.SaveRequest(PackageCode.BASIC,version,
            quote.packageCatalogVersion(),quote.serviceCatalogVersion(),quote.venueCatalogVersion(),
            quote.eventInputToken(),quote.pricingToken(),selections);
    }
}
