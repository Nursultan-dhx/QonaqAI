import React, { useEffect, useRef, useState } from "react";
import Icon2Gis from "./Icon2Gis.jsx";
import EventEditModal from "./EventEditModal.jsx";
import "./event-estimate.css";

const money = (n) =>
  new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const humanDate = (d) =>
  d
    ? new Date(d + (d.includes("T") ? "" : "T12:00:00")).toLocaleDateString(
        "ru-RU",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    : "Дата не выбрана";

const units = {
  FIXED: "за мероприятие",
  PER_HOUR: "за час",
  PER_GUEST: "за гостя",
};

export default function EventEstimateDetail({
  event,
  venue,
  venues = [],
  eventTypes = [],
  onBack,
  onEditParameters,
  onProposal,
  request,
  onSessionExpired,
  onUpdateEvent,
}) {
  const [currentEvent, setCurrentEvent] = useState(event);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  const [metadata, setMetadata] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [packageCode, setPackageCode] = useState("BASIC");
  const [optionalDraft, setOptionalDraft] = useState({});
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  /* Desired timing state */
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [timingNote, setTimingNote] = useState("");
  const [timingSavedNotice, setTimingSavedNotice] = useState("");

  const version = useRef(null);
  const revision = useRef(0);
  const activeCalc = useRef(null);
  const alive = useRef(true);

  // Load package options, service options, and existing package for this event
  useEffect(() => {
    alive.current = true;
    loadData();
    return () => {
      alive.current = false;
      activeCalc.current?.abort();
    };
  }, [event.id]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [packages, services, record] = await Promise.all([
        request("/api/package-options"),
        request("/api/service-options"),
        request("/api/events/" + event.id + "/package"),
      ]);
      if (!alive.current) return;

      setMetadata({ packages, services });
      setSaved(record);
      version.current = record.configurationVersion;

      const pCode = record.configured ? record.packageCode : "BASIC";
      setPackageCode(pCode);

      const draft = Object.fromEntries(
        (record.services || []).map((s) => [
          s.type,
          s.hours == null ? {} : { hours: String(s.hours) },
        ]),
      );
      setOptionalDraft(draft);
      setDirty(false);
      setReady(true);

      // Load saved timing for this event from local storage
      try {
        const stored = localStorage.getItem(`qonaq_event_timing_${event.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.startTime) setStartTime(parsed.startTime);
          if (parsed.endTime) setEndTime(parsed.endTime);
          if (parsed.timingNote !== undefined) setTimingNote(parsed.timingNote);
        }
      } catch {
        // ignore storage errors
      }
    } catch (e) {
      if (alive.current) {
        if (e.status === 401) onSessionExpired();
        else setError(e.message || "Не удалось загрузить данные сметы");
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  const selectedPackage = metadata?.packages.packages.find(
    (p) => p.packageCode === packageCode,
  );
  const includedTypes = new Set(selectedPackage?.includedServiceTypes || []);

  const inputs = saved?.currentEventInputs || currentEvent;
  const currentVenue =
    venues.find((v) => v.id === currentEvent?.venueId) || venue;
  const quote = preview?.quote || saved?.currentEstimate?.estimate;
  const isSavedEstimate = !preview && !!saved?.configured;
  const isOutdated =
    isSavedEstimate && saved?.currentEstimate?.freshness === "OUTDATED";

  function selectionsFor(pCode, draft) {
    if (!metadata?.services?.services) return [];
    const pObj = metadata.packages.packages.find((p) => p.packageCode === pCode);
    const inc = new Set(pObj?.includedServiceTypes || []);

    return metadata.services.services
      .filter((s) => draft[s.serviceType] !== undefined && !inc.has(s.serviceType))
      .map((s) => ({
        type: s.serviceType,
        ...(s.pricingUnit === "PER_HOUR"
          ? { hours: Number(draft[s.serviceType]?.hours || 1) }
          : {}),
      }));
  }

  // Trigger preview recalculation
  async function triggerRecalculate(nextCode, nextDraft) {
    if (!inputs.venueId) return;
    activeCalc.current?.abort();
    const controller = new AbortController();
    activeCalc.current = controller;
    const currentRev = ++revision.current;
    setCalculating(true);
    setError("");

    try {
      const payload = {
        packageCode: nextCode,
        services: selectionsFor(nextCode, nextDraft),
      };
      const quoteRes = await request(
        "/api/events/" + event.id + "/estimate/preview",
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      if (alive.current && revision.current === currentRev) {
        setPreview({ quote: quoteRes, draft: payload, revision: currentRev });
      }
    } catch (e) {
      if (alive.current && revision.current === currentRev && !controller.signal.aborted) {
        if (e.status === 401) onSessionExpired();
        else setError(e.message || "Ошибка при расчёте сметы");
      }
    } finally {
      if (alive.current && revision.current === currentRev) {
        setCalculating(false);
      }
    }
  }

  function handlePackageChange(newCode) {
    setPackageCode(newCode);
    setDirty(true);
    triggerRecalculate(newCode, optionalDraft);
  }

  function handleServiceToggle(serviceType, isChecked, pricingUnit) {
    const nextDraft = { ...optionalDraft };
    if (isChecked) {
      nextDraft[serviceType] = pricingUnit === "PER_HOUR" ? { hours: "2" } : {};
    } else {
      delete nextDraft[serviceType];
    }
    setOptionalDraft(nextDraft);
    setDirty(true);
    triggerRecalculate(packageCode, nextDraft);
  }

  function handleHoursChange(serviceType, delta) {
    const current = Number(optionalDraft[serviceType]?.hours || 1);
    const nextVal = Math.max(1, Math.min(12, current + delta));
    const nextDraft = {
      ...optionalDraft,
      [serviceType]: { hours: String(nextVal) },
    };
    setOptionalDraft(nextDraft);
    setDirty(true);
    triggerRecalculate(packageCode, nextDraft);
  }

  async function handleSave() {
    if (!preview || saving) return;
    setSaving(true);
    setError("");
    try {
      const q = preview.quote;
      const record = await request("/api/events/" + event.id + "/package", {
        method: "PUT",
        body: JSON.stringify({
          ...preview.draft,
          expectedConfigurationVersion: version.current,
          packageCatalogVersion: q.packageCatalogVersion,
          serviceCatalogVersion: q.serviceCatalogVersion,
          venueCatalogVersion: q.venueCatalogVersion,
          expectedEventInputToken: q.eventInputToken,
          expectedPricingToken: q.pricingToken,
        }),
      });
      if (!alive.current) return;
      setSaved(record);
      version.current = record.configurationVersion;
      setDirty(false);
      setPreview(null);
    } catch (e) {
      if (alive.current) {
        if (e.status === 401) onSessionExpired();
        else setError(e.message || "Не удалось сохранить смету");
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }

  // Desired timing handler
  function handleSaveTiming(e) {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(
        `qonaq_event_timing_${event.id}`,
        JSON.stringify({ startTime, endTime, timingNote }),
      );
      setTimingSavedNotice("✓ Тайминг сохранён");
      setTimeout(() => {
        if (alive.current) setTimingSavedNotice("");
      }, 3000);
    } catch {
      // fallback
    }
  }

  // Values calculation
  const totalCost = quote?.totalCost;
  const knownSubtotal = quote?.knownSubtotal;
  const finalAmount = totalCost != null ? totalCost : knownSubtotal || 0;
  const perGuest =
    inputs.guests > 0 && finalAmount > 0
      ? Math.round(finalAmount / inputs.guests)
      : null;

  const exceeded = quote?.budgetStatus === "EXCEEDED";
  const excess = quote?.budgetExcess || 0;
  const remaining = quote?.remainingBudget ?? (inputs.budget - finalAmount);
  const percentUsed =
    quote?.budgetUsedPercent != null
      ? Math.round(quote.budgetUsedPercent)
      : inputs.budget > 0
        ? Math.round((finalAmount / inputs.budget) * 100)
        : 0;

  const typeObj = eventTypes.find((t) => t.id === currentEvent.type);
  const typeLabel = typeObj?.label || currentEvent.type || "Мероприятие";

  return (
    <div className="eed-root">
      {/* ── Top Breadcrumbs & Quick Nav ── */}
      <div className="eed-nav">
        <button type="button" className="eed-back-btn" onClick={onBack}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Ко всем мероприятиям</span>
        </button>

        <div className="eed-actions">
          <button
            type="button"
            className="eed-action-btn secondary"
            onClick={() => onProposal && onProposal(event.id)}
            title="Сформировать коммерческое предложение (PDF)"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Экспорт в КП</span>
          </button>

          <button
            type="button"
            className="eed-action-btn secondary"
            onClick={() => setShowEditModal(true)}
            title="Изменить название, дату, число гостей или бюджет"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Параметры</span>
          </button>
        </div>
      </div>

      {/* ── Header Title & Badges ── */}
      <header className="eed-header">
        <div className="eed-meta-bar">
          <span className="eed-badge">{typeLabel}</span>
          <span className="eed-dot">·</span>
          <span className="eed-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {humanDate(currentEvent.date)}
          </span>
          <span className="eed-dot">·</span>
          <span className="eed-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {inputs.guests} гостей
          </span>

          {saved?.configured ? (
            <span className="eed-status-pill success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Смета готова
            </span>
          ) : (
            <span className="eed-status-pill draft">Черновик сметы</span>
          )}
        </div>

        <h1 className="eed-title">{currentEvent.title}</h1>
      </header>

      {/* ── Financial KPI Dashboard (4 Cards) ── */}
      <section className="eed-kpi-grid" aria-label="Финансовые показатели">
        {/* KPI 1: Плановый бюджет */}
        <div className="eed-kpi-card">
          <span className="eed-kpi-lbl">Плановый бюджет</span>
          <strong className="eed-kpi-val">{money(inputs.budget)}</strong>
          <small className="eed-kpi-sub">Лимит финансирования</small>
        </div>

        {/* KPI 2: Расчетная смета */}
        <div className="eed-kpi-card highlight">
          <span className="eed-kpi-lbl">
            Расчётная смета
            {calculating && <span className="eed-spin-pill">пересчёт…</span>}
          </span>
          <strong className="eed-kpi-val emerald">
            {finalAmount > 0 ? money(finalAmount) : "—"}
          </strong>
          <small className="eed-kpi-sub">
            {totalCost != null
              ? "Полная стоимость всех позиций"
              : "Известный подытог (без зала)"}
          </small>
        </div>

        {/* KPI 3: Баланс бюджета */}
        <div className={`eed-kpi-card ${exceeded ? "danger" : "safe"}`}>
          <span className="eed-kpi-lbl">Баланс бюджета</span>
          <strong className="eed-kpi-val">
            {exceeded ? `-${money(excess)}` : `+${money(remaining)}`}
          </strong>
          <div className="eed-meter-wrap">
            <div
              className={`eed-meter-bar ${exceeded ? "exceeded" : ""}`}
              style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
            />
          </div>
          <small className="eed-kpi-sub">
            {exceeded
              ? `Превышение бюджета (${percentUsed}%)`
              : `Остаток средств (освоено ${percentUsed}%)`}
          </small>
        </div>

        {/* KPI 4: На 1 гостя */}
        <div className="eed-kpi-card">
          <span className="eed-kpi-lbl">В расчёте на гостя</span>
          <strong className="eed-kpi-val">
            {perGuest ? money(perGuest) : "—"}
          </strong>
          <small className="eed-kpi-sub">
            При {inputs.guests} персонах
          </small>
        </div>
      </section>

      {/* ── Venue Spotlight Card ── */}
      {currentVenue ? (
        <section className="eed-venue-spotlight">
          <div className="eed-venue-photo-wrap">
            <img
              src={currentVenue.imageUrl}
              alt={currentVenue.name}
              className="eed-venue-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="eed-venue-city-pill">г. Астана</span>
          </div>

          <div className="eed-venue-info">
            <div className="eed-venue-top">
              <div>
                <span className="eed-venue-kicker">Выбранная площадка</span>
                <h3 className="eed-venue-name">
                  {currentVenue.name}
                  {currentVenue.hall ? <span className="eed-hall"> · {currentVenue.hall}</span> : null}
                </h3>
              </div>

              <a
                href={`https://2gis.kz/astana/search/${encodeURIComponent(`${currentVenue.name} ${currentVenue.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="eed-2gis-btn"
                title="Открыть в 2GIS"
              >
                <Icon2Gis size={16} />
                <span>2GIS</span>
                <span className="eed-ext-arrow">↗</span>
              </a>
            </div>

            <p className="eed-venue-address">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{currentVenue.address}</span>
            </p>

            <div className="eed-venue-specs">
              <span className="eed-spec">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                До {currentVenue.capacity} гостей
              </span>
              <span className="eed-spec">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
                {currentVenue.area ? `${currentVenue.area} м²` : "Площадь уточняется"}
              </span>
              <span className="eed-spec-price">
                Аренда: {currentVenue.price ? money(currentVenue.price) : "уточняется у площадки"}
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="eed-venue-empty-alert">
          <div className="eed-empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="eed-empty-copy">
            <h4>Площадка не выбрана</h4>
            <p>
              Чтобы зафиксировать стоимость аренды зала, выберите
              подходящий ресторан в параметрах события.
            </p>
          </div>
          <button
            type="button"
            className="eed-action-btn primary"
            onClick={() => setShowEditModal(true)}
          >
            Выбрать площадку →
          </button>
        </section>
      )}

      {/* ── Package Selector (Пакеты) ── */}
      <section className="eed-section">
        <div className="eed-section-header">
          <div>
            <span className="eed-section-kicker">Тарифные решения</span>
            <h2 className="eed-section-title">Пакет мероприятия</h2>
          </div>
          <p className="eed-section-desc">
            Переключайте пакеты — позиции сметы и стоимость пересчитываются мгновенно
          </p>
        </div>

        {metadata?.packages?.packages ? (
          <div className="eed-package-cards">
            {metadata.packages.packages.map((pkg) => {
              const isSelected = packageCode === pkg.packageCode;
              return (
                <div
                  key={pkg.packageCode}
                  className={`eed-pkg-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePackageChange(pkg.packageCode)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="eed-pkg-radio">
                    <span className={`eed-radio-dot ${isSelected ? "checked" : ""}`} />
                  </div>
                  <div className="eed-pkg-body">
                    <div className="eed-pkg-top">
                      <strong className="eed-pkg-name">{pkg.displayName}</strong>
                      <span className="eed-pkg-price">{money(pkg.basePrice)}</span>
                    </div>
                    <p className="eed-pkg-desc">{pkg.description}</p>
                    {pkg.includedServiceTypes.length > 0 && (
                      <div className="eed-pkg-included">
                        <small>Включено в тариф:</small>
                        <div className="eed-inc-tags">
                          {pkg.includedServiceTypes.map((st) => (
                            <span key={st} className="eed-inc-tag">
                              ✓ {st === "DECOR" ? "Оформление и декор" : st === "HOST" ? "Ведущий" : st}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="eed-loading-text">Загрузка тарифов…</p>
        )}
      </section>

      {/* ── Categorized Service Cost Breakdown ── */}
      <section className="eed-section">
        <div className="eed-section-header">
          <div>
            <span className="eed-section-kicker">Детализация расходов</span>
            <h2 className="eed-section-title">Смета по позициям</h2>
          </div>
          <p className="eed-section-desc">
            Включайте или отключайте услуги и настраивайте количество часов работы
          </p>
        </div>

        {metadata?.services?.services ? (
          <div className="eed-table-card">
            <div className="eed-table-header">
              <span className="col-service">Услуга / Позиция</span>
              <span className="col-rate">Тариф</span>
              <span className="col-hours">Объём / Часы</span>
              <span className="col-total">Сумма</span>
            </div>

            <div className="eed-table-body">
              {/* Row 1: Venue Rental (from quote line items) */}
              <div className="eed-table-row is-venue">
                <div className="col-service">
                  <div className="eed-service-cell">
                    <span className="eed-service-icon">🏛</span>
                    <div>
                      <strong>Аренда зала</strong>
                      <small>{venue ? venue.name : "Площадка не выбрана"}</small>
                    </div>
                  </div>
                </div>
                <div className="col-rate">
                  <span>{venue?.price ? money(venue.price) : "По запросу"}</span>
                </div>
                <div className="col-hours">
                  <span className="eed-fixed-pill">Вечер мероприятия</span>
                </div>
                <div className="col-total">
                  <strong className="eed-line-price">
                    {venue?.price ? money(venue.price) : "Уточняется"}
                  </strong>
                </div>
              </div>

              {/* Dynamic Services from ServiceCatalog */}
              {metadata.services.services.map((srv) => {
                const isInc = includedTypes.has(srv.serviceType);
                const isSelected = isInc || optionalDraft[srv.serviceType] !== undefined;
                const hours = Number(optionalDraft[srv.serviceType]?.hours || 2);
                const isHourly = srv.pricingUnit === "PER_HOUR";
                const isGuestRate = srv.pricingUnit === "PER_GUEST";

                let lineTotal = 0;
                if (isInc) {
                  lineTotal = 0;
                } else if (isSelected) {
                  if (isHourly) lineTotal = srv.unitPrice * hours;
                  else if (isGuestRate) lineTotal = srv.unitPrice * inputs.guests;
                  else lineTotal = srv.unitPrice;
                }

                const iconMap = {
                  HOST: "🎙",
                  PHOTOGRAPHY: "📸",
                  DECOR: "✨",
                  MUSIC: "🎵",
                  CATERING: "🍽",
                };

                return (
                  <div
                    key={srv.serviceType}
                    className={`eed-table-row ${isInc ? "is-included" : isSelected ? "is-selected" : ""}`}
                  >
                    <div className="col-service">
                      <label className="eed-service-check-label">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isInc}
                          onChange={(e) =>
                            handleServiceToggle(
                              srv.serviceType,
                              e.target.checked,
                              srv.pricingUnit,
                            )
                          }
                        />
                        <span className="eed-service-icon">
                          {iconMap[srv.serviceType] || "📌"}
                        </span>
                        <div>
                          <strong>{srv.displayName}</strong>
                          <small>{srv.description}</small>
                        </div>
                      </label>
                    </div>

                    <div className="col-rate">
                      <span className="eed-rate-tag">
                        {money(srv.unitPrice)} {units[srv.pricingUnit]}
                      </span>
                    </div>

                    <div className="col-hours">
                      {isInc ? (
                        <span className="eed-inc-badge">Включено в тариф</span>
                      ) : isHourly && isSelected ? (
                        <div className="eed-stepper">
                          <button
                            type="button"
                            className="eed-step-btn"
                            disabled={hours <= 1}
                            onClick={() => handleHoursChange(srv.serviceType, -1)}
                          >
                            −
                          </button>
                          <span className="eed-step-val">{hours} ч</span>
                          <button
                            type="button"
                            className="eed-step-btn"
                            disabled={hours >= 12}
                            onClick={() => handleHoursChange(srv.serviceType, 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : isGuestRate && isSelected ? (
                        <span className="eed-fixed-pill">
                          {inputs.guests} персон
                        </span>
                      ) : isSelected ? (
                        <span className="eed-fixed-pill">Фиксировано</span>
                      ) : (
                        <span className="eed-dash">—</span>
                      )}
                    </div>

                    <div className="col-total">
                      <strong className="eed-line-price">
                        {isInc ? (
                          <span className="eed-free-txt">0 ₸</span>
                        ) : isSelected ? (
                          money(lineTotal)
                        ) : (
                          <span className="eed-dash">—</span>
                        )}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer Summary */}
            <div className="eed-table-footer">
              <span>Итоговая смета выбранных услуг:</span>
              <strong className="eed-footer-sum">{money(finalAmount)}</strong>
            </div>
          </div>
        ) : (
          <p className="eed-loading-text">Загрузка перечня услуг…</p>
        )}
      </section>

      {/* ── Desired Event Timing Section ── */}
      <section className="eed-section eed-timing-card">
        <div className="eed-section-header">
          <div>
            <span className="eed-section-kicker">Тайминг события</span>
            <h2 className="eed-section-title">Желаемое время проведения</h2>
          </div>
          <p className="eed-section-desc">
            Укажите удобное время банкета. Оно автоматически вносится в коммерческое предложение и смету для согласования с банкетной службой.
          </p>
        </div>

        <form className="eed-timing-form" onSubmit={handleSaveTiming}>
          <div className="eed-timing-row">
            <label className="eed-b-field">
              <span>Время начала</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>

            <label className="eed-b-field">
              <span>Время завершения</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>

            <label className="eed-b-field eed-b-field-wide">
              <span>Пожелания по расписанию и программе</span>
              <input
                type="text"
                placeholder="Сбор гостей, вынос горячего, шоу-программа, монтаж декора..."
                value={timingNote}
                maxLength={160}
                onChange={(e) => setTimingNote(e.target.value)}
              />
            </label>

            <div className="eed-b-action-col">
              <button type="submit" className="eed-timing-save-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Сохранить тайминг</span>
              </button>
            </div>
          </div>

          {timingSavedNotice && (
            <p className="eed-timing-notice success">{timingSavedNotice}</p>
          )}

          <p className="eed-timing-footnote">
            💡 Премиальные залы и отели Астаны резервируются напрямую через банкетный отдел площадки. Указанный вами тайминг будет прикреплён к официальному коммерческому предложению для менеджера зала.
          </p>
        </form>
      </section>

      {/* ── Fixed Sticky Bottom Bar ── */}
      <aside className="eed-sticky-bar">
        <div className="eed-sticky-inner">
          <div className="eed-sticky-total-block">
            <span className="eed-sticky-lbl">Итого к оплате:</span>
            <strong className="eed-sticky-sum">{money(finalAmount)}</strong>
            <span className="eed-sticky-status">
              {dirty || preview ? (
                <span className="eed-dirty-pill">● Есть несохранённые изменения</span>
              ) : (
                <span className="eed-saved-pill">✓ Смета сохранена</span>
              )}
            </span>
          </div>

          <div className="eed-sticky-btns">
            {(dirty || preview) && (
              <button
                type="button"
                className="eed-sticky-btn primary"
                disabled={saving}
                onClick={handleSave}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{saving ? "Сохраняем…" : "Сохранить смету"}</span>
              </button>
            )}

            <button
              type="button"
              className="eed-sticky-btn secondary"
              onClick={() => onProposal && onProposal(event.id)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Подготовить КП (файл)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Edit Event Parameters Modal */}
      {showEditModal && (
        <EventEditModal
          event={currentEvent}
          eventTypes={eventTypes}
          venues={venues}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated, notifications) => {
            setCurrentEvent(updated);
            if (onUpdateEvent) onUpdateEvent(updated, notifications);
            loadData();
          }}
          request={request}
          onSessionExpired={onSessionExpired}
        />
      )}
    </div>
  );
}
