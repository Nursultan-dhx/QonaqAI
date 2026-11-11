package kz.qonaqai.service;
import java.time.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.AiDailyUsage;
import kz.qonaqai.persistence.AiDailyUsageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiQuota {
    public record Usage(int used,int limit) {}
    private final AiDailyUsageRepository repository;
    private final PlanService plans;
    private final TransactionTemplate transaction;
    public AiQuota(AiDailyUsageRepository repository,PlanService plans,PlatformTransactionManager manager) {
        this.repository=repository; this.plans=plans; this.transaction=new TransactionTemplate(manager);
    }
    private String id(SessionIdentity identity) { return LocalDate.now(ZoneId.of("Asia/Almaty"))+":"+(identity.accountId()==null?"demo":identity.accountId()); }
    // This local app runs one server; hold the monitor until the transaction has committed.
    public synchronized Usage reserve(SessionIdentity identity) {
        return transaction.execute(status->{
            int limit=plans.current(identity).plan().dailyAiMessages();
            var row=repository.findById(id(identity)).orElseGet(()->new AiDailyUsage(id(identity)));
            if (row.requests()>=limit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Ответы ИИ на сегодня закончились. Лимит обновится завтра; в Pro доступно 100 ответов в день.");
            row.increment(); repository.saveAndFlush(row); return new Usage(row.requests(),limit);
        });
    }
    public synchronized void refund(SessionIdentity identity) {
        transaction.executeWithoutResult(status->repository.findById(id(identity)).ifPresent(row->{row.refund();repository.save(row);}));
    }
}
