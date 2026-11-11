package kz.qonaqai.service;

import java.util.*;
import kz.qonaqai.auth.SessionIdentity;
import kz.qonaqai.domain.*;
import kz.qonaqai.domain.AccountPlan.Code;
import kz.qonaqai.domain.estimate.PackageConflictException;
import kz.qonaqai.persistence.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional
public class PlanService {
    public record Option(Code code,String label,int maxProposals,boolean textExport,String demoPrice,List<String> features,int dailyAiMessages,boolean aiProposal) {}
    public record Subscription(Option plan,long savedProposals,boolean demoBilling,boolean canSwitch) {}
    private static final List<Option> OPTIONS=List.of(
        new Option(Code.FREE,"Free",3,false,"0 ₸",List.of("10 ответов ИИ в день: вопросы и подбор площадок","Карточки площадок с фото и объяснением выбора","Расчёт сметы и до 3 сохранённых предложений","Личный кабинет и учебное бронирование"),10,false),
        new Option(Code.PRO,"Pro",100,true,"4 990 ₸",List.of("100 ответов ИИ в день для проработки вариантов","ИИ пишет вступление к предложению под ваше событие","До 100 сохранённых предложений для разных проектов","Скачивание готового предложения в TXT","Все возможности Free"),100,true));
    private final AccountRepository accounts;
    private final AccountPlanRepository plans;
    private final ProposalRepository proposals;
    private final NotificationRepository notifications;
    public PlanService(AccountRepository accounts,AccountPlanRepository plans,ProposalRepository proposals,NotificationRepository notifications) {
        this.accounts=accounts; this.plans=plans; this.proposals=proposals; this.notifications=notifications;
    }
    public List<Option> options() { return OPTIONS; }
    @Transactional(readOnly=true)
    public Subscription current(SessionIdentity identity) {
        Code code=identity.accountId()==null?Code.FREE:plans.findById(identity.accountId()).map(AccountPlan::code).orElse(Code.FREE);
        return new Subscription(option(code),proposals.countByOwnerId(identity.accountId()),true,identity.accountId()!=null);
    }
    public Subscription change(SessionIdentity identity,Code code) {
        lockAccount(identity);
        var existing=plans.findById(identity.accountId());
        var previous=existing.map(AccountPlan::code).orElse(Code.FREE);
        if (previous!=code) {
            var plan=existing.orElseGet(()->new AccountPlan(identity.accountId(),code)); plan.change(code); plans.saveAndFlush(plan);
            notifications.save(new Notification(identity.accountId(),"Демонстрационный тариф изменён на "+option(code).label()+". Деньги не списываются."));
        }
        return current(identity);
    }
    public void requireProposalCapacity(SessionIdentity identity) {
        // The account lock serializes quota checks across different events and plan changes.
        lockAccount(identity);
        var subscription=current(identity);
        if (subscription.savedProposals()>=subscription.plan().maxProposals())
            throw new PackageConflictException("PLAN_LIMIT","Лимит предложений тарифа "+subscription.plan().label()+" исчерпан. Выберите Pro в демонстрационных тарифах.");
    }
    public void requireTextExport(SessionIdentity identity) {
        if (!current(identity).plan().textExport())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Выгрузка TXT доступна в демонстрационном тарифе Pro");
    }
    public void requireAiProposal(SessionIdentity identity) {
        if (identity.accountId()==null || !current(identity).plan().aiProposal())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Текст предложения с ИИ доступен в Pro. Выберите Pro в разделе «Тарифы».");
    }
    private void lockAccount(SessionIdentity identity) {
        if (identity.accountId()==null) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Для сохранения предложений и выбора тарифа войдите в личный аккаунт.");
        accounts.findForUpdate(identity.accountId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Аккаунт не найден"));
    }
    private Option option(Code code) { return OPTIONS.stream().filter(option->option.code()==code).findFirst().orElseThrow(); }
}
