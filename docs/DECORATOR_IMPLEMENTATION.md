# Module 03, Phase 2 — Decorator, пакеты и предварительная смета

Проверено 11 ноября 2026 года. Основа — Phase 1, локальный коммит d4e7879.
Исторический отчёт Phase 2: тогда конфигурация и смета не сохранялись.
В текущей Phase 3 добавлено [сохранение конфигурации и immutable snapshots](ESTIMATE_PERSISTENCE_IMPLEMENTATION.md); описанные ниже pricing/pattern контракты сохранены.

## 1. Обзор

Добавлены BASIC, STANDARD и PREMIUM, реальная цепочка GoF Decorator, отдельные учебные тарифы аренды, полная детализация и сравнение с бюджетом. В рабочем HTTP-пути используются существующие ServiceCreator и EventServiceProduct.

В «Моих мероприятиях» кнопка «Настроить пакет и смету» открывает единый конфигуратор. React отправляет выбор, а Java возвращает все начисления и бюджетные показатели. Фактические Venue.price по-прежнему неизвестны, исходный каталог показывает «Цена по запросу».

Не менялись EventPlan, Venue, JPA-репозитории, схемы БД, Strategy, Observer, Factory Method, существующие API и их тесты. Нет бронирования, платежей, сохранения конфигурации или истории смет.

## 2. Реальные файлы

Все Java-пути ниже относятся к backend/src/main/java/kz/qonaqai/.

| Файл / группа | Назначение |
|---|---|
| domain/PackageCode.java | BASIC, STANDARD, PREMIUM |
| domain/estimate/PackageDefinition.java | Неизменяемое доверенное определение пакета |
| domain/estimate/DemoVenueRate.java | Отдельный DEMO-тариф по стабильному venueId |
| domain/estimate/EstimateLine.java | Типизированные строки, категории и источник цены |
| domain/estimate/Money.java | Точная денежная шкала и границы |
| patterns/decorator/EventPackage.java | Общий Component |
| patterns/decorator/BaseEventPackage.java | Общие строки базового пакета и включений |
| patterns/decorator/BasicPackage.java | Конкретный BASIC |
| patterns/decorator/StandardPackage.java | Конкретный STANDARD |
| patterns/decorator/PremiumPackage.java | Конкретный PREMIUM |
| patterns/decorator/PackageServiceDecorator.java | Общая композиция cost()/lines() |
| patterns/decorator/HostDecorator.java | Обёртка HOST |
| patterns/decorator/PhotographerDecorator.java | Обёртка PHOTOGRAPHY |
| patterns/decorator/DecorationDecorator.java | Обёртка DECOR |
| patterns/decorator/MusicDecorator.java | Обёртка MUSIC |
| patterns/decorator/CateringDecorator.java | Обёртка CATERING |
| service/PackageCatalog.java | Валидированный каталог пакетов |
| service/DemoVenueCatalog.java | Валидированный каталог учебной аренды |
| service/PackageAssembler.java | Factory Method → построение настоящих обёрток |
| service/EstimateService.java | Owned event → внешняя cost()/lines() → аренда → бюджет |
| web/PackageCatalogController.java | Публичная справка пакетов |
| web/EstimateController.java | Строгий авторизованный preview |

Новые ресурсы:
- backend/src/main/resources/package-rates.json — demo-packages-v1.
- backend/src/main/resources/demo-venue-rates.json — demo-venues-v1.

Новые UI-файлы:
- frontend/src/components/PackageConfigurator.jsx.
- frontend/src/components/EstimateBreakdown.jsx.
- frontend/src/components/package-configurator.css.

Новые проверки:
- backend/src/test/java/kz/qonaqai/patterns/decorator/DecoratorTest.java.
- backend/src/test/java/kz/qonaqai/service/EstimateServiceTest.java.
- backend/src/test/java/kz/qonaqai/service/EstimateCatalogTest.java.
- backend/src/test/java/kz/qonaqai/EstimateIntegrationTest.java.
- scripts/check-estimate-ui.mjs — воспроизводимая Firefox WebDriver BiDi smoke-проверка без дополнительных npm-пакетов.

