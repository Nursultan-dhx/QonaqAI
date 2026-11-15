import React, { useEffect, useRef, useState } from "react";
import "./landing-screen.css";

/* ── Pre-configured Scenarios with multiple venue options ── */
const SCENARIOS = [
  {
    id: "wedding",
    tab: "Свадьба · 120 гостей",
    prompt: "Свадьба на 120 гостей в Астане, бюджет до 3.5 млн ₸",
    aiReply:
      "Подобрал 3 отличных зала в Астане с расчётом под ваш бюджет:",
    venues: [
      {
        id: "st-regis",
        name: "The St. Regis Astana",
        hall: "Astor Ballroom",
        district: "Есиль, р. Ишим",
        capacity: "До 240 гостей",
        estimate: "~3.5 млн ₸",
        image: "https://iili.io/oHej2z7.jpg",
        badge: "Премиум",
        description:
          "Панорамный вид на парк, авторское меню от шефа, базовый декор столов и персональный координатор.",
        tags: ["Банкет 120 персон", "Сцена и свет"],
      },
      {
        id: "saltanat",
        name: "Салтанат Сарайы",
        hall: "Ханский зал",
        district: "Сарыарка, парк",
        capacity: "До 150 гостей",
        estimate: "~2.8 млн ₸",
        image: "https://iili.io/oHej95l.webp",
        badge: "Традиции",
        description:
          "Торжественный комплекс с национальной подачей, роскошными сводами и отдельной чайной зоной.",
        tags: ["Дастархан", "Парковка"],
      },
      {
        id: "ritz",
        name: "The Ritz-Carlton",
        hall: "Grand Ballroom",
        district: "Есиль, Достык",
        capacity: "До 300 гостей",
        estimate: "~3.9 млн ₸",
        image: "https://iili.io/oHeh6Rp.jpg",
        badge: "Люкс",
        description:
          "Пятизвёздочный сервис в центре столицы, премиальный кейтеринг, welcome-зона и номер в подарок.",
        tags: ["Премиум сервис", "Люкс номер"],
      },
    ],
  },
  {
    id: "corp",
    tab: "Корпоратив · 80 гостей",
    prompt: "Корпоратив на 80 человек в Hilton, бюджет 2 млн ₸",
    aiReply:
      "Для делового события подобрал 3 площадки с нужным мультимедиа:",
    venues: [
      {
        id: "hilton",
        name: "Hilton Astana",
        hall: "Grand Ballroom",
        district: "EXPO, Левый берег",
        capacity: "До 350 гостей",
        estimate: "~2.0 млн ₸",
        image: "https://iili.io/oHeXb9V.jpg",
        badge: "Бизнес",
        description:
          "Мультимедийное пространство с акустикой, встроенным LED-экраном и зоной для приветственного фуршета.",
        tags: ["LED-экран", "Фуршет"],
      },
      {
        id: "st-regis-corp",
        name: "The St. Regis Astana",
        hall: "Senator Room",
        district: "Есиль, р. Ишим",
        capacity: "До 100 гостей",
        estimate: "~2.2 млн ₸",
        image: "https://iili.io/oHej2z7.jpg",
        badge: "Премиум",
        description:
          "Камерный представительский зал для статусных корпоративов и ужинов с изысканной гастрономией.",
        tags: ["Executive меню", "Свой бар"],
      },
      {
        id: "ritz-corp",
        name: "The Ritz-Carlton",
        hall: "Ballroom 2",
        district: "Есиль, Достык",
        capacity: "До 120 гостей",
        estimate: "~2.4 млн ₸",
        image: "https://iili.io/oHeh6Rp.jpg",
        badge: "Люкс",
        description:
          "Высокотехнологичный зал в деловом центре столицы. Идеален для презентаций, награждений и гала-ужина.",
        tags: ["Деловой центр", "Синхронный звук"],
      },
    ],
  },
  {
    id: "jubilee",
    tab: "Юбилей · 60 гостей",
    prompt: "Юбилей 50 лет на 60 гостей, традиционная кухня",
    aiReply:
      "Для юбилея с традиционной кухней рекомендую 3 проверенных зала:",
    venues: [
      {
        id: "saltanat-jubilee",
        name: "Салтанат Сарайы",
        hall: "Ханский зал",
        district: "Сарыарка, парк",
        capacity: "До 150 гостей",
        estimate: "~1.65 млн ₸",
        image: "https://iili.io/oHej95l.webp",
        badge: "Традиции",
        description:
          "Классический дворцовый интерьер с высокими сводами. Праздничный дастархан и чайная зона.",
        tags: ["Дастархан", "Музыка"],
      },
      {
        id: "st-regis-jubilee",
        name: "The St. Regis Astana",
        hall: "Astor Ballroom",
        district: "Есиль, р. Ишим",
        capacity: "До 240 гостей",
        estimate: "~2.1 млн ₸",
        image: "https://iili.io/oHej2z7.jpg",
        badge: "Премиум",
        description:
          "Элегантный юбилей в спокойной атмосфере парка. Персональный банкетный координатор и европейская кухня.",
        tags: ["Вид на реку", "Живая музыка"],
      },
      {
        id: "hilton-jubilee",
        name: "Hilton Astana",
        hall: "Junior Ballroom",
        district: "EXPO, Левый берег",
        capacity: "До 120 гостей",
        estimate: "~1.8 млн ₸",
        image: "https://iili.io/oHeXb9V.jpg",
        badge: "Комфорт",
        description:
          "Светлый современный зал с удобной транспортной доступностью и гибкой рассадкой для семейного праздника.",
        tags: ["Парковка", "Рассадка"],
      },
    ],
  },
];

