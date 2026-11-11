package kz.qonaqai.service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.regex.*;
import org.springframework.stereotype.Service;

/** Offline demo provider: extracts suggestions, never creates events or invents venue prices. */
@Service
public class PlanningAssistant {
    public record Suggestions(String provider, Map<String,Object> fields, List<String> missing, List<String> warnings) {}
    private static final ZoneId ZONE = ZoneId.of("Asia/Almaty");
    private static final Map<String,Integer> MONTHS = Map.ofEntries(
        Map.entry("января",1), Map.entry("февраля",2), Map.entry("марта",3), Map.entry("апреля",4),
        Map.entry("мая",5), Map.entry("июня",6), Map.entry("июля",7), Map.entry("августа",8),
        Map.entry("сентября",9), Map.entry("октября",10), Map.entry("ноября",11), Map.entry("декабря",12));

    public Suggestions suggest(String brief) { return suggest(brief, LocalDate.now(ZONE)); }

    public Suggestions suggest(String brief, LocalDate today) {
        String text = brief.toLowerCase(Locale.ROOT).replace('\u00a0',' ');
        var fields = new LinkedHashMap<String,Object>();
        var warnings = new ArrayList<String>();
        String[][] types = {{"WEDDING","Свадьба","свадьб|той"}, {"BIRTHDAY","День рождения","день\\s+рожден"},
            {"CORPORATE","Корпоратив","корпоратив|тимбилдинг"}, {"CONFERENCE","Конференция","конференц|форум|семинар"},
            {"GRADUATION","Выпускной","выпускн"}, {"OTHER","Мероприятие","вечеринк|мероприяти"}};
        for (var rule : types) if (Pattern.compile(rule[2]).matcher(text).find()) {
            fields.put("type",rule[0]); fields.put("title",rule[1]); break;
        }
        var guests = Pattern.compile("(\\d(?:[\\d ]{0,5}))\\s*(?:гост(?:ей|я|ь)|человек)").matcher(text);
        if (guests.find()) {
            int count = Integer.parseInt(guests.group(1).replace(" ",""));
            if (count >= 1 && count <= 10000) fields.put("guests",count);
            else warnings.add("Количество гостей должно быть от 1 до 10 000.");
        }
        var budget = Pattern.compile("бюджет(?:ом|а|е)?\\s*(?:[-—:]|до|около|примерно)?\\s*(\\d+(?: \\d{3})*(?:[.,]\\d{1,2})?)\\s*(млн|миллион[\\p{L}]*|тыс[\\p{L}]*)?").matcher(text);
        if (budget.find()) {
            BigDecimal value = new BigDecimal(budget.group(1).replace(" ","").replace(',','.'));
            String unit = budget.group(2);
            if (unit != null) value = value.multiply(BigDecimal.valueOf(unit.startsWith("м") ? 1000000 : 1000));
            if (value.compareTo(BigDecimal.ONE)>=0 && value.compareTo(new BigDecimal("1000000000"))<=0) fields.put("budget",value);
            else warnings.add("Бюджет должен быть от 1 до 1 млрд ₸.");
        }
        LocalDate date = null;
        try {
            var iso = Pattern.compile("(?<!\\d)(20\\d{2})[-/.](\\d{1,2})[-/.](\\d{1,2})(?!\\d)").matcher(text);
            var local = Pattern.compile("(?<!\\d)(\\d{1,2})[./-](\\d{1,2})[./-](20\\d{2})(?!\\d)").matcher(text);
            var named = Pattern.compile("(?<!\\d)(\\d{1,2})\\s+("+String.join("|",MONTHS.keySet())+")\\s+(20\\d{2})(?!\\d)").matcher(text);
            if (iso.find()) date=LocalDate.of(Integer.parseInt(iso.group(1)),Integer.parseInt(iso.group(2)),Integer.parseInt(iso.group(3)));
            else if (local.find()) date=LocalDate.of(Integer.parseInt(local.group(3)),Integer.parseInt(local.group(2)),Integer.parseInt(local.group(1)));
            else if (named.find()) date=LocalDate.of(Integer.parseInt(named.group(3)),MONTHS.get(named.group(2)),Integer.parseInt(named.group(1)));
            else if (text.contains("послезавтра")) date=today.plusDays(2);
            else if (text.contains("завтра")) date=today.plusDays(1);
            else if (text.contains("сегодня")) date=today;
            if (date!=null && date.isBefore(today)) { warnings.add("Дата в прошлом. Выберите будущую дату."); date=null; }
        } catch (DateTimeException ex) { warnings.add("Такой даты не существует. Уточните дату мероприятия."); }
        if (date!=null) fields.put("date",date.toString());
        if (text.matches("(?s).*(простор|премиум|качеств).*")) fields.put("strategy","QUALITY");
        if (text.matches("(?s).*(эконом|дешев|сэконом).*")) fields.put("strategy","ECONOMY");
        var missing = List.of("type","date","guests","budget").stream().filter(key->!fields.containsKey(key)).toList();
        return new Suggestions("DEMO_RULES", Collections.unmodifiableMap(fields), missing, List.copyOf(warnings));
    }
}