Изменены main.jsx, прежний ServicePreviewPanel.jsx, README.md и связанные документы. Старый ServicePreviewPanel стал совместимым экспортом единого PackageConfigurator, а не вторым калькулятором. Используются прежние service-preview.css, Modal, fetch-helper, кнопки и визуальный стиль. REST endpoint Phase 1 не изменён.

## 3. Участники GoF Decorator

| Роль | Класс |
|---|---|
| Component | EventPackage |
| Concrete Components | BasicPackage, StandardPackage, PremiumPackage |
| Общая реализация компонентов | BaseEventPackage |
| Decorator | PackageServiceDecorator implements EventPackage |
| Concrete Decorators | HostDecorator, PhotographerDecorator, DecorationDecorator, MusicDecorator, CateringDecorator |
| Client / assembler | PackageAssembler |
| Потребитель результата | EstimateService |

PackageServiceDecorator содержит final wrapped EventPackage и final EventServiceProduct. cost() вызывает wrapped.cost().add(product.cost()); lines() берёт wrapped.lines() и добавляет строку продукта. Арифметика не скопирована в пять конкретных обёрток: каждая только проверяет свой поддерживаемый ServiceType.

BaseEventPackage реализует общий контракт через наследование, но **добавление услуг происходит композиционно**, через оборачивание существующего EventPackage. Для каждой комбинации услуг не создаётся отдельный подкласс пакета.

## 4. Диаграмма классов

~~~mermaid
classDiagram
    class EventPackage {
        <<interface>>
        cost()
        lines()
        includedServiceTypes()
        selectedServiceTypes()
    }
    class PackageServiceDecorator {
        <<abstract>>
        wrapped : EventPackage
        product : EventServiceProduct
    }
    class BaseEventPackage {
        <<abstract>>
    }
    EventPackage <|.. BaseEventPackage
    BaseEventPackage <|-- BasicPackage
    BaseEventPackage <|-- StandardPackage
    BaseEventPackage <|-- PremiumPackage
    EventPackage <|.. PackageServiceDecorator
    PackageServiceDecorator o--> EventPackage : wraps
    PackageServiceDecorator --> EventServiceProduct : reuses
    PackageServiceDecorator <|-- HostDecorator
    PackageServiceDecorator <|-- PhotographerDecorator
    PackageServiceDecorator <|-- DecorationDecorator
    PackageServiceDecorator <|-- MusicDecorator
    PackageServiceDecorator <|-- CateringDecorator
    PackageAssembler --> EventPackage : builds chain
    PackageAssembler --> ServiceCreatorRegistry
    EstimateService --> PackageAssembler
    EstimateService --> DemoVenueCatalog
~~~

## 5. Фактическая композиция

Пример, совместимый с реализованными конструкторами:

~~~java
EventPackage configured = new PhotographerDecorator(
    new MusicDecorator(
        new BasicPackage(packageDefinition, serviceCatalog),
        musicProduct),
    photographerProduct);

BigDecimal subtotal = configured.cost();
List<EstimateLine> lines = configured.lines();
~~~

musicProduct и photographerProduct предварительно создаются через ServiceCreatorRegistry → ServiceCreator.create(). В примере с музыкой 3 часа и фотографом 2 часа цепочка считает:

**30000 + 60000 + 50000 = 140000 KZT**, без аренды.

В production:
1. PackageAssembler проверяет конфигурацию.
2. Выбирает конкретный базовый компонент из доверенного определения.
3. Сортирует услуги по стабильному порядку ServiceType.
4. Создаёт продукт через существующий Factory Method.
5. Присваивает configured = decorate(configured, product) для каждой услуги.
6. Возвращает внешний EventPackage.
7. EstimateService вызывает именно configured.cost() и configured.lines().

Цикл сборщика **не суммирует дополнительные услуги**. Общая стоимость пакета берётся только из внешнего компонента. Аренда добавляется после него один раз.

selectedServiceTypes() означает явно выбранные платные дополнения; includedServiceTypes() — отдельные права пакета. Возвращаемые коллекции неизменяемые.

## 6. Интеграция Factory Method