/* ── Feature items with SVG micro-icons & live pulse dot (Option 1) ── */
const FEATURES = [
  {
    id: "speed",
    text: "AI-подбор за 30 секунд",
    hasDot: true,
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "estimate",
    text: "Автоматический расчёт сметы",
    hasDot: false,
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "venues",
    text: "50+ залов Астаны",
    hasDot: false,
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <line x1="9" y1="9" x2="9" y2="9.01" />
        <line x1="9" y1="13" x2="9" y2="13.01" />
      </svg>
    ),
  },
];

export default function LandingScreen({
  onGetStarted,
  onLogin,
  onRegister,
  onDemo,
  initialAuthActive = false,
  initialAuthMode = "register",
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState("");
  const [isTypingUser, setIsTypingUser] = useState(true);

  const [showAiHeader, setShowAiHeader] = useState(false);
  const [typedAiReply, setTypedAiReply] = useState("");
  const [isTypingAi, setIsTypingAi] = useState(false);

  const [visibleCardsCount, setVisibleCardsCount] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [visible, setVisible] = useState(false);

  /* ── Auth Slide-in state ── */
  const [isAuthActive, setIsAuthActive] = useState(initialAuthActive);
  const [authMode, setAuthMode] = useState(initialAuthMode); // "register" | "login"
  const [authFields, setAuthFields] = useState({ name: "", email: "", password: "" });
  const [authErrors, setAuthErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(""); // "" | "account" | "demo"
  const [showPassword, setShowPassword] = useState(false);

  /* ── Concept 1: Aurora Bloom Launch Overlay state ── */
  const [launchState, setLaunchState] = useState({
    active: false,
    stage: "idle", // "entering" | "revealing"
    title: "Қош келдіңіз!",
    subtitle: "Подготовка вашего пространства...",
  });

  function openAuth(mode = "register") {
    setAuthMode(mode);
    setAuthErrors({});
    setServerError("");
    setIsAuthActive(true);
  }

  function closeAuth() {
    setIsAuthActive(false);
    setAuthErrors({});
    setServerError("");
  }

  function updateAuthField(e) {
    const { name, value } = e.target;
    setAuthFields((curr) => ({ ...curr, [name]: value }));
    setAuthErrors((curr) => ({ ...curr, [name]: undefined }));
    setServerError("");
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (pending || launchState.active) return;
    const isReg = authMode === "register";
    const name = authFields.name.trim();
    const email = authFields.email.trim();
    const { password } = authFields;
    const errs = {};

    if (isReg && !name) errs.name = "Введите имя.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Введите корректный email.";
    if (!password || (isReg && password.length < 10)) {
      errs.password = isReg ? "Нужно не менее 10 символов." : "Введите пароль.";
    }

    setAuthErrors(errs);
    if (Object.keys(errs).length) {
      e.currentTarget.elements[Object.keys(errs)[0]]?.focus();
      return;
    }

    setPending("account");
    setServerError("");

    // Start Aurora Bloom animation
    setLaunchState({
      active: true,
      stage: "entering",
      title: isReg
        ? (name ? `Қош келдіңіз, ${name}!` : "Қош келдіңіз!")
        : "Рады видеть вас снова!",
      subtitle: isReg
        ? "Создание вашего пространства · Каталог 50+ залов..."
        : "Авторизация · Загрузка сохранённых смет...",
    });

    const minAnimation = new Promise((res) => setTimeout(res, 1050));
    try {
      const authPromise = isReg
        ? onRegister ? onRegister({ name, email, password }) : Promise.resolve()
        : onLogin ? onLogin({ email, password }) : Promise.resolve();

      await Promise.all([minAnimation, authPromise]);
      setLaunchState((prev) => ({ ...prev, stage: "revealing" }));
      await new Promise((res) => setTimeout(res, 350));
    } catch (err) {
      setLaunchState({ active: false, stage: "idle", title: "", subtitle: "" });
      if (err?.fields && Object.keys(err.fields).length) {
        setAuthErrors(err.fields);
      } else {
        setServerError(err?.message || "Не удалось продолжить. Повторите попытку.");
      }
    } finally {
      setPending("");
    }
  }

  async function handleDemoLogin() {
    if (pending || launchState.active) return;
    setPending("demo");
    setServerError("");

    setLaunchState({
      active: true,
      stage: "entering",
      title: "Қош келдіңіз!",
      subtitle: "Активация демо-профиля · Доступ к 50+ площадкам Астаны...",
    });

    const minAnimation = new Promise((res) => setTimeout(res, 1050));
    try {
      const demoPromise = onDemo ? onDemo() : Promise.resolve();
      await Promise.all([minAnimation, demoPromise]);
      setLaunchState((prev) => ({ ...prev, stage: "revealing" }));
      await new Promise((res) => setTimeout(res, 350));
    } catch (err) {
      setLaunchState({ active: false, stage: "idle", title: "", subtitle: "" });
      setServerError(err?.message || "Каталог временно недоступен.");
    } finally {
      setPending("");
    }
  }

  const scenario = SCENARIOS[activeIdx];
  const timersRef = useRef([]);

  function clearTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }

  function addTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }

  /* Mount fade-in */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Sequence: User typing -> AI text typing -> Cards emerging sequentially */
  useEffect(() => {
    clearTimers();

    // Reset all states
    setTypedPrompt("");
    setIsTypingUser(true);
    setShowAiHeader(false);
    setTypedAiReply("");
    setIsTypingAi(false);
    setVisibleCardsCount(0);
    setIsCountingDown(false);

    const userTarget = scenario.prompt;
    const aiTarget = scenario.aiReply;

    // 1. Type user prompt
    let userChar = 0;
    const userInterval = setInterval(() => {
      userChar++;
      setTypedPrompt(userTarget.slice(0, userChar));
      if (userChar >= userTarget.length) {
        clearInterval(userInterval);
        setIsTypingUser(false);

        // 2. Start AI turn after short pause
        addTimeout(() => {
          setShowAiHeader(true);
          setIsTypingAi(true);

          let aiChar = 0;
          const aiInterval = setInterval(() => {
            aiChar++;
            setTypedAiReply(aiTarget.slice(0, aiChar));
            if (aiChar >= aiTarget.length) {
              clearInterval(aiInterval);
              setIsTypingAi(false);

              // 3. Stagger cards sequentially
              addTimeout(() => setVisibleCardsCount(1), 120);
              addTimeout(() => setVisibleCardsCount(2), 260);
              addTimeout(() => {
                setVisibleCardsCount(3);
                setIsCountingDown(true);

                // 4. Wait 7 seconds after cards appear, then auto-advance
                addTimeout(() => {
                  setActiveIdx((prev) => (prev + 1) % SCENARIOS.length);
                }, 7000);
              }, 400);
            }
          }, 18);
        }, 140);
      }
    }, 24);

    return () => {
      clearInterval(userInterval);
      clearTimers();
    };
  }, [activeIdx, scenario.prompt, scenario.aiReply]);

  return (
    <div
      className={`ql-root${visible ? " ql-visible" : ""}`}
      aria-label="Добро пожаловать в QonaqAI"
    >
      {/* ── Aurora background blobs ── */}
      <div className="ql-aurora" aria-hidden="true">
        <span className="ql-blob ql-blob-1" />
        <span className="ql-blob ql-blob-2" />
        <span className="ql-blob ql-blob-3" />
      </div>

      {/* ── Main container ── */}
      <div className="ql-scroll">
        {/* ── Header / Brand ── */}
        <header className="ql-header ql-fade-up ql-delay-0">
          <div className="ql-brand">
            <img src="/qonaq-icon.png" alt="" className="ql-brand-icon" />
            <span className="ql-brand-name">
              Qonaq<span className="ql-brand-ai">AI</span>
            </span>
          </div>
          {!isAuthActive ? (
            <button
              className="ql-login-link"
              type="button"
              onClick={() => openAuth("login")}
            >
              Войти
            </button>
          ) : (
            <button
              className="ql-back-link"
              type="button"
              onClick={closeAuth}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Назад к обзору</span>
            </button>
          )}
        </header>

        {/* ── Responsive Stage Viewport & Sliding Body Layout ── */}
        <div className="ql-stage-viewport">
          <div className={`ql-body-layout ${isAuthActive ? "is-auth-active" : ""}`}>
            {/* ── LEFT COLUMN (Desktop: Hero + CTA + Features) ── */}
            <div className="ql-hero-side">
              <section className="ql-hero">
                <div className="ql-hero-kicker ql-fade-up ql-delay-1">
                  Интеллектуальный подбор площадок в Астане
                </div>
                <h1 className="ql-headline ql-fade-up ql-delay-1">
                  Организуйте{" "}
                  <span className="ql-headline-accent">незабываемое</span> событие
                </h1>
                <p className="ql-subline ql-fade-up ql-delay-2">
                  Опишите мероприятие — ИИ подберёт залы, составит программу и смету за минуты
                </p>
              </section>

              {/* Desktop Actions: Placed on the LEFT under hero text with generous breathing room */}
              <div className="ql-desktop-actions ql-fade-up ql-delay-3">
                <div className="ql-cta-wrap">
                  <button
                    className="ql-cta-btn"
                    type="button"
                    onClick={() => openAuth("register")}
                  >
                    <span className="ql-cta-shimmer" aria-hidden="true" />
                    <span>Начать бесплатно</span>
                    <svg className="ql-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>

                {/* Option 1: Live Status Feature Pills with SVG Micro-Icons */}
                <div className="ql-features">
                  {FEATURES.map((f) => (
                    <span key={f.id} className="ql-feature-pill">
                      {f.hasDot && <span className="ql-feat-dot" aria-hidden="true" />}
                      <span className="ql-feat-icon">{f.icon}</span>
                      <span className="ql-feat-text">{f.text}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

          {/* ── RIGHT COLUMN (Desktop: Chat Showcase on the right) ── */}
          <div className="ql-chat-side">
            <div className="ql-chat-showcase ql-fade-up ql-delay-3">
              {/* Scenario tabs */}
              <div className="ql-scenario-tabs-wrap">
                <div
                  className="ql-scenario-tabs"
                  role="tablist"
                  aria-label="Примеры запросов"
                >
                  {SCENARIOS.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={activeIdx === idx}
                      className={`ql-scenario-tab ${activeIdx === idx ? "is-active" : ""}`}
                      onClick={() => setActiveIdx(idx)}
                    >
                      <span className="ql-tab-text">{s.tab}</span>
                      {activeIdx === idx && (
                        <span
                          className={`ql-tab-progress ${
                            isCountingDown ? "is-counting" : ""
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat dialog */}
              <div className="ql-chat-box">
                {/* User turn */}
                <div className="ql-chat-turn ql-turn-user">
                  <div className="ql-bubble ql-user-bubble">
                    <span className="ql-bubble-text">{typedPrompt}</span>
                    {isTypingUser && (
                      <span className="ql-cursor" aria-hidden="true">
                        |
                      </span>
                    )}
                  </div>
                  <div className="ql-chat-avatar ql-avatar-user" aria-hidden="true">
                    Вы
                  </div>
                </div>

                {/* AI turn — content placed UNDER the avatar header for full width */}
                <div
                  className={`ql-chat-turn ql-turn-ai ${
                    showAiHeader ? "is-shown" : "is-hidden"
                  }`}
                >
                  {/* Header row: Avatar + Name */}
                  <div className="ql-ai-header">
                    <div className="ql-chat-avatar ql-avatar-ai" aria-hidden="true">
                      <img src="/qonaq-icon.png" alt="" />
                    </div>
                    <div className="ql-ai-sender-name">
                      <span>QonaqAI</span>
                      <span className="ql-ai-tag">Gemini AI</span>
                    </div>
                  </div>

                  {/* AI Content — 100% full width directly under avatar */}
                  <div className="ql-ai-content">
                    <div className="ql-bubble ql-ai-bubble">
                      <span>{typedAiReply}</span>
                      {isTypingAi && (
                        <span className="ql-cursor" aria-hidden="true">
                          |
                        </span>
                      )}
                    </div>

                    {/* ── Grid of 3 venue options (appear sequentially) ── */}
                    <div
                      className="ql-vpc-grid"
                      aria-label="Варианты площадок"
                    >
                      {scenario.venues.map((venue, idx) => (
                        <div
                          className={`ql-venue-preview-card ${
                            idx < visibleCardsCount ? "is-card-visible" : "is-card-hidden"
                          }`}
                          key={venue.id}
                        >
                          <div className="ql-vpc-img-wrap">
                            <img
                              src={venue.image}
                              alt={venue.name}
                              className="ql-vpc-img"
                              loading="lazy"
                            />
                            <div className="ql-vpc-badges">
                              <span className="ql-vpc-badge">
                                {venue.badge}
                              </span>
                              <span className="ql-vpc-price-badge">
                                {venue.estimate}
                              </span>
                            </div>
                          </div>

                          <div className="ql-vpc-body">
                            <div className="ql-vpc-title-row">
                              <h3 className="ql-vpc-name">{venue.name}</h3>
                              <span className="ql-vpc-capacity">
                                {venue.capacity}
                              </span>
                            </div>
                            <p className="ql-vpc-hall">
                              {venue.hall} · {venue.district}
                            </p>
                            <p className="ql-vpc-desc">{venue.description}</p>

                            <div className="ql-vpc-tags">
                              {venue.tags.map((tag) => (
                                <span key={tag} className="ql-vpc-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile scroll hint */}
                    <div
                      className={`ql-mobile-hint ${
                        visibleCardsCount > 0 ? "is-shown" : "is-hidden"
                      }`}
                      aria-hidden="true"
                    >
                      ← Листайте для сравнения 3 вариантов →
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Mobile Actions (Shown ONLY on mobile under the chat) ── */}
            <div className="ql-mobile-actions">
              {/* Option 1 Features on Mobile */}
              <div className="ql-features ql-fade-up ql-delay-4">
                {FEATURES.map((f) => (
                  <span key={f.id} className="ql-feature-pill">
                    {f.hasDot && <span className="ql-feat-dot" aria-hidden="true" />}
                    <span className="ql-feat-icon">{f.icon}</span>
                    <span className="ql-feat-text">{f.text}</span>
                  </span>
                ))}
              </div>

              <div className="ql-cta-wrap ql-fade-up ql-delay-5">
                <button
                  className="ql-cta-btn"
                  type="button"
                  onClick={() => openAuth("register")}
                >
                  <span className="ql-cta-shimmer" aria-hidden="true" />
                  <span>Начать бесплатно</span>
                  <svg className="ql-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── THIRD COLUMN / SLIDE-IN: Auth & Registration Panel ── */}
          <div className="ql-auth-side" aria-hidden={!isAuthActive}>
            <div className="ql-auth-card">
              {/* Card Header with Back Link */}
              <div className="ql-auth-top-bar">
                <button
                  type="button"
                  className="ql-auth-back-link"
                  onClick={closeAuth}
                  title="Вернуться к обзору"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Назад к обзору</span>
                </button>

                <span className="ql-auth-badge">
                  {authMode === "register" ? "Создание профиля" : "Вход"}
                </span>
              </div>

              {/* Segmented Auth Tabs */}
              <div className="ql-auth-tab-switch" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === "register"}
                  className={`ql-auth-tab ${authMode === "register" ? "is-active" : ""}`}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthErrors({});
                    setServerError("");
                  }}
                  disabled={!!pending}
                >
                  Регистрация
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === "login"}
                  className={`ql-auth-tab ${authMode === "login" ? "is-active" : ""}`}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthErrors({});
                    setServerError("");
                  }}
                  disabled={!!pending}
                >
                  Вход
                </button>
              </div>

              {/* Form Headings */}
              <div className="ql-auth-headings">
                <h2 className="ql-auth-title">
                  {authMode === "register" ? "Создать аккаунт" : "Войти в QonaqAI"}
                </h2>
                <p className="ql-auth-desc">
                  {authMode === "register"
                    ? "Сохраняйте сметы, бронируйте залы и общайтесь с банкетными менеджерами"
                    : "Введите email и пароль для доступа к вашим сохранённым расчётам"}
                </p>
              </div>

              {/* The Form */}
              <form className="ql-auth-form" onSubmit={handleAuthSubmit} noValidate>
                {authMode === "register" && (
                  <div className="ql-form-row">
                    <label className="ql-form-label" htmlFor="ql-reg-name">
                      Ваше имя
                    </label>
                    <input
                      id="ql-reg-name"
                      name="name"
                      type="text"
                      className={`ql-form-input ${authErrors.name ? "has-error" : ""}`}
                      value={authFields.name}
                      onChange={updateAuthField}
                      placeholder="Например, Алишер"
                      autoComplete="name"
                      disabled={!!pending}
                    />
                    {authErrors.name && (
                      <span className="ql-form-error-msg">{authErrors.name}</span>
                    )}
                  </div>
                )}

                <div className="ql-form-row">
                  <label className="ql-form-label" htmlFor="ql-reg-email">
                    Электронная почта
                  </label>
                  <input
                    id="ql-reg-email"
                    name="email"
                    type="email"
                    className={`ql-form-input ${authErrors.email ? "has-error" : ""}`}
                    value={authFields.email}
                    onChange={updateAuthField}
                    placeholder="name@example.kz"
                    autoComplete="email"
                    disabled={!!pending}
                  />
                  {authErrors.email && (
                    <span className="ql-form-error-msg">{authErrors.email}</span>
                  )}
                </div>

                <div className="ql-form-row">
                  <div className="ql-label-flex">
                    <label className="ql-form-label" htmlFor="ql-reg-password">
                      Пароль
                    </label>
                    {authMode === "register" && (
                      <span className="ql-hint-text">мин. 10 символов</span>
                    )}
                  </div>
                  <div className="ql-password-wrapper">
                    <input
                      id="ql-reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className={`ql-form-input ${authErrors.password ? "has-error" : ""}`}
                      value={authFields.password}
                      onChange={updateAuthField}
                      placeholder="••••••••••"
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      disabled={!!pending}
                    />
                    <button
                      type="button"
                      className="ql-pwd-toggle-btn"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={!!pending}
                      tabIndex={-1}
                    >
                      {showPassword ? "Скрыть" : "Показать"}
                    </button>
                  </div>
                  {authErrors.password && (
                    <span className="ql-form-error-msg">{authErrors.password}</span>
                  )}
                </div>

                {serverError && (
                  <div className="ql-server-error-banner" role="alert">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  className="ql-auth-submit-btn"
                  disabled={!!pending}
                >
                  <span>
                    {pending === "account"
                      ? "Секунду…"
                      : authMode === "register"
                      ? "Зарегистрироваться"
                      : "Войти"}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>

              <div className="ql-auth-divider">
                <span>или войдите без пароля</span>
              </div>

              <button
                type="button"
                className="ql-auth-demo-btn"
                onClick={handleDemoLogin}
                disabled={!!pending}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2c0 5.5-4.5 10-10 10 5.5 0 10 4.5 10 10 0-5.5 4.5-10 10-10-5.5 0-10-4.5-10-10Z" />
                </svg>
                <span>
                  {pending === "demo" ? "Открываем демо-профиль…" : "Открыть общий демо-профиль"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* ── Footer note ── */}
        <footer className="ql-footer ql-fade-up ql-delay-6">
          <span>50+ залов Астаны · Бесплатно · 24/7</span>
        </footer>
      </div>

      {/* ── Concept 1: Aurora Bloom Launch Portal Overlay ── */}
      {launchState.active && (
        <div
          className={`ql-launch-overlay ${
            launchState.stage === "revealing" ? "is-revealing" : "is-active"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Запуск платформы QonaqAI"
        >
          {/* Ambient luminous blobs */}
          <div className="ql-launch-blobs" aria-hidden="true">
            <span className="ql-launch-blob ql-lb-1" />
            <span className="ql-launch-blob ql-lb-2" />
            <span className="ql-launch-blob ql-lb-3" />
          </div>

          <div className="ql-launch-portal">
            {/* Glowing Emblem with pulsating ring */}
            <div className="ql-launch-emblem-wrap">
              <span className="ql-launch-ring" aria-hidden="true" />
              <span className="ql-launch-glow" aria-hidden="true" />
              <img
                src="/qonaq-icon.png"
                alt="QonaqAI"
                className="ql-launch-logo"
              />
            </div>

            {/* Title & Brand */}
            <div className="ql-launch-meta">
              <span className="ql-launch-brand">
                Qonaq<span className="ql-launch-ai">AI</span>
              </span>
              <h2 className="ql-launch-title">{launchState.title}</h2>
              <p className="ql-launch-subtitle">{launchState.subtitle}</p>
            </div>

            {/* Golden Thread Micro Progress Bar */}
            <div className="ql-launch-track-wrap" aria-hidden="true">
              <div className="ql-launch-track">
                <div className="ql-launch-bar" />
              </div>
            </div>

            <div className="ql-launch-badge">
              <span className="ql-feat-dot" aria-hidden="true" />
              <span>Запуск платформы</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
