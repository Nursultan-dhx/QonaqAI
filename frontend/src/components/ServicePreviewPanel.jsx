import React, { useEffect, useRef, useState } from "react";
import "./service-preview.css";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT" }).format(
    value,
  );
const units = {
  FIXED: "за мероприятие",
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export default function ServicePreviewPanel({
  event,
  request,
  onSessionExpired,
}) {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const revision = useRef(0);
  const activeRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request("/api/service-options", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCatalog(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setCatalogError(failure.message);
      });
    return () => {
      controller.abort();
      revision.current += 1;
      activeRequest.current?.abort();
    };
  }, [request]);

  function change(type, value) {
    revision.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setPending(false);
    setResult(null);
    setError("");
    setSelected((current) => {
      const next = { ...current };
      if (value === null) delete next[type];
      else next[type] = value;
      return next;
    });
  }

  async function calculate(submitEvent) {
    submitEvent.preventDefault();
    if (activeRequest.current || !catalog) return;
    const services = catalog.services
      .filter((option) => selected[option.serviceType] !== undefined)
      .map((option) => ({
        type: option.serviceType,
        ...(option.pricingUnit === "PER_HOUR"
          ? { hours: Number(selected[option.serviceType].hours) }
          : {}),
      }));
    const controller = new AbortController();
    const currentRevision = ++revision.current;
    activeRequest.current = controller;
    setPending(true);
    setResult(null);
    setError("");
    try {
      const response = await request(
        "/api/events/" + event.id + "/services/preview",
        {
          method: "POST",
          body: JSON.stringify({ services }),
          signal: controller.signal,
        },
      );
      if (!controller.signal.aborted && revision.current === currentRevision)
        setResult(response);
    } catch (failure) {
      if (!controller.signal.aborted && revision.current === currentRevision) {
        if (failure.status === 401) onSessionExpired();
        else setError(failure.message);
      }
    } finally {
      if (revision.current === currentRevision) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section className="service-preview">
      <p className="service-preview-notice">
        Предварительный расчёт дополнительных услуг. Пакет и стоимость площадки
        пока не включены.
      </p>
      <p>
        <strong>Демонстрационные цены (DEMO).</strong> Это вымышленные тарифы, а
        не предложения поставщиков. Выбор услуг и расчёт не сохраняются.
      </p>
      <p>
        {event.title} · Гостей в сохранённом мероприятии: {event.guests}
      </p>
      {catalogError && (
        <p role="alert" className="field-error">
          {catalogError}
        </p>
      )}
      {!catalog && !catalogError && <p role="status">Загрузка услуг…</p>}
      {catalog && (
        <form onSubmit={calculate}>
          <fieldset className="service-options">
            <legend>Дополнительные услуги</legend>
            {catalog.services.map((option) => {
              const chosen = selected[option.serviceType] !== undefined;
              return (
                <div className="service-option" key={option.serviceType}>
                  <label className="service-choice">
                    <input
                      type="checkbox"
                      checked={chosen}
                      onChange={(e) =>
                        change(
                          option.serviceType,
                          e.target.checked
                            ? option.pricingUnit === "PER_HOUR"
                              ? { hours: "1" }
                              : {}
                            : null,
                        )
                      }
                    />
                    <span>
                      <strong>{option.displayName}</strong>
                      <span>
                        {money(option.unitPrice)} {units[option.pricingUnit]} ·
                        DEMO
                      </span>
                      <small>{option.description}</small>
                    </span>
                  </label>
                  {chosen && option.pricingUnit === "PER_HOUR" && (
                    <label className="service-hours">
                      Часов для услуги «{option.displayName}»
                      <input
                        type="number"
                        min={catalog.minHours}
                        max={catalog.maxHours}
                        step="1"
                        required
                        value={selected[option.serviceType].hours}
                        onChange={(e) =>
                          change(option.serviceType, { hours: e.target.value })
                        }
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </fieldset>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Рассчитываем…" : "Рассчитать услуги"}
          </button>
          <small className="service-catalog-version">
            Каталог {catalog.catalogVersion} · KZT
          </small>
        </form>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {result && (
        <div className="service-result" role="status" aria-live="polite">
          <h3>Расчёт дополнительных услуг · DEMO</h3>
          {result.lines.length === 0 ? (
            <p>Дополнительные услуги не выбраны.</p>
          ) : (
            <div className="service-table-scroll">
              <table>
                <caption>Демонстрационные начисления по услугам</caption>
                <thead>
                  <tr>
                    <th>Услуга</th>
                    <th>Тариф</th>
                    <th>Количество</th>
                    <th>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => (
                    <tr key={line.serviceType}>
                      <th scope="row">{line.displayName}</th>
                      <td>
                        {money(line.unitPrice)} {units[line.pricingUnit]}
                      </td>
                      <td>{line.quantity}</td>
                      <td>{money(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="service-subtotal">
            <span>Подытог дополнительных услуг</span>
            <strong>{money(result.servicesSubtotal)}</strong>
          </p>
          <p>
            Без пакета и аренды площадки. Расчёт выполнен по сохранённым
            параметрам мероприятия.
          </p>
        </div>
      )}
    </section>
  );
}
