import React, { useEffect, useId, useRef, useState } from "react";
import BookingPanel from "./BookingPanel.jsx";
import EstimateBreakdown, { EstimateSummary } from "./EstimateBreakdown.jsx";
import "./service-preview.css";
import "./package-configurator.css";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    minimumFractionDigits: 0,
  }).format(value);
const units = {
  FIXED: "за мероприятие",
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export default function PackageConfigurator({
  event,
  request,
  onSessionExpired,
  onCreateProposal,
}) {
  const [metadata, setMetadata] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [packageCode, setPackageCode] = useState("BASIC");
  const [optionalDraft, setOptionalDraft] = useState({});
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const activeRequest = useRef(null);
  const activeSave = useRef(null);
  const loading = useRef(null);
  const alive = useRef(false);
  const version = useRef(null);
  const formId = useId();

  useEffect(() => {
    alive.current = true;
    refresh(true);
    return () => {
      alive.current = false;
      loading.current?.abort();
      activeRequest.current?.abort();
      activeSave.current?.abort();
      revision.current += 1;
    };
  }, [request, event.id]);

  async function refresh(replaceDraft = false) {
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    setLoadError("");
    try {
      const [packages, services, record] = await Promise.all([
        request("/api/package-options", { signal: controller.signal }),
        request("/api/service-options", { signal: controller.signal }),
        request("/api/events/" + event.id + "/package", {
          signal: controller.signal,
        }),
      ]);
      if (!alive.current || controller.signal.aborted) return;
      setMetadata({ packages, services });
      setSaved(record);
      version.current = record.configurationVersion;
      if (replaceDraft) {
        setPackageCode(record.configured ? record.packageCode : "BASIC");
        setOptionalDraft(
          Object.fromEntries(
            record.services.map((selection) => [
              selection.type,
              selection.hours == null ? {} : { hours: String(selection.hours) },
            ]),
          ),
        );
        setDirty(false);
      }
      setReady(true);
      setConflict(false);
      setError("");
      setPreview(null);
    } catch (failure) {
      if (alive.current && !controller.signal.aborted) {
        if (failure.status === 401) onSessionExpired();
        else setLoadError(failure.message);
      }
    }
  }

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
  const inputs = saved?.currentEventInputs || event;
  const result = preview?.quote || saved?.currentEstimate?.estimate;
  const resultIsSaved = !preview && !!saved?.configured;
  const outdated =
    resultIsSaved && saved.currentEstimate.freshness === "OUTDATED";

  function invalidate() {
    revision.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setPending(false);
    setPreview(null);
    setDirty(true);
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
  function selections() {
    return metadata.services.services
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
  }

  async function calculate(submitEvent) {
    submitEvent.preventDefault();
    if (!ready || activeRequest.current || !inputs.venueId) return;
    const draft = { packageCode, services: selections() };
    const controller = new AbortController();
    const currentRevision = ++revision.current;
    activeRequest.current = controller;
    setPending(true);
    setPreview(null);
    setError("");
    try {
      const quote = await request(
        "/api/events/" + event.id + "/estimate/preview",
        {
          method: "POST",
          body: JSON.stringify(draft),
          signal: controller.signal,
        },
      );
      if (
        alive.current &&
        !controller.signal.aborted &&
        revision.current === currentRevision
      )
        setPreview({ quote, draft, revision: currentRevision });
    } catch (failure) {
      if (
        alive.current &&
        !controller.signal.aborted &&
        revision.current === currentRevision
      ) {
        if (failure.status === 401) onSessionExpired();
        else setError(failure.message);
      }
    } finally {
      if (alive.current && revision.current === currentRevision) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  async function saveEstimate() {
    if (!preview || preview.revision !== revision.current || activeSave.current)
      return;
    const captured = preview;
    const controller = new AbortController();
    activeSave.current = controller;
    setSaving(true);
    setError("");
    try {
      const quote = captured.quote;
      const record = await request("/api/events/" + event.id + "/package", {
        method: "PUT",
        signal: controller.signal,
        body: JSON.stringify({
          ...captured.draft,
          expectedConfigurationVersion: version.current,
          packageCatalogVersion: quote.packageCatalogVersion,
          serviceCatalogVersion: quote.serviceCatalogVersion,
          venueCatalogVersion: quote.venueCatalogVersion,
          expectedEventInputToken: quote.eventInputToken,
          expectedPricingToken: quote.pricingToken,
        }),
      });
      if (!alive.current || controller.signal.aborted) return;
      setSaved(record);
      version.current = record.configurationVersion;
      setConflict(false);
      if (revision.current === captured.revision) {
        setDirty(false);
        setPreview(null);
      } // A newer local draft/preview survives this save response.
    } catch (failure) {
      if (alive.current && !controller.signal.aborted) {
        if (failure.status === 401) onSessionExpired();
        else {
          setError(failure.message);
          if (failure.status === 409) {
            setConflict(true);
            setPreview(null);
          }
        }
      }
    } finally {
      if (alive.current) setSaving(false);
      activeSave.current = null;
    }
  }
  return (
    <section className="service-preview package-configurator">
      <div
        className="package-selection-pane"
        role="region"
        aria-label="Пакет и услуги"
        tabIndex={0}
      >
        {!inputs.venueId && (
          <p role="alert" className="field-error">
            Сначала выберите и сохраните площадку в параметрах мероприятия.
          </p>
        )}
        {loadError && (
          <div role="alert">
            <p className="field-error">{loadError}</p>
            <button
              className="button secondary"
              onClick={() => refresh(!ready)}
            >
              Повторить загрузку
            </button>
          </div>
        )}
        {!metadata && !loadError && (
          <p role="status">Загрузка пакетов и услуг…</p>
        )}
        {metadata && ready && (
          <form id={formId} onSubmit={calculate}>
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
                    <span className="package-price">
                      {money(option.basePrice)}
                    </span>
                    {option.includedServiceTypes.length > 0 && (
                      <small>
                        Включено:{" "}
                        {option.includedServiceTypes
                          .map((type) => names[type])
                          .join(", ")}
                      </small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
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
                      <strong>{option.displayName}</strong>
                      {isIncluded ? (
                        <span className="service-price included-label">
                          Включено в пакет
                        </span>
                      ) : (
                        <span className="service-price">
                          {money(option.unitPrice)} {units[option.pricingUnit]}
                        </span>
                      )}
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
          </form>
        )}
      </div>
      <aside className="estimate-sidebar" aria-label="Смета и бронирование">
        <div className="estimate-sidebar-summary">
          <EstimateSummary
            estimate={result}
            budget={inputs.budget}
            outdated={outdated}
            savedWhileEditing={resultIsSaved && dirty}
          />
        </div>
        <div
          className="estimate-sidebar-details"
          role="region"
          aria-label="Детали сметы и бронирование"
          tabIndex={0}
        >
          {result && (
            <EstimateBreakdown
              estimate={result}
              mode={resultIsSaved ? "saved" : "preview"}
              outdated={outdated}
            />
          )}
          {metadata && ready && (
            <div className="estimate-actions">
              <button
                className={`button ${preview ? "secondary" : "primary"}`}
                type="submit"
                form={formId}
                disabled={pending || !inputs.venueId}
              >
                {pending ? "Рассчитываем…" : "Рассчитать смету"}
              </button>
              <button
                className={`button ${preview ? "primary" : "secondary"} estimate-save`}
                type="button"
                onClick={saveEstimate}
                disabled={
                  !preview || preview.revision !== revision.current || saving
                }
                data-save-estimate
              >
                {saving ? "Сохраняем…" : "Сохранить смету"}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {conflict && (
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                invalidate();
                refresh(false);
              }}
              data-refresh-saved
            >
              Обновить сохранённые данные (черновик останется)
            </button>
          )}
          <p className="service-preview-notice" role="status">
            {saved?.configured && !dirty && !preview
              ? "Смета сохранена"
              : "Предварительная смета — данные пока не сохранены."}
          </p>
          {ready && (saved?.configured || dirty || preview || saving) && (
            <div className="package-save-state" aria-live="polite">
              {saved?.configured ? (
                <p data-saved-revision={saved.currentEstimate.revision}>
                  Сохранённая смета №{saved.currentEstimate.revision} ·{" "}
                  {new Date(saved.savedAt).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {(dirty || preview) && (
                <p data-draft-dirty>Есть несохранённые изменения</p>
              )}
              {saving && <p>Сохраняем смету…</p>}
              {saved?.currentEstimate?.freshness === "OUTDATED" && (
                <p className="field-error" data-quote-outdated>
                  Параметры мероприятия изменились. Пересчитайте смету.
                </p>
              )}
              {saved?.currentEstimate?.catalogsChanged && (
                <p>
                  Тарифы изменились. Для расчёта в новых ценах пересчитайте
                  смету.
                </p>
              )}
            </div>
          )}
          {ready && (
            <details className="booking-disclosure">
              <summary>Бронирование площадки</summary>
              <BookingPanel
                event={event}
                saved={saved}
                draftPending={dirty || !!preview || saving}
                request={request}
                onSessionExpired={onSessionExpired}
              />
            </details>
          )}
          {onCreateProposal && (
            <div className="proposal-create">
              <button
                type="button"
                className="button secondary full"
                disabled={
                  !saved?.configured ||
                  dirty ||
                  !!preview ||
                  saving ||
                  outdated ||
                  saved?.currentEstimate?.catalogsChanged
                }
                onClick={onCreateProposal}
              >
                Подготовить предложение
              </button>
              <p className="service-preview-notice">
                Сначала сохраните актуальную смету.
              </p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
