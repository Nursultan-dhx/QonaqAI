import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import EntryFlow from "./EntryFlow.jsx";
import { BookingHistory } from "./components/BookingPanel.jsx";
import PackageConfigurator from "./components/PackageConfigurator.jsx";
import AssistantChat from "./components/AssistantChat.jsx";
import ProposalEditor from "./components/ProposalEditor.jsx";
import AccountArea from "./components/AccountArea.jsx";
import EventsScreen from "./components/EventsScreen.jsx";
import EventEstimateDetail from "./components/EventEstimateDetail.jsx";
import Icon2Gis from "./components/Icon2Gis.jsx";
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
  sliders: "M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6",
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

export function getVenueDistrict(address = "") {
  if (
    /Туран|Достык|Кабанбай|Алиева|Кунаева|Сыганак|Талал|Мангилик|Керей|Мухамедханов|Айтматов|Е-489|Коргалжын|Кургальжинское/i.test(
      address,
    )
  ) {
    return "YESIL";
  }
  if (
    /Момышулы|Майлин|Балкантау|Жумабаев|Жургенов|Жанкент|Нажимеденов|Абылай хана|Сатпаев|Кажымукан/i.test(
      address,
    )
  ) {
    return "ALMATY";
  }
  return "SARYARKA";
}

export const DISTRICTS = [
  { id: "ALL", label: "Все районы" },
  { id: "YESIL", label: "Есиль / Левый берег" },
  { id: "ALMATY", label: "Алматы / Байконур" },
  { id: "SARYARKA", label: "Сарыарка (Центр)" },
];
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

  async function bootstrap(screen = "demo", silent = false) {
    if (!silent) setView({ page: "loading" });
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
    await bootstrap("auth", true);
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
          <img
            src="/qonaq-icon.png"
            alt="QonaqAI"
            className="brand-logo"
          />
          Qonaq<span>AI</span>
        </div>
        <div className="spinner" />
        <p>Загрузка…</p>
      </div>
    );
  }
  return (
    <div className="ql-app-enter-wrap">
      <Planner
        initialData={view.data}
        onSessionExpired={() => showEntry()}
        onLogout={async () => {
          await authRequest("logout");
          showEntry();
        }}
      />
    </div>
  );
}

