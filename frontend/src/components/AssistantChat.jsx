import React, { useEffect, useMemo, useRef, useState } from "react";
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

const DEFAULT_GALLERY_VENUES = [
  {
    id: 1,
    name: "The Ritz-Carlton, Astana",
    hall: "Grand Ballroom",
    capacity: 500,
    address: "Астана, ул. Достык, 16",
    district: "Есиль",
    imageUrl: "https://iili.io/oHeh6Rp.jpg",
  },
  {
    id: 2,
    name: "The St. Regis Astana",
    hall: "Astor Ballroom",
    capacity: 240,
    address: "Астана, пр. Кабанбай батыра, 1",
    district: "Парк Есиль",
    imageUrl: "https://iili.io/oHej2z7.jpg",
  },
  {
    id: 3,
    name: "Hilton Astana",
    hall: "Grand Ballroom",
    capacity: 350,
    address: "Астана, ул. Гейдара Алиева, 14",
    district: "EXPO",
    imageUrl: "https://iili.io/oHeXb9V.jpg",
  },
  {
    id: 4,
    name: "Rixos President Astana",
    hall: "Зал мероприятий",
    capacity: 300,
    address: "Астана, ул. Динмухамеда Кунаева, 7",
    district: "Центр",
    imageUrl: "https://iili.io/oHehibI.jpg",
  },
  {
    id: 5,
    name: "Sheraton Astana Hotel",
    hall: "Ballroom",
    capacity: 180,
    address: "Астана, ул. Сыганак, 60/1",
    district: "Есиль",
    imageUrl: "https://iili.io/oHejJbS.jpg",
  },
  {
    id: 6,
    name: "Radisson Hotel, Astana",
    hall: "Sary Arka",
    capacity: 600,
    address: "Астана, пр. Сарыарка, 4",
    district: "Набережная",
    imageUrl: "https://iili.io/oHeh4JR.jpg",
  },
  {
    id: 7,
    name: "Hilton Garden Inn Astana",
    hall: "Garden",
    capacity: 250,
    address: "Астана, пр. Кабанбай батыра, 15",
    district: "Есиль",
    imageUrl: "https://iili.io/oHehHoF.jpg",
  },
  {
    id: 8,
    name: "KAZZHOL Astana",
    hall: "Евразия",
    capacity: 200,
    address: "Астана, ул. Балкантау, 213",
    district: "Алматы",
    imageUrl: "https://iili.io/oHehBAN.webp",
  },
  {
    id: 16,
    name: "Салтанат Сарайы",
    hall: "Торжественный зал",
    capacity: 400,
    address: "Астана, пр. Кабанбай батыра, 3",
    district: "Центральный парк",
    imageUrl: "https://iili.io/oHej95l.webp",
  },
  {
    id: 9,
    name: "Ресторан Мирас",
    hall: "Банкетный зал",
    capacity: 300,
    address: "Астана, пр. Туран, 36",
    district: "Туран",
    imageUrl: "https://iili.io/oHehhHQ.webp",
  },
  {
    id: 10,
    name: "Samruk 777",
    hall: "Банкетный зал",
    capacity: 300,
    address: "Астана, шоссе Коргалжын, 28",
    district: "Коргалжын",
    imageUrl: "https://iili.io/oHejHe2.webp",
  },
  {
    id: 11,
    name: "Esmeralda",
    hall: "Золотой зал",
    capacity: 240,
    address: "Астана, ул. Жанкент, 102",
    district: "Алматы",
    imageUrl: "https://iili.io/oHeXCCu.webp",
  },
  {
    id: 12,
    name: "Алғыс",
    hall: "Большой зал",
    capacity: 130,
    address: "Астана, ул. Абылай хана, 25",
    district: "Алматы",
    imageUrl: "https://iili.io/oHeWjrx.webp",
  },
  {
    id: 13,
    name: "Wyndham Garden Astana",
    hall: "Garden Hall",
    capacity: 500,
    address: "Астана, ул. Хусейн бен Талал, 25",
    district: "EXPO",
    imageUrl: "https://iili.io/oHeXEaR.webp",
  },
  {
    id: 14,
    name: "Royal Ballroom",
    hall: "Большой зал",
    capacity: 350,
    address: "Астана, пр. Туран, 48",
    district: "Есиль",
    imageUrl: "https://iili.io/oHehQWX.webp",
  },
  {
    id: 15,
    name: "KorkemTau",
    hall: "Банкетный зал",
    capacity: 200,
    address: "Астана, пр. Абылай хана, 52",
    district: "Алматы",
    imageUrl: "https://iili.io/oHehRS4.webp",
  },
  {
    id: 17,
    name: "Традициональ",
    hall: "Царский зал",
    capacity: 180,
    address: "Астана, пр. Туран, 33",
    district: "Туран",
    imageUrl: "https://iili.io/oHejndx.webp",
  },
  {
    id: 18,
    name: "Жерұйық",
    hall: "Большой зал",
    capacity: 300,
    address: "Астана, ул. Бауыржана Момышулы, 24",
    district: "Алматы",
    imageUrl: "https://iili.io/oHej5qg.webp",
  },
  {
    id: 19,
    name: "Royal Palace",
    hall: "Большой зал",
    capacity: 500,
    address: "Астана, ул. Шаймердена Косшыгулулы, 14",
    district: "Сарыарка",
    imageUrl: "https://iili.io/oHehb0G.webp",
  },
  {
    id: 20,
    name: "Palazzo Di Astana",
    hall: "Палаццо",
    capacity: 500,
    address: "Астана, ул. Кажымукана, 14",
    district: "Алматы",
    imageUrl: "https://iili.io/oHehex1.webp",
  },
];

