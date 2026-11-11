# Event Studio / QonaqAI — Project Review

> Historical audit of revision 05fb84c. Later modules changed the implementation;
> current modules 05–06 are documented in [MODULES_05_06.md](MODULES_05_06.md).

Audit date: 11 November 2026. Reviewed revision: **05fb84c**, branch **main**.

Scope: analysis of the existing repository and recommendations for the SDP final project. All designs below are proposals, not implemented functionality. The only new project document from this audit is **docs/PROJECT_REVIEW.md**. No source, configuration, schema, application database, or dependency installation was changed.

The repository is actually named **QonaqAI** and its UI uses that name; **Event Studio** is the assignment name supplied for this review. The checkout was moved from /home/morninginheaven/aitu/QonaqAI to **/home/morninginheaven/aitu/sdp/QonaqAI** before this audit. File references below are relative to the current repository root. Line numbers refer to the reviewed revision.

Evidence labels:
- **Confirmed**: directly supported by inspected source or command output.
- **Risk**: a failure mode supported by code structure, without a reproduced failure.
- **Missing requirement**: functionality required by the assignment but absent from the repository.
- **Decision**: business meaning that must be agreed before implementation.
- **Historical claim**: recorded in existing documentation, not independently reproduced in this audit.

## 1. Executive Summary

The application is a small, coherent **Java 21 / Spring Boot 3.5.16 backend and React 19 / Vite 6 frontend**, with **Spring Data JPA, Hibernate, and persistent embedded H2**. It is a browser GUI backed by a Java application, not a JavaFX/Swing desktop application. This satisfies a Java application with a graphical interface if the course accepts a web GUI; that interpretation should be confirmed with the instructor.

Modules 01 and 02 have a usable foundation: account registration/login, shared demo access, persisted event CRUD, five venue records with local images, text search, capacity filtering, venue comparison and selection, interchangeable ranking strategies, and persisted notifications. They are **substantially implemented, with explicit requirement gaps**, rather than fully complete against the supplied rubric.

The student-created **Strategy** and **Observer** implementations are genuine and actively called. No student-created Factory Method, Decorator, Builder, or Facade implementation exists yet. Framework mechanisms and javax.crypto.SecretKeyFactory do not count as student pattern implementations.

The main constraints for the next stage are:
1. The event has no city field; Astana is hardcoded in the UI and dataset.
2. All venue prices are unknown, so a complete numeric total and a positive affordability assertion cannot currently be produced honestly.
3. The frontend does not send budget to the venue search endpoint, despite backend support.
4. Event updates have no concurrency/version control; the future estimate and booking lifecycle must also constrain edits and deletion.
5. Current verification is incomplete: frontend bundling and the Java test-compile lifecycle succeeded, but test execution was blocked by an uncached Surefire plugin.

There is **no confirmed CRITICAL defect** established by this audit. Missing booking functionality is expected scope, not evidence that the present application double-books venues. There is no architectural blocker requiring a rewrite. The first implementation work should establish pricing/inclusion rules and DTO contracts, then build the Module 03 calculation path in Java. Module 04 must include atomic persistent conflict prevention from its first working version.

## 2. Repository Structure

The Git-tracked inventory contains **60 files**, including **31 production Java source files**, one Java integration test class, two JSX files, two CSS files, and five venue JPEGs. No AGENTS.md was found in the repository or the inspected ancestor directories.

~~~text
QonaqAI/
  README.md
  start.cmd, start.ps1, build.ps1
  scripts/toolchain.ps1
  backend/
    pom.xml
    src/main/java/kz/qonaqai/
      QonaqApplication.java
      ValidationClock.java
      auth/          AccountService, AuthSessions, PasswordHasher, SessionIdentity
      domain/        Account, EventDraft, EventPlan, EventType,
                     Notification, StrategyId, Venue
      web/           ApiController, AuthController, ApiErrors
      service/       EventService, VenueService
      persistence/   AccountRepository, EventRepository, VenueRepository,
                     NotificationRepository, CatalogSeeder
      patterns/
        strategy/    VenueSelectionStrategy, EconomyStrategy, QualityStrategy
        observer/    EventObserver, EventSubject, EventChanged,
                     ActivityObserver, RecommendationObserver
    src/main/resources/
      application.properties, catalog.json
      static/images/  five local venue photographs
    src/test/java/kz/qonaqai/ApplicationIntegrationTest.java
    src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker
  frontend/
    package.json, package-lock.json, vite.config.js, postcss.config.js
    index.html
    src/main.jsx, src/EntryFlow.jsx, src/style.css, src/entry.css
  docs/
    architecture.md, testing.md, sources.md, service-examples.json
~~~

