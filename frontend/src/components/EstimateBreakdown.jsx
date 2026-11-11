import React from "react";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT" }).format(
    value,
  );
const number = (value) =>
  new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 2 }).format(value);
const categories = {
  VENUE: "Аренда площадки",
  PACKAGE: "Основа пакета",
  INCLUDED_SERVICE: "Включённая услуга",
  ADDITIONAL_SERVICE: "Дополнительная услуга",
};
const units = {
  FIXED: "за мероприятие",
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export default function EstimateBreakdown({
  estimate,
  mode = "preview",
  outdated = false,
}) {
  const exceeded = estimate.budgetStatus === "EXCEEDED";
  return (
    <section className="service-result estimate-result" aria-live="polite">
      <h3>
        {mode === "saved" ? "Сохранённая смета" : "Предварительный расчёт"} ·
        DEMO
      </h3>
      <div className="service-table-scroll">
        <table>
          <caption>
            Учебные начисления: аренда, пакет и дополнительные услуги
          </caption>
          <thead>
            <tr>
              <th>Позиция</th>
              <th>Тариф</th>
              <th>Количество</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((line) => (
              <tr key={line.code} data-line-code={line.code}>
                <th scope="row">
                  {line.displayName}
                  <small className="estimate-line-kind">
                    {categories[line.category]} ·{" "}
                    {line.priceSource === "DEMO" ? "DEMO" : "Цена неизвестна"}
                  </small>
                </th>
                <td>
                  {line.included
                    ? "Включено в пакет"
                    : line.unitPrice == null
                      ? "Неизвестно"
                      : money(line.unitPrice) + " " + units[line.pricingUnit]}
                </td>
                <td>{line.quantity}</td>
                <td>
                  {line.included
                    ? "Без доплаты"
                    : line.total == null
                      ? "Неизвестно"
                      : money(line.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="estimate-summary">
        <div>
          <dt>Пакет и дополнительные услуги</dt>
          <dd>{money(estimate.packageSubtotal)}</dd>
        </div>
        <div>
          <dt>Аренда площадки · DEMO</dt>
          <dd>
            {estimate.venueCharge == null
              ? "Цена неизвестна"
              : money(estimate.venueCharge)}
          </dd>
        </div>
        <div className="estimate-total">
          <dt>Полная стоимость</dt>
          <dd data-estimate-total>
            {estimate.totalCost == null
              ? "Пока неизвестна"
              : money(estimate.totalCost)}
          </dd>
        </div>
        {!estimate.quoteComplete && (
          <div>
            <dt>Известный подытог</dt>
            <dd>{money(estimate.knownSubtotal)}</dd>
          </div>
        )}
        <div>
          <dt>Бюджет мероприятия</dt>
          <dd>{money(estimate.eventBudget)}</dd>
        </div>
        {estimate.remainingBudget != null && !exceeded && (
          <div>
            <dt>Остаток бюджета</dt>
            <dd data-budget-remaining>{money(estimate.remainingBudget)}</dd>
          </div>
        )}
        {exceeded && (
          <div>
            <dt>
              {estimate.quoteComplete
                ? "Превышение бюджета"
                : "Минимальное превышение бюджета"}
            </dt>
            <dd data-budget-excess>{money(estimate.budgetExcess)}</dd>
          </div>
        )}
        {estimate.budgetUsedPercent != null && (
          <div>
            <dt>Использовано бюджета</dt>
            <dd data-budget-percent>{number(estimate.budgetUsedPercent)} %</dd>
          </div>
        )}
      </dl>
      <p
        className={
          "estimate-budget " + (exceeded ? "estimate-budget-exceeded" : "")
        }
        role="status"
        data-budget-status={estimate.budgetStatus}
      >
        {outdated
          ? "Исторический расчёт: параметры мероприятия изменились. Для актуальной сметы нужен пересчёт."
          : exceeded
            ? estimate.quoteComplete
              ? "Стоимость превышает бюджет. Можно изменить пакет или набор услуг."
              : "Известные начисления уже превышают бюджет; аренда пока неизвестна."
            : estimate.budgetStatus === "WITHIN_BUDGET"
              ? "Демонстрационная смета укладывается в бюджет."
              : "Без цены аренды нельзя определить полную стоимость и достаточность бюджета."}
      </p>
      {!estimate.quoteComplete && (
        <p>
          Для выбранной площадки нет DEMO-тарифа аренды. Неизвестная цена не
          считается нулевой.
        </p>
      )}
      <p>
        {mode === "saved"
          ? "Это сохранённый снимок цен и параметров мероприятия."
          : "Предварительная смета — данные пока не сохранены."}
      </p>
    </section>
  );
}