~~~text
React PackageConfigurator
 → POST /api/events/{id}/estimate/preview
 → EstimateController / AuthSessions
 → EstimateService / EventRepository (id + ownerId)
 → PackageAssembler
 → ServiceCatalog + ServiceCreatorRegistry
 → ServiceCreator.create()
 → ConcreteCreator.createProduct()
 → существующий EventServiceProduct
 → конкретный PackageServiceDecorator
 → внешний EventPackage.cost()/lines()
 → DEMO-аренда + бюджет
 → DTO → EstimateBreakdown
~~~

Не введены новые реализации цены ведущего, фотографа, декора, музыки или питания. Используются прежние PricingContext, ServiceSelection, ServiceType, PricingUnit, ServiceRate, ServiceCatalog и ServiceCostLine.

EstimateLine.additional() адаптирует прежнюю строку к полной смете, сохраняя тариф, количество и начисление. Проверка арифметической согласованности строки не является вторым источником цен.

Switch в PackageAssembler выбирает базовый пакет или тип **обёртки**. Он не создаёт конкретные сервисные продукты и не подменяет Factory Method. Для новых продуктов по-прежнему используется Creator registry.

## 7. Включения и переключение пакетов

| Код | Название | DEMO-основа, KZT | Включено |
|---|---|---:|---|
| BASIC | Базовый | 30000 | — |
| STANDARD | Стандарт | 95000 | DECOR |
| PREMIUM | Премиум | 185000 | DECOR, HOST |

Все основы — фиксированная единичная плата за мероприятие.

Для включённой услуги создаётся одна строка INCLUDED_SERVICE с included=true, unitPrice=0.00, total=0.00. Она показывает право пакета, а не её отдельную рыночную цену. Начисление за пакет присутствует только в строке PACKAGE.

STANDARD + фотограф 2 часа: **95000 + 50000 = 145000 KZT**, без аренды. Дополнительные 45000 за декор не добавляются.

На сервере включённая услуга, переданная как optional, отклоняется сообщением «Услуга уже включена в пакет: DECOR/HOST». Проверка есть в сборщике и в базовом декораторе. Повторное оборачивание одним типом также отклоняется.

Точная UI-политика:
- optionalDraft хранит намерение пользователя независимо от текущего пакета.
- Смена пакета не удаляет позиции или часы из optionalDraft.
- Включённые типы отмечены, заблокированы для платного выбора и подписаны «Включено в пакет».
- При отправке они фильтруются из optional services.
- При возврате к BASIC прежние выбранные HOST/DECOR становятся платными выбранными услугами.
- Если пользователь не выбирал DECOR в BASIC, временное включение в STANDARD не создаёт новое optional-намерение: вернувшись в BASIC, он увидит DECOR невыбранным.
- Несвязанные услуги и часы не теряются.
- Удаление optional-позиции и новый preview строят цепочку заново, без изменения старых обёрток.
- Закрытие окна либо смена eventId уничтожают несохранённый черновик.

Браузерная проверка подтвердила включения, фильтрацию payload, восстановление выбранных HOST/DECOR и часов.

## 8. Отдельная DEMO-аренда

Тарифы сопоставлены со стабильными ID из фактического catalog.json, а не с индексом массива:

| venueId | Площадка | DEMO-аренда, KZT |
|---:|---|---:|
| 1 | The Ritz-Carlton, Astana | 500000 |
| 2 | The St. Regis Astana | 450000 |
| 3 | Hilton Astana | 400000 |
| 4 | Rixos President Astana | 300000 |
| 5 | Sheraton Astana Hotel | 250000 |

Источник каждого тарифа — **DEMO**, валюта KZT, единица FIXED за мероприятие. Это вымышленные учебные суммы, а не официальные цены отелей.

DemoVenueCatalog:
- загружает отдельный ресурс demo-venue-rates.json;
- проверяет версию, список, полноту полей записи, положительный ID/цену, точность, KZT, DEMO-источник и дубликаты ID;
- не обращается к VenueRepository для записи и не меняет CatalogSeeder;
- возвращает Optional.empty() для отсутствующей записи.

