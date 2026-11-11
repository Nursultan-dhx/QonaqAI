import React, { useEffect, useState } from "react";
import PlansPresentation from "./PlansPresentation.jsx";
import { proposalStatus } from "./ProposalEditor.jsx";
import "./account.css";

const money = (value) => new Intl.NumberFormat("ru-KZ").format(value) + " ₸";
const dateTime = (value) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
const estimateStatus = {
  MISSING: "Смета не сохранена",
  CURRENT: "Смета актуальна",
  OUTDATED: "Смету нужно обновить",
  INCOMPLETE: "Цена площадки требует уточнения",
};
const bookingStatus = {
  NONE: "Без брони",
  CONFIRMED: "Бронь подтверждена · DEMO",
  CANCELLED: "Бронь отменена",
};

export default function AccountArea({
  page,
  request,
  revision,
  onSessionExpired,
  onLoaded,
  onEditEvent,
  onConfigure,
  onProposal,
  onNewEvent,
}) {
  const [data, setData] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      request("/api/account/dashboard", { signal: controller.signal }),
      request("/api/plans", { signal: controller.signal }),
    ])
      .then(([dashboard, plans]) => {
        if (controller.signal.aborted) return;
        setData(dashboard);
        setOptions(plans);
        onLoaded(dashboard);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) onSessionExpired();
        else setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request, revision, refresh]);

  async function mutate(path, method, body) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setRefresh((value) => value + 1);
    } catch (failure) {
      if (failure.status === 401) onSessionExpired();
      else setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(proposal) {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/export`);
      if (!response.ok) {
        const value = await response.json();
        const failure = new Error(value.message);
        failure.status = response.status;
        throw failure;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `QonaqAI-proposal-${proposal.id}.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (failure.status === 401) onSessionExpired();
      else setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="account-area"
      aria-label={
        page === "plans" ? "Демонстрационные тарифы" : "Личный кабинет"
      }
    >
      {page !== "plans" && (
        <div className="account-heading">
          <div>
            <p className="eyebrow small">ВАШ QONAQAI</p>
            <h1>
              {page === "plans" ? "Тарифы для ваших планов" : "Личный кабинет"}
            </h1>
            <p>
              {page === "plans"
                ? "Выберите возможности для работы с предложениями."
                : "Мероприятия, предложения и бронирования в одном месте."}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={loading || busy}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Обновить данные
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Загружаем личный кабинет…</p>}
      {!loading && !data && (
        <button
          className="button secondary"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Повторить загрузку
        </button>
      )}
      {!loading && data && (
        <>
          <div className="account-plan-summary" hidden={page === "plans"}>
            <span className="proposal-status">
              Тариф {data.subscription.plan.label} · DEMO
            </span>
            <span>
              Предложений: {data.subscription.savedProposals} /{" "}
              {data.subscription.plan.maxProposals}
            </span>
          </div>
          {page === "plans" ? (
            <PlansPresentation
              subscription={data.subscription}
              options={options}
              busy={busy}
              onChange={(code) => mutate("/api/account/plan", "PUT", { code })}
            />
          ) : (
            <>
              <div className="account-stats">
                <div>
                  <strong>{data.events.length}</strong>
                  <span>мероприятий</span>
                </div>
                <div>
                  <strong>{data.proposals.length}</strong>
                  <span>предложений</span>
                </div>
                <div>
                  <strong>
                    {
                      data.bookings.filter(
                        (item) => item.status === "CONFIRMED",
                      ).length
                    }
                  </strong>
                  <span>активных DEMO-броней</span>
                </div>
              </div>
              <div className="account-section-heading">
                <h2>Мои проекты</h2>
                <button className="button primary" onClick={onNewEvent}>
                  Новое мероприятие
                </button>
              </div>
              {!data.events.length && (
                <p>Создайте мероприятие, чтобы начать планирование.</p>
              )}
              <div className="account-project-grid">
                {data.events.map((item) => (
                  <article className="account-card" key={item.event.id}>
                    <h3>{item.event.title}</h3>
                    <p>
                      {item.event.date} · {item.event.guests} гостей ·{" "}
                      {money(item.event.budget)}
                    </p>
                    <div className="account-badges">
                      <span>{estimateStatus[item.estimateStatus]}</span>
                      <span>{bookingStatus[item.bookingStatus]}</span>
                      <span>Предложений: {item.proposalCount}</span>
                    </div>
                    <div className="account-card-actions">
                      <button
                        className="button secondary"
                        onClick={() => onEditEvent(item.event)}
                      >
                        Продолжить
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => onConfigure(item.event)}
                      >
                        Пакет и смета
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => onProposal({ eventId: item.event.id })}
                      >
                        Новое предложение
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <h2 className="account-section-title">Сохранённые предложения</h2>
              {!data.proposals.length && (
                <p>Сохраните смету, затем подготовьте предложение.</p>
              )}
              <div className="account-project-grid">
                {data.proposals.map((proposal) => (
                  <article className="account-card" key={proposal.id}>
                    <h3>{proposal.title}</h3>
                    <span
                      className={`proposal-status ${proposal.freshness.toLowerCase()}`}
                    >
                      {proposalStatus[proposal.freshness]}
                    </span>
                    <p>
                      {proposal.quoteComplete
                        ? "Сумма DEMO-сметы"
                        : "Известная часть DEMO-сметы"}
                      : {money(proposal.knownSubtotal)}
                    </p>
                    <p className="proposal-notice">
                      Изменено: {dateTime(proposal.updatedAt)}
                    </p>
                    <div className="account-card-actions">
                      <button
                        className="button secondary"
                        onClick={() => onProposal({ proposalId: proposal.id })}
                      >
                        Открыть и редактировать
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy || !data.subscription.plan.textExport}
                        onClick={() => download(proposal)}
                      >
                        {data.subscription.plan.textExport
                          ? "Скачать TXT"
                          : "Выгрузка TXT · Pro"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <h2 className="account-section-title">Бронирования · DEMO</h2>
              {!data.bookings.length && <p>Пока нет бронирований.</p>}
              <div className="account-project-grid">
                {data.bookings.map((booking) => (
                  <article className="account-card" key={booking.id}>
                    <h3>{booking.eventTitle}</h3>
                    <p>{booking.venueName}</p>
                    <p>
                      {dateTime(booking.start)} — {dateTime(booking.end)} ·
                      Asia/Almaty
                    </p>
                    <span className="proposal-status">
                      {bookingStatus[booking.status]}
                    </span>
                    <p>{money(booking.quotedTotal)} · DEMO</p>
                    {booking.status === "CONFIRMED" && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          mutate(
                            `/api/bookings/${booking.id}/cancel`,
                            "POST",
                            {},
                          )
                        }
                      >
                        Отменить бронь
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <h2 className="account-section-title">Обновления проектов</h2>
              {!data.notifications.length && (
                <p>Уведомления появятся после изменения проектов.</p>
              )}
              <div className="account-activity">
                {data.notifications.map((notification) => (
                  <article key={notification.id}>
                    <p>{notification.message}</p>
                    <small>{dateTime(notification.createdAt)}</small>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
