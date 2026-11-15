import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./event-edit-modal.css";

const money = (n) =>
  new Intl.NumberFormat("ru-KZ").format(Number(n) || 0) + " ₸";

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EventEditModal({
  event,
  eventTypes = [],
  venues = [],
  onClose,
  onSaved,
  request,
  onSessionExpired,
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [type, setType] = useState(event?.type || "CORPORATE");
  const [date, setDate] = useState(event?.date || "");
  const [guests, setGuests] = useState(event?.guests || 50);
  const [budget, setBudget] = useState(event?.budget || 1000000);
  const [venueId, setVenueId] = useState(event?.venueId || "");
  const [strategy, setStrategy] = useState(event?.strategy || "ECONOMY");
  const [description, setDescription] = useState(event?.description || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const modalRef = useRef(null);
  const todayStr = getTodayString();

  // Escape key and outside click handling
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Selected venue info for capacity warning
  const selectedVenue = venues.find((v) => String(v.id) === String(venueId));
  const isOverCapacity =
    selectedVenue && Number(guests) > selectedVenue.capacity;

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const errors = {};
    if (!title.trim()) {
      errors.title = "Введите название мероприятия";
    }
    if (!date) {
      errors.date = "Выберите дату проведения";
    } else if (date < todayStr) {
      errors.date = "Дата не может быть в прошлом";
    }
    if (!guests || Number(guests) < 1) {
      errors.guests = "Минимум 1 гость";
    } else if (Number(guests) > 10000) {
      errors.guests = "Не более 10 000 гостей";
    }
    if (!budget || Number(budget) <= 0) {
      errors.budget = "Бюджет должен быть больше 0";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    try {
      const payload = {
        title: title.trim(),
        type,
        date,
        guests: Number(guests),
        budget: Number(budget),
        venueId: venueId ? Number(venueId) : null,
        strategy,
        description: description.trim(),
      };

      const result = await request(`/api/events/${event.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (onSaved) {
        onSaved(result.event || { ...event, ...payload }, result.notifications);
      }
      onClose();
    } catch (err) {
      if (err.status === 401) {
        if (onSessionExpired) onSessionExpired();
      } else {
        setError(err.message || "Не удалось сохранить изменения");
        if (err.fields) {
          setFieldErrors(err.fields);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className="eem-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="eem-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="eem-header">
          <div>
            <span className="eem-kicker">Настройки события</span>
            <h2 className="eem-title">Редактировать мероприятие</h2>
          </div>
          <button
            type="button"
            className="eem-close-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </header>

        {/* Form */}
        <form className="eem-form" onSubmit={handleSubmit}>
          {error && <div className="eem-error-banner">{error}</div>}

          {/* Title */}
          <div className="eem-field">
            <label htmlFor="eem-title">Название мероприятия *</label>
            <input
              id="eem-title"
              type="text"
              required
              maxLength={120}
              placeholder="Например: Выпускной AITU, Свадьба, Юбилей..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: null }));
                }
              }}
              className={fieldErrors.title ? "has-error" : ""}
            />
            {fieldErrors.title && (
              <span className="eem-field-error">{fieldErrors.title}</span>
            )}
          </div>

          {/* Event Type Pills */}
          <div className="eem-field">
            <label>Тип события</label>
            <div className="eem-type-pills">
              {eventTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`eem-type-pill ${type === t.id ? "active" : ""}`}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Guests Row */}
          <div className="eem-grid-2">
            <div className="eem-field">
              <label htmlFor="eem-date">Дата проведения *</label>
              <input
                id="eem-date"
                type="date"
                required
                min={todayStr}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (fieldErrors.date) {
                    setFieldErrors((prev) => ({ ...prev, date: null }));
                  }
                }}
                className={fieldErrors.date ? "has-error" : ""}
              />
              {fieldErrors.date && (
                <span className="eem-field-error">{fieldErrors.date}</span>
              )}
            </div>

            <div className="eem-field">
              <label htmlFor="eem-guests">Количество гостей *</label>
              <div className="eem-num-input-wrap">
                <input
                  id="eem-guests"
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={guests}
                  onChange={(e) => {
                    setGuests(e.target.value);
                    if (fieldErrors.guests) {
                      setFieldErrors((prev) => ({ ...prev, guests: null }));
                    }
                  }}
                  className={fieldErrors.guests ? "has-error" : ""}
                />
                <span className="eem-unit-badge">персон</span>
              </div>
              {fieldErrors.guests && (
                <span className="eem-field-error">{fieldErrors.guests}</span>
              )}
            </div>
          </div>

          {/* Budget & Strategy Row */}
          <div className="eem-grid-2">
            <div className="eem-field">
              <div className="eem-field-header-flex">
                <label htmlFor="eem-budget">Плановый бюджет *</label>
                <span className="eem-budget-preview">{money(budget)}</span>
              </div>
              <input
                id="eem-budget"
                type="number"
                required
                min="1000"
                step="10000"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  if (fieldErrors.budget) {
                    setFieldErrors((prev) => ({ ...prev, budget: null }));
                  }
                }}
                className={fieldErrors.budget ? "has-error" : ""}
              />
              {fieldErrors.budget && (
                <span className="eem-field-error">{fieldErrors.budget}</span>
              )}
            </div>

            <div className="eem-field">
              <label htmlFor="eem-strategy">Способ подбора площадок</label>
              <select
                id="eem-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="ECONOMY">Экономный (по цене меню)</option>
                <option value="QUALITY">Больше пространства (на гостя)</option>
              </select>
            </div>
          </div>

          {/* Venue Selection */}
          <div className="eem-field">
            <div className="eem-field-header-flex">
              <label htmlFor="eem-venue">Выбранная площадка / Зал</label>
              {selectedVenue && (
                <span className="eem-venue-cap">
                  Вместимость: {selectedVenue.capacity} персон
                </span>
              )}
            </div>
            <select
              id="eem-venue"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">— Без площадки (выбрать позже) —</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.address || "Астана"} (до {v.capacity} чел.)
                </option>
              ))}
            </select>

            {isOverCapacity && (
              <p className="eem-warning-notice">
                ⚠️ Внимание: выбранный зал вмещает до {selectedVenue.capacity}{" "}
                гостей, а у вас запланировано {guests}. Возможно, в зале будет тесно.
              </p>
            )}
          </div>

          {/* Description / Notes */}
          <div className="eem-field">
            <label htmlFor="eem-desc">Пожелания и заметки к событию</label>
            <textarea
              id="eem-desc"
              rows={3}
              maxLength={2000}
              placeholder="Формат торжества, особенности программы, важные акценты..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <footer className="eem-footer">
            <button
              type="button"
              className="eem-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="eem-btn primary"
              disabled={saving}
            >
              {saving ? "Сохраняем…" : "Сохранить изменения"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}