Важно различать **повреждённое определение** (например, запись без цены — ошибка загрузки) и **отсутствие тарифа для конкретной площадки** (явно неизвестная аренда в preview). Во втором случае нет нулевого fallback: строка VENUE имеет UNKNOWN и null-цены, quoteComplete=false, totalCost=null. Это позволяет работать с будущей новой площадкой без выдумывания её учебной цены.

Все пять исходных площадок покрыты текущим DEMO-ресурсом, что проверяется тестом по реальным ID catalog.json. Их фактические price остаются null и в поиске/каталоге не заменяются DEMO-значениями.

## 9. Формула, детализация и бюджет

**Event Total = Venue Rental + Package Base + Optional Service Charges.**

**Package subtotal = внешний EventPackage.cost().**

Полный пример для 80 гостей, Ritz-Carlton, бюджета 2000000 KZT:

| Строка | Формула | Начисление, KZT |
|---|---|---:|
| Аренда DEMO | фиксированная | 500000 |
| BASIC | фиксированная | 30000 |
| HOST | 70000 × 1 | 70000 |
| PHOTOGRAPHY | 25000 × 2 | 50000 |
| MUSIC | 20000 × 3 | 60000 |
| CATERING | 8000 × 80 | 640000 |
| Пакет с дополнениями | внешняя цепочка | **850000** |
| Полная стоимость | 500000 + 850000 | **1350000** |
| Остаток бюджета | 2000000 − 1350000 | **650000** |
| Использовано | 1350000 / 2000000 × 100 | **67.50%** |

Все авторитетные суммы — BigDecimal. Money нормализует шкалу до 2 без округления и ограничивает сумму диапазоном DECIMAL(16,2): 0–99999999999999.99. Тарифы и бюджет строго положительны; включённые строки нулевые. Переполнение суммарного значения даёт валидационную ошибку. Процент округляется до 2 знаков HALF_UP только для отображаемого бюджетного показателя.

Правила сравнения:
- Известный total <= budget → WITHIN_BUDGET.
- Известный total > budget → EXCEEDED.
- Неизвестная аренда и knownSubtotal <= budget → UNDETERMINED, даже при точном равенстве.
- Неизвестная аренда и knownSubtotal > budget → EXCEEDED как доказанное минимальное превышение.

При полной смете remainingBudget и budgetExcess неотрицательны: неактуальное из них равно 0.00. При неполной remainingBudget и budgetUsedPercent равны null; budgetExcess задан только при доказанном превышении и означает минимум.

React показывает предупреждение о превышении, но не блокирует preview. Прежняя валидация EventService при выборе площадки не менялась.

## 10. API-контракты

### GET /api/package-options

Публичный endpoint, как существующие справочники площадок и услуг. Возвращает:
- catalogVersion=demo-packages-v1;
- currency=KZT, demoPrices=true;
- packages: packageCode, displayName, description, basePrice, includedServiceTypes, currency, demoPrice.

Сервисные ставки по-прежнему доступны через GET /api/service-options. UI загружает оба справочника, не создавая второго набора цен.

### POST /api/events/{eventId}/estimate/preview

Авторизация — существующая QONAQSESSION, владение — findByIdAndOwnerId(). Идентификатор, гости, бюджет и площадка берутся из EventPlan, а цены из доверенных каталогов.

~~~json
{
  "packageCode": "BASIC",
  "services": [
    {"type": "HOST"},
    {"type": "PHOTOGRAPHY", "hours": 2},
    {"type": "MUSIC", "hours": 3},
    {"type": "CATERING"}
  ]
}
~~~

Фактический ответ теста для eventId=37, сокращены только строки:

~~~json
{
  "eventId": 37,
  "venueId": 1,
  "packageCode": "BASIC",
  "currency": "KZT",
  "quoteComplete": true,
  "demoPrices": true,
  "packageCatalogVersion": "demo-packages-v1",
  "serviceCatalogVersion": "demo-v1",
  "venueCatalogVersion": "demo-venues-v1",
  "packageSubtotal": 850000.00,
  "venueCharge": 500000.00,
  "knownSubtotal": 1350000.00,
  "totalCost": 1350000.00,
  "eventBudget": 2000000.00,
  "remainingBudget": 650000.00,
  "budgetExcess": 0.00,
  "budgetUsedPercent": 67.50,
  "budgetStatus": "WITHIN_BUDGET",
  "lines": [
    {
      "code": "VENUE:1",
      "displayName": "Учебная аренда: The Ritz-Carlton, Astana",
      "category": "VENUE",
      "pricingUnit": "FIXED",
      "quantity": 1,
      "unitPrice": 500000.00,
      "total": 500000.00,
      "included": false,
      "priceSource": "DEMO",
      "currency": "KZT"
    }
  ]
}
~~~

