import React from "react";
import "./plans.css";

export default function PlansPresentation({
  subscription,
  options,
  busy,
  onChange,
}) {
  return (
    <div className="qplans">
      <div className="qplans-intro">
        <span className="qplans-pill">НАЧНИТЕ С ИДЕИ. ОСТАЛЬНОЕ ОБСУДИМ.</span>
        <h1>
          Ваше событие.
          <br />
          <em>На шаг ближе.</em>
        </h1>
        <p>
          От первой мысли до предложения, которое можно отправить.
          <br />
          Выберите, сколько помощи вам нужно.
        </p>
      </div>
      <div className="qplans-cards">
        {options.map((plan) => {
          const pro = plan.code === "PRO",
            current = subscription.plan.code === plan.code;
          return (
            <article
              className={`qplans-card ${pro ? "pro" : "free"}`}
              key={plan.code}
            >
              {pro && (
                <div className="qplans-ribbon">
                  ДЛЯ ВАШЕГО СЛЕДУЮЩЕГО МАСШТАБА
                </div>
              )}
              <div className="qplans-card-top">
                <span className="qplans-icon">{pro ? "✦" : "◌"}</span>
                <span className="qplans-current">
                  {current
                    ? "ВАШ ТАРИФ"
                    : pro
                      ? "БОЛЬШЕ ВОЗМОЖНОСТЕЙ"
                      : "БЕЗ ПОДПИСКИ"}
                </span>
              </div>
              <h2>
                Qonaq <em>{plan.label}</em>
              </h2>
              <p className="qplans-tagline">
                {pro
                  ? "Когда идей больше, чем свободного времени."
                  : "Для первого «а давайте соберёмся». "}
              </p>
              <div className="qplans-price">
                {plan.demoPrice}
                <span>{pro ? "/ месяц · DEMO" : "навсегда"}</span>
              </div>
              <p className="qplans-value">
                {pro ? (
                  <>
                    <b>В 10 раз больше диалога с ИИ.</b> Проработайте разные
                    идеи и подготовьте текст для клиента.
                  </>
                ) : (
                  <>
                    Попробуйте помощника, найдите площадку и соберите первое
                    предложение.
                  </>
                )}
              </p>
              <button
                className="qplans-cta"
                disabled={busy || !subscription.canSwitch || current}
                onClick={() => onChange(plan.code)}
              >
                {current
                  ? "Вы уже здесь"
                  : pro
                    ? "Попробовать Pro бесплатно"
                    : "Перейти на Free"}
                <span aria-hidden="true">↗</span>
              </button>
              <p className="qplans-cta-note">
                {pro
                  ? "Учебное переключение. Без карты и списаний."
                  : "Без срока действия и платёжных данных."}
              </p>
              <div className="qplans-feature-heading">
                {pro ? "БОЛЬШЕ ПРОСТРАНСТВА ДЛЯ ИДЕЙ" : "ВСЁ, ЧТОБЫ НАЧАТЬ"}
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      {!subscription.canSwitch && (
        <p className="qplans-signin">
          Вы в общем демо-профиле. Для выбора тарифа и сохранения предложений
          войдите в личный аккаунт.
        </p>
      )}
      <section className="qplans-outcomes" aria-label="Возможности Pro">
        <div>
          <span>01 / ОБСУДИТЬ</span>
          <h3>Идея обретает форму</h3>
          <p>
            Помощник уточняет детали и предлагает площадки с объяснением выбора.
          </p>
        </div>
        <div>
          <span>02 / ПОДГОТОВИТЬ</span>
          <h3>Слова находятся сами</h3>
          <p>
            Gemini пишет вступление к предложению. Все цифры берутся из
            сохранённой сметы.
          </p>
        </div>
        <div>
          <span>03 / ПОДЕЛИТЬСЯ</span>
          <h3>Результат уже в файле</h3>
          <p>
            Скачайте предложение в TXT и отправьте его удобным вам способом.
          </p>
        </div>
      </section>
      <section className="qplans-faq" aria-label="Вопросы о тарифах">
        <h2>Остались вопросы?</h2>
        <details>
          <summary>С меня спишут 4 990 ₸?</summary>
          <p>
            Нет. Это учебный тариф: показана условная цена. Кнопка бесплатно
            меняет возможности аккаунта, платёжных данных приложение не
            запрашивает.
          </p>
        </details>
        <details>
          <summary>Что произойдёт, если вернуться на Free?</summary>
          <p>
            Сохранённые предложения останутся доступны. Free позволяет создавать
            до 3 документов; если их уже больше, создание новых будет доступно в
            Pro. Выгрузка TXT и подготовка вступления с ИИ доступны в Pro.
          </p>
        </details>
        <details>
          <summary>Чем отличается ИИ в Free и Pro?</summary>
          <p>
            Оба тарифа используют Gemini. В Free — 10 успешных ответов в день, в
            Pro — 100 и подготовка вступления к предложению. Неудачные запросы
            не расходуют дневной лимит. Он обновляется в полночь по времени
            Алматы.
          </p>
        </details>
      </section>
      <p className="qplans-final-note">
        Площадки и расчёты доступны на обоих тарифах. Сметы и брони учебные;
        реальные условия уточняются у площадки.
      </p>
    </div>
  );
}
