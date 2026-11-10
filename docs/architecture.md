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

## Передача следующих этапов

Бейбарыс добавляет пакеты, услуги, расчёт и Factory Method/Decorator. Дастан добавляет бронирование, ИИ, предложение и Facade/Builder. Стоимость услуг должна рассчитываться в Java. Выбор площадки на этом этапе не является бронированием.

Данные площадок и ссылок находятся в `backend/src/main/resources/catalog.json`. Для расширения до 50 добавьте проверенные записи с уникальными стабильными ID и фотографии в `static/images`. При старте каталог обновляется по ID, мероприятия сохраняются. Для многопользовательского публичного размещения потребуются отдельные пользователи, авторизация, миграции и серверная БД; текущая версия предназначена для локальной демонстрации.