В полном production-ответе этого примера **шесть строк**, перечисленных в разделе 9. Включённые строки имеют категорию INCLUDED_SERVICE и нулевую доплату; optional — ADDITIONAL_SERVICE. Коды стабильны: VENUE:{id}, PACKAGE:{code}, SERVICE:{type}. Коллекции DTO неизменяемые, внутренних Creator/Decorator/JPA-объектов в JSON нет.

Коды HTTP: 200 — preview; 400 — некорректная конфигурация/нет площадки; 401 — нет сессии; 404 — отсутствующее или чужое мероприятие. Неизвестный DEMO-тариф даёт 200 с неполной сметой, а не выдуманный итог. Ошибки сохраняют message/errors проекта.

GET/POST endpoint Phase 1, /api/bootstrap, CRUD событий и поиск площадок не изменены.

## 11. Валидация

- packageCode обязателен и должен быть известным enum-кодом.
- services обязателен; пустой список разрешён; null-элементы и null-типы запрещены.
- Каждый тип не более одного раза; включённые услуги не принимаются как paid optional.
- Часы проверяют существующие продукты: целые 1–12 для PHOTOGRAPHY/MUSIC; для остальных часы не нужны.
- Строковые/дробные часы и числовые ordinal enum отклоняются строгим ObjectReader.
- Любые неизвестные поля, включая unitPrice, quantity, eventBudget, guestCount, venueCharge, basePrice, currency, отклоняются.
- ObjectReader скопирован локально для нового endpoint; прежняя конфигурация Jackson и контракты не менялись.
- Сначала проверяется сессия; владение проверяется сервисом. Аккаунт не получает чужие данные, а null-owner демосессии сохраняют существующее общее поведение.
- Выбранная площадка должна быть сохранена и существовать.
- Каталог пакетов должен содержать все PackageCode без дубликатов, валидные денежные значения и уникальные фиксированные включения. Почасовые включения без определённого количества не поддерживаются.
- Каталог DEMO-аренды валидирует каждое определение, а отсутствие конкретного ID даёт UNKNOWN.
- В строках проверяются валюта, положительное количество, денежная шкала/диапазон, соответствие quantity × unitPrice = total, статус included и нулевая доплата включений.

## 12. Unit- и интеграционные тесты

Новые изолированные классы не запускают Spring:

| Класс | Случаи | Количество |
|---|---|---:|
| DecoratorTest | Три пакета, все пять обёрток, рекурсивные cost/lines, независимость порядка, удаление/rebuild, дубликаты, включения, неизменяемость, Factory Method в сборщике | 16 |
| EstimateServiceTest | 1350000, STANDARD/PREMIUM, бюджетные границы, неполная смета/нижняя граница, гости/часы, десятичная точность, вызовы внешнего компонента, нет площадки/чужой event | 13 |
| EstimateCatalogTest | Стабильные ID, Ritz=500000, пропуски/дубли/некорректные определения, валюта/источник, точность/переполнение, инварианты строк | 11 |
| EstimateIntegrationTest | Реальные Spring/MockMvc, метаданные, preview, 30 плохих payload, включения, бюджеты, 401/404/демо, неизвестная аренда, отсутствие записей | 43 |

Новых JUnit-случаев **83**. Прежние 89 тестов не изменены.

Интеграционная проверка read-only:
1. Создаёт fixture только в отдельной H2 в памяти.
2. Flush/clear и снимок сохранённого bootstrap.
3. Вызывает preview.
4. Снова flush/clear и сравнивает состояние, число событий/уведомлений и таблицы.
5. Проверяет, что все исходные Venue.price остаются null.

Тест отсутствующей DEMO-аренды создаёт дополнительную Venue только внутри транзакционного disposable-теста. Это не изменение схемы или пользовательских данных.

