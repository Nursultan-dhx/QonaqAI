package kz.qonaqai.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PlanningAssistantTest {
    private final PlanningAssistant assistant=new PlanningAssistant();
    private final LocalDate today=LocalDate.of(2026,11,11);
    @Test void extractsRussianBriefWithGroupedBudgetAndNamedDate() {
        var result=assistant.suggest("Корпоратив на 80 гостей, бюджет 2 000 000 ₸, 20 декабря 2026, нужен простор",today);
        assertThat(result.fields()).containsEntry("type","CORPORATE").containsEntry("guests",80)
            .containsEntry("budget",new BigDecimal("2000000")).containsEntry("date","2026-12-20").containsEntry("strategy","QUALITY");
        assertThat(result.missing()).isEmpty();
    }
    @Test void extractsDecimalMillionsAndRelativeDate() {
        var result=assistant.suggest("Свадьба завтра на 120 человек, бюджет до 2,5 млн тенге, экономно",today);
        assertThat((BigDecimal)result.fields().get("budget")).isEqualByComparingTo("2500000");
        assertThat(result.fields()).containsEntry("date","2026-11-12").containsEntry("strategy","ECONOMY");
    }
    @Test void missingFieldsAreNeverInvented() {
        var result=assistant.suggest("Хочу красивый вечер",today);
        assertThat(result.fields()).isEmpty();
        assertThat(result.missing()).containsExactly("type","date","guests","budget");
    }
    @Test void rejectsImpossiblePastDatesAndOutOfRangeValues() {
        var result=assistant.suggest("Мероприятие 31.02.2027 на 10001 гостей, бюджет 0",today);
        assertThat(result.fields()).doesNotContainKeys("date","guests","budget");
        assertThat(result.warnings()).hasSize(3);
        assertThat(assistant.suggest("Корпоратив 2020-01-01",today).fields()).doesNotContainKey("date");
    }
}
