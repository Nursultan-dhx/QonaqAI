package kz.qonaqai.patterns.builder;

import java.util.*;
import kz.qonaqai.domain.*;
import kz.qonaqai.service.PackageConfigurationService.SavedQuote;

/** Builder assembles the document in explicit steps from verified project data only. */
public final class ProposalBuilder {
    private final List<String> sections = new ArrayList<>();
    public ProposalBuilder event(EventPlan event) {
        sections.add("ПРЕДЛОЖЕНИЕ · QonaqAI DEMO\n"+event.title()+"\nТип: "+event.type().label
            +"\nДата: "+event.date()+"\nГостей: "+event.guests()+"\nБюджет: "+event.budget().toPlainString()+" ₸");
        return this;
    }
    public ProposalBuilder venue(Venue venue) {
        sections.add("ПЛОЩАДКА\n"+venue.name()+" · "+venue.hall()+"\n"+venue.address());
        return this;
    }
    public ProposalBuilder estimate(SavedQuote saved) {
        var quote=saved.estimate();
        StringBuilder text=new StringBuilder("ПАКЕТ И СМЕТА\nПакет: "+quote.packageCode()+"\nСохранённая смета №"+saved.revision());
        for (var line : quote.lines()) text.append("\n• ").append(line.displayName()).append(" × ").append(line.quantity())
            .append(": ").append(line.total()==null ? "цена по запросу" : line.total().toPlainString()+" ₸")
            .append(line.included() ? " (включено в пакет)" : "");
        text.append("\n").append(quote.quoteComplete() ? "Итого: "+quote.totalCost().toPlainString()+" ₸"
            : "Известная часть: "+quote.knownSubtotal().toPlainString()+" ₸. Полная сумма требует уточнения цены площадки.");
        if (quote.budgetStatus()==kz.qonaqai.service.EstimateService.BudgetStatus.EXCEEDED)
            text.append("\nПревышение бюджета: ").append(quote.budgetExcess().toPlainString()).append(" ₸");
        sections.add(text.toString()); return this;
    }
    public ProposalBuilder demoTerms() {
        sections.add("УСЛОВИЯ DEMO\nЦены сметы вымышленные и используются для учебного расчёта. "
            +"Предложение не подтверждает доступность площадки и не создаёт бронь. Реальные деньги не списываются.");
        return this;
    }
    public String build() {
        if (sections.size()!=4) throw new IllegalStateException("Заполните мероприятие, площадку, смету и условия");
        return String.join("\n\n",sections);
    }
}