## 13. Фактические результаты сборки и браузера

Среда: Java 21.0.12.1, Maven 3.10.0, Node 26.11.1, npm 12.2.1. Новые зависимости и версии build-плагинов не вводились.

Из backend выполнены:

~~~bash
mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test-compile
mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test
mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 package
~~~

Из frontend выполнено:

~~~bash
npm run build
~~~

| Проверка | Результат |
|---|---|
| javac release 21 | PASS, 78 production-файлов |
| Полный Maven test | **172 выполнено, 172 прошло, 0 failures, 0 errors, 0 skipped** |
| Maven package | PASS, повторно все 172 теста, исполняемый JAR |
| Vite production build | PASS, 29 модулей |
| JAR | Проверены новые ресурсы, Decorator-классы и собранный UI |
| Браузер | Все 8 групп smoke-проверок прошли |
| BLOCKED | Нет обязательных заблокированных проверок |

172 = 85 unit + 87 integration, с учётом параметризованных случаев. Прежние классы: FactoryMethodTest 30, ServiceCatalogTest 10, ServicePreviewServiceTest 5, ApplicationIntegrationTest 14, ServicePreviewIntegrationTest 30. Новые: 16 + 13 + 11 + 43.

Для headless-проверки запускался **собранный JAR**, не отдельный поддельный UI:

~~~bash
# Из backend; отдельная H2 в памяти, не backend/data
PORT=18084 QONAQ_DB_URL='jdbc:h2:mem:decorator-ui;DB_CLOSE_DELAY=-1' java -jar target/qonaqai-0.1.0.jar
~~~

Отдельный Firefox-профиль и выполнение скрипта:

~~~bash
mkdir -p /tmp/qonaqai-decorator-firefox
firefox --headless --no-remote --profile /tmp/qonaqai-decorator-firefox --remote-debugging-port 19224 about:blank
# Из корня проекта, в другом терминале; Node с встроенным WebSocket (22+)
QONAQ_UI_TEST_BASE_URL=http://127.0.0.1:18084 node scripts/check-estimate-ui.mjs
~~~

Адрес приложения в скрипте требуется указать явно; тест создаёт fixture-мероприятия в указанном disposable-приложении. Дополнительные браузерные/npm/pip-пакеты не требуются. При другом BiDi-порте можно задать QONAQ_BIDI_URL.

Проверены:
1. Desktop 1280 px: saved event, BASIC, четыре услуги, 1350000/650000/67.5%.
2. STANDARD/PREMIUM: включения видны, не передаются как optional и имеют нулевое дополнительное начисление.
3. Возврат в BASIC: восстановлены HOST/DECOR и часы; удаление услуги меняет новую цепочку.
4. Невалидные часы, защита от повторного submit и отклонение задержанного ответа после смены пакета.
5. 390 px: карточки в колонку, нет переполнения панели; таблица имеет внутренний горизонтальный скролл. Два скриншота просмотрены визуально.
6. Сохранённый бюджет 1000000, та же конфигурация: preview доступен, предупреждение и excess=350000.
7. Закрытие/открытие сбрасывает черновик; задержанный ответ другого eventId не заменяет новый экран.
8. Подсказка при отсутствии площадки, фактические цены null и возврат к входу после истечения сессии.

Тестовое приложение и Firefox остановлены после проверки. backend/data не использовалась. Логи: /tmp/qonaqai-decorator-{compile,tests,package,browser,server}.log; JUnit XML — backend/target/surefire-reports. Скриншоты: /tmp/qonaqai-decorator-mobile.png и /tmp/qonaqai-decorator-breakdown.png. Временные артефакты не входят в Git.

## 14. Демонстрация через UI

