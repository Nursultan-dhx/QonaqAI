import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon2Gis from "./Icon2Gis.jsx";
import "./proposal-print.css";

function parseProposal(body = "") {
  if (!body) {
    return {
      intro: "",
      eventMeta: {},
      venueMeta: {},
      packageInfo: "",
      timing: "",
      items: [],
      summaryLines: [],
      terms: "",
      other: [],
    };
  }

  const rawSections = body.split(/\n{2,}/);
  let intro = "";
  let eventMeta = {};
  let venueMeta = {};
  let packageInfo = "";
  let timing = "";
  const items = [];
  const summaryLines = [];
  let terms = "";
  const other = [];

  for (const raw of rawSections) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Event metadata
    if (
      trimmed.startsWith("ПРЕДЛОЖЕНИЕ") ||
      (trimmed.includes("Тип:") && trimmed.includes("Гостей:")) ||
      (trimmed.includes("Дата:") && trimmed.includes("Бюджет:"))
    ) {
      const lines = trimmed.split("\n");
      for (const line of lines) {
        const m = line.match(/^([^:]+):\s*(.*)$/);
        if (m) {
          const k = m[1].trim().toLowerCase();
          eventMeta[k] = m[2].trim();
        }
      }
    } else if (trimmed.startsWith("ПЛОЩАДКА")) {
      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      venueMeta.title = lines[1] || "";
      venueMeta.address = lines[2] || "";
    } else if (trimmed.startsWith("ТАЙМИНГ") || trimmed.includes("Желаемое время:")) {
      timing = trimmed.replace(/^ТАЙМИНГ\s*/i, "").trim();
    } else if (
      trimmed.startsWith("ПАКЕТ И СМЕТА") ||
      trimmed.includes("Сохранённая смета") ||
      trimmed.includes("Итого:") ||
      trimmed.includes("• ")
    ) {
      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === "ПАКЕТ И СМЕТА") continue;

        if (line.startsWith("Пакет:") || line.startsWith("Сохранённая смета")) {
          packageInfo = packageInfo ? `${packageInfo} · ${line}` : line;
          continue;
        }

        // Line items parsing: starts with bullet or has " × " and ":"
        const isBullet =
          line.startsWith("• ") ||
          line.startsWith("- ") ||
          line.startsWith("* ");
        if (
          isBullet ||
          (line.includes(":") &&
            !line.startsWith("Итого") &&
            !line.startsWith("Известная часть") &&
            !line.startsWith("Превышение") &&
            !line.startsWith("Остаток"))
        ) {
          const itemText = isBullet ? line.substring(2).trim() : line;
          const colonIdx = itemText.lastIndexOf(":");
          if (colonIdx !== -1) {
            const nameQty = itemText.substring(0, colonIdx).trim();
            const pricePart = itemText.substring(colonIdx + 1).trim();

            let name = nameQty;
            let qty = "1";
            if (nameQty.includes(" × ")) {
              const splitQty = nameQty.split(" × ");
              name = splitQty[0].trim();
              qty = splitQty[1]?.trim() || "1";
            }

            let price = pricePart;
            let note = "";
            if (pricePart.includes(" (")) {
              const splitNote = pricePart.split(" (");
              price = splitNote[0].trim();
              note = splitNote[1].replace(/\)$/, "").trim();
            }

            items.push({ name, qty, price, note });
            continue;
          }
        }

        if (
          line.startsWith("Итого") ||
          line.startsWith("Известная часть") ||
          line.startsWith("Превышение") ||
          line.startsWith("Остаток")
        ) {
          summaryLines.push(line);
        } else {
          other.push(line);
        }
      }
    } else if (
      trimmed.startsWith("УСЛОВИЯ") ||
      trimmed.includes("Цены сметы вымышленные")
    ) {
      terms = trimmed;
    } else {
      if (!intro) {
        intro = trimmed;
      } else {
        other.push(trimmed);
      }
    }
  }

  return {
    intro,
    eventMeta,
    venueMeta,
    packageInfo,
    timing,
    items,
    summaryLines,
    terms,
    other,
  };
}

