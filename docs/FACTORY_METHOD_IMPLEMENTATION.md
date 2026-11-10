# Module 03, Phase 1 — Factory Method: реализация

Дата проверки: 11 ноября 2026. Проект: QonaqAI. Эта фаза реализует только дополнительные услуги и предварительный расчёт. Аудит docs/PROJECT_REVIEW.md остаётся историческим снимком состояния до реализации.

Дополнение Phase 2: этот документ фиксирует реализацию первой фазы.
Текущий UI заменён единым конфигуратором пакетов и сметы, использующим те же
продукты/создатели; endpoint первой фазы сохранён без изменений.
См. [DECORATOR_IMPLEMENTATION.md](DECORATOR_IMPLEMENTATION.md).

## 1. Обзор реализации

Добавлены пять конкретных продуктов, пять конкретных создателей, реестр создателей, версионированный серверный каталог DEMO-тарифов, REST API и отдельная React-панель.

Приложение создаёт услуги через реальную цепочку Factory Method и рассчитывает начисления в Java с BigDecimal. Контекст питания берётся из сохранённого EventPlan. Продукты не обращаются к JPA и не получают граф сущностей.

Нет новых таблиц, записей конфигураций, итоговой сметы, пакетов, Decorator или бронирования. Предварительный расчёт не сохраняется. Factual Venue.price, исходный catalog.json, CatalogSeeder, Strategy и Observer не изменены.

## 2. Участники GoF

