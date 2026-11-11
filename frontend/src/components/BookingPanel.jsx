import React, { useEffect, useRef, useState } from "react";
import "./booking.css";

const formatTime = (value) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const money = (value) =>
  new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT" }).format(
    value,
  );

function HistoryRows({ rows, onCancel, busy }) {
  return (
    <div className="booking-history">
      {rows.length === 0 && <p>Бронирований пока нет.</p>}
      {rows.map((booking) => (
        <article
          className="booking-row"
          key={booking.id}
          data-booking-id={booking.id}
          data-booking-status={booking.status}
        >
          <strong>
            {booking.eventTitle} · {booking.venueName}
          </strong>
          <p>
            {formatTime(booking.start)} — {formatTime(booking.end)} ·{" "}
            {booking.timeZone}
          </p>
          <p>
            <b>
              {booking.status === "CONFIRMED" ? "Подтверждено" : "Отменено"}
            </b>{" "}
            · Смета №{booking.estimateRevision} · {money(booking.quotedTotal)} ·
            DEMO
          </p>
          {booking.cancelledAt && (
            <small>Отменено: {formatTime(booking.cancelledAt)}</small>
          )}
          {onCancel && booking.status === "CONFIRMED" && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => onCancel(booking.id)}
              data-cancel-booking
            >
              Отменить бронь
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

export function BookingHistory({ request, onSessionExpired }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request("/api/bookings", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          if (failure.status === 401) onSessionExpired();
          else setError(failure.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request, onSessionExpired, revision]);
  return (
    <section className="booking-panel" aria-label="История всех бронирований">
      <h2>История бронирований</h2>
      <button
        type="button"
        className="button secondary"
        disabled={loading}
        onClick={() => setRevision((value) => value + 1)}
      >
        Обновить историю
      </button>
      {loading ? <p role="status">Загрузка…</p> : <HistoryRows rows={rows} />}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}

export default function BookingPanel({
  event,
  saved,
  draftPending,
  request,
  onSessionExpired,
}) {
  const [start, setStart] = useState(event.date + "T18:00");
  const [end, setEnd] = useState(event.date + "T22:00");
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const alive = useRef(false);
  const savedQuote = saved?.currentEstimate;
  const eligible =
    savedQuote?.freshness === "CURRENT" &&
    !savedQuote?.catalogsChanged &&
    savedQuote?.estimate.quoteComplete &&
    !draftPending;
  const active = rows.find((row) => row.status === "CONFIRMED");
  const key = `${start}/${end}/${savedQuote?.estimateId}/${saved?.currentEventInputs?.venueId}`;

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    operation.current = controller;
    request("/api/bookings", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data.filter((row) => row.eventId === event.id));
          setLoaded(true);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) handleError(failure);
      })
      .finally(() => {
        if (operation.current === controller) operation.current = null;
      });
    return () => {
      alive.current = false;
      operation.current?.abort();
    };
  }, [event.id, request]);

  function handleError(failure) {
    if (!alive.current) return;
    if (failure.status === 401) onSessionExpired();
    else setError(failure.message);
  }
  async function refreshHistory(signal) {
    const data = await request("/api/bookings", { signal });
    if (alive.current && !signal.aborted) {
      setRows(data.filter((row) => row.eventId === event.id));
      setLoaded(true);
    }
  }
  function change(setter, value) {
    setter(value);
    setAvailability(null);
    setError("");
    setNotice("");
  }
  async function run(kind, id) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      // Local fields always mean Almaty time (UTC+05:00), independent of the browser's time zone.
      const interval = { start: start + ":00+05:00", end: end + ":00+05:00" };
      if (kind === "check") {
        const query = new URLSearchParams(interval);
        const result = await request(
          `/api/venues/${saved.currentEventInputs.venueId}/availability?${query}`,
          { signal: controller.signal },
        );
        if (alive.current && !controller.signal.aborted)
          setAvailability({ ...result, key });
      } else {
        const path =
          kind === "confirm"
            ? `/api/events/${event.id}/bookings`
            : `/api/bookings/${id}/cancel`;
        const result = await request(path, {
          method: "POST",
          signal: controller.signal,
          ...(kind === "confirm"
            ? {
                body: JSON.stringify({
                  ...interval,
                  estimateId: savedQuote.estimateId,
                }),
              }
            : {}),
        });
        if (!alive.current || controller.signal.aborted) return;
        setRows((current) => [
          result,
          ...current.filter((row) => row.id !== result.id),
        ]);
        setAvailability(null);
        setNotice(
          kind === "confirm"
            ? "Бронь подтверждена и сохранена."
            : "Бронь отменена. Слот освобождён — проверьте доступность снова.",
        );
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setAvailability(null);
        handleError(failure);
        // A lost HTTP response can follow a committed mutation: recover the authoritative history.
        if (kind !== "check") {
          try {
            await refreshHistory(controller.signal);
          } catch (recovery) {
            handleError(recovery);
          }
        }
      }
    } finally {
      if (alive.current) setBusy(false);
      if (operation.current === controller) operation.current = null;
    }
  }
  return (
    <section className="booking-panel" aria-label="Бронирование площадки">
      <p>
        Часовой пояс: <strong>Asia/Almaty (UTC+05:00)</strong>. Начало — в дату
        мероприятия, длительность до 24 часов. Это учебная бронь DEMO.
      </p>
      {!eligible && (
        <p>
          Для бронирования сохраните полную актуальную смету и все изменения
          пакета.
        </p>
      )}
      {active && (
        <p>
          Перед изменением даты, площадки, гостей, бюджета или пакета отмените
          действующую бронь.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run("check");
        }}
      >
        <fieldset
          disabled={
            busy || !loaded || !!active || !saved?.currentEventInputs?.venueId
          }
        >
          <legend>Выберите время</legend>
          <div className="booking-times">
            <label>
              Начало (Алматы)
              <input
                type="datetime-local"
                step="60"
                required
                value={start}
                onChange={(e) => change(setStart, e.target.value)}
                data-booking-start
              />
            </label>
            <label>
              Конец (Алматы)
              <input
                type="datetime-local"
                step="60"
                required
                value={end}
                onChange={(e) => change(setEnd, e.target.value)}
                data-booking-end
              />
            </label>
          </div>
          <div className="booking-actions">
            <button
              className="button secondary"
              type="submit"
              data-check-availability
            >
              Проверить доступность
            </button>
            <button
              className="button primary"
              type="button"
              disabled={
                !eligible ||
                !availability?.available ||
                availability.key !== key
              }
              onClick={() => run("confirm")}
              data-confirm-booking
            >
              Подтвердить бронь
            </button>
          </div>
        </fieldset>
      </form>
      {busy && <p role="status">Выполняем запрос…</p>}
      {availability?.key === key && (
        <p
          role="status"
          data-availability={availability.available ? "available" : "busy"}
        >
          {availability.available
            ? "Площадка свободна. Доступность повторно проверяется при подтверждении."
            : "Площадка занята. Выберите другое время."}
        </p>
      )}
      {notice && (
        <p role="status" data-booking-notice>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <h3>Брони этого мероприятия</h3>
      {!loaded ? (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            if (operation.current) return;
            const controller = new AbortController();
            operation.current = controller;
            setBusy(true);
            try {
              await refreshHistory(controller.signal);
              setError("");
            } catch (failure) {
              if (!controller.signal.aborted) handleError(failure);
            } finally {
              if (alive.current) setBusy(false);
              if (operation.current === controller) operation.current = null;
            }
          }}
        >
          Загрузить историю
        </button>
      ) : (
        <HistoryRows
          rows={rows}
          busy={busy}
          onCancel={(id) => run("cancel", id)}
        />
      )}
    </section>
  );
}