1. Войти или открыть общий демопрофиль.
2. Создать и сохранить мероприятие: 80 гостей, бюджет 2000000 KZT, Ritz-Carlton.
3. «Мои мероприятия» → «Настроить пакет и смету».
4. Показать три пакета и DEMO-маркировку; выбрать BASIC.
5. Выбрать ведущего, фотографа на 2 часа, музыку на 3 часа, питание.
6. «Рассчитать смету»: показать все шесть начислений, 1350000 KZT, 650000 остатка и 67.5%.
7. Добавить DECOR, затем переключить STANDARD/PREMIUM: показать включения без двойного начисления.
8. Вернуться к BASIC: предыдущие optional-позиции и часы восстановлены.
9. Уменьшить бюджет сохранённого мероприятия в обычной форме и вновь открыть конфигуратор: показать предупреждение, а не отказ preview.
10. Закрыть и открыть: выбор не сохранён, в соответствии с надписью.

Для breakpoint: PackageAssembler.assemble() → ServiceCreator.create() → ConcreteCreator.createProduct() → PackageServiceDecorator.cost()/lines(). На последнем шаге видно рекурсивное прохождение до Basic/Standard/Premium.

Расчёт запускается только по кнопке. Изменения немедленно очищают старый результат, отменяют запрос и увеличивают revision. Перемонтирование по event.id и cleanup защищают от ответов прежнего мероприятия. Суммы/остаток/проценты React только форматирует, не пересчитывает.

## 15. Добавление услуги и декоратора

1. Добавить ServiceType и серверный DEMO-тариф, обновить версию.
2. Реализовать Product/Creator через существующий Factory Method.
3. Добавить конкретный Decorator, вызывающий super(wrapped, product, supportedType).
4. Добавить маршрут обёртки в PackageAssembler.decorate().
5. Добавить unit/API-тесты, в том числе дубликаты/включения.
6. Для FIXED/PER_HOUR/PER_GUEST существующий metadata-driven UI уже подходит; новые виды настройки требуют явного расширения контракта.

Цены услуг не дублируются в декораторе. Он использует product.cost() и product.costLine().

## 16. Добавление четвёртого пакета

1. Добавить PackageCode и определение в package-rates.json с новой версией.
2. Создать конкретный компонент, наследующий BaseEventPackage с ожидаемым кодом.
3. Добавить выбор базового компонента в PackageAssembler.assemble().
4. Проверить включения, нулевые included-строки и суммы тестами.

UI строит карточки из метаданных: отдельная ветка JSX не нужна. Пример нового пакета должен использовать поддерживаемые фиксированные включения либо явно расширить модель entitlements.

## 17. Ограничения

- Preview не сохраняется; изменение страницы/закрытие окна очищает выбор.
- Нет исторических снимков, бронирования и коммерческой фиксации цены.
- DEMO-каталоги загружаются при старте, не через админ-интерфейс.
- Услуги используют существующие правила: целые часы 1–12, питание на всех сохранённых гостей.
- Неизвестная аренда не заменяется ни нулём, ни фактической неподтверждённой ценой.
- Почасовые/погостевые включения пакета, апгрейды, скидки, налоги и депозиты не реализованы.
- Доступность времени/площадок не проверяется в этой фазе.
- Старые записи и endpoint Phase 1 сохранены; UI старой отдельной панели заменён одним конфигуратором.

## 18. Готовность к Phase 3

Следующая фаза должна сохранять **данные выбора**, не Java-объекты декораторов:
- eventId и владельца из серверного контекста;
- packageCode;
- optional services: type, hours и будущие разрешённые настройки;
- версии package/service/venue каталогов;
- входной снимок: venueId, гости, бюджет и ревизия события;
- snapshot строк, происхождения цен, полного/неполного итога, бюджетного сравнения и времени расчёта.

Восстановление: загрузить принадлежащую пользователю конфигурацию → получить соответствующие версионированные определения/тарифы → PricingContext → Factory Method → PackageAssembler → цепочка Decorator. Включённые услуги берутся из определения пакета, а не начисляются повторно как optional.

Нужно заранее решить хранение старых версий тарифов. Если версия уже недоступна, исторический snapshot остаётся авторитетным отображением, а пересчёт текущими ценами должен быть отдельной новой ревизией. Изменение гостей/площадки/бюджета должно инвалидировать прежний preview; для записи потребуется версия/контроль конкуренции.

Таблицы конфигурации, selections и snapshots, миграции и транзакционное сохранение относятся к Phase 3. Они не добавлены в Phase 2. Бронирование и атомарная проверка пересечений относятся к следующей отдельной фазе.