function TypewriterText({ text, onComplete, onScroll }) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    if (!text) {
      onComplete?.();
      return;
    }

    let current = 0;
    const total = text.length;
    let timer = null;

    function step() {
      if (completedRef.current) return;

      const stepSize = total > 350 ? 3 : total > 140 ? 2 : 1;
      current = Math.min(total, current + stepSize);
      setDisplayedLength(current);
      onScroll?.();

      if (current >= total) {
        completedRef.current = true;
        onComplete?.();
      } else {
        const char = text[current - 1];
        const delay =
          char === "." || char === "!" || char === "?"
            ? 45
            : char === "," || char === ":"
              ? 25
              : 14;
        timer = setTimeout(step, delay);
      }
    }

    timer = setTimeout(step, 20);

    return () => {
      clearTimeout(timer);
    };
  }, [text, onComplete, onScroll]);

  function handleSkip() {
    if (!completedRef.current) {
      completedRef.current = true;
      setDisplayedLength(text.length);
      onComplete?.();
    }
  }

  const isFinished = displayedLength >= text.length;

  return (
    <span
      className="qchat-typewriter"
      onClick={handleSkip}
      title={isFinished ? undefined : "Нажмите, чтобы показать весь текст сразу"}
      style={{ cursor: isFinished ? "inherit" : "pointer" }}
    >
      {text.slice(0, displayedLength)}
      {!isFinished && (
        <span className="qchat-typewriter-cursor" aria-hidden="true" />
      )}
    </span>
  );
}