Базовый путь Java-файлов: **backend/src/main/java/kz/qonaqai/**.

| Роль | Реальные классы |
|---|---|
| Product | patterns/factory/EventServiceProduct |
| Concrete Products | products/HostService, PhotographerService, DecorationService, MusicService, CateringService |
| Общая реализация продуктов | products/AbstractServiceProduct: неизменяемые входы, арифметика и переиспользуемые проверки |
| Creator | patterns/factory/ServiceCreator |
| Concrete Creators | creators/HostServiceCreator, PhotographerServiceCreator, DecorationServiceCreator, MusicServiceCreator, CateringServiceCreator |
| Клиент | service/ServicePreviewService |
| Диспетчер | patterns/factory/ServiceCreatorRegistry |
| Доверенные данные | service/ServiceCatalog, domain/pricing/ServiceRate и PricingContext |

ServiceCreator.create() — final общий алгоритм. Он проверяет входы, вызывает защищённый абстрактный **createProduct(selection, trustedRate, context)**, проверяет тип/конфигурацию результата и вызывает product.validate().

Все пять конкретных создателей явно переопределяют createProduct() и создают свой продукт. Контекст передаётся в фабричный метод вместе с выбором и тарифом, чтобы CateringService мог сохранить доверенное число гостей.

Это Factory Method, потому что конкретный подкласс Creator выбирает класс создаваемого Product через переопределение метода. Реестр только выбирает Creator. Ни контроллер, ни бизнес-сервис не вызывают конструкторы конкретных продуктов. Spring создаёт beans создателей, но это не выдаётся за реализацию студенческого паттерна.

## 3. Связи классов

~~~mermaid
classDiagram
    class EventServiceProduct {
        <<interface>>
        type()
        configuration()
        validate()
        cost()
        costLine()
    }
    class ServiceCreator {
        <<abstract>>
        type()
        create(selection, rate, context)
        createProduct(selection, rate, context)*
    }
    class AbstractServiceProduct {
        <<abstract>>
        quantity()*
        costLine()
    }
    EventServiceProduct <|.. AbstractServiceProduct
    AbstractServiceProduct <|-- HostService
    AbstractServiceProduct <|-- PhotographerService
    AbstractServiceProduct <|-- DecorationService
    AbstractServiceProduct <|-- MusicService
    AbstractServiceProduct <|-- CateringService
    ServiceCreator <|-- HostServiceCreator
    ServiceCreator <|-- PhotographerServiceCreator
    ServiceCreator <|-- DecorationServiceCreator
    ServiceCreator <|-- MusicServiceCreator
    ServiceCreator <|-- CateringServiceCreator
    HostServiceCreator ..> HostService : creates
    PhotographerServiceCreator ..> PhotographerService : creates
    DecorationServiceCreator ..> DecorationService : creates
    MusicServiceCreator ..> MusicService : creates
    CateringServiceCreator ..> CateringService : creates
    ServiceCreatorRegistry --> ServiceCreator
    ServicePreviewService --> ServiceCreatorRegistry
    ServicePreviewService --> ServiceCatalog
    ServicePreviewService --> EventRepository
~~~

Конкретные продукты final, их поля final, а ServiceSelection, ServiceRate, PricingContext и ServiceCostLine — records. Подклассы продуктов реализуют собственный quantity(): фиксированная услуга запрещает часы и возвращает 1; почасовая требует 1–12; питание запрещает часы и использует context.guestCount(). Общая арифметика не дублируется.

## 4. Реальный путь создания и расчёта

~~~text
«Мои мероприятия» → «Рассчитать услуги»
    → ServicePreviewPanel
    → POST /api/events/{eventId}/services/preview
    → ServicePreviewController
        → AuthSessions.require()
        → строгое чтение нового JSON-контракта
    → ServicePreviewService.preview()
        → EventRepository.findByIdAndOwnerId()
        → PricingContext(event.id(), event.guests(), "KZT")
        → ServiceCatalog.require(type)
        → ServiceCreatorRegistry.require(type)
        → ServiceCreator.create()
            → ConcreteCreator.createProduct()
            → ConcreteProduct.validate()
        → product.costLine()
        → сумма строк BigDecimal
    → JSON → таблица и подытог в React
~~~

Опорные места:
- ServiceCreator.java:10–26 — общий алгоритм и абстрактный фабричный метод.
- ServicePreviewService.java:34–57 — проверка владельца, доверенный контекст, вызов Creator и сумма строк.
- ServicePreviewController.java:20–41 — локальный строгий ObjectReader и проверка сессии.
- AbstractServiceProduct.java:36–56 — количество и точная арифметика.
- Каждый creators/*Creator.java — переопределённый createProduct(), вызывающий соответствующий конструктор.

Бизнес-метод отмечен @Transactional(readOnly = true). Нет вызовов save(), обновления события или публикации EventChanged, поэтому предварительный расчёт не создаёт новых уведомлений.

## 5. API: запросы и ответы

### Каталог

**GET /api/service-options** публичен, как существующий GET /api/venues. Он раскрывает только справочные демонстрационные данные, а не мероприятия.

Ответ содержит catalogVersion, currency, demoPrices, minHours, maxHours и services. У каждого тарифа есть serviceType, displayName, description, pricingUnit, unitPrice, currency и demoPrice.

Сокращённый пример метаданных:

~~~json
{
  "catalogVersion": "demo-v1",
  "currency": "KZT",
  "demoPrices": true,
  "minHours": 1,
  "maxHours": 12,
  "services": [
    {
      "serviceType": "HOST",
      "displayName": "Ведущий",
      "description": "Ведущий мероприятия: фиксированная демонстрационная стоимость.",
      "pricingUnit": "FIXED",
      "unitPrice": 70000.00,
      "currency": "KZT",
      "demoPrice": true
    }
  ]
}
~~~

В полном ответе пять услуг.

### Предварительный расчёт

**POST /api/events/{eventId}/services/preview**, Content-Type: application/json, действующая серверная сессия QONAQSESSION.

Запрос из выполненного MockMvc-теста для сохранённого мероприятия с ID 3 и 50 гостями:

~~~http
POST /api/events/3/services/preview
Content-Type: application/json
~~~

~~~json
{
  "services": [
    { "type": "PHOTOGRAPHY", "hours": 3 },
    { "type": "CATERING" }
  ]
}
~~~

Фактически полученный ответ, без изменения полей, кроме форматирования:

~~~json
{
  "eventId": 3,
  "catalogVersion": "demo-v1",
  "currency": "KZT",
  "demoPrices": true,
  "lines": [
    {
      "serviceType": "PHOTOGRAPHY",
      "displayName": "Фотограф",
      "pricingUnit": "PER_HOUR",
      "unitPrice": 25000.00,
      "quantity": 3,
      "total": 75000.00,
      "currency": "KZT",
      "demoPrice": true
    },
    {
      "serviceType": "CATERING",
      "displayName": "Питание",
      "pricingUnit": "PER_GUEST",
      "unitPrice": 8000.00,
      "quantity": 50,
      "total": 400000.00,
      "currency": "KZT",
      "demoPrice": true
    }
  ],
  "servicesSubtotal": 475000.00
}
~~~

При самостоятельном запуске нужно использовать ID собственного мероприятия: тестовая запись 3 не переносится в пользовательскую БД.

Пустой список services допустим: lines пуст, servicesSubtotal = 0.00. Нет полей totalEventCost или withinBudget.

| Код | Значение |
|---|---|
| 200 | Каталог или успешный расчёт |
| 400 | Некорректный список, дубликаты, тип, часы, лишние поля или повреждённый JSON |
| 401 | Нет действующей сессии |
| 404 | Мероприятие отсутствует либо принадлежит другому владельцу |

Ошибки сохраняют формат проекта: message и errors. Отсутствие мероприятия и чужое мероприятие дают одинаковое сообщение. Общие демосессии видят мероприятия с ownerId=null, а аккаунты — только свои.

## 6. Тарифы и правила валидации

Единственный источник runtime-тарифов: **backend/src/main/resources/service-rates.json**, версия **demo-v1**. docs/service-examples.json остаётся справкой по кодам/единицам, без конкурирующего набора цен.

| Код | Название | Цена, KZT | Единица | Количество |
|---|---|---:|---|---|
| HOST | Ведущий | 70000 | FIXED | 1 |
| PHOTOGRAPHY | Фотограф | 25000 | PER_HOUR | выбранные целые часы 1–12 |
| DECOR | Декор | 45000 | FIXED | 1 |
| MUSIC | Музыка | 20000 | PER_HOUR | выбранные целые часы 1–12 |
| CATERING | Питание | 8000 | PER_GUEST | гости из сохранённого EventPlan |

Это вымышленные учебные цены, не предложения поставщиков. Статус DEMO виден в JSON и интерфейсе.

Правила:
- Все денежные значения в Java — BigDecimal, валюта только KZT.
- Тариф строго положителен и имеет не более двух десятичных знаков. setScale(2, UNNECESSARY) не допускает скрытого округления.
- Количество целое; умножение на BigDecimal.valueOf(quantity) сохраняет точную арифметику.
- Фиксированные услуги и питание не принимают hours с числовым значением. Отсутствие поля либо null означает отсутствие почасовой настройки.
- Для фотографии/музыки hours обязателен, от 1 до 12. Строки "3" и дробные JSON-числа отклоняются, а не приводятся к целому.
- ServiceType закрепляет допустимую единицу тарифа: некорректное сочетание не загрузится.
- PricingContext требует сохранённый положительный eventId и 1–10000 гостей, согласованно с существующим EventDraft.
- Один тип услуги встречается только один раз. Дубликаты отклоняются до начислений.
- services обязателен, не null; элементы списка и type не могут быть null.
- Клиент не может передавать unitPrice, quantity, guestCount, currency или другие дополнительные поля. Неизвестные поля отклоняются как в корне, так и внутри услуги.
- Новая строгость ObjectReader действует только на этот endpoint: общая конфигурация Jackson и прежние контракты не изменены.
- На старте проверяются версия, наличие всех пяти тарифов, дубликаты, положительные цены, метаданные, единицы, KZT и demoPrice=true. Ошибка ресурса прерывает создание каталога и старт приложения.

Поддержка дробных часов, скидок, налогов, депозитов и бесплатных тарифов отсутствует намеренно. Для смены учебных правил надо явно изменить код/версию ресурса и тесты. Перезапуск загружает новую версию каталога.

## 7. Добавленные и изменённые файлы

Относительно начала этой фазы добавлено 33 файла и изменено 5 существовавших файлов. Исторический PROJECT_REVIEW.md был создан предыдущей задачей и не изменён этой фазой.

### Backend — новые файлы

| Путь относительно backend/src/main/java/kz/qonaqai/ | Назначение |
|---|---|
| domain/ServiceType.java | Пять стабильных кодов и соответствующие единицы |
| domain/PricingUnit.java | FIXED, PER_HOUR, PER_GUEST |
| domain/pricing/ServiceSelection.java | Выбор типа/часов, границы часов |
| domain/pricing/PricingContext.java | Доверенный ID, гости, KZT |
| domain/pricing/ServiceRate.java | Валидированный DEMO-тариф |
| domain/pricing/ServiceCostLine.java | Неизменяемая строка расчёта |
| domain/pricing/ServiceValidationException.java | Детерминированная ошибка выбора/тарифа |
| patterns/factory/EventServiceProduct.java | Стабильный контракт продукта |
| patterns/factory/ServiceCreator.java | Creator и фабричный метод |
| patterns/factory/ServiceCreatorRegistry.java | Внедрение/диспетчеризация создателей, защита от дубликатов |
| patterns/factory/products/AbstractServiceProduct.java | Общая арифметика/валидация |
| patterns/factory/products/HostService.java | Фиксированный ведущий |
| patterns/factory/products/PhotographerService.java | Почасовая фотосъёмка |
| patterns/factory/products/DecorationService.java | Фиксированный декор |
| patterns/factory/products/MusicService.java | Почасовое музыкальное сопровождение |
| patterns/factory/products/CateringService.java | Питание по доверенному числу гостей |
| patterns/factory/creators/HostServiceCreator.java | Создаёт HostService |
| patterns/factory/creators/PhotographerServiceCreator.java | Создаёт PhotographerService |
| patterns/factory/creators/DecorationServiceCreator.java | Создаёт DecorationService |
| patterns/factory/creators/MusicServiceCreator.java | Создаёт MusicService |
| patterns/factory/creators/CateringServiceCreator.java | Создаёт CateringService |
| service/ServiceCatalog.java | Загрузка, валидация и метаданные каталога |
| service/ServicePreviewService.java | Владелец/контекст/создание/подытог |
| web/ServiceCatalogController.java | Публичные опции |
| web/ServicePreviewController.java | Авторизованный строгий preview |

Остальные новые файлы:
- backend/src/main/resources/service-rates.json — версионированные DEMO-цены.
- backend/src/test/java/kz/qonaqai/patterns/factory/FactoryMethodTest.java — продукты, создатели, реестр, делегирование.
- backend/src/test/java/kz/qonaqai/service/ServiceCatalogTest.java — каталог, деньги, некорректные определения.
- backend/src/test/java/kz/qonaqai/service/ServicePreviewServiceTest.java — бизнес-клиент Creator, подытог, дубликаты.
- backend/src/test/java/kz/qonaqai/ServicePreviewIntegrationTest.java — HTTP, владельцы, строгий JSON, отсутствие записи.
- frontend/src/components/ServicePreviewPanel.jsx — изолированный UI.
- frontend/src/components/service-preview.css — стили панели.
- docs/FACTORY_METHOD_IMPLEMENTATION.md — этот документ.

Изменённые файлы:
- backend/src/main/java/kz/qonaqai/web/ApiErrors.java — обработчик только новой ServiceValidationException.
- frontend/src/main.jsx — импорт, выбранное сохранённое событие, кнопка и существующий Modal.
- docs/architecture.md — актуальная цепочка Factory Method.
- docs/testing.md — фактические новые результаты и проверки.
- README.md — указание на новую возможность и её ограничения.

pom.xml, package.json, package-lock.json, application.properties, существующие сущности, репозитории и старые тесты не изменены.

## 8. Автоматические проверки и фактические результаты

Среда: Java 21.0.12.1, Maven 3.10.0, Node 26.11.1, npm 12.2.1. Новые проектные зависимости не добавлялись. Maven разрешил недостающие build/test artifacts штатно, без изменения версии Surefire.

Команды из backend:

~~~bash
mvn -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test-compile
mvn -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test
mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test
mvn -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 package
~~~

Из frontend:

~~~bash
npm run build
~~~

| Проверка | Фактический результат |
|---|---|
| Первичная компиляция | PASS: javac release 21, 56 production-файлов |
| Первый test | 88 тестов, 1 ошибка утверждения в новом тесте; причина — сравнение состояния до/после перечитывания с разной точностью timestamp/денежного представления H2 |
| После исправления fixture | PASS: 88/88; обе стороны сравнения сначала перечитываются из БД |
| Финальный package, с дополнительным unit-тестом контракта расширения | PASS: 89 тестов, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS |
| Frontend build | PASS: Vite, 27 модулей, production assets |
| Итоговый JAR | backend/target/qonaqai-0.1.0.jar; проверено наличие service-rates.json, пяти Creator-классов, static/index.html и JS/CSS |
| Существующие Strategy/Observer/venue seed/старые тесты | git diff подтвердил отсутствие изменений; все старые 14 тестов прошли |
| BLOCKED | Нет заблокированных обязательных проверок |

Финальный прогон, с учётом параметризованных случаев:

| Класс | Вид | Выполнено / прошло |
|---|---|---:|
| FactoryMethodTest | Изолированные unit | 30 / 30 |
| ServiceCatalogTest | Изолированные unit | 10 / 10 |
| ServicePreviewServiceTest | Изолированные unit, mock только репозитория/события | 5 / 5 |
| ApplicationIntegrationTest | Существующие Spring/MockMvc | 14 / 14 |
| ServicePreviewIntegrationTest | Новые Spring/MockMvc | 30 / 30 |
| Всего в финальном прогоне | | **89 / 89** |

Unit-тесты проверяют все пять Creator через общий create(), конкретные классы/цены, 0.10 × 3 = 0.30, границы часов, некорректных гостей, дубли создателей, неполный/дублированный каталог, неправильную единицу и отрицательные/нулевые/слишком дробные цены. Проверяется, что бизнес-сервис использует зарегистрированный Creator, а общий алгоритм вызывает фабричный метод и проверку продукта расширения.

Интеграционные проверки покрывают публичный каталог, точный подытог, новое сохранённое число гостей, 24 некорректных JSON/конфигурации, аккаунты/демо, 401/404, пустой выбор, отсутствие изменения события/уведомлений/схемы/цен площадок. Существующие тесты не удалялись и не ослаблялись. Все БД тестов — отдельные H2 в памяти.

Дополнительно выполнена браузерная проверка через установленный headless Firefox и WebDriver BiDi без новых npm/pip-пакетов:
1. Сохранённое событие → «Мои мероприятия» → окно услуг → пять DEMO-позиций → фотограф 3 часа + питание 50 гостей → 475000 KZT.
2. Две отправки подряд дают один запрос; смена выбора отменяет его и не позволяет задержанному ответу восстановить старый результат.
3. Добавление ведущего после изменения выбора пересчитывает подытог на сервере до 545000 KZT.
4. Панель помещается в viewport шириной 390 px; скриншот визуально просмотрен.
5. Закрытие/открытие окна очищает несохранённые услуги и результат.

Для браузера временно запускалось приложение:

~~~bash
PORT=18083 QONAQ_DB_URL='jdbc:h2:mem:factory-ui;DB_CLOSE_DELAY=-1' mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 spring-boot:run
~~~

Адрес был http://127.0.0.1:18083/. Вспомогательный браузерный скрипт: /tmp/qonaqai-factory-ui-check.mjs, запуск: node /tmp/qonaqai-factory-ui-check.mjs. Этот одноразовый smoke-check не является постоянным frontend test runner. Временные сервер/Firefox остановлены после проверки; backend/data не использовалась.

JUnit XML/text-отчёты находятся в backend/target/surefire-reports. Временные логи сборки: /tmp/qonaqai-factory-tests.log и /tmp/qonaqai-factory-package.log. Цифра 89 относится к последнему полному прогону, а не к сумме повторных запусков.

## 9. Демонстрация через UI

1. Запустить приложение обычным способом; войти или открыть общий демопрофиль.
2. Создать и сохранить мероприятие на 50 гостей. Можно сохранить выбранную площадку; её цена по-прежнему «по запросу».
3. Открыть «Мои мероприятия», у нужной карточки нажать «Рассчитать услуги».
4. Показать DEMO-маркировку и текст: «Предварительный расчёт дополнительных услуг. Пакет и стоимость площадки пока не включены.»
5. Выбрать фотографа, задать 3 часа, выбрать питание, нажать расчёт.
6. Показать строки 75000 и 400000 KZT и подытог 475000 KZT.
7. Выбрать ведущего и повторить: 545000 KZT.
8. Закрыть окно и открыть снова: настройки пусты, что соответствует сообщению «не сохраняются».

Вставка сделана в карточки сохранённых мероприятий: так расчёт всегда имеет существующий eventId и использует сохранённый контекст. Он не смешивается с несохранёнными полями формы. Для изменения гостей надо сохранить мероприятие, затем открыть расчёт заново.

Каталог загружается при открытии панели; расчёт отправляется только по кнопке. AbortController, ref активного запроса и счётчик revision предотвращают повторную отправку/устаревшие ответы. При изменении выбора старый результат сразу исчезает. При 401 вызывается существующий возврат к авторизации.

Для защиты паттерна удобно поставить breakpoint в ServiceCreator.create(), соответствующем ConcreteCreator.createProduct() и продукте costLine(). Видно, что реальный HTTP-запрос проходит через эти объекты.

## 10. Как добавить шестую услугу

Например, TRANSPORT с фиксированной DEMO-ценой:
1. Добавить TRANSPORT(PricingUnit.FIXED) в ServiceType.
2. Добавить тариф в service-rates.json, сохранить явный demoPrice=true и изменить catalogVersion.
3. Реализовать TransportService с проверкой собственного количества/конфигурации.
4. Реализовать TransportServiceCreator extends ServiceCreator, переопределить type()/createProduct(), добавить @Component.
5. Добавить unit/интеграционные примеры для новой позиции и ожидаемого количества услуг в тестах.
6. Перезапустить, запустить тесты.

Реестр, ServicePreviewService и React-список не требуют нового switch/ветки: список услуг приходит из метаданных. Каталог намеренно требует запись для каждого ServiceType, поэтому новая enum-позиция без тарифа сразу даст понятную ошибку.

Если у новой услуги появятся совершенно новые настройки, надо явно расширить ServiceSelection, его строгий JSON-контракт и компонент настройки. Для фиксированной/почасовой/погостевой услуги текущая форма уже понимает единицы.

## 11. Точки интеграции с будущим Decorator

EventServiceProduct уже предоставляет:
- type() — идентификатор;
- configuration() — неизменяемый выбор;
- cost() — готовое денежное начисление;
- costLine() — строку с тарифом, количеством, валютой и DEMO-происхождением.

Будущий PackageServiceDecorator может хранить wrapped EventPackage и созданный через Creator продукт. Он будет складывать wrapped.cost() + product.cost() и добавлять product.costLine() в детализацию. Повторно писать ценовую арифметику не нужно.

Правила включённых в пакет услуг и недопущения двойного начисления принадлежат будущему сборщику пакета. Сейчас запрещены дубликаты типов в service-only preview, но нет притворной реализации пакетов или декораторов.

При будущей записи смет необходимо сохранять конфигурацию, catalogVersion и снимки строк. Текущий ответ уже содержит эти данные для начислений, но не является сохранённой коммерческой сметой.

## 12. Ограничения и следующий шаг

- Считаются только дополнительные услуги, без аренды/пакета и без сравнения с бюджетом.
- Сохранения выбора/расчёта, истории смет и бронирования нет.
- Цены и правила учебные, фиксируются в серверном ресурсе/коде и загружаются при старте.
- Для питания используется всё сохранённое число гостей.
- Часы задаются отдельно, не выводятся из даты мероприятия.
- Пустой выбор даёт ноль; реальный тариф нулевым быть не может.
- Полная доступность UI для всех вспомогательных технологий не сертифицировалась; выполнены описанные функциональные и мобильные smoke-проверки.

Следующая фаза: EventPackage, Basic/Standard/Premium и Decorator, использующие текущие продукты. После неё — отдельные DEMO-тарифы площадок и итоговая смета с явным происхождением цен; фактические неизвестные Venue.price остаются null.
