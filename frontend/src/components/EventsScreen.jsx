import React, { useEffect, useRef, useState } from "react";
import EventEstimateDetail from "./EventEstimateDetail.jsx";
import EventEditModal from "./EventEditModal.jsx";
import "./events-screen.css";

const money = (n) => new Intl.NumberFormat("ru-KZ").format(n || 0) + " ₸";

const humanDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Дата не выбрана";

function getNoun(number, one, two, five) {
  let n = Math.abs(number);
  n %= 100;
  if (n >= 5 && n <= 20) return five;
  n %= 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
}

export default function EventsScreen({
  events = [],
  eventTypes = [],
  venues = [],
  onNewEvent,
  onEditEvent,
  onConfigure,
  onProposal,
  onDelete,
  request,
  onSessionExpired,
  onUpdateEvent,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [estimateEventId, setEstimateEventId] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const menuRef = useRef(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  function toggleMenu(id, e) {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === id ? null : id));
  }

  /* When an event estimate is opened */
  const activeEstimateEvent = events.find((e) => e.id === estimateEventId);
  if (activeEstimateEvent) {
    const venue = venues.find((v) => v.id === activeEstimateEvent.venueId);
    return (
      <EventEstimateDetail
        event={activeEstimateEvent}
        venue={venue}
        venues={venues}
        eventTypes={eventTypes}
        onBack={() => setEstimateEventId(null)}
        onProposal={onProposal}
        request={request}
        onSessionExpired={onSessionExpired}
        onUpdateEvent={onUpdateEvent}
      />
    );
  }

  return (
    <div className="ev-root">
      {/* ── Minimalist Header ── */}
      <header className="ev-header">
        <div className="ev-header-copy">
          <span className="ev-kicker">Ваши планы</span>
          <h1 className="ev-title">Мои мероприятия</h1>
          <p className="ev-subtitle">
            {events.length > 0
              ? `${events.length} ${getNoun(
                  events.length,
                  "сохранённое мероприятие",
                  "сохранённых мероприятия",
                  "сохранённых мероприятий",
                )}`
              : "Создайте первое мероприятие, чтобы рассчитать смету и подобрать залы"}
          </p>
        </div>

        <button
          type="button"
          className="ev-create-btn"
          onClick={onNewEvent}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Создать мероприятие</span>
        </button>
      </header>

      {/* ── Events Grid or Minimalist Empty State ── */}
      {events.length > 0 ? (
        <div className="ev-grid" ref={menuRef}>
          {events.map((event) => {
            const venue = venues.find((v) => v.id === event.venueId);
            const typeObj = eventTypes.find((t) => t.id === event.type);
            const typeLabel = typeObj?.label || event.type || "Мероприятие";
            const isMenuOpen = activeMenuId === event.id;

            return (
              <article className="ev-card" key={event.id}>
                <div className="ev-card-top-content">
                  {/* Top metadata line */}
                  <div className="ev-card-top">
                    <div className="ev-meta-left">
                      <span className="ev-tag">{typeLabel}</span>
                      <span className="ev-dot">·</span>
                      <span className="ev-date-str">{humanDate(event.date)}</span>
                    </div>

                    <div className="ev-actions-top">
                      <button
                        type="button"
                        className="ev-quick-edit-btn"
                        title="Редактировать мероприятие"
                        aria-label={`Редактировать ${event.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      {/* Options Menu Button (···) */}
                      <div className="ev-menu-wrap">
                        <button
                          type="button"
                          className={`ev-menu-trigger ${isMenuOpen ? "is-open" : ""}`}
                          aria-label={`Действия для ${event.title}`}
                          aria-expanded={isMenuOpen}
                          onClick={(e) => toggleMenu(event.id, e)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="2.2" />
                            <circle cx="5" cy="12" r="2.2" />
                            <circle cx="19" cy="12" r="2.2" />
                          </svg>
                        </button>

                      {/* Floating Actions Popover */}
                      {isMenuOpen && (
                        <div className="ev-popover" role="menu">
                          <button
                            type="button"
                            className="ev-menu-item"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuId(null);
                              setEstimateEventId(event.id);
                            }}
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
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span>Открыть смету и детали</span>
                          </button>

                          <button
                            type="button"
                            className="ev-menu-item"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (onProposal) onProposal(event.id);
                            }}
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
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <span>Подготовить КП (файл)</span>
                          </button>

                          <button
                            type="button"
                            className="ev-menu-item"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingEvent(event);
                            }}
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
                            <span>Редактировать параметры</span>
                          </button>

                          <div className="ev-menu-hr" />

                          <button
                            type="button"
                            className="ev-menu-item danger"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (onDelete) onDelete(event.id);
                            }}
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
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Удалить мероприятие</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Restaurant Photo Banner */}
                  <div
                    className={`ev-card-cover ${venue?.imageUrl ? "has-img" : "no-img"}`}
                    onClick={() => setEstimateEventId(event.id)}
                    role="button"
                    tabIndex={0}
                    title={venue ? `Площадка: ${venue.name}` : "Площадка не выбрана"}
                  >
                    {venue?.imageUrl ? (
                      <>
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="ev-cover-img"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="ev-cover-overlay">
                          <span className="ev-cover-venue-badge">
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>{venue.name}</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="ev-cover-empty">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 21h18" />
                          <path d="M5 21V7l8-4v18" />
                          <path d="M19 21V11l-6-4" />
                          <line x1="9" y1="9" x2="9" y2="9.01" />
                          <line x1="9" y1="13" x2="9" y2="13.01" />
                          <line x1="9" y1="17" x2="9" y2="17.01" />
                        </svg>
                        <span>Площадка ещё не выбрана</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h2
                    className="ev-card-title"
                    title="Открыть смету и детали"
                    onClick={() => setEstimateEventId(event.id)}
                  >
                    {event.title}
                  </h2>

                  {/* Clean Parameters */}
                  <div className="ev-card-params">
                    {/* Venue & hall */}
                    {venue ? (
                      <div className="ev-param">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>
                          {venue.name}
                          {venue.hall ? ` · ${venue.hall}` : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="ev-param is-empty">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Площадка не выбрана</span>
                      </div>
                    )}

                    {/* Guests */}
                    <div className="ev-param">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>{event.guests} гостей</span>
                    </div>
                  </div>
                </div>

                <div className="ev-card-bottom-section">
                  {/* Budget */}
                  <div className="ev-card-budget">
                    <span className="ev-budget-lbl">Бюджет события</span>
                    <strong className="ev-budget-val">{money(event.budget)}</strong>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="button"
                    className="ev-card-btn"
                    onClick={() => setEstimateEventId(event.id)}
                  >
                    <span>Открыть смету и детали</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* ── Minimalist Empty State ── */
        <div className="ev-empty">
          <div className="ev-empty-icon" aria-hidden="true">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 className="ev-empty-title">Пока нет сохранённых мероприятий</h2>
          <p className="ev-empty-desc">
            Создайте первое событие, чтобы рассчитать смету, подобрать площадки и
            подготовить предложение.
          </p>
          <button
            type="button"
            className="ev-empty-btn"
            onClick={onNewEvent}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Начать планирование</span>
          </button>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          eventTypes={eventTypes}
          venues={venues}
          onClose={() => setEditingEvent(null)}
          onSaved={(updated, notifications) => {
            setEditingEvent(null);
            if (onUpdateEvent) onUpdateEvent(updated, notifications);
          }}
          request={request}
          onSessionExpired={onSessionExpired}
        />
      )}
    </div>
  );
}
