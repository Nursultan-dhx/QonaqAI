import React, { useEffect, useRef, useState } from "react";
import "./proposal.css";

export const proposalStatus = {
  CURRENT: "Актуально",
  OUTDATED: "Исходные данные изменились",
  EVENT_REMOVED: "Мероприятие удалено · сохранённый документ",
};

export default function ProposalEditor({
  target,
  request,
  onSessionExpired,
  onSaved,
}) {
  const [record, setRecord] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const active = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request(
      target.proposalId
        ? `/api/proposals/${target.proposalId}`
        : `/api/events/${target.eventId}/proposal-draft`,
      {
        ...(target.proposalId ? {} : { method: "POST" }),
        signal: controller.signal,
      },
    )
      .then((value) => {
        if (controller.signal.aborted) return;
        setRecord(value);
        setTitle(value.title);
        setBody(value.body);
        setSaved(false);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) onSessionExpired();
        else setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, [target.eventId, target.proposalId, request, reload]);

  async function save(event) {
    event.preventDefault();
    if (saving || !record) return;
    const controller = new AbortController();
    active.current = controller;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const value = await request(
        record.id
          ? `/api/proposals/${record.id}`
          : `/api/events/${record.eventId}/proposals`,
        {
          method: record.id ? "PUT" : "POST",
          signal: controller.signal,
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            ...(record.id
              ? { expectedVersion: record.version }
              : { sourceToken: record.sourceToken }),
          }),
        },
      );
      if (controller.signal.aborted) return;
      setRecord(value);
      setSaved(true);
      onSaved?.(value);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure.status === 401) onSessionExpired();
      else setError(failure.message);
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  async function improveWithAi() {
    if (aiBusy || !record) return;
    const controller = new AbortController();
    active.current = controller;
    setAiBusy(true);
    setError("");
    try {
      const draft = await request(
        `/api/events/${record.eventId}/proposal-ai-draft`,
        { method: "POST", signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (!record.id) setRecord(draft);
      setBody(draft.body);
      setSaved(false);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure.status === 401) onSessionExpired();
        else setError(failure.message);
      }
    } finally {
      if (!controller.signal.aborted) setAiBusy(false);
    }
  }

  return (
    <div className="proposal-editor">
      <p className="proposal-notice">
        Черновик по выбранной площадке, услугам и сохранённой DEMO-смете.
        Проверьте и отредактируйте текст.
      </p>
      {loading && <p role="status">Подготавливаем предложение…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {!loading && !record && (
        <button
          className="button secondary"
          onClick={() => setReload((value) => value + 1)}
        >
          Повторить подготовку
        </button>
      )}
      {!loading && record && (
        <form onSubmit={save}>
          <div className="proposal-ai-action">
            <div>
              <strong>Добавьте событию голос</strong>
              <p>
                Gemini подготовит вступление, а данные сметы останутся в
                документе. Заменит текущий текст черновика. Доступно в Pro.
              </p>
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={saving || aiBusy}
              onClick={improveWithAi}
            >
              {aiBusy ? "Пишем с Gemini…" : "✦ Подготовить текст с ИИ"}
            </button>
          </div>
          {record.freshness && (
            <p className={`proposal-status ${record.freshness.toLowerCase()}`}>
              {proposalStatus[record.freshness]}
            </p>
          )}
          <label>
            Название предложения
            <input
              name="proposal-title"
              value={title}
              maxLength={120}
              required
              disabled={saving || aiBusy}
              onChange={(event) => {
                setTitle(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label>
            Текст предложения
            <textarea
              name="proposal-body"
              rows={20}
              value={body}
              maxLength={16000}
              required
              disabled={saving || aiBusy}
              onChange={(event) => {
                setBody(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <p className="proposal-notice">
            Редактирование текста не меняет смету или бронь. При изменении
            исходных данных подготовьте новое предложение.
          </p>
          <button
            className="button primary"
            disabled={saving || aiBusy || !title.trim() || !body.trim()}
          >
            {saving ? "Сохраняем…" : "Сохранить предложение"}
          </button>
          {saved && (
            <p role="status">Предложение сохранено в личном кабинете.</p>
          )}
        </form>
      )}
    </div>
  );
}
