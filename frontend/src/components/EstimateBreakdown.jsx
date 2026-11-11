import React from "react";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT" }).format(
    value,
  );
const number = (value) =>
  new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 2 }).format(value);
const units = {
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export function EstimateSummary({
  estimate,
  budget,
  outdated,
  savedWhileEditing,
}) {
  const exceeded = estimate?.budgetStatus === "EXCEEDED";
  const comparison = exceeded
    ? estimate.budgetExcess
    : estimate?.remainingBudget;
  const usedPercent = estimate?.budgetUsedPercent;
  const formattedPercent =
    usedPercent == null ? null : `${number(usedPercent)} %`;
  return (
    <>
      <dl className="estimate-summary" aria-live="polite" aria-atomic="true">
        <div className="estimate-total">
          <dt>
            {outdated
              ? "Полная стоимость · прошлый расчёт"
              : savedWhileEditing
                ? "Полная стоимость · сохранённая смета"
                : "Полная стоимость"}
          </dt>
          <dd
            className={
              estimate && estimate.totalCost == null
                ? "estimate-total-unknown"
                : undefined
            }
            data-estimate-total={estimate ? "" : undefined}
          >
            {!estimate
              ? "—"
              : estimate.totalCost == null
                ? "Пока неизвестна"
                : money(estimate.totalCost)}
          </dd>
        </div>
        <div>
          <dt>Бюджет мероприятия</dt>
          <dd>{money(estimate?.eventBudget ?? budget)}</dd>
        </div>
        {comparison != null && (
          <div className={exceeded ? "estimate-summary-exceeded" : undefined}>
            <dt>
              {exceeded
                ? estimate.quoteComplete
                  ? "Превышение бюджета"
                  : "Минимальное превышение бюджета"
                : "Остаток бюджета"}
            </dt>
            <dd
              data-budget-remaining={!exceeded ? "" : undefined}
              data-budget-excess={exceeded ? "" : undefined}
            >
              {money(comparison)}
            </dd>
          </div>
        )}
      </dl>
      {formattedPercent && (
        <div
          className={`estimate-budget-meter${exceeded ? " estimate-budget-meter-exceeded" : ""}`}
        >
          <div className="estimate-budget-meter-label">
            <span>Использовано бюджета</span>
            <strong data-budget-percent>{formattedPercent}</strong>
          </div>
          <progress
            aria-label="Использовано бюджета"
            aria-valuetext={formattedPercent}
            max={100}
            value={Math.min(100, Math.max(0, usedPercent))}
          />
        </div>
      )}
    </>
  );
}

function budgetWarning(estimate, outdated) {
  if (outdated)
    return "Параметры мероприятия изменились. Для актуальной сметы нужен пересчёт.";
  if (estimate.budgetStatus === "EXCEEDED") {
    return estimate.quoteComplete
      ? "Стоимость превышает бюджет. Можно изменить пакет или набор услуг."
      : "Известные начисления уже превышают бюджет. Цена аренды неизвестна.";
  }
  if (!estimate.quoteComplete)
    return "Цена аренды неизвестна. Полную стоимость и остаток бюджета пока нельзя определить.";
  return null;
}

export default function EstimateBreakdown({
  estimate,
  mode = "preview",
  outdated = false,
}) {
  const exceeded = estimate.budgetStatus === "EXCEEDED";
  const warning = budgetWarning(estimate, outdated);
  return (
    <section
      className="service-result estimate-result"
      data-budget-status={estimate.budgetStatus}
    >
      <h3>
        {mode === "saved" ? "Сохранённая смета" : "Предварительный расчёт"} ·
        DEMO
      </h3>
      <ul className="estimate-line-list" aria-label="Позиции сметы">
        {estimate.lines.map((line) => (
          <li
            className="estimate-line"
            key={line.code}
            data-line-code={line.code}
          >
            <div className="estimate-line-description">
              <strong>{line.displayName}</strong>
              {!line.included &&
                line.unitPrice != null &&
                units[line.pricingUnit] && (
                  <small className="estimate-line-rate">
                    {money(line.unitPrice)} {units[line.pricingUnit]} ×{" "}
                    {line.quantity}
                  </small>
                )}
            </div>
            <span className="estimate-line-amount">
              {line.included
                ? "Без доплаты"
                : line.total == null
                  ? "Цена неизвестна"
                  : money(line.total)}
            </span>
          </li>
        ))}
      </ul>
      {!estimate.quoteComplete && (
        <dl className="estimate-cost-details">
          <div>
            <dt>Известный подытог</dt>
            <dd>{money(estimate.knownSubtotal)}</dd>
          </div>
        </dl>
      )}
      {warning && (
        <p
          className={`estimate-budget${exceeded ? " estimate-budget-exceeded" : ""}`}
          role="status"
        >
          {warning}
        </p>
      )}
    </section>
  );
}
