import React, { useEffect, useRef, useState } from "react";
import "./assistant-chat.css";

const greeting = {
  role: "assistant",
  text: "Привет! Я Qonaq — помогу собрать ваше событие. Какой повод планируем?",
};
const starters = [
  "Свадьба / той",
  "Корпоратив",
  "День рождения",
  "Конференция",
];
const money = (n) => new Intl.NumberFormat("ru-KZ").format(n) + " ₸";

export default function AssistantChat({
  request,
  onApply,
  onManual,
  onSessionExpired,
  cache,
  onUpdate,
}) {
  const [messages, setMessages] = useState(cache?.messages || [greeting]);
  const [input, setInput] = useState(cache?.input || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState(cache?.reply || null);
  const [failedHistory, setFailedHistory] = useState(null);
  const [selected, setSelected] = useState(cache?.selected || null);
  useEffect(() => { onUpdate({messages,input,reply,selected}); }, [messages,input,reply,selected,onUpdate]);
  const end = useRef(null),
    active = useRef(null),
    sending = useRef(false);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (messages.length > 1)
      end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  async function ask(history) {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError("");
    setFailedHistory(null);
    const controller = new AbortController();
    active.current = controller;
    try {
      const value = await request("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setMessages([
        ...history,
        { role: "assistant", text: value.message, result: value },
      ]);
      setReply(value);
      setSelected(null);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure.status === 401) onSessionExpired();
      else {
        setError(failure.message);
        setFailedHistory(history);
      }
    } finally {
      sending.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed || pending || sending.current) return;
    if (messages.length >= 23) {
      setError(
        "Этот диалог уже длинный. Перенесите параметры в мероприятие или начните новый диалог.",
      );
      return;
    }
    const history = [...messages, { role: "user", text: trimmed }];
    setMessages(history);
    setInput("");
    ask(history);
  }
  function apply(venueId = selected) {
    if (!reply) return;
    onApply({
      ...reply,
      venueId,
      description: messages
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join("\n")
        .slice(0, 2000),
    });
  }
  const chips = reply?.quickReplies || starters;
  return (
    <section
      className={`qchat ${messages.length > 1 ? "has-conversation" : ""}`}
      aria-label="ИИ-помощник Qonaq"
    >
      <header className="qchat-hero">
        <div className="qchat-kicker">
          <span className="qchat-spark">✦</span> QONAQ AI{" "}
          <span className="qchat-gemini">С GEMINI</span>
        </div>
        <h1>
          У вас идея.
          <br />
          <em>У нас — первый шаг.</em>
        </h1>
        <p>
          Расскажите о событии. Вместе уточним детали
          <br className="qchat-desktop-break" /> и найдём место, в котором всё
          сложится.
        </p>
      </header>
      <div className="qchat-layout">
        <div className="qchat-conversation">
          <div
            className="qchat-messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((item, index) => (
              <div className={`qchat-turn ${item.role}`} key={index}>
                {item.role === "assistant" && (
                  <span className="qchat-avatar" aria-hidden="true">
                    q
                  </span>
                )}
                <div className="qchat-turn-content">
                  <span className="qchat-sender">
                    {item.role === "assistant" ? "Qonaq" : "Вы"}
                  </span>
                  <div className="qchat-bubble">{item.text}</div>
                  {!!item.result?.recommendations?.length && (
                    <div
                      className="qchat-recommendations"
                      aria-label="Рекомендованные площадки"
                    >
                      <p className="qchat-cards-label">
                        МЕСТА ДЛЯ ВАШЕГО СОБЫТИЯ
                      </p>
                      <div className="qchat-card-grid">
                        {item.result.recommendations.map(
                          ({ venue, reason }, idx) => (
                            <article
                              className={`qchat-venue ${selected === venue.id ? "is-selected" : ""}`}
                              key={venue.id}
                            >
                              <div className="qchat-venue-photo">
                                <img
                                  src={venue.imageUrl}
                                  alt={`${venue.name} — ${venue.hall}`}
                                  loading="lazy"
                                />
                                <span>
                                  {idx === 0
                                    ? "Первый вариант"
                                    : `Вариант ${idx + 1}`}
                                </span>
                              </div>
                              <div className="qchat-venue-info">
                                <p className="qchat-hall">{venue.hall}</p>
                                <h3>{venue.name}</h3>
                                <div className="qchat-venue-facts">
                                  <span>До {venue.capacity} гостей</span>
                                  <span>{venue.area} м²</span>
                                </div>
                                <p className="qchat-venue-reason">{reason}</p>
                                <p className="qchat-venue-price">
                                  {venue.price == null
                                    ? "Стоимость по запросу"
                                    : money(venue.price)}
                                </p>
                                <button
                                  type="button"
                                  disabled={
                                    pending || index !== messages.length - 1
                                  }
                                  className="qchat-select"
                                  aria-pressed={selected === venue.id}
                                  onClick={() => {
                                    setSelected(venue.id);
                                if (item.result.ready) apply(venue.id);
                                else send(`Мне нравится площадка «${venue.name}». Давайте уточним остальные детали.`);
                                  }}
                                >
                                  {selected === venue.id
                                    ? "Выбрано ✓"
                                    : item.result.ready
                                      ? "Выбрать и проверить детали"
                                      : "Мне нравится"}
                                  <span aria-hidden="true">↗</span>
                                </button>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                      <p className="qchat-catalog-note">
                        Фото и характеристики — из каталога. Стоимость и
                        свободную дату нужно уточнить у площадки.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {pending && (
              <div className="qchat-thinking" role="status">
                <span>✦</span> Qonaq обдумывает ваш запрос
                <span className="qchat-dots">•••</span>
              </div>
            )}
            <div ref={end} />
          </div>
          {!pending && !error && (
            <div className="qchat-chips" aria-label="Варианты ответа">
              {chips.map((chip) => (
                <button type="button" key={chip} onClick={() => send(chip)}>
                  {chip}
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <div className="qchat-error" role="alert">
              <p>{error}</p>
              {failedHistory && (
                <button
                  type="button"
                  onClick={() => ask(failedHistory)}
                  disabled={pending}
                >
                  Повторить запрос
                </button>
              )}
              <button type="button" onClick={onManual}>
                Заполнить вручную
              </button>
            </div>
          )}
        {reply?.ready && !pending && !error && (
            <div className="qchat-ready">
              <div>
                <strong>Основа события готова</strong>
                <span>Вы проверите всё перед сохранением.</span>
              </div>
              <button className="button primary" onClick={() => apply()}>
                Проверить параметры →
              </button>
            </div>
          )}
          <form
            className="qchat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label className="qchat-sr" htmlFor="qchat-message">
              Сообщение помощнику
            </label>
            <textarea
              id="qchat-message"
              rows={2}
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                messages.length === 1
                  ? "Например, хочу уютный корпоратив на 80 гостей…"
                  : "Напишите ответ или задайте вопрос…"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="qchat-composer-bottom">
              <span>Сначала обсудим. Сохраняете только вы.</span>
              <button
                type="submit"
                aria-label="Отправить сообщение"
                disabled={pending || !input.trim()}
              >
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          </form>
          <div className="qchat-footnote">
            <span>
              Ответы ИИ стоит проверять.
              {reply?.usage &&
                ` Сегодня: ${reply.usage.used} из ${reply.usage.limit} ответов.`}
            </span>
            <button type="button" onClick={onManual}>
              Перейти к форме
            </button>
            {messages.length > 1 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMessages([greeting]);
                  setReply(null);
                  setError("");
                  setSelected(null);
                  setFailedHistory(null);
                }}
              >
                Новый диалог
              </button>
            )}
          </div>
        </div>
        {messages.length === 1 && (
          <aside className="qchat-aside">
            <span className="qchat-aside-symbol">✳</span>
            <p className="qchat-aside-label">ОТ ИДЕИ К СОБЫТИЮ</p>
            <h2>
              Не нужно
              <br />
              знать всё
              <br />
              <em>заранее.</em>
            </h2>
            <p>
              Достаточно повода.
              <br />
              Остальное обсудим вместе.
            </p>
            <ol>
              <li>
                <b>01</b>
                <span>Уточним, что важно</span>
              </li>
              <li>
                <b>02</b>
                <span>Покажем подходящие места</span>
              </li>
              <li>
                <b>03</b>
                <span>Соберём смету и предложение</span>
              </li>
            </ol>
          </aside>
        )}
      </div>
    </section>
  );
}
