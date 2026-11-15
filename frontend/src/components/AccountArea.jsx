import React, { useEffect, useState } from "react";
import PlansPresentation from "./PlansPresentation.jsx";
import ProposalPrintModal from "./ProposalPrintModal.jsx";
import { proposalStatus } from "./ProposalEditor.jsx";
import "./account.css";

const money = (value) =>
  new Intl.NumberFormat("ru-KZ").format(Math.round(value || 0)) + " ₸";

const dateTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
};

export default function AccountArea({
  page,
  request,
  revision,
  profile,
  onSessionExpired,
  onLoaded,
  onEditEvent,
  onConfigure,
  onProposal,
  onNewEvent,
  onSignOut,
  onNavigateTab,
  onNavigateToEvents,
}) {
  const [data, setData] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [printProposal, setPrintProposal] = useState(null);

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
        if (onLoaded) onLoaded(dashboard);
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

  // If viewing the "plans" tab, preserve PlansPresentation 100% intact
  if (page === "plans") {
    return (
      <section className="account-area plans-view" aria-label="Демонстрационные тарифы">
        {error && <p role="alert" className="field-error">{error}</p>}
        {loading && <p role="status" className="account-loading-msg">Загружаем тарифы…</p>}
        {!loading && data && (
          <PlansPresentation
            subscription={data.subscription}
            options={options}
            busy={busy}
            onChange={(code) => mutate("/api/account/plan", "PUT", { code })}
          />
        )}
      </section>
    );
  }

  // Calculations for personal profile dashboard
  const userProfile = data?.profile || profile || { name: "Гость", mode: "DEMO" };
  const userName = userProfile.name || "Организатор";
  const avatarLetter = (Array.from(userName)[0] || "Q").toUpperCase();
  const isDemo = userProfile.mode === "DEMO" || !data?.profile;

  const plan = data?.subscription?.plan || {
    code: "BASIC",
    label: "BASIC",
    maxProposals: 3,
    textExport: false,
  };
  const isPro = plan.code === "PRO";
  const savedProposals = data?.subscription?.savedProposals || 0;
  const maxProposals = plan.maxProposals || 3;
  const quotaPercent = Math.min(
    100,
    Math.round((savedProposals / Math.max(1, maxProposals)) * 100),
  );

  const events = data?.events || [];
  const proposals = data?.proposals || [];
  const totalEvents = events.length;
  const totalProposals = proposals.length;
  const totalBudget = events.reduce(
    (sum, item) => sum + (Number(item?.event?.budget) || 0),
    0,
  );

  return (
    <section className="account-area" aria-label="Личный кабинет">
      <div className="account-shell">
        {/* ── Top Header ── */}
        <header className="account-header">
          <div className="account-header-copy">
            <h1 className="account-title">Личный кабинет</h1>
          </div>
        </header>

        {error && (
          <div className="account-alert error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading && !data && (
          <div className="account-loading-wrap" role="status">
            <p>Загружаем данные личного кабинета…</p>
          </div>
        )}

        {!loading && !data && (
          <div className="account-empty-state">
            <p>Не удалось получить данные профиля.</p>
            <button
              type="button"
              className="account-btn secondary"
              onClick={() => setRefresh((v) => v + 1)}
            >
              Повторить попытку
            </button>
          </div>
        )}

        {data && (
          <>
            {/* ── Top Dual Cards: Profile Info & Plan Status ── */}
            <div className="account-top-grid">
              {/* Card 1: User Profile & Identity */}
              <article className="account-card profile-card">
                <div className="profile-card-top">
                  <div className="profile-avatar">
                    <span>{avatarLetter}</span>
                  </div>
                  <div className="profile-identity">
                    <div className="profile-name-row">
                      <h2 className="profile-name">{userName}</h2>
                      <span className={`profile-mode-badge ${isDemo ? "demo" : "registered"}`}>
                        {isDemo ? "Демо-профиль" : "Аккаунт"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-card-divider" />

                <div className="profile-card-footer">
                  {onSignOut && (
                    <button
                      type="button"
                      className="profile-logout-btn"
                      onClick={onSignOut}
                      title="Выйти из аккаунта"
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
                        aria-hidden="true"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Выйти из аккаунта</span>
                    </button>
                  )}
                </div>
              </article>

              {/* Card 2: Subscription & Quota Card */}
              <article className="account-card plan-card">
                <div className="plan-card-header">
                  <div>
                    <span className="plan-card-kicker">Тарифный план</span>
                    <div className="plan-title-row">
                      <h2 className="plan-title">
                        Qonaq <em>{plan.label}</em>
                      </h2>
                      <span className={`plan-tier-badge ${isPro ? "pro" : "basic"}`}>
                        {isPro ? "PRO ДОСТУП" : "БАЗОВЫЙ ПАКЕТ"}
                      </span>
                    </div>
                  </div>

                  {onNavigateTab && (
                    <button
                      type="button"
                      className="plan-manage-btn"
                      onClick={() => onNavigateTab("plans")}
                      title="Открыть тарифную сетку"
                    >
                      <span>Тарифы →</span>
                    </button>
                  )}
                </div>

                {/* Quota Progress Bar */}
                <div className="plan-quota-wrap">
                  <div className="plan-quota-lbls">
                    <span>Лимит коммерческих предложений</span>
                    <strong>
                      {savedProposals} из {maxProposals} использовано
                    </strong>
                  </div>
                  <div className="plan-progress-track">
                    <div
                      className={`plan-progress-bar ${quotaPercent >= 100 ? "full" : ""}`}
                      style={{ width: `${Math.min(100, Math.max(6, quotaPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="plan-features-list">
                  <div className="feature-item">
                    <span className="feature-check">✓</span>
                    <span>Расчёт смет и подбор банкетных залов Астаны</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-check">✓</span>
                    <span>Экспорт КП в формат PDF (A4) и отправка в WhatsApp</span>
                  </div>
                  <div className={`feature-item ${isPro ? "active" : "muted"}`}>
                    <span className="feature-check">{isPro ? "✓" : "○"}</span>
                    <span>
                      {isPro
                        ? "ИИ-тексты предложений Gemini Pro активны"
                        : "ИИ-копирайтер предложений (доступно в тарифе Pro)"}
                    </span>
                  </div>
                </div>
              </article>
            </div>

            {/* ── Executive KPI Summary (3 Cards) ── */}
            <section className="account-kpi-grid" aria-label="Сводные показатели">
              <div
                className="account-kpi-card is-clickable"
                onClick={onNavigateToEvents}
                title="Перейти к списку мероприятий"
              >
                <div className="kpi-top">
                  <span className="kpi-lbl">Мероприятий в работе</span>
                  <span className="kpi-arrow-icon">↗</span>
                </div>
                <strong className="kpi-val">{totalEvents}</strong>
                <small className="kpi-sub">Открыть «Мои мероприятия»</small>
              </div>

              <div className="account-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-lbl">Подготовлено предложений</span>
                </div>
                <strong className="kpi-val">{totalProposals}</strong>
                <small className="kpi-sub">Сохранённых КП в реестре</small>
              </div>

              <div className="account-kpi-card highlight">
                <div className="kpi-top">
                  <span className="kpi-lbl">Совокупный бюджет</span>
                  <span className="kpi-currency-badge">₸</span>
                </div>
                <strong className="kpi-val">{money(totalBudget)}</strong>
                <small className="kpi-sub">Сумма всех запланированных событий</small>
              </div>
            </section>

            {/* ── Proposals Repository (Сохранённые коммерческие предложения) ── */}
            <section className="account-section">
              <div className="account-section-header">
                <h2 className="account-section-title">Коммерческие предложения</h2>
              </div>

              {proposals.length > 0 ? (
                <div className="account-proposals-grid">
                  {proposals.map((proposal) => {
                    return (
                      <article className="account-proposal-card" key={proposal.id}>
                        <div className="prop-card-top">
                          <div className="prop-card-info">
                            <span className="prop-doc-tag">КП № 00{proposal.id}</span>
                            <h3 className="prop-title">{proposal.title}</h3>
                            <span className="prop-date">
                              Обновлено: {dateTime(proposal.updatedAt)}
                            </span>
                          </div>

                          <span
                            className={`prop-status-pill ${proposal.freshness?.toLowerCase() || "current"}`}
                          >
                            {proposalStatus[proposal.freshness] || "Актуально"}
                          </span>
                        </div>

                        <div className="prop-card-body">
                          <div className="prop-amount-block">
                            <span className="prop-amount-lbl">
                              {proposal.quoteComplete
                                ? "Итоговая сумма сметы:"
                                : "Расчётная смета (известная часть):"}
                            </span>
                            <strong className="prop-amount-val">
                              {money(proposal.knownSubtotal)}
                            </strong>
                          </div>
                        </div>

                        <div className="prop-card-actions">
                          <button
                            type="button"
                            className="prop-action-btn primary"
                            onClick={() => setPrintProposal(proposal)}
                            title="Открыть предварительный просмотр и печать в PDF"
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
                              aria-hidden="true"
                            >
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            <span>Печать / PDF</span>
                          </button>

                          <button
                            type="button"
                            className="prop-action-btn secondary"
                            onClick={() =>
                              onProposal && onProposal({ proposalId: proposal.id })
                            }
                            title="Открыть редактор текста предложения"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Редактор</span>
                          </button>

                          <button
                            type="button"
                            className="prop-action-btn secondary"
                            disabled={busy || !data.subscription.plan.textExport}
                            onClick={() => download(proposal)}
                            title={
                              data.subscription.plan.textExport
                                ? "Скачать в текстовом формате TXT"
                                : "Выгрузка TXT доступна в тарифе Pro"
                            }
                          >
                            <span>TXT</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="account-empty-card">
                  <div className="empty-icon-circle">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <h3>Пока нет сохранённых предложений</h3>
                  <p>
                    Перейдите в раздел «Мои мероприятия», откройте смету и нажмите «Экспорт в КП»,
                    чтобы подготовить официальный документ для площадки.
                  </p>
                  {onNavigateToEvents && (
                    <button
                      type="button"
                      className="account-btn primary"
                      onClick={onNavigateToEvents}
                    >
                      <span>Перейти к мероприятиям →</span>
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── Activity Timeline (Журнал событий) ── */}
            <section className="account-section">
              <div className="account-section-header">
                <h2 className="account-section-title">История активности</h2>
              </div>

              {data.notifications && data.notifications.length > 0 ? (
                <div className="account-timeline-card">
                  {data.notifications.map((n, idx) => (
                    <div className="timeline-row" key={n.id || idx}>
                      <div className="timeline-dot-col">
                        <span className="timeline-dot" />
                      </div>
                      <div className="timeline-body">
                        <p className="timeline-msg">{n.message}</p>
                        <small className="timeline-timestamp">
                          {dateTime(n.createdAt)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="account-timeline-empty">
                  <p>Уведомления и история действий появятся после расчёта или сохранения смет.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Proposal Print & PDF Modal */}
      {printProposal && (
        <ProposalPrintModal
          proposal={{
            id: printProposal.id,
            eventId: printProposal.eventId,
            title: printProposal.title,
            body: printProposal.body,
            createdAt: printProposal.createdAt,
          }}
          onClose={() => setPrintProposal(null)}
        />
      )}
    </section>
  );
}
