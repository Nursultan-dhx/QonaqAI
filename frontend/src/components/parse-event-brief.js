const typeRules = [
  ["WEDDING", /(?:свадьб\w*|той)/i, "Свадьба"],
  ["BIRTHDAY", /(?:день\s+рождени\w*|деньрожден\w*)/i, "День рождения"],
  ["CORPORATE", /(?:корпоратив\w*|тимбилдинг\w*)/i, "Корпоратив"],
  ["CONFERENCE", /(?:конференци\w*|форум\w*|семинар\w*)/i, "Конференция"],
  ["GRADUATION", /(?:выпускн\w*|выпуск\w*)/i, "Выпускной"],
  ["OTHER", /(?:вечеринк\w*|мероприяти\w*)/i, "Мероприятие"],
];

function validDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isoDate(year, month, day) {
  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function parseDate(text) {
  const iso = text.match(
    /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/,
  );
  if (iso) {
    const year = Number(iso[1]),
      month = Number(iso[2]),
      day = Number(iso[3]);
    if (validDate(year, month, day)) return isoDate(year, month, day);
  }
  const local = text.match(
    /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](20\d{2})\b/,
  );
  if (local) {
    const day = Number(local[1]),
      month = Number(local[2]),
      year = Number(local[3]);
    if (validDate(year, month, day)) return isoDate(year, month, day);
  }
  return undefined;
}

function parseBudget(text) {
  const budget = text.match(
    /бюджет(?:ом|а|е)?\s*(?:[-—:]|до|около|примерно)?\s*(\d+(?:[.,]\d+)?(?:[ \u00a0]\d{3})*)(?:\s*(млн|миллион\w*|тыс\w*))?(?=\s*(?:₸|тенге|тг|$|[,.]))/i,
  );
  if (!budget) return undefined;
  const value = Number(budget[1].replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const unit = budget[2]?.toLocaleLowerCase("ru");
  const multiplier = unit?.startsWith("м")
    ? 1_000_000
    : unit?.startsWith("тыс")
      ? 1_000
      : 1;
  return Math.round(value * multiplier);
}

export function parseEventBrief(brief) {
  const text = brief.trim();
  const result = {};
  if (!text) return result;

  const type = typeRules.find(([, pattern]) => pattern.test(text));
  if (type) {
    result.type = type[0];
    result.title = type[2];
  }

  const guests = text.match(
    /(\d(?:[\d \u00a0]{0,5}))\s*(?:гост(?:ей|я|ь)|человек)/i,
  );
  if (guests) {
    const value = Number(guests[1].replace(/\s/g, ""));
    if (Number.isInteger(value) && value >= 1 && value <= 10_000)
      result.guests = value;
  }

  const budget = parseBudget(text);
  if (budget && budget <= 1_000_000_000) result.budget = budget;
  const date = parseDate(text);
  if (date) result.date = date;

  if (/(?:простор\w*|премиум\w*|качест\w*)/i.test(text))
    result.strategy = "QUALITY";
  if (/(?:эконом\w*|дешев\w*|сэконом\w*)/i.test(text))
    result.strategy = "ECONOMY";
  return result;
}
