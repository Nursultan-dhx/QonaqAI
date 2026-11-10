import React, { useEffect, useRef, useState } from "react";
import EstimateBreakdown from "./EstimateBreakdown.jsx";
import "./service-preview.css";
import "./package-configurator.css";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT" }).format(
    value,
  );
const units = {
  FIXED: "за мероприятие",
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export default function PackageConfigurator({
  event,
  request,
  onSessionExpired,
}) {
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [packageCode, setPackageCode] = useState("BASIC");
  // Keep optional intent independently of package inclusions: switching back restores it.
  const [optionalDraft, setOptionalDraft] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const revision = useRef(0);
  const activeRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    Promise.all([
      request("/api/package-options", { signal: controller.signal }),
      request("/api/service-options", { signal: controller.signal }),
    ])
      .then(([packages, services]) => {
        if (!controller.signal.aborted) setMetadata({ packages, services });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setLoadError(failure.message);
          controller.abort();
        }
      });
    return () => {
      controller.abort();
      revision.current += 1;
      activeRequest.current?.abort();
    };
  }, [request, event.id, reload]);

  const selectedPackage = metadata?.packages.packages.find(
    (option) => option.packageCode === packageCode,
  );
  const included = new Set(selectedPackage?.includedServiceTypes || []);
  const names = Object.fromEntries(
    (metadata?.services.services || []).map((service) => [
      service.serviceType,
      service.displayName,
    ]),
  );

  function invalidate() {
    revision.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setPending(false);
    setResult(null);
    setError("");
  }

  function changeService(type, selection) {
    invalidate();
    setOptionalDraft((current) => {
      const next = { ...current };
      if (selection === null) delete next[type];
      else next[type] = selection;
      return next;
    });
  }

  function changePackage(code) {
    invalidate();
    setPackageCode(code);
  }

  async function calculate(submitEvent) {
    submitEvent.preventDefault();
    if (!metadata || activeRequest.current || !event.venueId) return;
    const services = metadata.services.services
      .filter(
        (option) =>
          optionalDraft[option.serviceType] !== undefined &&
          !included.has(option.serviceType),
      )
      .map((option) => ({
        type: option.serviceType,
        ...(option.pricingUnit === "PER_HOUR"
          ? { hours: Number(optionalDraft[option.serviceType].hours) }
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
        "/api/events/" + event.id + "/estimate/preview",
        {
          method: "POST",
          body: JSON.stringify({ packageCode, services }),
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
    <section className="service-preview package-configurator">
      <p className="service-preview-notice">
        Предварительная смета — данные пока не сохранены.
      </p>
      <p>
        <strong>Демонстрационные цены (DEMO).</strong> Пакеты, услуги и аренда
        рассчитаны по вымышленным учебным тарифам, а не предложениям
        поставщиков.
      </p>
      <p>
        {event.title} · Гостей в сохранённом мероприятии: {event.guests}
      </p>
      {!event.venueId && (
        <p role="alert" className="field-error">
          Сначала выберите и сохраните площадку в параметрах мероприятия.
        </p>
      )}
      {loadError && (
        <div role="alert">
          <p className="field-error">{loadError}</p>
          <button
            className="button secondary"
            onClick={() => setReload((value) => value + 1)}
          >
            Повторить загрузку
          </button>
        </div>
      )}
      {!metadata && !loadError && (
        <p role="status">Загрузка пакетов и услуг…</p>
      )}
      {metadata && (
        <form onSubmit={calculate}>
          <fieldset className="package-options">
            <legend>Пакет мероприятия</legend>
            <div className="package-grid">
              {metadata.packages.packages.map((option) => (
                <label
                  className={
                    "package-card" +
                    (packageCode === option.packageCode ? " selected" : "")
                  }
                  key={option.packageCode}
                >
                  <input
                    type="radio"
                    name="packageCode"
                    value={option.packageCode}
                    checked={packageCode === option.packageCode}
                    onChange={() => changePackage(option.packageCode)}
                  />
                  <strong>{option.displayName}</strong>
                  <span>{money(option.basePrice)} · DEMO</span>
                  <small>
                    {option.includedServiceTypes.length
                      ? "Включено: " +
                        option.includedServiceTypes
                          .map((type) => names[type])
                          .join(", ")
                      : "Без включённых дополнительных услуг"}
                  </small>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="package-draft-policy">
            Выбранные дополнительные услуги сохраняются при переключении пакета.
            Включённые услуги повторно не оплачиваются.
          </p>
          <fieldset className="service-options">
            <legend>Дополнительные услуги</legend>
            {metadata.services.services.map((option) => {
              const isIncluded = included.has(option.serviceType);
              const chosen = optionalDraft[option.serviceType] !== undefined;
              return (
                <div
                  className={
                    "service-option" + (isIncluded ? " service-included" : "")
                  }
                  key={option.serviceType}
                  data-service-type={option.serviceType}
                >
                  <label className="service-choice">
                    <input
                      type="checkbox"
                      checked={isIncluded || chosen}
                      disabled={isIncluded}
                      onChange={(e) =>
                        changeService(
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
                      {isIncluded ? (
                        <span className="included-label">Включено в пакет</span>
                      ) : (
                        <span>
                          {money(option.unitPrice)} {units[option.pricingUnit]}{" "}
                          · DEMO
                        </span>
                      )}
                      <small>{option.description}</small>
                    </span>
                  </label>
                  {chosen &&
                    !isIncluded &&
                    option.pricingUnit === "PER_HOUR" && (
                      <label className="service-hours">
                        Часов для услуги «{option.displayName}»
                        <input
                          type="number"
                          min={metadata.services.minHours}
                          max={metadata.services.maxHours}
                          step="1"
                          required
                          value={optionalDraft[option.serviceType].hours}
                          onChange={(e) =>
                            changeService(option.serviceType, {
                              hours: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                </div>
              );
            })}
          </fieldset>
          <button
            className="button primary"
            type="submit"
            disabled={pending || !event.venueId}
          >
            {pending ? "Рассчитываем…" : "Рассчитать смету"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {result && <EstimateBreakdown estimate={result} />}
    </section>
  );
}