export default function AssistantChat({
  venues = [],
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
  const [typingIndex, setTypingIndex] = useState(null);
  const [applying, setApplying] = useState(false);

  const galleryVenues = useMemo(() => {
    if (venues && venues.length > 0) {
      const withImages = venues.filter((v) => v.imageUrl);
      if (withImages.length >= 6) return withImages.slice(0, 20);
    }
    return DEFAULT_GALLERY_VENUES;
  }, [venues]);

  function handleVenueClick(v) {
    const prompt = `Расскажи подробнее про площадку ${v.name} (${v.hall || "банкетный зал"}) и рассчитай примерную смету для моего события`;
    setInput(prompt);
    const textarea = document.getElementById("qchat-message");
    if (textarea) {
      textarea.focus();
      textarea.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const trackRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let animId = null;
    let lastTime = performance.now();

    function step(now) {
      const delta = Math.min(now - lastTime, 40);
      lastTime = now;

      const halfHeight = track.scrollHeight / 2;

      if (halfHeight > 100) {
        // Continuous smooth auto-glide (approx 26px per second)
        offsetRef.current += delta * 0.026;

        if (offsetRef.current >= halfHeight) {
          offsetRef.current -= halfHeight;
        } else if (offsetRef.current < 0) {
          offsetRef.current += halfHeight;
        }

        track.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
      }

      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);

    const container = track.parentElement;
    if (!container) return () => cancelAnimationFrame(animId);

    const onWheel = (e) => {
      e.preventDefault();
      const halfHeight = track.scrollHeight / 2;
      offsetRef.current += e.deltaY * 0.85;

      if (halfHeight > 100) {
        if (offsetRef.current >= halfHeight) {
          offsetRef.current -= halfHeight;
        } else if (offsetRef.current < 0) {
          offsetRef.current += halfHeight;
        }
      }

      track.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
    };

    let touchStartY = 0;
    const onTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;

      const halfHeight = track.scrollHeight / 2;
      offsetRef.current += deltaY * 1.1;

      if (halfHeight > 100) {
        if (offsetRef.current >= halfHeight) {
          offsetRef.current -= halfHeight;
        } else if (offsetRef.current < 0) {
          offsetRef.current += halfHeight;
        }
      }

      track.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [galleryVenues]);
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
      const targetIndex = history.length;
      setMessages([
        ...history,
        { role: "assistant", text: value.message, result: value },
      ]);
      setTypingIndex(targetIndex);
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
    setTypingIndex(null);
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
  async function apply(venueId = selected) {
    if (!reply || applying) return;
    setApplying(true);
    try {
      await onApply({
        ...reply,
        venueId,
        description: messages
          .filter((m) => m.role === "user")
          .map((m) => m.text)
          .join("\n")
          .slice(0, 2000),
      });
    } finally {
      setApplying(false);
    }
  }
  const chips = reply?.quickReplies || starters;
  return (
    <section
      className={`qchat ${messages.length > 1 ? "has-conversation" : ""}`}
      aria-label="ИИ-помощник Qonaq"
    >
      {messages.length <= 1 && (
        <header className="qchat-hero">
          <h1>
            У вас идея.
            <br />
            <em>У нас — первый шаг.</em>
          </h1>
          <p>
            Расскажите о событии. Вместе уточним детали и найдём место, в котором всё сложится.
          </p>
        </header>
      )}
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
                    <img src="/qonaq-icon.png" alt="Qonaq" />
                  </span>
                )}
                <div className="qchat-turn-content">
                  <span className="qchat-sender">
                    {item.role === "assistant" ? "Qonaq" : "Вы"}
                  </span>
                  <div className="qchat-bubble">
                    {item.role === "assistant" && typingIndex === index ? (
                      <TypewriterText
                        text={item.text}
                        onComplete={() => setTypingIndex(null)}
                        onScroll={() => {
                          end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                      />
                    ) : (
                      item.text
                    )}
                  </div>
                  {typingIndex !== index && !!item.result?.recommendations?.length && (
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
                                  alt={`${venue.name} — фотография площадки`}
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
                                  <span>{venue.area == null ? "Площадь уточняется" : `${venue.area} м²`}</span>
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
                                    pending || applying || index !== messages.length - 1
                                  }
                                  className="qchat-select"
                                  aria-pressed={selected === venue.id}
                                  onClick={() => {
                                    setSelected(venue.id);
                                    apply(venue.id);
                                  }}
                                >
                                  {applying && selected === venue.id
                                    ? "Создаём смету…"
                                    : selected === venue.id
                                      ? "Выбрано ✓"
                                      : "Выбрать и открыть смету"}
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
              <div className="qchat-thinking" role="status" aria-live="polite">
                <span className="qchat-thinking-spark" aria-hidden="true">✦</span>
                <span className="qchat-thinking-text">
                  Qonaq подбирает площадки и рассчитывает детали...
                </span>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="qchat-dock">
            {!pending && !error && typingIndex === null && (
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
            {reply?.ready && !pending && !error && typingIndex === null && (
              <div className="qchat-ready">
                <div>
                  <strong>Основа события готова</strong>
                  <span>{selected ? "Площадка выбрана. Перейдите к готовой смете." : "Вы проверите всё перед сохранением."}</span>
                </div>
                <button
                  className="button primary"
                  disabled={applying}
                  onClick={() => apply()}
                >
                  {applying
                    ? "Создаём смету…"
                    : selected
                      ? "Открыть готовую смету →"
                      : "Выбрать площадку →"}
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
                  <svg
                    className="qchat-send-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 19V5" />
                    <path d="M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </form>
            <div className="qchat-footnote">
              <span>
                {reply?.usage &&
                  `Сегодня: ${reply.usage.used} из ${reply.usage.limit} ответов.`}
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
        </div>
        <div
          className="qchat-aside-col"
          aria-hidden={messages.length > 1}
        >
          <aside className="qchat-monograph" aria-label="Архитектурные площадки Астаны">
            <div className="qchat-mono-viewport">
              <div className="qchat-mono-track" ref={trackRef}>
                {galleryVenues.concat(galleryVenues).map((v, i) => (
                  <article
                    key={`${v.id}-${i}`}
                    className="qchat-mono-card"
                    onClick={() => handleVenueClick(v)}
                    role="button"
                    tabIndex={0}
                    title={`Выбрать «${v.name}» для обсуждения с ИИ`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleVenueClick(v);
                      }
                    }}
                  >
                    <div className="qchat-mono-photo-frame">
                      <img
                        src={v.imageUrl}
                        alt={`${v.name} — ${v.hall || "зал"}`}
                        loading="lazy"
                        onError={(e) => {
                          if (v.imageSourceUrl && e.currentTarget.src !== v.imageSourceUrl) {
                            e.currentTarget.src = v.imageSourceUrl;
                          }
                        }}
                      />
                    </div>

                    <div className="qchat-mono-caption">
                      <div className="qchat-mono-caption-top">
                        <h4 className="qchat-mono-name">{v.name}</h4>
                        <span className="qchat-mono-capacity">
                          {v.capacity ? `${v.capacity} мест` : "Банкет"}
                        </span>
                      </div>
                      <div className="qchat-mono-caption-bottom">
                        <span className="qchat-mono-hall">{v.hall || "Банкетный зал"}</span>
                        <span className="qchat-mono-dot">·</span>
                        <span className="qchat-mono-district">
                          {v.district || (v.address ? v.address.split(",")[1]?.trim() : "Астана")}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