function Planner({ initialData, onSessionExpired, onLogout }) {
  const [data, setData] = useState(initialData),
    [tab, setTab] = useState("planning"),
    [form, setForm] = useState(emptyForm),
    [editingId, setEditingId] = useState(null),
    [fieldErrors, setFieldErrors] = useState({}),
    [saving, setSaving] = useState(false),
    [query, setQuery] = useState(""),
    [district, setDistrict] = useState("ALL"),
    [capacityRange, setCapacityRange] = useState("ALL"),
    [selectedFeatures, setSelectedFeatures] = useState([]),
    [priceFilter, setPriceFilter] = useState("ALL"),
    [sortBy, setSortBy] = useState("DEFAULT"),
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
    [assistantChatKey, setAssistantChatKey] = useState(0),
    [assistantConversation, setAssistantConversation] = useState(null),
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
      setTab("planning");
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
    setAssistantChatKey((value) => value + 1);
    setAssistantConversation(null);
    setAssistantNotes(null);
    setAssistantStage("brief");
    setEditingId(null);
    setFieldErrors({});
    setTab("planning");
    setTimeout(() => formRef.current?.querySelector("input")?.focus(), 100);
  }
  function editEvent(event) {
    setForm({ ...event, description: event.description || "" });
    setEditingId(event.id);
    setFieldErrors({});
    setAssistantStage("parameters");
    setTab("planning");
    setTimeout(
      () =>
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    );
  }
  function handleEventUpdated(updatedEvent, notifications) {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((ev) =>
        ev.id === updatedEvent.id ? updatedEvent : ev,
      ),
      notifications: notifications || prev.notifications,
    }));
    notify("✓ Мероприятие успешно обновлено");
  }
  async function applyAssistant(result) {
    const fields = result.fields || {};
    const venueId = result.venueId || null;
    const targetVenue = allVenues.find((v) => v.id === venueId);

    const guests =
      Number(fields.guests) && Number(fields.guests) >= 1
        ? Number(fields.guests)
        : targetVenue
          ? Math.min(80, targetVenue.capacity)
          : 80;

    const budget =
      Number(fields.budget) && Number(fields.budget) > 0
        ? Number(fields.budget)
        : 2000000;

    const date =
      fields.date && fields.date >= localDay()
        ? fields.date
        : localDay(14);

    const type = fields.type || "CORPORATE";
    const typeLabel =
      data.eventTypes.find((t) => t.id === type)?.label || "Событие";
    const title =
      fields.title?.trim() ||
      (targetVenue
        ? `${typeLabel} в ${targetVenue.name}`
        : `${typeLabel} в Астане`);

    const description = result.description || "";
    const strategy = fields.strategy || "ECONOMY";

    const eventPayload = {
      title,
      type,
      date,
      guests,
      budget,
      strategy,
      description,
      venueId,
    };

    setForm(eventPayload);
    setFieldErrors({});
    setAssistantNotes(result);

    if (venueId) {
      // Прямой бесшовный переход к Смете и Предложению (Zero-Friction)
      setSaving(true);
      try {
        const res = await api(
          editingId ? `/api/events/${editingId}` : "/api/events",
          {
            method: editingId ? "PUT" : "POST",
            body: JSON.stringify(eventPayload),
          },
        );
        setEditingId(res.event.id);
        setForm({ ...res.event, description: res.event.description || "" });
        setData((prev) => ({
          ...prev,
          events: [
            res.event,
            ...prev.events.filter((x) => x.id !== res.event.id),
          ],
          notifications: res.notifications || prev.notifications,
        }));
        setServiceEvent(res.event);
        setAssistantStage("estimate");
        notify("✓ Мероприятие создано. Смета и предложение готовы!");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } catch (err) {
        if (err.status === 401) onSessionExpired();
        else notify(err.message, true);
      } finally {
        setSaving(false);
      }
    }

    // Если площадка ещё не выбрана:
    setAssistantStage("venues");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function startManualEntry() {
    setAssistantStage("parameters");
    setTimeout(() => formRef.current?.querySelector("input")?.focus(), 260);
  }
  async function continueToVenues(event) {
    const saved = await saveEvent(event);
    if (saved) {
      setAssistantStage(saved.venueId ? "estimate" : "venues");
      if (saved.venueId) setServiceEvent(saved);
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

  function toggleFeature(feat) {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
    );
  }

  function resetAllFilters() {
    setQuery("");
    setDistrict("ALL");
    setCapacityRange("ALL");
    setSelectedFeatures([]);
    setPriceFilter("ALL");
    setSortBy("DEFAULT");
    field("guests", 80);
    field("strategy", "ECONOMY");
  }

  const hasActiveFilters =
    district !== "ALL" ||
    capacityRange !== "ALL" ||
    selectedFeatures.length > 0 ||
    priceFilter !== "ALL" ||
    query.trim() !== "" ||
    sortBy !== "DEFAULT";

  const activeFiltersCount =
    (district !== "ALL" ? 1 : 0) +
    (capacityRange !== "ALL" ? 1 : 0) +
    selectedFeatures.length +
    (priceFilter !== "ALL" ? 1 : 0) +
    (query.trim() !== "" ? 1 : 0) +
    (sortBy !== "DEFAULT" ? 1 : 0);

  // 1. Filter by District
  let filteredVenues =
    district === "ALL"
      ? venues
      : venues.filter((v) => getVenueDistrict(v.address) === district);

  // 2. Filter by Capacity Range
  if (capacityRange === "UNDER_200") {
    filteredVenues = filteredVenues.filter((v) => (v.capacity || 0) <= 200);
  } else if (capacityRange === "200_350") {
    filteredVenues = filteredVenues.filter(
      (v) => (v.capacity || 0) > 200 && (v.capacity || 0) <= 350,
    );
  } else if (capacityRange === "350_500") {
    filteredVenues = filteredVenues.filter(
      (v) => (v.capacity || 0) > 350 && (v.capacity || 0) <= 500,
    );
  } else if (capacityRange === "OVER_500") {
    filteredVenues = filteredVenues.filter((v) => (v.capacity || 0) > 500);
  }

  // 3. Filter by Features
  if (selectedFeatures.length > 0) {
    filteredVenues = filteredVenues.filter((v) => {
      const vFeatures = v.features || [];
      return selectedFeatures.every((f) => {
        if (f === "Конференция") {
          return vFeatures.some((vf) =>
            /конференц|мультимедиа|led|проектор/i.test(vf),
          );
        }
        return vFeatures.some((vf) =>
          vf.toLowerCase().includes(f.toLowerCase()),
        );
      });
    });
  }

  // 4. Filter by Price
  if (priceFilter === "HAS_PRICE") {
    filteredVenues = filteredVenues.filter((v) => v.price != null && v.price > 0);
  } else if (priceFilter === "ON_REQUEST") {
    filteredVenues = filteredVenues.filter((v) => v.price == null || v.price === 0);
  }

  // 5. Sort
  let displayedVenues = [...filteredVenues];
  if (sortBy === "CAPACITY_DESC") {
    displayedVenues.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  } else if (sortBy === "CAPACITY_ASC") {
    displayedVenues.sort((a, b) => (a.capacity || 0) - (b.capacity || 0));
  } else if (sortBy === "AREA_DESC") {
    displayedVenues.sort((a, b) => (b.area || 0) - (a.area || 0));
  } else if (sortBy === "NAME_ASC") {
    displayedVenues.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  function renderCatalogContent() {
    return (
      <div className="catalog">
        {/* ── 1. Search & Sort & Strategy ── */}
        <div className="catalog-toolbar">
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              aria-label="Поиск площадок"
              placeholder="Название площадки или адрес..."
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
          <div className="catalog-sort-select-wrap">
            <label htmlFor="catalog-sort" className="catalog-sort-label">
              <Icon name="sliders" size={15} />
              <span>Сортировка:</span>
            </label>
            <select
              id="catalog-sort"
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="DEFAULT">По умолчанию</option>
              <option value="CAPACITY_DESC">Вместимость: от больших к малым</option>
              <option value="CAPACITY_ASC">Вместимость: от малых к большим</option>
              <option value="AREA_DESC">Площадь зала (м²)</option>
              <option value="NAME_ASC">По названию (А–Я)</option>
            </select>
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

        {/* ── 2. Filters Box ── */}
        <div className="catalog-filters-box">
          {/* Район */}
          <div className="catalog-filter-row">
            <span className="catalog-filter-label">Район:</span>
            <div className="catalog-pills-list" role="tablist" aria-label="Районы Астаны">
              {DISTRICTS.map((d) => {
                const count =
                  d.id === "ALL"
                    ? venues.length
                    : venues.filter(
                        (v) => getVenueDistrict(v.address) === d.id,
                      ).length;
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`catalog-pill ${district === d.id ? "active" : ""}`}
                    onClick={() => setDistrict(d.id)}
                    role="tab"
                    aria-selected={district === d.id}
                  >
                    <span>{d.label}</span>
                    <span className="pill-count">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Вместимость */}
          <div className="catalog-filter-row">
            <span className="catalog-filter-label">Вместимость:</span>
            <div className="catalog-pills-list" role="toolbar" aria-label="Вместимость залов">
              {[
                { id: "ALL", label: "Любая вместимость" },
                { id: "UNDER_200", label: "До 200 гостей" },
                { id: "200_350", label: "200 – 350 гостей" },
                { id: "350_500", label: "350 – 500 гостей" },
                { id: "OVER_500", label: "500+ гостей" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`catalog-pill ${capacityRange === c.id ? "active" : ""}`}
                  onClick={() => setCapacityRange(c.id)}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Оснащение */}
          <div className="catalog-filter-row">
            <span className="catalog-filter-label">Оснащение:</span>
            <div className="catalog-pills-list" role="toolbar" aria-label="Оснащение и особенности">
              {[
                { id: "Парковка", label: "Парковка", icon: "🚗" },
                { id: "Сцена", label: "Сцена", icon: "🎭" },
                { id: "VIP-зал", label: "VIP-зал", icon: "👑" },
                { id: "Комната невесты", label: "Комната невесты", icon: "👰" },
                { id: "Конференция", label: "Конференц-зал / LED", icon: "📽️" },
              ].map((f) => {
                const active = selectedFeatures.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`catalog-pill ${active ? "active" : ""}`}
                    onClick={() => toggleFeature(f.id)}
                    aria-pressed={active}
                  >
                    <span>{f.icon} {f.label}</span>
                    {active && <span className="pill-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Стоимость */}
          <div className="catalog-filter-row">
            <span className="catalog-filter-label">Цена:</span>
            <div className="catalog-pills-list" role="toolbar" aria-label="Фильтр по стоимости">
              {[
                { id: "ALL", label: "Все площадки" },
                { id: "HAS_PRICE", label: "С опубликованной ценой" },
                { id: "ON_REQUEST", label: "Цена по запросу" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`catalog-pill ${priceFilter === p.id ? "active" : ""}`}
                  onClick={() => setPriceFilter(p.id)}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Results Bar & Reset Button ── */}
        <div className="catalog-active-bar">
          <div className="catalog-results-badge">
            Найдено площадок: <strong>{displayedVenues.length}</strong>
            {district !== "ALL" && (
              <span className="results-subtag">
                ({DISTRICTS.find((d) => d.id === district)?.label})
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="catalog-reset-filters-btn"
              onClick={resetAllFilters}
            >
              <Icon name="close" size={13} />
              <span>Сбросить все фильтры ({activeFiltersCount})</span>
            </button>
          )}
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
            {displayedVenues.length === 0 && (
              <div
                className="catalog-empty"
                style={{
                  gridColumn: "1 / -1",
                  padding: "48px 20px",
                }}
              >
                <Icon name="info" size={32} />
                <h3>По выбранным фильтрам ничего не найдено</h3>
                <p>
                  Попробуйте изменить район, диапазон гостей или снять некоторые фильтры оснащения.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={resetAllFilters}
                >
                  Сбросить все фильтры ({venues.length} площадок)
                </button>
              </div>
            )}
            {displayedVenues.map((v) => (
              <article className="venue-card" key={v.id}>
                <div className="venue-photo">
                  <button
                    className="photo-open"
                    onClick={() => setDetail(v)}
                    aria-label={`Подробнее о ${v.name}`}
                  >
                    <Photo
                      src={v.imageUrl}
                      alt={`${v.name} — фотография площадки`}
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
                    <span className="address-text">{v.address}</span>
                    <a
                      href={`https://2gis.kz/astana/search/${encodeURIComponent(`${v.name} ${v.address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gis-badge"
                      title={`Открыть «${v.name}» в 2GIS`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon2Gis size={14} />
                      <span>2GIS ↗</span>
                    </a>
                  </p>
                  <div className="venue-facts">
                    <span>
                      <Icon name="users" size={15} />
                      До {v.capacity} гостей
                    </span>
                    <span>
                      <Icon name="square" size={14} />
                      {v.area == null ? "Площадь уточняется" : `${v.area} м²`}
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
                  onClick={resetAllFilters}
                >
                  Сбросить все фильтры
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
    );
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setTab("planning");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="QonaqAI, главная"
          >
            <img
              src="/qonaq-icon.png"
              alt="QonaqAI"
              className="brand-logo"
            />
            Qonaq<span>AI</span>
          </a>
          <nav aria-label="Основная навигация">
            <button
              className={tab === "planning" ? "nav-link active" : "nav-link"}
              onClick={() => {
                setTab("planning");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Планирование
            </button>
            <button
              className={tab === "venues" ? "nav-link active" : "nav-link"}
              onClick={() => {
                setTab("venues");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Каталог
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
            <button
              type="button"
              className={`profile ${tab === "account" ? "active" : ""}`}
              onClick={() => setTab("account")}
              aria-label="Личный кабинет"
              title="Личный кабинет"
            >
              <span className="avatar" aria-hidden="true">
                {Array.from(data.profile.name)[0]?.toLocaleUpperCase("ru")}
              </span>
              <div>
                <strong title={data.profile.name}>{data.profile.name}</strong>
                <small>Личный кабинет</small>
              </div>
            </button>
          </div>
        </div>
      </header>
      <main className="main-shell">
        {tab === "planning" ? (
          <>
            {assistantStage === "brief" ? (
              <AssistantChat
                key={assistantChatKey}
                venues={allVenues}
                request={api}
                cache={assistantConversation}
                onUpdate={setAssistantConversation}
                onApply={applyAssistant}
                onManual={startManualEntry}
                onSessionExpired={onSessionExpired}
              />
            ) : assistantStage === "estimate" && serviceEvent ? (
              <EventEstimateDetail
                event={serviceEvent}
                venue={allVenues.find((v) => v.id === serviceEvent.venueId)}
                venues={allVenues}
                eventTypes={data.eventTypes}
                onBack={() => {
                  setAssistantStage("brief");
                  setServiceEvent(null);
                }}
                onProposal={(eventId) => setProposalTarget({ eventId })}
                request={api}
                onSessionExpired={onSessionExpired}
                onUpdateEvent={handleEventUpdated}
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
            {assistantStage !== "brief" && assistantStage !== "estimate" && (
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
                              Подсказки ИИ из вашего диалога. Проверьте значения
                              перед сохранением.
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
                        {saving ? "Сохраняем…" : form.venueId ? "Перейти к смете" : "Показать площадки"}
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
                {assistantStage === "venues" && renderCatalogContent()}
              </section>
            )}
          </>
        ) : tab === "venues" ? (
          <>
            <header className="assistant-flow-heading catalog-standalone-heading">
              <div>
                <p className="assistant-step-label">Пространства Астаны</p>
                <h1>Каталог площадок</h1>
                <p>
                  Банкетные залы, отели и загородные комплексы для любого формата событий
                </p>
              </div>
            </header>
            <section
              className="workspace assistant-workspace assistant-venues"
              id="catalog"
            >
              {renderCatalogContent()}
            </section>
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
            profile={data.profile}
            onSignOut={signOut}
            onNavigateTab={(t) => setTab(t)}
            onNavigateToEvents={() => setTab("events")}
          />
        ) : (
          <EventsScreen
            events={data.events}
            eventTypes={data.eventTypes}
            venues={allVenues}
            onNewEvent={newEvent}
            onEditEvent={editEvent}
            onConfigure={setServiceEvent}
            onProposal={(eventId) => setProposalTarget({ eventId })}
            onDelete={(id) => setDeleteId(id)}
            request={api}
            onSessionExpired={onSessionExpired}
            onUpdateEvent={handleEventUpdated}
          />
        )}
      </main>
      {((tab === "planning" && assistantStage === "venues") || tab === "venues") &&
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
            alt={`${detail.name} — фотография площадки`}
            loading="eager"
          />
          <div className="detail-body">
            <span className="eyebrow small">{detail.hall}</span>
            <p className="detail-description">{detail.description}</p>
            <p className="detail-address">
              <Icon name="pin" size={17} />
              <span>{detail.address}</span>
              <a
                href={`https://2gis.kz/astana/search/${encodeURIComponent(`${detail.name} ${detail.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gis-badge"
                title={`Посмотреть «${detail.name}» в 2GIS Карты`}
              >
                <Icon2Gis size={14} />
                <span>2GIS ↗</span>
              </a>
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
                <strong>{detail.area == null ? "Уточняется" : `${detail.area} м²`}</strong>
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
                  Источник данных
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
                  <dd>{v.area == null ? "Уточняется" : `${v.area} м²`}</dd>
                  <dt>Стоимость</dt>
                  <dd>{v.price ? money(v.price) : "По запросу"}</dd>
                  <dt>Адрес</dt>
                  <dd>
                    {v.address}{" "}
                    <a
                      href={`https://2gis.kz/astana/search/${encodeURIComponent(`${v.name} ${v.address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gis-badge"
                      title={`Открыть «${v.name}» в 2GIS`}
                    >
                      <Icon2Gis size={14} />
                      <span>2GIS ↗</span>
                    </a>
                  </dd>
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
      {serviceEvent && assistantStage !== "estimate" && (
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
