import React, { useEffect, useRef, useState } from "react";
import "./entry.css";

const venues = [
  {
    id: "st-regis",
    name: "The St. Regis Astana",
    hall: "Astor Ballroom",
    capacity: 240,
    image: "/images/st-regis-astana.jpg",
  },
  {
    id: "hilton",
    name: "Hilton Astana",
    hall: "Grand Ballroom",
    capacity: 350,
    image: "/images/hilton-astana.jpg",
  },
];

const stepNames = ["Запрос", "Подбор площадки", "План"];
const exampleRequest =
  "Организовать корпоратив в Астане на 80 гостей. Бюджет — 2\u202f000\u202f000\u00a0₸.";

const icons = {
  arrow: "M4 12h15m-6-6 6 6-6 6",
  back: "M20 12H5m6-6-6 6 6 6",
  spark:
    "M12 2c0 5.5-4.5 10-10 10 5.5 0 10 4.5 10 10 0-5.5 4.5-10 10-10-5.5 0-10-4.5-10-10Z",
  check: "m4 12 5 5L20 6",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2",
};

function EntryIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icons[name]} />
    </svg>
  );
}

function TimeComparison() {
  return (
    <figure
      className="qentry-timing"
      aria-label="Пример расчёта времени подготовки"
    >
      <div className="qentry-timing-row">
        <span>Вручную</span>
        <strong>
          90 <small>мин</small>
        </strong>
        <div className="qentry-timing-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <div className="qentry-timing-row qentry-timing-row-short">
        <span>С QonaqAI</span>
        <strong>
          20 <small>мин</small>
        </strong>
        <div className="qentry-timing-track" aria-hidden="true">
          <span />
        </div>
      </div>
      <figcaption>
        Пример расчёта для подготовки корпоратива на 80 гостей.
      </figcaption>
      <details className="qentry-timing-details">
        <summary>Как посчитали</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Задача</th>
              <th scope="col">Вручную</th>
              <th scope="col">С QonaqAI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Поиск площадок</th>
              <td>45 мин</td>
              <td>8 мин</td>
            </tr>
            <tr>
              <th scope="row">Сравнение</th>
              <td>25 мин</td>
              <td>5 мин</td>
            </tr>
            <tr>
              <th scope="row">Черновик плана</th>
              <td>20 мин</td>
              <td>7 мин</td>
            </tr>
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function DemoPreview({ step, venue, selectVenue }) {
  if (step === 0) {
    return (
      <div className="qentry-preview-inner" key={step}>
        <div className="qentry-preview-top">
          <span>Пример запроса</span>
          <EntryIcon name="spark" />
        </div>
        <blockquote>{exampleRequest}</blockquote>
        <div className="qentry-photo" aria-hidden="true">
          <img src={venues[0].image} alt="" />
        </div>
        <p className="qentry-photo-caption">
          Astor Ballroom · The St. Regis Astana
        </p>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="qentry-preview-inner" key={step}>
        <div className="qentry-preview-top">
          <span>Параметры из запроса</span>
          <EntryIcon name="spark" />
        </div>
        <dl className="qentry-params">
          <div>
            <dt>Город</dt>
            <dd>Астана</dd>
          </div>
          <div>
            <dt>Гостей</dt>
            <dd>80</dd>
          </div>
          <div>
            <dt>Бюджет</dt>
            <dd>2 000 000 ₸</dd>
          </div>
        </dl>
        <fieldset className="qentry-venues">
          <legend>Выберите зал для примера</legend>
          {venues.map((option) => (
            <label className="qentry-venue" key={option.id}>
              <img src={option.image} alt="" />
              <span>
                <strong>{option.name}</strong>
                <small>
                  {option.hall} · до {option.capacity} гостей
                </small>
              </span>
              <input
                type="radio"
                name="entry-venue"
                value={option.id}
                checked={venue.id === option.id}
                onChange={() => selectVenue(option)}
              />
            </label>
          ))}
        </fieldset>
        <p className="qentry-preview-note">
          Банкетная вместимость. Цены площадок по запросу.
        </p>
      </div>
    );
  }

  return (
    <div className="qentry-preview-inner" key={step}>
      <div className="qentry-preview-top">
        <span>Черновик плана</span>
        <EntryIcon name="check" />
      </div>
      <div className="qentry-plan">
        <img src={venue.image} alt={venue.hall} />
        <div>
          <h3>Корпоратив в Астане</h3>
          <p>
            {venue.name} · {venue.hall}
          </p>
        </div>
        <dl className="qentry-params">
          <div>
            <dt>Гостей</dt>
            <dd>80</dd>
          </div>
          <div>
            <dt>Бюджет события</dt>
            <dd>2 000 000 ₸</dd>
          </div>
        </dl>
      </div>
      <p className="qentry-preview-note">
        Сохранить свой план можно после входа в каталог.
      </p>
    </div>
  );
}

const blankFields = { name: "", email: "", password: "" };

export default function EntryFlow({
  onRegister,
  onLogin,
  onDemo,
  initialScreen = "demo",
}) {
  const [screen, setScreen] = useState(
    initialScreen === "auth" ? "auth" : "demo",
  );
  const [mode, setMode] = useState(
    initialScreen === "auth" ? "login" : "register",
  );
  const [step, setStep] = useState(0);
  const [venue, setVenue] = useState(venues[0]);
  const [fields, setFields] = useState(blankFields);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const heading = useRef(null);
  const changeFocus = useRef(false);
  const register = mode === "register";

  useEffect(() => {
    if (changeFocus.current) {
      heading.current?.focus();
      changeFocus.current = false;
    }
  }, [screen, mode, step]);

  function openAuth(nextMode) {
    if (pending) return;
    if (screen !== "auth" || mode !== nextMode) changeFocus.current = true;
    setMode(nextMode);
    setScreen("auth");
    setFields((current) => ({ ...current, password: "" }));
    setErrors({});
    setServerError("");
    setShowPassword(false);
  }

  function replayDemo() {
    if (pending) return;
    if (screen !== "demo" || step !== 0) changeFocus.current = true;
    setScreen("demo");
    setStep(0);
    setVenue(venues[0]);
  }

  function goToStep(next) {
    changeFocus.current = true;
    setStep(next);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setServerError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const name = fields.name.trim();
    const email = fields.email.trim();
    const { password } = fields;
    const nextErrors = {};
    if (register && !name) nextErrors.name = "Введите имя.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Введите адрес электронной почты.";
    if (!password || (register && password.length < 10))
      nextErrors.password = register
        ? "Нужно не менее 10 символов."
        : "Введите пароль.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements[Object.keys(nextErrors)[0]]?.focus();
      return;
    }
    setPending("account");
    setServerError("");
    try {
      if (register) await onRegister({ name, email, password });
      else await onLogin({ email, password });
    } catch (error) {
      if (Object.keys(error?.fields || {}).length) setErrors(error.fields);
      else
        setServerError(
          error?.message || "Не удалось продолжить. Повторите попытку.",
        );
    } finally {
      setPending("");
    }
  }

  async function enterDemoProfile() {
    if (pending) return;
    setPending("demo");
    setServerError("");
    try {
      await onDemo();
    } catch (error) {
      setServerError(error?.message || "Каталог временно недоступен.");
    } finally {
      setPending("");
    }
  }

  function fieldFeedback(key) {
    return errors[key] ? (
      <span className="qentry-field-error" id={`qentry-error-${key}`}>
        {errors[key]}
      </span>
    ) : null;
  }

  return (
    <div className="qentry">
      {screen === "demo" ? (
        <main className="qentry-demo">
          <section className="qentry-demo-copy">
            <div className="qentry-demo-label">
              <EntryIcon name="spark" /> Демо возможностей ИИ
            </div>
            <ol className="qentry-steps" aria-label="Этапы демонстрации">
              {stepNames.map((name, index) => (
                <li
                  key={name}
                  aria-current={step === index ? "step" : undefined}
                  className={index <= step ? "qentry-step-active" : ""}
                >
                  {name}
                </li>
              ))}
            </ol>
            <div className="qentry-demo-heading" key={step}>
              <h1 tabIndex="-1" ref={heading}>
                {
                  [
                    "Событие начинается с идеи",
                    "Выберите подходящее место",
                    "Ваш план собран",
                  ][step]
                }
              </h1>
              <p>
                {
                  [
                    "Опишите, что хотите организовать. Посмотрите, как из запроса получается черновик мероприятия.",
                    "В примере выделяем город, число гостей и бюджет. Затем подбираем реальные залы по вместимости.",
                    "Параметры и выбранный зал теперь в одном плане. В этом примере подготовка заняла бы примерно на 70 минут меньше.",
                  ][step]
                }
              </p>
            </div>
            <div className="qentry-demo-actions">
              {step > 0 && (
                <button
                  className="qentry-secondary"
                  type="button"
                  onClick={() => goToStep(step - 1)}
                >
                  <EntryIcon name="back" /> Назад
                </button>
              )}
              <button
                className="qentry-primary"
                type="button"
                onClick={() =>
                  step < 2 ? goToStep(step + 1) : openAuth("register")
                }
              >
                {
                  ["Разобрать запрос", "Посмотреть план", "Создать аккаунт"][
                    step
                  ]
                }{" "}
                <EntryIcon name="arrow" />
              </button>
            </div>
            <div className="qentry-demo-links">
              <button
                className="qentry-text"
                type="button"
                onClick={step < 2 ? () => openAuth("register") : replayDemo}
              >
                {step < 2 ? "Пропустить демо" : "Повторить демо"}
              </button>
              <button
                className="qentry-text"
                type="button"
                onClick={() => openAuth("login")}
              >
                Войти
              </button>
            </div>
          </section>
          <section
            className="qentry-preview"
            aria-label="Предпросмотр результата"
          >
            <DemoPreview step={step} venue={venue} selectVenue={setVenue} />
          </section>
        </main>
      ) : (
        <main className="qentry-auth">
          <section
            className="qentry-auth-story"
            aria-labelledby="qentry-auth-story-title"
          >
            <div className="qentry-auth-story-photo">
              <img
                src={venues[0].image}
                alt="Astor Ballroom, The St. Regis Astana"
              />
            </div>
            <div className="qentry-auth-story-content">
              <h2 id="qentry-auth-story-title">
                Около 70 минут
                <br />
                экономии в этом примере
              </h2>
              <TimeComparison />
            </div>
          </section>
          <section
            className="qentry-auth-panel"
            aria-labelledby="qentry-auth-title"
          >
            <div className="qentry-auth-form-wrap">
              <div
                className="qentry-auth-modes"
                aria-label="Вход или регистрация"
              >
                <button
                  type="button"
                  disabled={!!pending}
                  aria-pressed={register}
                  onClick={() => openAuth("register")}
                >
                  Регистрация
                </button>
                <button
                  type="button"
                  disabled={!!pending}
                  aria-pressed={!register}
                  onClick={() => openAuth("login")}
                >
                  Вход
                </button>
              </div>
              <h1 id="qentry-auth-title" tabIndex="-1" ref={heading}>
                {register ? "Создать аккаунт" : "Войти в QonaqAI"}
              </h1>
              <form
                className="qentry-form"
                onSubmit={submit}
                noValidate
                aria-busy={!!pending}
              >
                {register && (
                  <div className="qentry-field">
                    <label htmlFor="qentry-name">Имя</label>
                    <input
                      id="qentry-name"
                      name="name"
                      autoComplete="name"
                      maxLength={80}
                      required
                      value={fields.name}
                      disabled={!!pending}
                      onChange={updateField}
                      aria-invalid={!!errors.name}
                      aria-describedby={
                        errors.name ? "qentry-error-name" : undefined
                      }
                    />
                    {fieldFeedback("name")}
                  </div>
                )}
                <div className="qentry-field">
                  <label htmlFor="qentry-email">Почта</label>
                  <input
                    id="qentry-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={fields.email}
                    disabled={!!pending}
                    onChange={updateField}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "qentry-error-email" : undefined
                    }
                  />
                  {fieldFeedback("email")}
                </div>
                <label className="qentry-field" htmlFor="qentry-password">
                  Пароль
                </label>
                <div className="qentry-password">
                  <input
                    id="qentry-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    required
                    minLength={register ? 10 : undefined}
                    maxLength={128}
                    value={fields.password}
                    disabled={!!pending}
                    onChange={updateField}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password
                        ? "qentry-error-password"
                        : register
                          ? "qentry-password-hint"
                          : undefined
                    }
                  />
                  <button
                    type="button"
                    className="qentry-text"
                    disabled={!!pending}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
                {errors.password
                  ? fieldFeedback("password")
                  : register && (
                      <span className="qentry-hint" id="qentry-password-hint">
                        Минимум 10 символов
                      </span>
                    )}
                {serverError && (
                  <p className="qentry-server-error" role="alert">
                    {serverError}
                  </p>
                )}
                <button
                  className="qentry-primary qentry-submit"
                  type="submit"
                  disabled={!!pending}
                >
                  {pending === "account"
                    ? "Подождите…"
                    : register
                      ? "Зарегистрироваться"
                      : "Войти"}{" "}
                  <EntryIcon name="arrow" />
                </button>
              </form>
              <button
                className="qentry-text qentry-guest"
                type="button"
                disabled={!!pending}
                onClick={enterDemoProfile}
              >
                {pending === "demo"
                  ? "Открываем каталог…"
                  : "Открыть общий демо-профиль"}
              </button>
              <button
                className="qentry-text qentry-return"
                type="button"
                disabled={!!pending}
                onClick={replayDemo}
              >
                <EntryIcon name="back" /> К демонстрации
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
