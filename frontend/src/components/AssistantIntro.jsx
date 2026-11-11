import React from "react";
import "./assistant-intro.css";

export default function AssistantIntro({
  brief,
  onBriefChange,
  onContinue,
  onManual,
}) {
  function submit(event) {
    event.preventDefault();
    if (brief.trim()) onContinue();
  }

  return (
    <section
      className="assistant-intro"
      aria-labelledby="assistant-intro-title"
    >
      <div className="assistant-intro-content">
        <p className="assistant-step-label">Создание мероприятия · 1 из 4</p>
        <h1 id="assistant-intro-title">Что будем планировать?</h1>
        <p>Опишите мероприятие своими словами.</p>
        <form className="assistant-intro-composer" onSubmit={submit}>
          <textarea
            aria-label="Описание мероприятия"
            name="event-brief"
            rows={3}
            maxLength={2000}
            value={brief}
            onChange={(event) => onBriefChange(event.target.value)}
            placeholder="Например, корпоратив в Астане на 80 гостей с бюджетом 2 000 000 ₸"
            required
          />
          <div className="assistant-intro-actions">
            <button
              className="assistant-intro-submit"
              disabled={!brief.trim()}
              type="submit"
            >
              Продолжить <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <button
          className="assistant-intro-manual"
          onClick={onManual}
          type="button"
        >
          Заполнить вручную
        </button>
      </div>
    </section>
  );
}