Generated/local directories ignored by .gitignore are **.tools/**, **backend/target/**, **backend/data/**, **frontend/node_modules/**, and **frontend/dist/**. They are not source modules. There is no Maven wrapper, Gradle build, Docker/Compose setup, migration framework, frontend test runner, CI workflow, or separate package/booking module in the tracked tree.

Git was clean at the beginning of the audit. Six available commits trace foundation → venue/Strategy → events/Observer → React comparison → documentation → onboarding/accounts:

| Commit | Evidence of scope |
|---|---|
| 418bba8 | Java application and persistent database configuration |
| a757405 | Venue catalog and interchangeable selection strategies |
| 799f4ca | Event persistence and observers |
| 77deed7 | Russian UI and venue comparison |
| 6b53ec8 | Setup, sources, patterns, and verification documentation |
| 05fb84c | Interactive onboarding and account access |

README.md:67–69 explicitly says commit dates were manually assigned. Commit timestamps must not be treated as proof of development duration or individual contribution. No commit or push was made during this audit.

## 3. Tech Stack and Application Architecture

### Stack and entry points

| Area | Actual implementation and evidence |
|---|---|
| Java/build | Java release 21, Maven, Spring Boot parent 3.5.16; backend/pom.xml:4–7 |
| Backend dependencies | spring-boot-starter-web, data-jpa, validation, H2 runtime, starter-test; pom.xml:8–13 |
| Java entry | QonaqApplication.main(), backend/src/main/java/kz/qonaqai/QonaqApplication.java:6–8 |
| HTTP server | Embedded servlet server from Spring Boot; bound to 127.0.0.1, default port 8080 |
| Browser UI | React and react-dom; index.html:14–15 → main.jsx:1210 → App |
| Resolved frontend versions | package-lock.json: React/react-dom 19.3.1, Vite 6.4.6, Prettier 3.9.10; package.json declares compatible ranges |
| Navigation | React local state; no React Router, URL route model, Redux, or persisted draft store |
| Persistence | JPA repositories, Hibernate-managed tables, file H2 at ./data/qonaqai relative to backend working directory |
| Validation | Jakarta Bean Validation plus explicit EventService venue checks |
| Authentication | Custom PBKDF2 password hashing and servlet sessions; no Spring Security dependency |
| Tests | JUnit/AssertJ/Spring Boot MockMvc integration class with H2 in memory |
| Styles | Handwritten CSS, serif typography, sage/cream palette, responsive grids, focus styles, reduced-motion rules |

### Actual dependency flow

~~~mermaid
flowchart TD
    App["main.jsx: App / Planner"] -->|"fetch JSON"| API["ApiController"]
    Entry["EntryFlow"] -->|"callbacks / authRequest"| Auth["AuthController"]
    API --> Sessions["AuthSessions / SessionIdentity"]
    Auth --> Sessions
    Auth --> Accounts["AccountService / PasswordHasher"]
    Accounts --> AR["AccountRepository"]
    API --> ES["EventService"]
    API --> VS["VenueService"]
    ES --> ER["EventRepository"]
    ES --> VR["VenueRepository"]
    ES --> NR["NotificationRepository"]
    ES --> Subject["EventSubject"]
    Subject --> AO["ActivityObserver"]
    Subject --> RO["RecommendationObserver"]
    AO --> NR
    RO --> VS
    RO --> NR
    VS --> Strategy["VenueSelectionStrategy"]
    Strategy --> Economy["EconomyStrategy"]
    Strategy --> Quality["QualityStrategy"]
    VS --> VR
    ER --> DB[("H2")]
    VR --> DB
    NR --> DB
    AR --> DB
    Seeder["CatalogSeeder / catalog.json"] --> VR
~~~

The core HTTP path is presentation → controller → service → repository → H2. There are two deliberate qualifications: authentication uses its own service path, and event saves synchronously notify observers that call repositories and VenueService. The frontend never accesses the database directly.

### Request and state lifecycle

1. App.bootstrap() calls GET /api/bootstrap. A missing servlet identity gives 401 and displays onboarding/authentication; a valid identity opens Planner (main.jsx:171–243).
2. EntryFlow receives registration/login/demo callbacks; AuthController delegates password checks and creates a fresh session. AuthSessions.start() invalidates the previous session first (AuthSessions.java:24–27).
3. Bootstrap returns profile, enum metadata, venues, events, and notifications. Venue search is public; event/notification endpoints require a session.
4. Planner owns form, editingId, tab, query, comparison IDs, dialogs, and server data in useState (main.jsx:246–263).
5. Venue filters are debounced by 240 ms and previous requests are aborted (main.jsx:272–307).
6. saveEvent() sends EventDraft JSON by POST or PUT. ApiController applies @Valid, EventService validates ownership/capacity/known venue price, saves, publishes EventChanged, and returns event data. The controller separately obtains recommendations and notifications (ApiController.java:49–64).
7. Reloading rebuilds the saved event list from H2. Unsaved form, active tab, comparison choices, and the selected editing context are not retained. Selecting a venue invokes event saving, not booking.

### API surface

| Endpoint | Access | Responsibility |
|---|---|---|
| POST /api/auth/register, /login, /demo, /logout | Authentication/session actions | AuthController:31–50; consumes JSON |
| GET /api/bootstrap | Session required | Initial profile, enums, catalog, owned data |
| GET /api/venues | Public | Query, guests, strategy, optional budget |
| GET /api/events | Session required | Owned event list |
| POST /api/events | Session required | Create validated event |
| PUT /api/events/{id} | Session required and owner check | Full event update |
| DELETE /api/events/{id} | Session required and owner check | Delete event and its notifications |
| GET /api/notifications | Session required | Latest 50 owned notifications |

There is no single-event GET, package/service/estimate API, availability API, or booking API. Full-list bootstrap is adequate at this catalog size.

### Current persistence model

| Model | Persisted shape / relationships |
|---|---|
| Account | user_account, generated ID; name, unique normalized email, passwordHash; Account.java:11–26 |
| Venue | Stable assigned ID; descriptive fields, banquet capacity, optional theater capacity, area, nullable BigDecimal price; Venue.java:13–30 |
| Venue collections | galleryUrls and features are eager @ElementCollection lists with order columns; two additional collection tables are expected |
| EventPlan | Generated ID; title/type/LocalDate date/guests; budget DECIMAL precision 16 scale 2; description, strategy, updatedAt; EventPlan.java:12–24 |
| Event → Venue | Lazy @ManyToOne, venue_id foreign-key mapping; the API exposes venueId, not the Venue entity relationship |
| Event owner | Nullable Long ownerId, immutable on update; scalar identifier, not @ManyToOne Account |
| Notification | Generated ID; scalar eventId and ownerId, message, createdAt; no JPA relationship to EventPlan |
| Demo identity | SessionIdentity.DEMO has accountId = null; repository queries select the shared null-owner data |

Expected default physical names include event_plan, venue, notification and the venue collection tables. These names are inferred from entity mappings and default naming, not a live inspection of the application database. No production database was opened or schema changed in this audit.

CatalogSeeder.run() transactionally upserts every catalog JSON entry at startup (CatalogSeeder.java:16–19). Stable IDs preserve event references, but seeded catalog attributes are authoritative at restart. The seeder does not seed services and does not remove obsolete venue IDs.

### Configuration and packaging

- application.properties:2–16 configures loopback binding, PORT override, 30-minute sessions, HttpOnly/SameSite=strict QONAQSESSION, QONAQ_DB_URL override, ddl-auto=update, open-in-view=false, and Asia/Qyzylorda JSON time zone.
- ValidationClock.java:11–12 uses the same region for @FutureOrPresent. Browser localDay() uses the browser's local date. A future booking contract needs one explicit venue time zone.
- Vite proxies /api and /images to 127.0.0.1:8080 (frontend/vite.config.js:3–8). PORT overrides do not update this dev proxy.
- Maven copies frontend/dist into backend static resources when that directory exists (pom.xml:16). A backend-only build can succeed without shipping the React UI.
- start.ps1 builds the UI then invokes spring-boot:run from backend. build.ps1 builds the UI then executes clean package. Both rely on Windows executable discovery in scripts/toolchain.ps1.
- Linux manual Maven/npm commands work, but the documented launcher is Windows-specific. Changing the working directory changes the relative H2 location; README.md:23 correctly warns about this.

## 4. Current Functionality — Module 01

| Requirement | Status | Evidence and limits |
|---|---|---|
| Java application with GUI | Fully implemented, subject to course interpretation | Spring Boot Java service with browser React GUI; no desktop GUI |
| Shared project repository | Fully implemented structurally | Git repository and six available commits; actual collaboration practices cannot be proved from code |
| Presentation/business/persistence separation | Fully implemented at basic scale | web/, service/, persistence/; React uses REST; entities also act as response objects |
| Database integration | Fully implemented | Four JPA entities, repositories, file H2 config |
| Sample venues and services | Partially implemented | Five persisted venues; five service examples exist only in docs/service-examples.json:1–7, with no runtime loader or prices |
| Persistence after restart | Implemented; not freshly verified by restart here | File H2 and stable venue IDs support it. docs/testing.md:26 reports a prior two-JVM check using an external temporary adapter |
| Account-scoped data | Implemented additional capability | Owned queries and server-derived identity; tests at ApplicationIntegrationTest.java:115–193 |
| Error presentation | Partially implemented | Structured validation/status errors and UI messages; database infrastructure errors lack dedicated mapping |

Do not describe the documentation-only service list as a completed service catalog. Do not describe persistence across HTTP requests in an in-memory integration test as persistence across JVM restarts.

## 5. Current Functionality — Module 02

| Requirement / concern | Status | Specific evidence |
|---|---|---|
| Event title, type, date, budget, guest form | Fully implemented | main.jsx:591–687; EventDraft.java:7–16 |
| City in event creation | Missing | No city in EventDraft/EventPlan; main.jsx:479–481 and 828–830 display hardcoded Astana |
| Create/update/list/delete events | Fully implemented in source | EventService.java:23–52; integration test :61–69 |
| Persist selected venue | Fully implemented | EventPlan.java:20–21,36–37; main.jsx:374–381 |
| Catalog with images/capacity | Fully implemented | catalog.json, static/images; card/detail/comparison UI |
| Numeric venue prices | Partially implemented | Nullable price field exists; all five seeded price values are null |
| Text search | Fully implemented for stated fields | VenueService.find():23–26 matches name + hall + address, case-insensitively |
| Guest filtering | Fully implemented | VenueService.java:25; all event types use banquet capacity deliberately |
| Budget validity | Fully implemented at API boundary | Required, minimum 1, maximum 1 billion, at most 2 decimals; EventDraft.java:12–13 |
| Budget-aware venue search | Partially implemented | Backend predicate at VenueService.java:27; frontend request :288–295 omits budget |
| Capacity validation on save | Fully implemented | EventService.java:35–36 rejects a selected venue below guest count |
| Known venue price validation | Implemented but unexercised by seeded data | EventService.java:37 rejects known price > event budget; all catalog prices are null |
| Economy/quality approaches | Fully implemented with explicit limitations | Two real Strategy classes; no invented rental prices or service-quality scores |
| Venue comparison | Fully implemented in source | Up to three IDs, requires two to open; main.jsx:383–392,1016–1045,1126–1168 |
| Navigation/state retention | Partially implemented | Tabs preserve Planner state while mounted; refresh restores saved data, not drafts/navigation |
| Full supplied journey | Missing beyond venue selection | No packages, services, estimates, availability, or bookings |

### Algorithm behavior

**EconomyStrategy.rank()**, patterns/strategy/EconomyStrategy.java:11–17, sorts:
1. Known prices before unknown prices.
2. Known prices ascending.
3. Remaining capacity (capacity minus guests) ascending.
4. Venue name as deterministic tie-break.

With the current all-null catalog, it chooses the smallest sufficient banquet room first. This is a documented fit heuristic, not proof of lower cost. A large unknown-price room can legitimately rank after a more expensive known-price room because the algorithm prefers known values; that is its declared policy.

**QualityStrategy.rank()**, QualityStrategy.java:11–15, sorts by area / max(1, guests) descending, then name. With one requested guest count shared by every candidate, this order is mathematically the same as descending area. Guest count still affects candidate eligibility. It does not model staff quality, amenities, reviews, or price/value. The UI correctly calls it “Просторнее”.

VenueService performs capacity and budget eligibility before Strategy dispatch; rank() not using budget itself is not a defect. Unknown-price venues remain eligible for any valid budget; that is intentional uncertainty, not a claim that they are affordable.

### Persistence, validation, and journey details

EventService.save() is transactional and publishes observers after saveAndFlush(). Observer database writes participate in that transaction; an observer exception rolls back the event and notifications together. delete() removes owned notifications and then the event in one transaction.

EventRepository.findAllByOwnerIdOrderByUpdatedAtDesc() has an @EntityGraph for venue (EventRepository.java:8–9), supporting venueId serialization with open-in-view=false. The save path already loads the selected venue. There is no demonstrated lazy-loading defect on these paths.

GET /api/venues is intentionally usable without login. Access to events and notifications is enforced in the controller and by owner-scoped event lookup. A different account receives 404 for attempted edits/deletion of another account's event. Demo data is deliberately shared, not personal.

The working current journey is onboarding → account/demo → create event → search/compare → select venue → saved event → reopen/edit/delete. The introductory three-step “AI” preview is static prepared content (EntryFlow.jsx:4–23,112–209); it neither performs AI inference nor creates an event or booking.

## 6. Existing Design Patterns Audit

| Pattern | Category | Participants and actual call sites | Verdict |
|---|---|---|---|
| Strategy | Behavioral | VenueSelectionStrategy, EconomyStrategy, QualityStrategy; VenueService constructor :18–20 builds the strategy map, find() :29 invokes rank(); controller venue search/bootstrap/save and RecommendationObserver use VenueService | Genuine interchangeable algorithms, actively used |
| Observer | Behavioral | EventSubject, EventObserver, EventChanged; ActivityObserver and RecommendationObserver; EventService.save():41 publishes; EventSubject.java:9–12 dispatches | Genuine explicit publisher/subscriber implementation, actively used |
| Factory Method | Creational | No student implementation found | Required future work |
| Decorator | Structural | No student implementation found | Required future work |
| Facade / Builder | Structural / creational | Mentioned as future team responsibilities in docs/architecture.md:56; no explicit GoF participants | Do not claim as implemented |

### Strategy details

The problem is changing venue ordering without embedding both algorithms in the controller. Spring instantiates @Component strategies; VenueService depends on their interface through an injected list and map. Selection comes from StrategyId in an API query or EventDraft.

This matches GoF Strategy. Adding an implementation is easy, but also requires a new StrategyId and bootstrap/UI metadata; it is not completely extension-only. The strategy registry rejects duplicate IDs through Collectors.toMap(), but a missing registered ID would lead to null dereference at find():29. Both current IDs have implementations, so no present failure is established.

### Observer details

The problem is reacting to event creation/editing without hardcoding every reaction in EventService. EventSubject copies the injected subscriber list and calls onEventChanged(); ActivityObserver saves a created/updated notification, and RecommendationObserver runs venue selection and stores a count notification.

The list is fixed at construction, with no runtime attach/detach API. That is adequate for the configured observers and does not invalidate the pattern. Observer order is not explicitly defined; the current subscribers do not depend on ordering.

RecommendationObserver **does not persist a recommendation set or push live UI updates**. It recalculates a count; the controller also returns recommendations, while Planner uses its own filter request rather than consuming that returned list. The duplicated query is a small efficiency/cohesion issue, not incorrect pattern implementation.

Synchronous transactional observer side effects are suitable for this student application. Do not move them to asynchronous execution casually: that would change transaction and error semantics. New service pricing should be called directly by the estimation service; it should not depend on notification order.

No pattern conflict exists: Strategy ranks venues, Factory Method creates service products, Decorator composes package charges, and Observer reacts to saved changes. Their responsibilities can stay separate.

## 7. Architecture and SOLID Evaluation

| Principle / quality | Repository-specific assessment | Minimal recommendation |
|---|---|---|
| SRP | Backend services are small and focused. Planner combines persistence requests, filtering, forms, catalog, comparison, dialogs, notifications, and event cards in a 1,210-line file | Add PackageConfigurator, EstimateBreakdown, BookingPanel, and BookingHistory as new React components; keep orchestration in Planner without a full rewrite |
| OCP | Strategy/Observer use extension points. StrategyId/bootstrap/UI require edits for a new strategy | Use injected ServiceCreator registration for service products; keep package registry simple |
| LSP | Existing strategies return ranked lists through the same contract; observers share one notification contract. No observed substitutability violation | Define nonnegative charges, consistent line totals, and immutable service selections for new components; test all implementations |
| ISP | Interfaces have one behavior plus strategy ID; no bloated “manager” interface | Keep service-product, package-component, and booking responsibilities separate |
| DIP | Constructor injection and repository/strategy interfaces support replacement. EventService references concrete EventSubject; services throw HTTP exceptions | Existing coupling is acceptable at this scale. New pricing components should be plain Java, with HTTP mapping at the edge where practical |
| Encapsulation | Private entity fields/protected persistence constructors are good. EventPlan.update() trusts EventDraft validation; entities are directly serialized using field visibility | Introduce explicit DTOs for the new estimate/booking APIs. Avoid exposing new internal prices, ownership, or lazy graphs automatically |
| Cohesion/coupling | Clear package layers; domain → API JSON annotations and EventDraft → EventPlan mutation couple persistence/transport | Reuse EventPlan; do not create a competing Event entity. Avoid a broad domain redesign |
| Business-logic duplication | API and UI both validate input; server correctly remains authoritative. RecommendationObserver and ApiController repeat venue queries | Keep UI checks for feedback; calculate authoritative costs exactly once on the server |
| Dependency direction | Services depend on repositories; frontend has no database access | Keep future controllers thin; don't put Java factories in REST handlers or price arithmetic in JSX |
| Transactions | Event + observer writes are atomic. Controller's follow-up reads occur after service transaction returns | Quote/configuration writes should have one service transaction; booking verification and insert must share a transaction |
| Errors | ApiErrors handles validation, malformed input, and ResponseStatusException. Infrastructure/concurrency errors have no uniform mapping | Add targeted mappings when adding optimistic/pessimistic locks; preserve diagnostic logs without leaking internals |
| Testability | Plain strategy interfaces and injected collaborators are testable, but all existing tests load Spring | New factories/decorators get fast unit tests; persistence/locking gets real integration tests |
| Extensibility | Small monolith is appropriate; no blocker to two additional modules | Extend in the existing package tree, with small feature-oriented collaborators rather than microservices |

The custom session/password implementation has meaningful protections for local use: salted PBKDF2-HMAC-SHA256 with 600,000 iterations, constant-time derived-key comparison, dummy hash work for missing accounts, unique normalized email, and session replacement. This is not a production security certification, but absence of Spring Security alone is not a confirmed defect or reason to rewrite authentication.

## 8. Confirmed Bugs and Technical Risks

Severity uses the supplied scale. **CRITICAL = established invariant/functionality failure with critical impact; none confirmed.** HIGH items below include rubric/integration blockers and explicitly identified decisions, not invented runtime failures.

| ID / severity / kind | Location and evidence | Why it matters | Specific future fix | Blocks 03 / 04? |
|---|---|---|---|---|
| F01 HIGH — missing requirement | domain/EventDraft.java:7–16 and domain/EventPlan.java:12–24 have no city; frontend/src/main.jsx:479–481 hardcodes Astana | Module 02 does not satisfy the city requirement | Agree single-city acceptance or add explicit supported city to event DTO/entity/form and catalog filter. Do not infer city from free-text addresses | No for single-city development; blocks full rubric compliance |
| F02 HIGH — confirmed data limitation / decision | backend/src/main/resources/catalog.json:17,39,61,83,105 contain price=null; domain/Venue.java:28 has no price unit | Complete total/budget-sufficient claim is undefined | Agree venue rental semantics, price source, and incomplete-quote behavior. Keep null distinct from zero; optionally use clearly separated demonstration rates | Blocks a complete numeric 03 demo; booking cost-confirmation policy also depends on it |
| F03 MEDIUM — confirmed frontend wiring gap | frontend/src/main.jsx:288–307 omits budget and excludes it from effect dependencies; service/VenueService.java:27 supports budget filtering | Once known prices exist, the displayed “matching” list can include an over-budget venue that save rejects | Pass valid budget and refresh on budget changes; preserve unknown-price labeling. Add a non-null-price UI/API test | Does not block backend design; fix before integrating estimates into catalog |
| F04 MEDIUM — concurrency risk | domain/EventPlan.java:12–24 has no @Version; EventService.save():33–40 performs full update | Two tabs can overwrite each other's event edits without detection; no concurrency test exists | Add a version precondition to the update contract and optimistic persistence version, mapping stale updates to 409. Reconcile frontend state | Not an implementation blocker; important for 03 configuration and 04 edit consistency |
| F05 MEDIUM — confirmed unsafe UI state interaction | frontend/src/main.jsx:332–347 awaits save then unconditionally replaces form/editingId; inputs :594–687 and new-event action :720–725 remain enabled | A user can start a new form or edit fields while a save is in flight; its response replaces newer draft state | Disable switching/editing during save or use a request/draft revision guard. Verify with a delayed response | No; keep this interaction from propagating into package/booking forms |
| F06 MEDIUM — confirmed environment/configuration mismatch | application.properties:3 supports PORT; frontend/vite.config.js:7–8 always targets 8080; scripts/toolchain.ps1:12–40 searches Windows executables | Separate dev servers fail to communicate when backend port is changed. Linux launcher guidance is absent | Document matching ports or make dev API target configurable during later implementation; retain packaged single-origin workflow | Operational issue for both; not a domain blocker |
| F07 MEDIUM — prospective price-history risk | persistence/CatalogSeeder.java:16–19 upserts seed data at restart; no estimate/snapshot entity exists | A future “saved estimate” recalculated only from today's catalog could change after restart/catalog update | Persist selected configuration and immutable quote lines/rates/version; do not put negotiated per-event prices into seeded Venue.price | Must be solved in 03 persistence; 04 should reference a frozen quote |
| F08 MEDIUM — future invariant gap, not present booking bug | EventService.java:33–47 freely edits/deletes events; no booking references/status exist | After bookings are added, changing date/venue/guest count or deleting the event could invalidate availability/history | In the same locking discipline, reject incompatible edits/deletion while an active booking exists; retain historical records | Required before 04 is considered done |
| F09 MEDIUM — error/retry risk | web/ApiErrors.java:14–23 has no database/lock exception mapping; ApiController.java:62–64 reads after committed save | Infrastructure errors may have generic responses; a response failure after commit can make retry outcome ambiguous | Map concrete lock/conflict failures; separate save success from optional refresh. Consider request deduplication for booking confirmation | Targeted handling needed for 04; no current reproduced database failure |
| F10 MEDIUM — maintainability | frontend/src/main.jsx:246–1209 houses nearly all planner behavior and rendering | Adding both modules directly there increases state coupling and merge conflicts | Add focused components and a small shared API helper as part of the modules; avoid unrelated frontend rewrite | No |
| F11 MEDIUM — verification gap | ApplicationIntegrationTest.java:25–28 uses transactional in-memory H2; :78–85 explicitly assumes every venue price is null | No current proof of known-price behavior, real restart durability, rollback failures, UI state races, or concurrency | Extend tests in the implementation phase; record current test-run blocker honestly | Blocks a claim of comprehensive verification, not coding |
| F12 LOW — confirmed stale documentation/copy | docs/testing.md:5 says 12 tests; 14 @Test methods exist. docs/architecture.md:58 says accounts/auth are future work, despite current auth classes. main.jsx:729–731,1173–1175 always says demo profile | Defense/user explanations conflict with the actual current account flow | Later update counts/scenarios and make copy depend on profile.mode; do not change these files during this audit | No |
| F13 LOW — representation risk | frontend/src/main.jsx:871,874,1150 checks price truthiness rather than null | A valid zero-price venue would display “по запросу” | If zero is allowed, use explicit null/undefined tests. If prohibited, validate that rule in pricing/catalog input | No; zero-price policy remains undecided |

For Java source rows above, domain/, service/, web/, and persistence/ are under **backend/src/main/java/kz/qonaqai/**.

Additional bounded observations:
- Unknown prices passing the budget predicate are intentional, not an affordability bug.
- No confirmed broken ownership check or password disclosure was found in the inspected paths.
- VenueService loads the entire catalog into memory; this is reasonable for five venues and is not a scalability blocker for this defense.
- Server-side validation is stronger than client checks (guest maximum, budget maximum/scale). Invalid API requests are still rejected.
- Not every future missing entity warrants a separate “bug” finding; Modules 03 and 04 are explicitly unimplemented.

## 9. Module 03 — Integration and Design Recommendations

### Integration answers

| Question | Answer grounded in current code |
|---|---|
| Reusable domain models? | EventPlan, Venue, Account/SessionIdentity, existing event/venue repositories, BigDecimal budget, and owner-scoped service lookups |
| Existing Event? | Yes: EventPlan. Do not introduce a second competing Event entity |
| Budget storage? | EventPlan.budget, BigDecimal, @Column(precision=16, scale=2), EventPlan.java:17 |
| Venue price? | Venue.price is nullable BigDecimal; all seeded values are unknown; no unit/currency field or quote history |
| Service entity/table? | None. docs/service-examples.json is descriptive data only and is not loaded at runtime |
| Existing relationships? | EventPlan → Venue is a many-to-one; owners/notification event references use scalar IDs |
| Where does configuration belong? | In an event-owned EventPackageConfiguration, ideally one row per event with child service selections; not in Venue or browser-only state |
| Breakdown representation? | Explicit immutable QuoteResponse/CostLine DTOs, server-calculated amounts and completeness/budget status |
| Price persistence? | Persist server-owned current rate definitions or a versioned server resource, plus immutable snapshots used by saved estimates; never trust browser prices |
| UI/business communication? | Existing same-origin fetch/JSON pattern, through dedicated package/estimate endpoints and Java services |
| Components to extend? | Planner navigation/state, EventService ownership/edit policies, new controllers/services/repos/entities; minimal EventPlan accessors/version if needed |
| Components to preserve? | Authentication rules, existing Strategy/Observer contracts, official venue catalog semantics, image paths, event CRUD validation, React/Vite stack |

Proposed names are descriptive and can be shortened consistently by the team. A Java interface should not be named just Service because that is easily confused with Spring's @Service.

### Small persistence design

Recommended minimum:
- **EventPackageConfiguration**: ID, unique event_id foreign key, packageCode, catalogVersion, version, updatedAt.
- **EventServiceSelection**: configuration_id, serviceType, selected options/variant, typed quantity/duration where relevant; enforce one selection per service type if that policy is chosen.
- **EventEstimate**: configuration/event reference, quote revision, event input snapshot (guests/date/time as needed), currency, completeness, venue-price provenance, known subtotal, nullable final total, and createdAt.
- **EstimateLine**: estimate_id, stable code, label, category, pricing unit, quantity, unitPrice snapshot, amount, inclusion/unknown status.
- **ServiceRate / PackageDefinition**: server-owned catalog of current rates/inclusions, stored either in small tables or a versioned resource. Tables are useful if runtime editing is required; immutable resources are sufficient if prices only change with a release. Do not build an admin UI unless required.

These are new tables proposed for implementation, not existing schema. A saved estimate can initially be the current immutable snapshot per configuration revision; unlimited quote history is optional. Package/service configuration must be reloadable even if quote history is limited.

Store precise decimal money (for example precision 16, scale 2 consistently with budget), explicit KZT currency, unit and quantities. Specify rounding once, using BigDecimal, rather than letting JSON numbers/JavaScript determine totals. Store included-service selections/configuration as well as additions when their options matter. Do not serialize Java decorator objects, class names, or Spring beans into the database.

### Contract and calculation ownership

Suggested endpoints, following existing event ownership:
- GET /api/package-options: package definitions, service options, current catalog version.
- POST /api/events/{id}/estimate: pure preview of candidate configuration using saved event context; no event/config mutation.
- PUT /api/events/{id}/package: validate, recalculate, save configuration and quote snapshot atomically.
- GET /api/events/{id}/package: persisted selections and last saved quote.

The new service must resolve the event by **id + sessions.require(request).accountId()**. Never accept ownerId or authoritative prices from JSON. Validate enum values/options/quantities and reject stale catalog/configuration revisions. Preview responses need a configuration revision so the UI can discard late responses.

A quote response should distinguish:
- venue line and source/status;
- package base line;
- included-service lines, clearly marked included;
- charged optional-service lines;
- packageSubtotal, additionalServicesSubtotal, knownSubtotal;
- nullable total, currency, quoteComplete;
- budget, remaining/excess amount when determinable, and budgetStatus;
- quote/catalog revision, input snapshot, and warnings requiring product decisions.

No double arithmetic: the decorator chain calculates **package plus additional services**; EstimateService combines that once with the venue amount. UI only formats returned results.

### Formula and uncertainty

The supplied formula is a **proposed rule**:

**Total = venue rental charge + selected package base charge + optional service charges.**

Before implementing it, decide whether a venue charge already includes catering, equipment, staffing, taxes, deposits, or a room package. A food minimum is not automatically venue rent. Package prices and inclusions must not be invented from the current venue source data.

If venue price is null:
- show the known package/services subtotal;
- retain an unknown venue line;
- return total = null and quoteComplete = false;
- return budgetStatus = UNDETERMINED unless the known minimum already exceeds budget, in which case EXCEEDED is justified;
- never return WITHIN_BUDGET merely because the known subtotal fits.

For a fully priced quote, compare exact BigDecimal totals with budget: equal is within, greater is exceeded. Decide whether exceeding budget is a warning or blocks configuration/booking. Current EventService rejects a known venue alone exceeding budget; preserve that until a deliberate rule change is agreed.

A complete numeric defense demo needs a verified price, explicitly entered per-event quotation, or clearly labeled demonstration tariff stored separately from factual venue data. This is a product/data decision, not permission to silently replace null with zero.

### Pricing units

docs/service-examples.json suggests HOST/DECOR per event, PHOTOGRAPHY/MUSIC per hour, and CATERING per guest. Those are examples, not implemented rates or binding pricing rules.

| Candidate unit | Calculation if approved | Input/rule still needed |
|---|---|---|
| FIXED | unitPrice × 1 | What is included, any minimum scope |
| PER_GUEST | unitPrice × chargeable guest count | All guests or selected count; children/staff; minimum order |
| PER_HOUR | unitPrice × billable hours | Duration source, increments, rounding, minimum hours |
| Package base | Published package price or approved quantity rule | Inclusion set, tier semantics, and whether price is fixed or per guest |

Do not silently derive hours from EventPlan.date: there is no time/duration yet. Either require explicit service hours or introduce the shared schedule contract before hourly pricing. Reject negative values; zero-price rates require an explicit complimentary/included rule.

## 10. Factory Method — Proposed Class Design

### Concrete participants

| GoF role | Proposed class/interface | Business role |
|---|---|---|
| Product | EventServiceProduct | Exposes service type, immutable configuration, context validation, and a priced CostLine |
| Concrete products | HostService, PhotographerService, DecorationService, MusicService, CateringService | Hold type-specific options and apply approved unit/quantity behavior |
| Creator | abstract ServiceCreator | Shared validated creation workflow; declares protected createProduct() factory method |
| Concrete creators | HostServiceCreator, PhotographerServiceCreator, DecorationServiceCreator, MusicServiceCreator, CateringServiceCreator | Override createProduct() to construct the corresponding product |
| Client | PackageConfigurationService / EstimateService via ServiceCreatorRegistry | Resolve creator by type and actually create products for every selected service |
| Supporting data | ServiceSelection, ServiceRate, PricingContext | Selected options, trusted price definition, event guests/duration context |

Spring can inject a List<ServiceCreator> and build a registry, as VenueService already does for strategies. Detect duplicate registrations and give a clear error for unsupported types. The registry is dispatch infrastructure; **the overridden createProduct() is the Factory Method**.

Illustrative documentation-only sketch:

~~~java
abstract class ServiceCreator {
    public final EventServiceProduct create(
            ServiceSelection selection, ServiceRate rate, PricingContext context) {
        validateShared(selection, rate, context);
        EventServiceProduct product = createProduct(selection, rate);
        product.validate(context);
        return product;
    }

    protected abstract EventServiceProduct createProduct(
            ServiceSelection selection, ServiceRate rate);
}

// Concrete creator overrides createProduct() and returns HostService.
// Actual application service call:
ServiceCreator creator = creators.require(selection.type());
EventServiceProduct product = creator.create(selection, trustedRate, context);
~~~

The names in this sketch are proposed contracts, not compilable additions to the current project.

A static ServiceFactory.create(type) with a switch is a **simple factory**, not the required GoF Factory Method. Likewise, making creator subclasses but constructing products directly in EstimateService would leave the pattern unused. The production preview/save/reconstruction path must invoke the creator abstraction.

Avoid needless complexity:
- Use one creator hierarchy, not a creator factory plus abstract factory plus reflection.
- Keep product instances immutable and independent of JPA/Spring.
- Rates come from trusted server catalog data. Products should not query repositories during cost().
- Map existing example codes deliberately: PHOTOGRAPHY → PhotographerService and DECOR → DecorationService. Do not introduce conflicting PHOTOGRAPHER/DECORATION identifiers accidentally.
- Type-specific validation makes the separate products meaningful: approved hour options, guest quantities, and supported variants differ by service.

Defense extension example: add a **TRANSPORT** optional service. Add its type, product and creator, register a trusted rate/option definition, select a decorator mapping, and add tests. If UI reads server option metadata, no hardcoded checkbox branch is needed. This is a small, explainable extension; adding an enum/catalog entry is not evidence of an OCP failure by itself.

## 11. Decorator — Proposed Class Design

### Participants and active calculation path

| Role | Proposed implementation |
|---|---|
| Component | EventPackage: cost(), lines(), includedServiceTypes(), selectedServiceTypes() |
| Concrete components | BasicPackage, StandardPackage, PremiumPackage, each constructed from a trusted PackageDefinition |
| Base decorator | abstract PackageServiceDecorator implements EventPackage; holds a final EventPackage wrapped and EventServiceProduct service |
| Concrete decorators | HostDecorator, PhotographerDecorator, DecorationDecorator, MusicDecorator, CateringDecorator |
| Assembly client | PackageConfigurationService: build base, create selected products through ServiceCreator, wrap in canonical order |
| Total client | EstimateService: calls the resulting EventPackage.cost()/lines() and adds venue charge once |

Package constructors must not hide arbitrary invented rates. A simple switch/registry selecting Basic/Standard/Premium is acceptable: the required Factory Method is responsible for **service products**, not necessarily package creation.

~~~mermaid
classDiagram
    class EventPackage {
        <<interface>>
        cost()
        lines()
        includedServiceTypes()
        selectedServiceTypes()
    }
    EventPackage <|.. BasicPackage
    EventPackage <|.. StandardPackage
    EventPackage <|.. PremiumPackage
    EventPackage <|.. PackageServiceDecorator
    PackageServiceDecorator o--> EventPackage : wraps
    PackageServiceDecorator --> EventServiceProduct : uses
    PackageServiceDecorator <|-- HostDecorator
    PackageServiceDecorator <|-- PhotographerDecorator
    PackageServiceDecorator <|-- DecorationDecorator
    PackageServiceDecorator <|-- MusicDecorator
    PackageServiceDecorator <|-- CateringDecorator
~~~

For a Basic package plus host and photography:

~~~text
PhotographerDecorator(
    HostDecorator(
        BasicPackage(definition),
        hostProduct),
    photographerProduct)

outer.cost()
  = BasicPackage.cost()
  + HostService priced charge
  + PhotographerService priced charge
~~~

Each decorator calls wrapped.cost(), adds its own product charge, and appends its CostLine to wrapped.lines(). The wrapped component and decorators share the same interface, so further wrapping remains possible. If EstimateService instead sums selections in a separate loop and never calls the outer decorator, the project would have a decorative class diagram but no active Decorator calculation.

A small concrete decorator can delegate calculation to the base class while restricting/identifying its service type. Five subclasses are understandable for this rubric; avoid copying the entire arithmetic into each subclass. If an instructor accepts one generic ServiceDecorator around polymorphic products, that is structurally sufficient, but the named five variants are easier to demonstrate.

### Inclusions, duplicates, removal, and reconstruction

- Package definitions explicitly list included service types and relevant included configuration/allowances.
- The package base line carries its package price. Included service lines say INCLUDED and have no additional charge. They must not add their standalone tariff to the package total again.
- Simplest student rule: at most one selection per service type. Reject duplicate submissions by type, rather than silently multiplying or dropping charges.
- Do not allow an optional decorator for a type already fully included in the package. If upgrades/additional hours are required later, model the incremental entitlement/price explicitly; do not charge the full service again by accident.
- Validate these rules in the assembler and defensively in the decorator. Return clear errors to the UI and enforce an appropriate selection uniqueness constraint.
- Removal edits the persisted selection list and rebuilds the chain. Do not search/mutate nested decorators or persist pointers to the chain.
- Persist packageCode, service codes/options/quantities, catalog version and quote line snapshots. Reconstruct by loading the definition, creating products through creators, then wrapping them in a deterministic order.
- Reconstruct an **old saved quote** using its saved rates/version; a request for current prices must explicitly create a new quote revision. If old definitions cannot be retained, the persisted immutable snapshot remains the historical authority.
- Both cost() and lines() must use the same charges; assert that the sum of charged lines equals cost(). Included lines and unknown venue lines need explicit statuses.

The decorator represents **priced service composition**, not persistent entity inheritance. There is no need for a JPA inheritance hierarchy for BasicPackage/HostDecorator.

## 12. Module 04 — Booking Integration and Data Consistency

### Existing gaps and recommended entity

No booking entity, table, endpoint, status, availability query, start/end time, or time-conflict logic exists. EventPlan.date is LocalDate only (EventPlan.java:15). Venue selection currently saves a preference and does not reserve anything.

Recommended **Booking**:
- generated id;
- non-null event_id and venue_id foreign keys;
- server-derived owner identity consistent with the event;
- startAt and endAt, preferably stored as Instant with venue ZoneId retained for display;
- status as an enum string;
- createdAt, cancelledAt, optional cancellation reason, persistence version;
- reference to the saved estimate/quote revision if price confirmation is part of booking.

Reuse EventPlan and Venue. No second booking-specific venue catalog is necessary. Add a minimal EventPlan date accessor if services need one. Do not accept a user-supplied event owner or book a foreign event.

Adopt a policy of **one active booking per event** for the first version. Multiple canceled historical attempts are allowed. An event-row lock can serialize attempts for that event as well as coordinating edits; same-venue locking handles conflicts across different events.

### Time and status semantics

Validate start < end, future/non-past booking policy, permitted duration, time zone, and consistency between event.date and the venue-local start date. Decide if overnight bookings and setup/cleanup buffers are allowed. Do not infer a duration from the date alone.

Minimal state machine:

~~~mermaid
stateDiagram-v2
    [*] --> CONFIRMED : validate and reserve atomically
    CONFIRMED --> CANCELLED : owner cancels
    CANCELLED --> [*]
~~~

No PENDING state is needed unless approval/temporary holds are required. If added, define expiry and whether it blocks availability. COMPLETED can initially be a display condition derived from the end time, rather than a scheduled state transition.

Cancellation retains the Booking row, changes status transactionally, and releases availability because overlap queries include **CONFIRMED only**. A second cancel can be idempotent and return the already canceled state; it must not reactivate the booking. Reactivation is rejected: create a new booking attempt and revalidate availability. Cancellation of past bookings needs an explicit policy.

### Correct interval predicate

Use half-open intervals **[start, end)**. For the same venue, a blocking booking overlaps when:

~~~text
existing.start < requested.end
    AND
requested.start < existing.end
~~~

Examples:
- Existing 10:00–12:00, requested 11:00–13:00: conflict.
- Requested 09:00–10:00 or 12:00–13:00: no conflict.
- Same start/end or complete containment in either direction: conflict.
- Different venue or CANCELLED status: no conflict.

Comparing only dates or equal start times is insufficient. If a turnover buffer is required, apply it consistently to the interval before querying and document the resulting adjacent-booking rule.

### Atomic enforcement for the actual H2/JPA architecture

A transaction containing “query overlaps, then insert” **without a common lock is insufficient**: two requests can both see no booking and both insert. Locking only matching booking rows also fails when the result is empty.

Recommended application protocol:
1. Enter **one @Transactional BookingService.confirm()** operation.
2. Lock/load the owned event row, consistently with event edit/delete operations. Check event version, selected venue, one-active-booking rule, and saved configuration.
3. Acquire **PESSIMISTIC_WRITE on the existing Venue row** by venue ID, inside that transaction. This provides a common lock even if there are no bookings yet. A dedicated VenueRepository lock query can use @Lock; verify generated SQL.
4. After acquiring that lock, execute a fresh overlap query for that venue and blocking status. Do not reuse an earlier availability result.
5. Revalidate dates, capacity, quote/config revision, and the event/venue relationship under the applicable locks. If conflict exists, return a domain conflict mapped to HTTP 409.
6. Insert and flush the confirmed booking, then commit. Release locks on commit/rollback.

H2 supports SELECT ... FOR UPDATE; Spring Data supports repository @Lock metadata. This recommendation applies those mechanisms to the present entity model. See [H2 SELECT locking](https://h2database.com/html/commands.html#select) and [Spring Data JPA 3.5 locking](https://docs.spring.io/spring-data/jpa/reference/3.5/jpa/locking.html).

Use the lock query on the **Venue root row**, not an aggregate overlap count with FOR UPDATE. The booking query should run after lock acquisition under a suitable isolation level; H2's default READ_COMMITTED supports fresh committed reads. Confirm the actual generated SQL and isolation with two real transactions in tests. Do not assume changing to SERIALIZABLE alone is sufficient. See [H2 transaction isolation](https://h2database.com/html/advanced.html#transaction_isolation).

Cancellation and any rescheduling must use the same lock protocol. Fix a lock order such as **event → venue → booking**, and use it in confirm/cancel/event-edit paths. If future moves lock two venues, acquire their locks in sorted ID order. A lock timeout should produce a controlled retryable response; never catch it and proceed with insertion.

The guarantee is valid only if **every booking-writing path** honors the protocol. An in-memory synchronized block or map cannot replace the persistent lock. Different servlet requests use different database connections, even in one local application process.

### Persistence constraints and lifecycle

- Add foreign keys, non-null fields, and a database CHECK(start_at < end_at), plus an index beginning with venue_id/status/start_at for overlap lookup.
- A unique key on venue/date/start is not an interval exclusion constraint and cannot enforce arbitrary overlap prevention.
- This review does not assume PostgreSQL-style exclusion constraints exist in H2. The root-row locking protocol is the minimal proposal here. Reassess database-native exclusion constraints only if the database changes.
- Use optimistic versioning or locked transitions on Booking so concurrent cancellation cannot create an invalid state.
- Restrict incompatible EventService edits/deletion while a confirmed booking exists; preserve historical bookings and quote snapshots. Avoid cascade deletion that erases booking history.
- Rescheduling can remain out of scope: cancel then create a new booking. Do not silently change a confirmed booking through the existing event PUT.
- Availability GET is advisory and may become stale. Confirmation is the authority.
- List booking history by owner, including canceled status; do not expose other users' booking details in public availability responses.
- For the defense, create a booking in the logged-in user's event and show it in that user's booking list. The existing shared demo mode is explicitly not private; choose and document whether it can reserve global venue slots.

## 13. UI/UX Integration Recommendations

Keep React, Vite, the sage/cream styling, existing cards/buttons, typography, modal conventions, focus feedback, and responsive layouts. style.css:1–12 defines palette; :323–345 the workspace; :447–476 buttons; :1115–1160 dialogs; :1375 onwards responsive rules; :2109 reduced motion. entry.css is scoped to onboarding.

Recommended journey:

~~~mermaid
flowchart LR
    A["Create Event"] --> B["Select Venue"]
    B --> C["Choose Package"]
    C --> D["Configure Services"]
    D --> E["Review Estimate"]
    E --> F["Check Availability"]
    F --> G["Confirm Booking"]
    G --> H["View Booking"]
~~~

A and B exist. C through H are absent. Current “Мои мероприятия” can remain the entry point to resume this journey; do not replace the planner with a second application.

Suggested focused additions:
- **PackageConfigurator**: Basic/Standard/Premium cards with prices, inclusions and selected state. Changing tier reconciles additions and explains which services are now included.
- **ServiceSelector**: options read from server metadata; quantity/duration only where relevant; disable fully included services and explain inclusion.
- **EstimateBreakdown**: itemized venue/package/additional charges; included markers; explicit “venue price pending” and known subtotal; budget sufficient/exceeded/undetermined.
- **AvailabilityPanel**: start/end inputs and venue-local zone, current advisory availability, accessible pending/error states.
- **BookingConfirmation**: final event/venue/time/estimate revision summary; one confirmation action with pending state; handle 409 by refreshing availability.
- **BookingHistory**: owned bookings grouped or linked from events; status labels and cancel confirmation; no optimistic “canceled” display until server success.

Keep unsaved package selections separate from the persisted configuration and label preview versus saved quote. After save, display the server-returned result. Debounce estimate requests and cancel/discard stale responses, using the existing catalog AbortController approach plus a configuration revision. Do not calculate the authoritative total in JSX.

Saved events should retain and reopen package configuration and booking status. Browser reload can restore the last saved step from server state; URL-based deep links or local draft recovery are optional improvements. Clear pending state on session expiry and return to authentication consistently.

Existing UX limitations to account for:
- Local comparison IDs survive tab switches but not reload.
- Editing guests clears the selected venue locally (main.jsx:308–313); package quotes dependent on guests must also be invalidated/recalculated.
- Changing budget currently does not refresh recommendations.
- Some account-mode copy still says demo profile.
- Modal code includes keyboard/Escape/focus handling, but new dialogs should be keyboard-tested rather than assuming the existing trap covers disabled/dynamic controls perfectly.
- No browser visual or accessibility execution was performed in this audit; responsiveness conclusions come from source, not fresh screenshot testing.

## 14. Test and Build Assessment

### Commands and results

Environment observed: Linux, OpenJDK **21.0.12.1**, Maven **3.10.0**, Node **26.11.1**, npm **12.2.1**. These are observed tool versions, not a recommendation to require Node 26.

Repository exploration used rg --files, git ls-files, git status --short, git log, line-numbered source reads, and file for the five JPEG headers. All tracked source/configuration/documentation areas were inspected; ignored dependencies and binary database contents were not treated as application source.

| Verification command | Result | Interpretation |
|---|---|---|
| git status --short; git log -12; git ls-files | Clean start; main at 05fb84c; 60 tracked files | Baseline identified |
| java -version; mvn -version; node --version; npm --version | Available | Toolchain installed before audit |
| In frontend: node --input-type=module -e 'import {build} from "vite"; await build({configLoader:"runner",build:{write:false}});' | **PASS**: 25 modules transformed; production bundling completed in 1.52 s | Uses installed Vite and project config, with output writing disabled; no install and no frontend/dist created |
| In backend: mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test | First attempt failed opening cache lock files under sandbox | Environment restriction on the relocated checkout, not a test assertion |
| Same offline Maven test command with filesystem permission | **BLOCKED**: maven-surefire-plugin:3.5.6 not cached | No tests executed. No dependencies downloaded, as required |
| In backend: mvn -o -B -Dmaven.repo.local=/home/morninginheaven/aitu/sdp/QonaqAI/.tools/m2 test-compile | **PASS**, BUILD SUCCESS | Incremental compile lifecycle succeeded; main/test classes were already up to date. This is not a fresh clean compile or test pass |
| Packaged application/JAR including UI | **Not run/verified** | No clean/package command or launcher was run; frontend/dist is absent |

The permission retry allowed ordinary generated build/cache files only; it did not open the real application H2 database. Test configuration explicitly uses jdbc:h2:mem:qonaq-test with create-drop (ApplicationIntegrationTest.java:25). No application restart, registration, event mutation, schema change, dependency installation, or destructive clean was performed.

**Actual execution totals for this audit: 0 tests passed, 0 tests failed; execution blocked before tests.** This must not be summarized as “14 tests passed.” Existing docs/testing.md reports a historical 12-test success, but the current source contains 14 tests and no fresh Surefire reports were produced.

### Existing suite

ApplicationIntegrationTest.java contains 14 @Test methods:
- bootstrap/catalog/profile;
- create/reload/edit/select/delete;
- both persisted observer reactions;
- strategy order and all-null price preservation;
- capacity filters;
- case-insensitive search;
- blank title, zero guests, negative budget, and past date rejection;
- insufficient selected venue capacity;
- malformed values and missing event errors;
- registration/login/logout/session replacement;
- owner isolation between accounts and shared demo.

All are in one Spring Boot integration class. Some exercise services directly but still run with a Spring context; there are no isolated unit-test classes or UI tests. @Transactional rolls test changes back. The custom listeners and mock-maker-subclass resource avoid needing Mockito's runtime agent for these real-collaborator tests.

Coverage gaps for current functionality include non-null venue prices/budget boundaries, missing/null/fractional limits, observer failure rollback, unknown strategy registry cases, real file persistence and restart, stale event updates, server failures after save, and frontend races/navigation. No coverage percentage can be claimed without instrumentation.

### Proposed Module 03 tests — do not implement during this audit

| Level | Tests |
|---|---|
| Unit: packages | Each Basic/Standard/Premium definition creates expected base price/inclusions; zero/negative/missing rates follow approved policy |
| Unit: Factory Method | Each concrete creator produces the right product and honors type/options; actual shared create workflow invokes overridable creation; invalid variants/quantities rejected |
| Unit: Decorator | Single and multiple additions; nested chain cost; line sum equals cost; order independence where fees are additive; component remains substitutable |
| Unit: inclusion/deduplication | Duplicate type rejected; included type cannot be charged again; tier change reconciles additions; removal/rebuild matches expected result |
| Unit: money/budget | Exact boundary, sufficient/exceeded, decimal rounding, large values, unknown venue total, known minimum already over budget, invalid zero pricing |
| Integration: ownership/API | Preview/save/get with current user; foreign event rejected; malformed payloads; browser-submitted prices ignored/rejected; stale versions handled |
| Integration: persistence | Save and reconstruct selections, rates, inclusions, and quote lines; changed current catalog does not alter old snapshot; transaction rollback |
| UI/end-to-end | Choose tier/services, see pending then server quote, remove service, change guests, reload saved config, budget messages, stale-response/session expiry behavior |

### Proposed Module 04 tests

| Level | Tests |
|---|---|
| Unit | Interval overlap, containment, same boundaries, adjacency, different venue/status; start >= end; time-zone/date rules; allowed/invalid transitions |
| Integration | Successful persist/list/reload; rejected overlap; adjacent non-overlap; cancellation frees slot; cancellation history retained; foreign owner rejected |
| Integration: lifecycle | Event edits/deletes cannot invalidate a confirmed booking; stale quote/version rejected; repeated confirm does not create another active booking |
| Integration: concurrency | Two independent transactions/connections attempt conflicting slots on the same venue, including initially empty history: exactly one commits; loser gets conflict or controlled lock timeout |
| Integration: isolation | Parallel bookings for different venues can succeed; concurrent cancellation/rebooking obey locks; state persists across a fresh context/file-based temporary test database |
| UI/end-to-end | Select time, availability, confirm, view own booking, cancel, refresh; handle confirmation 409 and double-click/pending states |

The concurrency test must not be hidden inside one rollback-only test transaction. Use independently committed transactions and coordination barriers, then assert persisted rows. Future restart tests must use disposable databases, not backend/data/qonaqai.

## 15. Prioritized Implementation Roadmap

Everything in this section is **future work**, not authorization exercised by this audit.

### Essential requirements

**Step 1 — Agree contracts and business rules.**
- Goal: settle city scope, KZT price units/rates, package inclusions, unknown venue pricing, budget enforcement, schedule/time zone, and booking ownership.
- Existing files to modify later: docs/architecture.md, docs/service-examples.json, docs/testing.md; EventDraft/EventPlan/main.jsx only if city is required.
- New files/classes: agreed request/response schemas; PricingUnit/PackageCode/ServiceType definitions once decisions are made.
- Patterns: define Factory Method/Decorator responsibilities; no pattern implementation yet.
- Database/UI: specify tables/fields and screen flow; no premature schema mutation.
- Tests: agree money, inclusion, overlap and ownership acceptance cases.
- Dependencies: none.
- Definition of Done: one documented set of codes, units, examples and unresolved-price behavior agreed by module owners; the city requirement has an explicit resolution.

**Step 2 — Implement service catalog and real Factory Method.**
- Goal: five trusted service definitions and concrete products created through the creator abstraction.
- Existing files: reuse docs/service-examples.json codes; package registration through normal component scanning; no change to Strategy/Observer.
- New classes: EventServiceProduct, ServiceCreator, five product/creator pairs, ServiceCreatorRegistry, ServiceRate, PricingContext, selection DTOs.
- Pattern: Factory Method with an overridden createProduct() used by business services.
- Database: optional rate tables, or a versioned server resource if runtime editing is not required.
- UI: expose package/service option metadata API, but no frontend arithmetic.
- Tests: product/creator variants, rate/quantity validity, unsupported/duplicate registrations.
- Dependencies: Step 1.
- Definition of Done: all five products are created through the same creator API and validated with approved pricing examples.

**Step 3 — Implement packages, decorator chain, and estimate preview.**
- Goal: Basic/Standard/Premium plus composed optional services produce one consistent itemized quote.
- Existing files: add integration points beside EventService/VenueService; preserve their existing behavior.
- New classes: EventPackage, three base packages, PackageServiceDecorator and five concrete decorators, PackageDefinition, EstimateService, QuoteResponse/CostLine, estimate controller.
- Patterns: Decorator consumes Factory Method products.
- Database: not required for a pure preview.
- UI: small initial PackageConfigurator/ServiceSelector/EstimateBreakdown components.
- Tests: chain arithmetic, inclusions, duplicate/removal, exact budget boundaries, unknown venue prices, HTTP ownership.
- Dependencies: Step 2 and approved pricing.
- Definition of Done: real HTTP preview uses outer decorator cost(), returns deterministic lines, and never reports an unknown complete total as affordable.

**Step 4 — Persist configuration and quote snapshots.**
- Goal: reload selections and preserve the price actually quoted.
- Existing files: EventService ownership helper/accessors as minimally needed; EventPlan version/DTO update contract if chosen; ApiErrors for stale conflicts.
- New classes: EventPackageConfiguration, EventServiceSelection, EventEstimate/EstimateLine, repositories, PackageConfigurationService/controller.
- Patterns: reconstruct products via Factory Method and chain via Decorator.
- Database: additive configuration, selection and estimate tables; foreign keys, uniqueness, money precision, version fields.
- UI: save/resume configuration, distinguish current preview from saved quote.
- Tests: round-trip, owner isolation, stale versions, transactional rollback, catalog change preserving snapshots.
- Dependencies: Step 3.
- Definition of Done: a saved event reopens after restart with the same configuration and saved quote; repricing creates a deliberate new revision.

**Step 5 — Complete Module 03 UX and current integration gaps.**
- Goal: make the complete event → venue → package → services → estimate flow usable.
- Existing files: main.jsx, style.css; EventDraft/EventPlan if city unresolved; current API/helper where budget/version is wired.
- New components: focused configurator/breakdown components and shared API helper only as needed.
- Patterns: frontend demonstrates backend patterns through actual results.
- Database: only agreed city/version additions not already done.
- UI: wire budget filtering, pending/draft guards, included-service states, budget/incomplete-price explanations, accurate account/demo copy.
- Tests: delayed responses, package switching, duplicate prevention, reload, auth expiry, known-price venue filtering, keyboard/mobile.
- Dependencies: Steps 3–4.
- Definition of Done: Beibarys can demonstrate multiple services, exact total where fully priced, explicit uncertainty otherwise, and budget comparison without bypassing Java calculation.

**Step 6 — Add booking model and advisory availability.**
- Goal: explicit intervals, minimal status model, persisted booking structure.
- Existing files: VenueRepository for a future lock method; EventPlan minimal date access; owned event lookup reuse.
- New classes: Booking, BookingStatus, BookingDraft/BookingResponse, BookingRepository, BookingService/controller, interval validator.
- Pattern: none required here; do not invent a State hierarchy for two states.
- Database: booking table, event/venue FKs, interval check, status/time indexes, version.
- UI: AvailabilityPanel with start/end and zone; clearly advisory status.
- Tests: overlap boundaries, invalid intervals, canceled filtering, ownership.
- Dependencies: Step 1 schedule decisions; Step 4 if quotes are required to book.
- Definition of Done: accurate advisory query and persisted model exist; no confirm endpoint is presented as safe before Step 7.

**Step 7 — Implement atomic confirm/cancel and event lifecycle guards.**
- Goal: prevent conflicting commits and preserve history.
- Existing files: EventService.save/delete, EventRepository and VenueRepository lock queries, ApiErrors.
- New classes: booking conflict exceptions/DTOs; confirm/cancel methods and owner history query.
- Pattern: transaction and database locking protocol, not a student GoF pattern claim.
- Database: finalize checks/indexes; optional deduplication key if confirm retry policy requires it.
- UI: handle 409/lock timeout, pending confirmation, cancellation confirmation.
- Tests: independent concurrent transactions, empty-history race, duplicate event booking, cancel/rebook, incompatible event edits/deletes.
- Dependencies: Step 6.
- Definition of Done: two conflicting attempts cannot both persist as active, adjacent permitted bookings work, cancellation releases the slot, and history remains queryable.

**Step 8 — Complete booking journey and defense verification.**
- Goal: show the user's own booking from a saved event and exercise persistence end to end.
- Existing files: main.jsx/style.css, README.md, docs/testing.md, docs/architecture.md.
- New components: BookingConfirmation and BookingHistory; regression tests.
- Patterns: demonstrate all four implemented student patterns through working actions.
- Database: no further change unless tests expose a concrete omission.
- UI: confirm → view → cancel → available again; preserve context and readable error states.
- Tests: complete UI/API journey, temporary-file restart tests, regressions for Modules 01–02, clean build once dependencies are available.
- Dependencies: Steps 5 and 7.
- Definition of Done: documented reproducible demo, actual test results, runnable packaged GUI, and every required journey step works for the logged-in user.

### Quality improvements, after essential invariants

- Make API target/launcher documentation work on Linux and alternate ports; update stale technical docs. Existing files: README.md, vite.config.js/toolchain docs, testing.md; test manual start with matching ports. No dependency on pattern implementation.
- Keep new HTTP DTOs explicit; extract only the Planner responsibilities touched by new modules. Existing files: main.jsx and new components; UI regression checks prove behavior retained.
- Consolidate duplicate recommendation calculations only if profiling or changed flow justifies it. Existing files: ApiController/RecommendationObserver; observer integration tests must remain meaningful.
- Introduce reproducible schema-change scripts or a migration approach when adding persistent tables; agree this separately rather than retroactively rewriting the existing schema.
- Add targeted CI/build reproducibility once all dependencies can be fetched in an authorized implementation phase. Do not make this a prerequisite for explaining the patterns.

### Optional extensions

URL/deep-link navigation, browser draft recovery, extra service variants, multiple cities beyond the rubric minimum, package upgrades, rescheduling, completed/expired statuses, and richer price administration can follow the basic defense. Payments, distributed locks, microservices, event buses, a new frontend framework, and production hosting are not necessary for this project.

## 16. Defense Readiness

**Current defense readiness:** good for explaining a small layered Java web application, Strategy, Observer, event persistence, ownership, and venue selection. Not ready to claim packages, cost estimation, availability, or booking.

Beibarys's recommended live demonstration:
1. Log in, create/open an event, choose a venue, and point to its persisted event/venue IDs.
2. Select a package and two optional services. Show registry → ServiceCreator.create() → overridden createProduct() → concrete product in the debugger or focused source.
3. Show the nested decorators and call the outer cost(). Removing one service should rebuild the chain and remove exactly one charge.
4. Display itemized lines and show that their charged sum equals the returned package subtotal and final total.
5. Change guest count or service hours where supported; show server recalculation. Test budget exactly equal, below total, and above total.
6. Demonstrate unknown venue price honestly, then a clearly labeled fully priced demo/quotation scenario.
7. Save, reload, and show persisted configuration/snapshot. Explain why a future rate change does not rewrite the saved quote.

Likely instructor changes:
- **Add TRANSPORT service:** type + product + creator + trusted rate/options + decorator mapping + unit tests. Registry-driven option UI minimizes edits.
- **Add a package variant:** new package definition/component and package registration, inclusion tests; service creators remain unchanged.
- **Add per-hour service:** implement the approved quantity rule with explicit duration, test fractional/rounded duration; never hardcode hours in the UI.
- **Include photography in Standard:** update inclusion definition; tests prove it cannot be charged again and an existing saved quote remains historically consistent.
- **Remove a selected service:** edit selections and reconstruct, demonstrating true composition rather than a growing string description.

The strongest explanation connects concrete inputs to concrete objects and persisted results. Show why inheritance is used for the creator, wrapping for decorators, and IDs/snapshots for storage. Do not claim that Spring injection itself is the assessed pattern or that a switch named Factory is sufficient.

README.md:69 discloses AI assistance; follow course disclosure rules and ensure each participant can explain and change their own code. The review cannot establish individual authorship from commits alone.

## 17. Unresolved Questions and Assumptions

| Question | Why it must be settled |
|---|---|
| Is a browser GUI accepted as the required Java graphical interface? | Existing implementation is Spring Boot + React, not a desktop GUI |
| Is single-city Astana acceptable, or is an explicit city input mandatory? | Current event/domain has no city |
| Is Event Studio a report name or a required UI rename? | Current app, artifact, and documentation say QonaqAI |
| What exactly do Basic/Standard/Premium include and cost? | No package model/rates exist |
| Are service-example units binding? | They are documentation examples without pricing/business rules |
| What is the authoritative venue rental charge, and what does it include? | All current prices are null; catering and room rent must not be conflated |
| How is a per-event quote entered and attributed? Are demo rates acceptable? | Needed for a complete numeric defense without fabricating official prices |
| Are discounts/taxes/deposits included or out of scope? | Otherwise total/budget semantics are ambiguous |
| Does exceeding budget warn, reject configuration, or block booking? | Assignment requires comparison, not an explicit enforcement policy |
| Can an incomplete quote be booked? | Module 04 may reserve a time independently of final commercial price |
| Are duplicate service types forbidden, or can quantity/upgrade entitlements be added? | Determines validation and uniqueness |
| What are minimum hours, billing increments, and rounding? | Event currently has only a date |
| What zone, opening hours, overnight rules and turnover buffers apply? | Defines legal booking intervals |
| One active booking per event? | Proposed student default, not an existing requirement enforced by code |
| Can shared demo users reserve the same global venue schedule? | Demo ownerId=null is intentionally shared |
| Are confirmed event changes prohibited or handled by cancel/rebook? | Needed to maintain booking consistency |
| What cancellation cutoff applies? | Minimal state machine does not imply a commercial cancellation policy |
| How long are quote/catalog versions retained? | Required to reconstruct historical prices |
| How will additive schema updates preserve existing saved data? | Current ddl-auto=update is not a reviewed migration history |

Assumptions used for the recommendations: keep Java/Spring/React/H2, use KZT, keep current authentication/ownership, prefer a local student demonstration, do not add payment or approval workflows, and use CONFIRMED/CANCELLED as the minimal booking states. None of those assumptions silently supplies missing package prices or venue availability.

## 18. Final Recommendations

1. Retain the existing layered monolith. Its current abstractions fit the remaining modules without a rewrite.
2. Resolve pricing/inclusions/unknown-total behavior and the city requirement before committing new data contracts.
3. Implement Module 03 through an actually called ServiceCreator Factory Method and an actually traversed EventPackage Decorator chain. Keep cost arithmetic in Java.
4. Save event-owned configuration and quote snapshots; separate current rates from historical prices and from factual venue seed data.
5. Implement Module 04 with real persisted intervals, common-row locking, atomic conflict check/insert, cancellation, ownership, and event lifecycle guards.
6. Fix the bounded integration gaps as part of the relevant steps, especially budget request wiring, stale UI drafts, and concurrency versions.
7. Obtain genuine test execution and a packaged-UI build during implementation. Current successful bundling/test-compilation checks do not replace the blocked 14-test run or an end-to-end booking demonstration.

The application is a viable foundation for a defensible SDP final project. The remaining work is concrete domain behavior and verification, not replacement of the technology stack.
