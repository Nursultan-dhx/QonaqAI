# Архитектура первых двух этапов

React отображает каталог и форму. REST API на Java принимает запросы, проверяет ввод и вызывает сервисы. Spring Data JPA сохраняет аккаунты, площадки, мероприятия и уведомления в файловой H2. Серверная сессия связывает запросы с аккаунтом. Сохранённые мероприятия и уведомления выдаются только их владельцу. Общий демо-профиль открывает данные без владельца из прежней версии.

## Strategy

`VenueSelectionStrategy` задаёт общий интерфейс. `EconomyStrategy` сначала сравнивает известные цены, затем запас банкетных мест. `QualityStrategy` сравнивает площадь зала на гостя. `VenueService` выбирает реализацию по параметру пользователя. Никаких выдуманных цен, рейтингов или гарантий экономии нет. При неопубликованных тарифах бюджет не подтверждает доступность площадки.

## Observer

`EventService` сохраняет мероприятие и сообщает об изменении через `EventSubject`. Подписчик `RecommendationObserver` пересчитывает подбор и сохраняет уведомление с количеством вариантов. Независимый `ActivityObserver` сохраняет сообщение о создании или изменении. Оба работают в одной транзакции с мероприятием. Реализация паттерна находится в проекте; Spring только создаёт и связывает объекты.

```mermaid
classDiagram
  class VenueSelectionStrategy {
    <<interface>>
    rank(venues, guests, budget)
  }
  VenueSelectionStrategy <|.. EconomyStrategy
  VenueSelectionStrategy <|.. QualityStrategy
  VenueService --> VenueSelectionStrategy
  EventService --> EventSubject
  EventSubject --> EventObserver
  class EventObserver {
    <<interface>>
    onEventChanged(change)
  }
  EventObserver <|.. RecommendationObserver
  EventObserver <|.. ActivityObserver
  RecommendationObserver --> VenueService
  EventPlan --> Venue : выбранная площадка
```

```mermaid
sequenceDiagram
  actor Пользователь
  participant React
  participant API
  participant EventService
  participant H2
  participant EventSubject
  participant Подписчики
  Пользователь->>React: Заполняет и сохраняет мероприятие
  React->>API: POST /api/events
  API->>EventService: Проверенные параметры
  EventService->>H2: Сохранить мероприятие
  EventService->>EventSubject: publish(EventChanged)
  EventSubject->>Подписчики: onEventChanged
  Подписчики->>H2: Сохранить уведомления
  API-->>React: Мероприятие, подбор, уведомления
  React-->>Пользователь: Сохранённый результат
```


## Factory Method — дополнительные услуги (Module 03, Phase 1)

Сервер загружает версионированный DEMO-каталог из
backend/src/main/resources/service-rates.json. Фактические цены площадок не
меняются. Публичный GET /api/service-options отдаёт метаданные, а
POST /api/events/{eventId}/services/preview проверяет сессию/владельца и
считает только дополнительные услуги без записи в БД.

ServicePreviewService использует EventRepository и сохранённое число гостей.
Для каждого выбора он вызывает ServiceCreatorRegistry → ServiceCreator.create()
→ конкретный createProduct() → конкретный EventServiceProduct. В проекте
пять продуктов и пять создателей: ведущий, фотограф, декор, музыка, питание.
Арифметика выполняется в Java через BigDecimal. Реестр не является фабричным
методом; фабричный метод явно переопределён в каждом Creator.

React открывает ServicePreviewPanel через «Рассчитать услуги» в карточке
сохранённого мероприятия. Настройки и расчёт не сохраняются; устаревшие запросы
отменяются. Пакеты, Decorator, окончательная смета и бронирование ещё не реализованы.

Участники, API, правила, диаграмма и результаты проверок:
[FACTORY_METHOD_IMPLEMENTATION.md](FACTORY_METHOD_IMPLEMENTATION.md).

## Передача следующих этапов

Factory Method и предварительный расчёт услуг реализованы; Бейбарыс продолжает пакеты, итоговую смету и Decorator. Дастан добавляет бронирование, ИИ, предложение и Facade/Builder. Стоимость услуг должна рассчитываться в Java. Выбор площадки на этом этапе не является бронированием.

Данные площадок и ссылок находятся в `backend/src/main/resources/catalog.json`. Для расширения до 50 добавьте проверенные записи с уникальными стабильными ID и фотографии в `static/images`. При старте каталог обновляется по ID, мероприятия сохраняются. Для многопользовательского публичного размещения потребуются отдельные пользователи, авторизация, миграции и серверная БД; текущая версия предназначена для локальной демонстрации.
