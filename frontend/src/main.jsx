import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import EntryFlow from "./EntryFlow.jsx";
import { BookingHistory } from "./components/BookingPanel.jsx";
import PackageConfigurator from "./components/PackageConfigurator.jsx";
import AssistantIntro from "./components/AssistantIntro.jsx";
import ProposalEditor from "./components/ProposalEditor.jsx";
import AccountArea from "./components/AccountArea.jsx";
const paths = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 .13a4 4 0 0 1 0 7.75",
  search: "m21 21-5-5M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Z",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  compare: "M4 4v16m16-16v16M1 7h6m10 10h6M12 2v20",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  plus: "M12 5v14M5 12h14",
  edit: "m16 3 5 5L8 21H3v-5L16 3Z",
  external:
    "M15 3h6v6m0-6L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  leaf: "M20 3C7 1 2 7 5 14c3 7 15 5 15-11ZM4 21 15 10",
  square: "M4 4h16v16H4ZM8 8h8v8H8Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  chevron: "m6 9 6 6 6-6",
  info: "M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  logout: "M10 17l5-5-5-5m5 5H3m12-8h5v16h-5",
};
function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
const money = (n) => new Intl.NumberFormat("ru-KZ").format(n) + " ₸";
const humanDate = (s) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Дата не выбрана";
function localDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const emptyForm = () => ({
  title: "",
  type: "CORPORATE",
  date: localDay(7),
  guests: 80,
  budget: 2000000,
  description: "",
  strategy: "ECONOMY",
  venueId: null,
});
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.message || "Не удалось выполнить запрос. Попробуйте ещё раз.",
    );
    error.status = response.status;
    error.code = data?.code;
    error.fields = data?.errors || {};
    throw error;
  }
  if (!data) throw new Error("Сервер вернул неожиданный ответ.");
  return data;
}
function authRequest(action, body = {}) {
  return api(`/api/auth/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
function Photo({ src, alt, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      {...props}
      onError={(e) => {
        e.currentTarget.classList.add("image-unavailable");
        e.currentTarget.alt = "Фотография временно недоступна";
      }}
    />
  );
}
function Modal({
  title,
  heading = title,
  subtitle,
  onClose,
  children,
  wide = false,
  bottomSheet = false,
}) {
  const box = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const last = document.activeElement,
      old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        if (!box.current) return;
        const targets = Array.from(
          box.current.querySelectorAll(
            'button,a[href],input,select,textarea,summary,[tabindex="0"]',
          ),
        ).filter(
          (target) =>
            target.getClientRects().length &&
            !target.matches(":disabled") &&
            !target.closest("details:not([open]) > :not(summary)"),
        );
        if (!targets.length) return;
        const first = targets[0],
          last = targets[targets.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === box.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      last?.focus();
    };
  }, []);
  return (
    <div
      className={
        bottomSheet
          ? "modal-backdrop estimate-sheet-backdrop"
          : "modal-backdrop"
      }
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal${wide ? " modal-wide" : ""}${bottomSheet ? " estimate-sheet" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex="-1"
        ref={box}
      >
        <div className="modal-heading">
          {subtitle ? (
            <div>
              <h2>{heading}</h2>
              <p>{subtitle}</p>
            </div>
          ) : (
            <h2>{heading}</h2>
          )}
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function App() {
  const [view, setView] = useState({ page: "loading" });

  function showEntry(screen = "auth") {
    setView({ page: "entry", screen });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function bootstrap(screen = "demo") {
    setView({ page: "loading" });
    try {
      const data = await api("/api/bootstrap");
      setView({ page: "planner", data });
    } catch (error) {
      if (error.status === 401) showEntry(screen);
      else setView({ page: "error", message: error.message, screen });
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function enter(action, values) {
    await authRequest(action, values);
    await bootstrap("auth");
  }

  if (view.page === "entry") {
    return (
      <EntryFlow
        initialScreen={view.screen}
        onRegister={(values) => enter("register", values)}
        onLogin={(values) => enter("login", values)}
        onDemo={() => enter("demo")}
      />
    );
  }
  if (view.page === "error") {
    return (
      <div className="page-loading" role="alert">
        <h1>Не удалось загрузить QonaqAI</h1>
        <p>{view.message}</p>
        <button
          className="button primary"
          onClick={() => bootstrap(view.screen)}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
  if (view.page === "loading") {
    return (
      <div className="page-loading" role="status">
        <div className="brand">
          Qonaq<span>AI</span>
        </div>
        <div className="spinner" />
        <p>Загрузка…</p>
      </div>
    );
  }
  return (
    <Planner
      initialData={view.data}
      onSessionExpired={() => showEntry()}
      onLogout={async () => {
        await authRequest("logout");
        showEntry();
      }}
    />
  );
}

function Planner({ initialData, onSessionExpired, onLogout }) {
  const [data, setData] = useState(initialData),
    [tab, setTab] = useState("catalog"),
    [form, setForm] = useState(emptyForm),
    [editingId, setEditingId] = useState(null),
    [fieldErrors, setFieldErrors] = useState({}),
    [saving, setSaving] = useState(false),
    [query, setQuery] = useState(""),
    [venues, setVenues] = useState(initialData.venues),
    [catalogLoading, setCatalogLoading] = useState(false),
    [catalogError, setCatalogError] = useState(""),
    [compare, setCompare] = useState([]),
    [showCompare, setShowCompare] = useState(false),
    [detail, setDetail] = useState(null),
    [serviceEvent, setServiceEvent] = useState(null),
    [proposalTarget, setProposalTarget] = useState(null),
    [accountRevision, setAccountRevision] = useState(0),
    [assistantStage, setAssistantStage] = useState("brief"),
    [assistantBrief, setAssistantBrief] = useState(""),
    [assistantPending, setAssistantPending] = useState(false),
    [assistantError, setAssistantError] = useState(""),
    [assistantNotes, setAssistantNotes] = useState(null),
    [showNotifications, setShowNotifications] = useState(false),
    [toast, setToast] = useState(null),
    [deleteId, setDeleteId] = useState(null),
    [signingOut, setSigningOut] = useState(false);
  const toastTimer = useRef(null),
    formRef = useRef(null);
  function notify(message, error = false) {
    setToast({ message, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (
      !Number.isInteger(Number(form.guests)) ||
      Number(form.guests) < 1 ||
      Number(form.guests) > 10000
    ) {
      setVenues([]);
      setCatalogError("");
      setCatalogLoading(false);
      return;
    }
    const controller = new AbortController(),
      timer = setTimeout(async () => {
        setCatalogLoading(true);
        setCatalogError("");
        try {
          const params = new URLSearchParams({
            query,
            guests: String(form.guests || 0),
            strategy: form.strategy,
          });
          const result = await api("/api/venues?" + params, {
            signal: controller.signal,
          });
          setVenues(Array.isArray(result) ? result : result.venues || []);
        } catch (e) {
          if (e.name !== "AbortError") setCatalogError(e.message);
        } finally {
          if (!controller.signal.aborted) setCatalogLoading(false);
        }
      }, 240);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, form.guests, form.strategy]);
  function field(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "guests" ? { venueId: null } : {}),
    }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }
  async function saveEvent(e, venueId = form.venueId) {
    e?.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = "Укажите название мероприятия";
    if (!form.date || form.date < localDay())
      errors.date = "Выберите сегодняшнюю или будущую дату";
    if (!Number.isInteger(Number(form.guests)) || Number(form.guests) < 1)
      errors.guests = "Укажите целое число гостей от 1";
    if (Number(form.budget) <= 0)
      errors.budget = "Бюджет должен быть больше нуля";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      notify("Проверьте параметры мероприятия", true);
      return false;
    }
    setSaving(true);
    try {
      const result = await api(
        editingId ? `/api/events/${editingId}` : "/api/events",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            guests: Number(form.guests),
            budget: Number(form.budget),
            venueId,
          }),
        },
      );
      setEditingId(result.event.id);
      setForm({ ...result.event, description: result.event.description || "" });
      setData((prev) => ({
        ...prev,
        events: [
          result.event,
          ...prev.events.filter((x) => x.id !== result.event.id),
        ],
        notifications: result.notifications || prev.notifications,
      }));
      notify(
        venueId
          ? "Площадка выбрана, мероприятие сохранено"
          : "Мероприятие сохранено. Подбор площадок обновлён",
      );
      return result.event;
    } catch (e) {
      if (e.status === 401) {
        onSessionExpired();
        return false;
      }
      setFieldErrors(e.fields);
      notify(e.message, true);
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function chooseVenue(v) {
    if (Number(form.guests) > v.capacity) {
      notify(`Банкетная вместимость площадки — ${v.capacity} гостей`, true);
      return;
    }
    setDetail(null);
    setShowCompare(false);
    const event = await saveEvent(null, v.id);
    if (event) {
      setAssistantStage("estimate");
      setServiceEvent(event);
    }
  }
  function toggleCompare(id) {
    setCompare((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
    if (!compare.includes(id) && compare.length === 3)
      notify("Можно сравнить до трёх площадок");
  }
  function newEvent() {
    setForm(emptyForm());
    setAssistantBrief("");
    setAssistantError("");
    setAssistantNotes(null);
    setAssistantStage("brief");
    setEditingId(null);
    setFieldErrors({});
    setTab("catalog");
    setTimeout(() => formRef.current?.querySelector("input")?.focus(), 100);
  }
  function editEvent(event) {
    setForm({ ...event, description: event.description || "" });
    setEditingId(event.id);
    setFieldErrors({});
    setAssistantBrief(event.description || "");
    setAssistantStage("parameters");
    setTab("catalog");
    setTimeout(
      () =>
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    );
  }
  async function startAssistant() {
    if (assistantPending) return;
    setAssistantPending(true);
    setAssistantError("");
    try {
      const result = await api("/api/assistant/suggest", {
        method: "POST",
        body: JSON.stringify({ text: assistantBrief.trim() }),
      });
      setForm({
        ...emptyForm(),
        title: "",
        date: "",
        guests: "",
        budget: "",
        ...result.fields,
        description: assistantBrief.trim(),
        venueId: null,
      });
      setAssistantNotes(result);
      setFieldErrors({});
      setAssistantStage("parameters");
      setTimeout(() => formRef.current?.querySelector("input")?.focus(), 260);
    } catch (failure) {
      if (failure.status === 401) onSessionExpired();
      else setAssistantError(failure.message);
    } finally {
      setAssistantPending(false);
    }
  }
  function startManualEntry() {
    setAssistantStage("parameters");
    setTimeout(() => formRef.current?.querySelector("input")?.focus(), 260);
  }
  async function continueToVenues(event) {
    const saved = await saveEvent(event);
    if (saved) {
      setAssistantStage("venues");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function removeEvent() {
    try {
      await api(`/api/events/${deleteId}`, { method: "DELETE" });
      setData((prev) => ({
        ...prev,
        events: prev.events.filter((x) => x.id !== deleteId),
      }));
      if (editingId === deleteId) newEvent();
      setDeleteId(null);
      const notifications = await api("/api/notifications");
      setData((prev) => ({ ...prev, notifications }));
      notify("Мероприятие удалено");
    } catch (e) {
      if (e.status === 401) onSessionExpired();
      else notify(e.message, true);
    }
  }
  async function signOut() {
    setSigningOut(true);
    try {
      await onLogout();
    } catch (error) {
      if (error.status === 401) onSessionExpired();
      else notify(error.message, true);
    } finally {
      setSigningOut(false);
    }
  }
  const allVenues = data.venues || [],
    selectedVenue = allVenues.find((v) => v.id === form.venueId),
    comparison = allVenues.filter((v) => compare.includes(v.id));
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setTab("catalog");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="QonaqAI, главная"
          >
            <span className="brand-mark">q</span>Qonaq<span>AI</span>
          </a>
          <nav aria-label="Основная навигация">
            <button
              className={tab === "catalog" ? "nav-link active" : "nav-link"}
              onClick={() => setTab("catalog")}
            >
              Планирование
            </button>
            <button
              className={tab === "events" ? "nav-link active" : "nav-link"}
              onClick={() => setTab("events")}
            >
              Мои мероприятия
              {data.events.length > 0 && (
                <span className="nav-count">{data.events.length}</span>
              )}
            </button>
            <button
              className={tab === "account" ? "nav-link active" : "nav-link"}
              onClick={() => setTab("account")}
            >
              Личный кабинет
            </button>
            <button
              className={tab === "plans" ? "nav-link active" : "nav-link"}
              onClick={() => setTab("plans")}
            >
              Тарифы
            </button>
          </nav>
          <div className="header-actions">
            <span className="city-label">
              <Icon name="pin" size={16} />
              Астана
            </span>
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${showNotifications ? "selected" : ""}`}
                aria-label="Уведомления"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Icon name="bell" />
                {data.notifications.length > 0 && (
                  <span className="notification-dot" />
                )}
              </button>
              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-title">
                    Уведомления
                    <button
                      className="icon-button"
                      aria-label="Закрыть уведомления"
                      onClick={() => setShowNotifications(false)}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  {data.notifications.length ? (
                    data.notifications.slice(0, 8).map((n) => (
                      <div className="notification-item" key={n.id}>
                        <span className="tiny-leaf">
                          <Icon name="check" size={14} />
                        </span>
                        <div>
                          <p>{n.message}</p>
                          <small>
                            {new Date(n.createdAt).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-notifications">
                      Здесь появятся обновления ваших мероприятий.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="profile">
              <span className="avatar" aria-hidden="true">
                {Array.from(data.profile.name)[0]?.toLocaleUpperCase("ru")}
              </span>
              <div>
                <strong title={data.profile.name}>{data.profile.name}</strong>
                {data.profile.mode === "DEMO" && <small>Демо-профиль</small>}
              </div>
            </div>
            <button
              className="icon-button sign-out"
              aria-label="Выйти"
              title="Выйти"
              onClick={signOut}
              disabled={signingOut || saving}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="main-shell">
        {tab === "catalog" ? (
          <>
            {assistantStage === "brief" ? (
              <AssistantIntro
                brief={assistantBrief}
                onBriefChange={setAssistantBrief}
                onContinue={startAssistant}
                onManual={startManualEntry}
                pending={assistantPending}
                error={assistantError}
              />
            ) : (
              <header className="assistant-flow-heading">
                <button
                  className="assistant-back"
                  type="button"
                  onClick={() =>
                    setAssistantStage(
                      assistantStage === "venues" ? "parameters" : "brief",
                    )
                  }
                >
                  ← Назад
                </button>
                <div>
                  <p className="assistant-step-label">
                    Создание мероприятия ·{" "}
                    {assistantStage === "parameters" ? "2" : "3"} из 4
                  </p>
                  <h1>
                    {assistantStage === "parameters"
                      ? "Проверьте параметры"
                      : "Выберите площадку"}
                  </h1>
                  <p>
                    {assistantStage === "parameters"
                      ? "Мы заполнили только то, что удалось найти в описании. Остальное можно изменить."
                      : "Показаны площадки, подходящие по числу гостей."}
                  </p>
                </div>
              </header>
            )}
            {assistantStage !== "brief" && (
              <section
                className={
                  "workspace assistant-workspace assistant-" + assistantStage
                }
                id="catalog"
              >
                {assistantStage === "parameters" && (
                  <aside className="planner" ref={formRef}>
                    <div className="planner-heading">
                      <span className="section-icon">
                        <Icon name="calendar" />
                      </span>
                      <div>
                        <h2>Ваше мероприятие</h2>
                      </div>
                    </div>
                    <form onSubmit={continueToVenues} noValidate>
                      {assistantNotes && (
                        <div className="source-note" role="status">
                          <div>
                            <p>
                              Демо-подсказки из вашего описания. Проверьте
                              значения перед сохранением.
                            </p>
                            {assistantNotes.missing.length > 0 && (
                              <p>
                                Уточните:{" "}
                                {assistantNotes.missing
                                  .map(
                                    (key) =>
                                      ({
                                        type: "тип мероприятия",
                                        date: "дату",
                                        guests: "гостей",
                                        budget: "бюджет",
                                      })[key],
                                  )
                                  .join(", ")}
                                .
                              </p>
                            )}
                            {assistantNotes.warnings.map((note) => (
                              <p key={note}>{note}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      <label>
                        Название
                        <input
                          name="title"
                          placeholder="Например, корпоратив команды"
                          value={form.title}
                          onChange={(e) => field("title", e.target.value)}
                          maxLength={120}
                          aria-invalid={!!fieldErrors.title}
                        />
                        {fieldErrors.title && (
                          <small className="field-error">
                            {fieldErrors.title}
                          </small>
                        )}
                      </label>
                      <label>
                        Тип мероприятия
                        <div className="select-wrap">
                          <select
                            name="type"
                            value={form.type}
                            onChange={(e) => field("type", e.target.value)}
                          >
                            {data.eventTypes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <Icon name="chevron" size={15} />
                        </div>
                      </label>
                      <div className="form-row">
                        <label>
                          Дата
                          <input
                            name="date"
                            type="date"
                            min={localDay()}
                            value={form.date}
                            onChange={(e) => field("date", e.target.value)}
                            aria-invalid={!!fieldErrors.date}
                          />
                          {fieldErrors.date && (
                            <small className="field-error">
                              {fieldErrors.date}
                            </small>
                          )}
                        </label>
                        <label>
                          Гостей
                          <input
                            name="guests"
                            type="number"
                            min="1"
                            max="10000"
                            value={form.guests}
                            onChange={(e) => field("guests", e.target.value)}
                            aria-invalid={!!fieldErrors.guests}
                          />
                          {fieldErrors.guests && (
                            <small className="field-error">
                              {fieldErrors.guests}
                            </small>
                          )}
                        </label>
                      </div>
                      <label>
                        Общий бюджет
                        <div className="input-suffix">
                          <input
                            name="budget"
                            type="number"
                            min="1"
                            step="0.01"
                            value={form.budget}
                            onChange={(e) => field("budget", e.target.value)}
                            aria-invalid={!!fieldErrors.budget}
                          />
                          <span>₸</span>
                        </div>
                        {fieldErrors.budget && (
                          <small className="field-error">
                            {fieldErrors.budget}
                          </small>
                        )}
                      </label>
                      <label>
                        Пожелания<span className="optional">необязательно</span>
                        <textarea
                          name="description"
                          rows="2"
                          maxLength={2000}
                          placeholder="Что важно для вашего события?"
                          value={form.description}
                          onChange={(e) => field("description", e.target.value)}
                        />
                      </label>
                      {selectedVenue && (
                        <div className="selected-venue">
                          <span className="selected-check">
                            <Icon name="check" size={15} />
                          </span>
                          <div>
                            <small>Выбранная площадка</small>
                            <strong>{selectedVenue.name}</strong>
                          </div>
                          <button
                            className="icon-button"
                            type="button"
                            aria-label="Убрать выбранную площадку"
                            onClick={() => field("venueId", null)}
                          >
                            <Icon name="close" size={15} />
                          </button>
                        </div>
                      )}
                      <button
                        className="button primary full"
                        disabled={saving}
                        type="submit"
                      >
                        {saving ? "Сохраняем…" : "Показать площадки"}
                        <Icon name="arrow" size={17} />
                      </button>
                      {editingId && (
                        <button
                          className="text-button full new-event-button"
                          type="button"
                          onClick={newEvent}
                        >
                          Создать новое мероприятие
                        </button>
                      )}
                      <p className="planner-footnote">
                        <Icon name="check" size={13} />
                        Данные сохраняются в демо-профиле
                      </p>
                    </form>
                  </aside>
                )}
                {assistantStage === "venues" && (
                  <div className="catalog">
                    <div className="catalog-title">
                      <div>
                        <h2>Подходящие площадки</h2>
                      </div>
                      <span className="result-count">
                        {venues.length}{" "}
                        {venues.length === 1
                          ? "площадка"
                          : venues.length >= 2 && venues.length <= 4
                            ? "площадки"
                            : "площадок"}
                      </span>
                    </div>
                    <div className="catalog-toolbar">
                      <div className="search-input">
                        <Icon name="search" size={18} />
                        <input
                          aria-label="Поиск площадок"
                          placeholder="Название площадки или адрес"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button
                            className="icon-button"
                            aria-label="Очистить поиск"
                            onClick={() => setQuery("")}
                          >
                            <Icon name="close" size={15} />
                          </button>
                        )}
                      </div>
                      <div
                        className="strategy-switch"
                        aria-label="Способ подбора"
                      >
                        {data.strategies.map((s) => (
                          <button
                            key={s.id}
                            className={form.strategy === s.id ? "active" : ""}
                            onClick={() => field("strategy", s.id)}
                            title={s.description}
                          >
                            <Icon
                              name={s.id === "ECONOMY" ? "leaf" : "square"}
                              size={15}
                            />
                            {s.id === "ECONOMY" ? "Экономный" : "Просторнее"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="strategy-note">
                      <Icon name="info" size={15} />
                      <p>
                        {form.strategy === "ECONOMY"
                          ? "Если цена не опубликована, сначала показываем залы с меньшим запасом мест. Стоимость нужно уточнить у площадки."
                          : "Сначала показываем более просторные залы — по площади на одного гостя. Это не рейтинг качества обслуживания."}
                      </p>
                    </div>
                    {catalogError ? (
                      <div className="catalog-empty">
                        <Icon name="info" size={30} />
                        <h3>Не удалось обновить подбор</h3>
                        <p>{catalogError}</p>
                        <button
                          className="button secondary"
                          onClick={() =>
                            field(
                              "strategy",
                              form.strategy === "ECONOMY"
                                ? "QUALITY"
                                : "ECONOMY",
                            )
                          }
                        >
                          Повторить подбор
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`venue-grid ${catalogLoading ? "is-loading" : ""}`}
                        aria-busy={catalogLoading}
                      >
                        {venues.map((v) => (
                          <article className="venue-card" key={v.id}>
                            <div className="venue-photo">
                              <button
                                className="photo-open"
                                onClick={() => setDetail(v)}
                                aria-label={`Подробнее о ${v.name}`}
                              >
                                <Photo
                                  src={v.imageUrl}
                                  alt={`${v.name} — ${v.hall}`}
                                />
                              </button>
                              <span className="venue-city">
                                <Icon name="pin" size={12} />
                                Астана
                              </span>
                              <button
                                className={`compare-icon ${compare.includes(v.id) ? "checked" : ""}`}
                                onClick={() => toggleCompare(v.id)}
                                aria-label={`${compare.includes(v.id) ? "Убрать из сравнения" : "Сравнить"} ${v.name}`}
                                aria-pressed={compare.includes(v.id)}
                              >
                                <Icon
                                  name={
                                    compare.includes(v.id) ? "check" : "compare"
                                  }
                                  size={17}
                                />
                              </button>
                            </div>
                            <div className="venue-content">
                              <span className="hall-name">{v.hall}</span>
                              <button
                                className="venue-name"
                                onClick={() => setDetail(v)}
                              >
                                {v.name}
                              </button>
                              <p className="venue-address">
                                <Icon name="pin" size={13} />
                                {v.address}
                              </p>
                              <div className="venue-facts">
                                <span>
                                  <Icon name="users" size={15} />
                                  До {v.capacity} гостей
                                </span>
                                <span>
                                  <Icon name="square" size={14} />
                                  {v.area} м²
                                </span>
                              </div>
                              <div className="venue-bottom">
                                <div>
                                  <strong>
                                    {v.price
                                      ? money(v.price)
                                      : "Цена по запросу"}
                                  </strong>
                                  <small>
                                    {v.price
                                      ? "стоимость площадки"
                                      : "уточняется у площадки"}
                                  </small>
                                </div>
                                <button
                                  className={`button card-button ${form.venueId === v.id ? "chosen" : ""}`}
                                  disabled={saving}
                                  onClick={() => chooseVenue(v)}
                                >
                                  {form.venueId === v.id ? (
                                    <>
                                      <Icon name="check" size={15} />
                                      Выбрано
                                    </>
                                  ) : (
                                    <>
                                      Выбрать
                                      <Icon name="arrow" size={15} />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                        {!venues.length && !catalogLoading && (
                          <div className="catalog-empty">
                            <Icon name="search" size={32} />
                            <h3>Подходящих площадок пока нет</h3>
                            <p>
                              Попробуйте другое название или уменьшите
                              количество гостей.
                            </p>
                            <button
                              className="button secondary"
                              onClick={() => {
                                setQuery("");
                                field("guests", 80);
                              }}
                            >
                              Сбросить фильтры
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="catalog-note">
                      <Icon name="info" size={15} />
                      <p>
                        Вместимость указана для банкета. Свободные даты и
                        стоимость уточняйте у площадки.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        ) : tab === "account" || tab === "plans" ? (
          <AccountArea
            page={tab}
            request={api}
            revision={accountRevision}
            onSessionExpired={onSessionExpired}
            onLoaded={(dashboard) =>
              setData((prev) => ({
                ...prev,
                events: dashboard.events.map((item) => item.event),
                notifications: dashboard.notifications,
              }))
            }
            onEditEvent={editEvent}
            onConfigure={setServiceEvent}
            onProposal={setProposalTarget}
            onNewEvent={newEvent}
          />
        ) : (
          <section className="events-page">
            <div className="events-heading">
              <div>
                <h1>Мои мероприятия</h1>
              </div>
              <button className="button primary" onClick={newEvent}>
                <Icon name="plus" size={18} />
                Создать мероприятие
              </button>
            </div>
            {data.events.length ? (
              <div className="saved-grid">
                {data.events.map((event) => {
                  const v = allVenues.find((v) => v.id === event.venueId);
                  return (
                    <article className="saved-card" key={event.id}>
                      <div className="saved-card-top">
                        <span className="saved-type">
                          {data.eventTypes.find((t) => t.id === event.type)
                            ?.label || event.type}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Удалить ${event.title}`}
                          onClick={() => setDeleteId(event.id)}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                      <h2>{event.title}</h2>
                      <div className="saved-details">
                        <span>
                          <Icon name="calendar" size={16} />
                          {humanDate(event.date)}
                        </span>
                        <span>
                          <Icon name="users" size={16} />
                          {event.guests} гостей
                        </span>
                      </div>
                      <div className="saved-budget">
                        <span>Бюджет мероприятия</span>
                        <strong>{money(event.budget)}</strong>
                      </div>
                      {v ? (
                        <div className="saved-venue">
                          <Photo src={v.imageUrl} alt={v.name} />
                          <div>
                            <small>Выбранная площадка</small>
                            <strong>{v.name}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="no-venue">
                          <Icon name="pin" size={17} />
                          Площадка пока не выбрана
                        </div>
                      )}
                      <button
                        className="button secondary full"
                        onClick={() => editEvent(event)}
                      >
                        <Icon name="edit" size={16} />
                        Продолжить планирование
                      </button>
                      <button
                        className="button secondary full service-open"
                        onClick={() => setServiceEvent(event)}
                      >
                        Настроить пакет и смету
                      </button>
                      <button
                        className="button secondary full service-open"
                        onClick={() => setProposalTarget({ eventId: event.id })}
                      >
                        Подготовить предложение
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="events-empty">
                <span className="empty-illustration">
                  <Icon name="calendar" size={42} />
                </span>
                <h2>Пока нет мероприятий</h2>
                <button className="button primary" onClick={newEvent}>
                  Создать мероприятие
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            )}
            <BookingHistory request={api} onSessionExpired={onSessionExpired} />
          </section>
        )}
      </main>
      {tab === "catalog" &&
        assistantStage === "venues" &&
        compare.length > 0 && (
          <div className="compare-bar">
            <span className="compare-bar-icon">
              <Icon name="compare" />
            </span>
            <div>
              <strong>Сравнить площадки</strong>
              <small>Выбрано {compare.length} из 3</small>
            </div>
            <div className="compare-thumbnails">
              {comparison.map((v) => (
                <Photo key={v.id} src={v.imageUrl} alt={v.name} />
              ))}
            </div>
            <button
              className="button primary"
              disabled={compare.length < 2}
              onClick={() => setShowCompare(true)}
            >
              Сравнить
              <Icon name="arrow" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Очистить сравнение"
              onClick={() => setCompare([])}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} wide>
          <Photo
            className="detail-image"
            src={detail.imageUrl}
            alt={`${detail.name} — ${detail.hall}`}
            loading="eager"
          />
          <div className="detail-body">
            <span className="eyebrow small">{detail.hall}</span>
            <p className="detail-description">{detail.description}</p>
            <p className="detail-address">
              <Icon name="pin" size={17} />
              {detail.address}
            </p>
            <div className="detail-facts">
              <div>
                <strong>{detail.capacity}</strong>
                <span>гостей на банкете</span>
              </div>
              {detail.theaterCapacity && (
                <div>
                  <strong>{detail.theaterCapacity}</strong>
                  <span>мест театром</span>
                </div>
              )}
              <div>
                <strong>{detail.area} м²</strong>
                <span>площадь зала</span>
              </div>
            </div>
            <div className="feature-list">
              {detail.features?.map((f) => (
                <span key={f}>
                  <Icon name="check" size={14} />
                  {f}
                </span>
              ))}
            </div>
            <div className="source-note">
              <Icon name="info" size={17} />
              <div>
                Цена и свободные даты уточняются у площадки.
                <br />
                <a href={detail.sourceUrl} target="_blank" rel="noreferrer">
                  Официальный источник
                  <Icon name="external" size={12} />
                </a>
                {detail.imageSourceUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={detail.imageSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Источник фотографии
                    </a>
                  </>
                )}
                <small>
                  Проверено: {humanDate(detail.verifiedAt?.slice(0, 10))}
                </small>
              </div>
            </div>
            <button
              className="button primary full"
              disabled={saving || Number(form.guests) > detail.capacity}
              onClick={() => chooseVenue(detail)}
            >
              {Number(form.guests) > detail.capacity
                ? "Недостаточная вместимость"
                : "Выбрать эту площадку"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </Modal>
      )}
      {showCompare && (
        <Modal
          title="Сравнение площадок"
          onClose={() => setShowCompare(false)}
          wide
        >
          <div
            className="comparison-grid"
            style={{
              gridTemplateColumns: `repeat(${comparison.length},minmax(0,1fr))`,
            }}
          >
            {comparison.map((v) => (
              <div className="comparison-column" key={v.id}>
                <Photo src={v.imageUrl} alt={v.name} />
                <h3>{v.name}</h3>
                <dl>
                  <dt>Зал</dt>
                  <dd>{v.hall}</dd>
                  <dt>Банкетная вместимость</dt>
                  <dd>До {v.capacity} гостей</dd>
                  <dt>Площадь</dt>
                  <dd>{v.area} м²</dd>
                  <dt>Стоимость</dt>
                  <dd>{v.price ? money(v.price) : "По запросу"}</dd>
                  <dt>Адрес</dt>
                  <dd>{v.address}</dd>
                </dl>
                <button
                  className="button primary full"
                  disabled={saving || Number(form.guests) > v.capacity}
                  onClick={() => chooseVenue(v)}
                >
                  Выбрать
                </button>
              </div>
            ))}
          </div>
          <p className="comparison-note">
            Вместимость зависит от рассадки. Доступность и окончательная цена
            требуют подтверждения площадкой.
          </p>
        </Modal>
      )}
      {serviceEvent && (
        <Modal
          title="Пакет, смета и бронирование"
          heading={serviceEvent.title}
          subtitle={`Этап 4 из 4 · Гостей: ${serviceEvent.guests} · Демонстрационные цены`}
          onClose={() => {
            setServiceEvent(null);
            setAccountRevision((value) => value + 1);
            setAssistantStage("venues");
          }}
          bottomSheet
        >
          <PackageConfigurator
            key={serviceEvent.id}
            event={serviceEvent}
            request={api}
            onSessionExpired={onSessionExpired}
            onCreateProposal={() => {
              setServiceEvent(null);
              setProposalTarget({ eventId: serviceEvent.id });
            }}
          />
        </Modal>
      )}
      {proposalTarget && (
        <Modal
          title="Предложение для мероприятия"
          onClose={() => setProposalTarget(null)}
          wide
        >
          <ProposalEditor
            target={proposalTarget}
            request={api}
            onSessionExpired={onSessionExpired}
            onSaved={async () => {
              setAccountRevision((value) => value + 1);
              try {
                const notifications = await api("/api/notifications");
                setData((prev) => ({ ...prev, notifications }));
              } catch (failure) {
                if (failure.status === 401) onSessionExpired();
                else notify(failure.message, true);
              }
            }}
          />
        </Modal>
      )}
      {deleteId && (
        <Modal title="Удалить мероприятие?" onClose={() => setDeleteId(null)}>
          <div className="confirm-body">
            <p>
              Мероприятие будет удалено из демо-профиля. Восстановить его не
              получится.
            </p>
            <div className="confirm-actions">
              <button
                className="button secondary"
                onClick={() => setDeleteId(null)}
              >
                Оставить
              </button>
              <button className="button danger" onClick={removeEvent}>
                Удалить
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <Icon name={toast.error ? "info" : "check"} size={20} />
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Закрыть сообщение"
            onClick={() => setToast(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