export default function ProposalPrintModal({ proposal, onClose }) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  // Auto-fit zoom based on screen resolution and DPI scale
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerHeight < 780 || window.innerWidth < 1280) {
        return 0.8;
      }
    }
    return 1.0;
  });

  const parsed = parseProposal(proposal?.body || "");

  // Desired timing resolution: from body text OR localStorage
  const timingText =
    parsed.timing ||
    (() => {
      if (proposal?.eventId) {
        try {
          const stored = localStorage.getItem(
            `qonaq_event_timing_${proposal.eventId}`,
          );
          if (stored) {
            const parsedStored = JSON.parse(stored);
            if (parsedStored.startTime && parsedStored.endTime) {
              return `${parsedStored.startTime} – ${parsedStored.endTime}${
                parsedStored.timingNote ? ` (${parsedStored.timingNote})` : ""
              }`;
            }
          }
        } catch {
          // ignore
        }
      }
      return "";
    })();

  // Ensure scroll is at the very top when modal opens or zoom changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [zoom]);

  const fitToScreen = () => {
    if (typeof window !== "undefined") {
      const vh = window.innerHeight;
      if (vh < 680) setZoom(0.7);
      else if (vh < 780) setZoom(0.8);
      else if (vh < 900) setZoom(0.85);
      else setZoom(1.0);
    }
  };

  const handlePrint = () => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "visible";
    window.print();
    setTimeout(() => {
      document.body.style.overflow = prevOverflow;
    }, 600);
  };

  const copyForWhatsApp = async () => {
    const text =
      `🎉 *Коммерческое предложение: ${proposal.title || "Мероприятие"}*\n` +
      `🏛 *Площадка:* ${parsed.venueMeta.title || "Астана"}\n` +
      (parsed.venueMeta.address
        ? `📍 *Адрес:* ${parsed.venueMeta.address}\n`
        : "") +
      (parsed.eventMeta["дата"]
        ? `📅 *Дата:* ${parsed.eventMeta["дата"]}\n`
        : "") +
      (parsed.eventMeta["гостей"]
        ? `👥 *Гостей:* ${parsed.eventMeta["гостей"]}\n`
        : "") +
      (timingText ? `⏰ *Желаемое время:* ${timingText}\n` : "") +
      `\n💰 *Смета и услуги:*\n` +
      (parsed.items.length > 0
        ? parsed.items
            .map(
              (it) =>
                `• ${it.name} (${it.qty} шт.) — ${it.price}${it.note ? ` _(${it.note})_` : ""}`,
            )
            .join("\n")
        : proposal.body) +
      (parsed.summaryLines.length > 0
        ? `\n\n📌 *${parsed.summaryLines.join("\n* ")}`
        : "") +
      `\n\n✨ _Сформировано в QonaqAI — площадки и мероприятия Астаны_`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const content = (
    <div className="proposal-print-overlay" onClick={onClose}>
      <div
        className="proposal-print-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Toolbar */}
        <div className="proposal-print-toolbar no-print">
          <div className="toolbar-left">
            <span className="toolbar-badge">Предпросмотр документа</span>
            <strong>{proposal.title}</strong>
          </div>

          {/* Scale & Zoom controls */}
          <div className="toolbar-zoom-ctrls">
            <button
              type="button"
              className="zoom-btn"
              disabled={zoom <= 0.65}
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
              title="Уменьшить масштаб"
            >
              −
            </button>
            <span className="zoom-val">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="zoom-btn"
              disabled={zoom >= 1.25}
              onClick={() => setZoom((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
              title="Увеличить масштаб"
            >
              +
            </button>
            {zoom !== 1.0 && (
              <button
                type="button"
                className="zoom-reset-btn"
                onClick={() => setZoom(1.0)}
                title="Сбросить на 100%"
              >
                100%
              </button>
            )}
            <button
              type="button"
              className="zoom-reset-btn"
              onClick={fitToScreen}
              title="По размеру экрана"
            >
              По экрану
            </button>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="button secondary whatsapp-btn"
              onClick={copyForWhatsApp}
            >
              {copied ? "✓ Скопировано!" : "📋 Скопировать в WhatsApp"}
            </button>
            <button
              type="button"
              className="button primary print-action-btn"
              onClick={handlePrint}
            >
              🖨️ Печать / Сохранить PDF
            </button>
            <button
              type="button"
              className="icon-button close-btn"
              onClick={onClose}
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Viewport */}
        <div className="proposal-print-scroll-wrap" ref={scrollRef}>
          <div
            className="proposal-print-scale-container"
            style={{
              zoom: zoom,
              margin: "0 auto",
            }}
          >
            <article className="proposal-print-document">
              {/* Header */}
              <header className="doc-header">
                <div className="doc-brand">
                  <img
                    src="/qonaq-icon.png"
                    alt="QonaqAI"
                    className="doc-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div>
                    <h2 className="doc-company">
                      Qonaq<span>AI</span>
                    </h2>
                    <p className="doc-tagline">
                      Планирование мероприятий и залов в Астане
                    </p>
                  </div>
                </div>
                <div className="doc-meta">
                  <span className="doc-ref">
                    КП № {proposal.id ? `00${proposal.id}` : "DRAFT"}
                  </span>
                  <span className="doc-date">
                    Дата:{" "}
                    {new Date(
                      proposal.createdAt || Date.now(),
                    ).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="doc-city">г. Астана, Казахстан</span>
                </div>
              </header>

              <div className="doc-divider" />

              {/* Document Title */}
              <div className="doc-title-block">
                <h1 className="doc-title">{proposal.title}</h1>
                <p className="doc-subtitle">Проект сметы и спецификация услуг</p>
              </div>

              {/* AI Intro if available */}
              {parsed.intro && (
                <blockquote className="doc-intro">
                  <p>{parsed.intro}</p>
                </blockquote>
              )}

              {/* Meta Cards: Event & Venue */}
              <div className="doc-cards-grid">
                <div className="doc-card">
                  <h3>Параметры события</h3>
                  <dl>
                    <dt>Тип события:</dt>
                    <dd>{parsed.eventMeta["тип"] || "Мероприятие"}</dd>

                    <dt>Планируемая дата:</dt>
                    <dd>{parsed.eventMeta["дата"] || "Дата не указана"}</dd>

                    <dt>Число гостей:</dt>
                    <dd>
                      {parsed.eventMeta["гостей"]
                        ? `${parsed.eventMeta["гостей"]} персон`
                        : "По согласованию"}
                    </dd>

                    {timingText && (
                      <>
                        <dt>Желаемое время:</dt>
                        <dd>{timingText}</dd>
                      </>
                    )}

                    {parsed.eventMeta["бюджет"] && (
                      <>
                        <dt>Бюджет заказчика:</dt>
                        <dd>{parsed.eventMeta["бюджет"]}</dd>
                      </>
                    )}

                    {parsed.packageInfo && (
                      <>
                        <dt>Пакет:</dt>
                        <dd>{parsed.packageInfo}</dd>
                      </>
                    )}
                  </dl>
                </div>

                <div className="doc-card">
                  <h3>Локация и площадка</h3>
                  <dl>
                    <dt>Площадка / Зал:</dt>
                    <dd>
                      <strong>{parsed.venueMeta.title || "Выбранный зал"}</strong>
                    </dd>
                    <dt>Адрес:</dt>
                    <dd>
                      <span>{parsed.venueMeta.address || "г. Астана"}</span>
                      {parsed.venueMeta.title && (
                        <a
                          href={`https://2gis.kz/astana/search/${encodeURIComponent(`${parsed.venueMeta.title} ${parsed.venueMeta.address || ""}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-2gis-link no-print"
                          title="Открыть в 2GIS"
                        >
                          <Icon2Gis size={14} />
                          <span>2GIS</span>
                        </a>
                      )}
                    </dd>
                    <dt>Город:</dt>
                    <dd>Астана, Казахстан</dd>
                  </dl>
                </div>
              </div>

              {/* Estimate Table */}
              <section className="doc-table-section">
                <h3>Спецификация сметы и услуг</h3>
                {parsed.items.length > 0 ? (
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: "36px" }}>№</th>
                        <th>Наименование позиции</th>
                        <th style={{ width: "80px", textAlign: "center" }}>
                          Кол-во
                        </th>
                        <th style={{ width: "160px", textAlign: "right" }}>
                          Стоимость
                        </th>
                        <th style={{ width: "160px" }}>Примечание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="doc-item-name">{item.name}</td>
                          <td style={{ textAlign: "center" }}>{item.qty}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {item.price}
                          </td>
                          <td className="doc-item-note">{item.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="doc-prose-body">
                    {proposal.body.split(/\n{2,}/).map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}

                {parsed.summaryLines.length > 0 && (
                  <div className="doc-summary-box">
                    {parsed.summaryLines.map((s, idx) => (
                      <p
                        key={idx}
                        className={
                          s.startsWith("Итого") || s.startsWith("Всего")
                            ? "doc-total"
                            : ""
                        }
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                )}
              </section>

              {/* Custom additional sections */}
              {parsed.other.length > 0 && (
                <section className="doc-extra-section">
                  {parsed.other.map((o, idx) => (
                    <p key={idx}>{o}</p>
                  ))}
                </section>
              )}

              {/* Terms */}
              {parsed.terms && (
                <section className="doc-terms">
                  <h4>Условия и примечания</h4>
                  <p>{parsed.terms}</p>
                </section>
              )}

              {/* Signatures Block */}
              <footer className="doc-signatures">
                <div className="sig-col">
                  <p className="sig-role">Организатор / Менеджер проекта</p>
                  <div className="sig-line" />
                  <p className="sig-name">QonaqAI Events Astana</p>
                </div>
                <div className="sig-col">
                  <p className="sig-role">Заказчик (Согласовано)</p>
                  <div className="sig-line" />
                  <p className="sig-name">Ф.И.О. / Подпись</p>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via React Portal to document.body to prevent parent modal clipping
  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
