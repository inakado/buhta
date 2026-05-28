# Architecture Baseline And Domain Core Plan

Статус: `Active`
Дата: 2026-05-28
Roadmap stage: `0. Project Structure And Architecture Baseline` + начало `1. Roles, Admin, Policy Foundation` и `3. Shared Contracts And Domain Core`.

## Цель

Подготовить первый большой кодовый этап перед реализацией бизнес-сценариев CRM:

- зафиксировать структуру backend/frontend/shared модулей;
- подружить BetterAuth session/user model с доменными ролями и policy layer «Бухты»;
- заменить spike-style role guard на расширяемый role/policy foundation;
- заложить domain core: money/quantity helpers, error contract, command/result conventions;
- подготовить Prisma baseline для auth + пользователей + ролей + operation/audit envelope + idempotency;
- создать основу тестового контура для доменных операций на real Postgres;
- обновить архитектурные документы по фактической структуре после реализации.

Этот этап не должен реализовывать весь бизнес-процесс. Его задача — сделать прочный каркас, на котором следующие этапы смогут безопасно строить справочники, производство, продажи, курьера, деньги и отчеты.

## Handoff For Next Agent

Перед началом кода прочитать:

- `AGENTS.md`;
- `docs/crm-requirements.md`;
- `docs/ARCHITECTURE-PRINCIPLES.md`;
- `docs/TECH-STACK.md`;
- `docs/DECISIONS.md`;
- `docs/SECURITY.md`;
- `docs/FRONTEND.md`;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`;
- этот план.

Главная задача следующего агента: не начинать сразу писать все бизнес-сценарии, а реализовать architecture baseline и domain core из этого плана.

Ключевые ограничения:

- BetterAuth отвечает за identity/session.
- Доменные права проверяет наш backend policy layer.
- Не размазывать role checks по controllers и UI.
- Operation history: общий envelope + typed details для критичных операций.
- Деньги, остатки и история действий должны проектироваться под транзакционность и тесты.
- Mobile-first/PWA direction уже принято, но финальный UI не входит в этот этап.

## Контекст

Текущая база уже создана:

- `apps/api` — NestJS API;
- `apps/web` — Next.js frontend;
- `packages/shared` — общий пакет;
- `PostgreSQL + Prisma`;
- `BetterAuth` через `@thallesp/nestjs-better-auth`;
- v1 roadmap: `docs/exec-plans/active/2026-05-27-v1-roadmap.md`;
- mobile-first PWA направление;
- все write-операции online-only.

BetterAuth/Nest integration уже прошла spike:

- `/api/auth/sign-up/email` работает;
- session cookie создается;
- anonymous protected route возвращает `401`;
- wrong role возвращает `403`;
- allowed role возвращает `200`;
- BetterAuth user имеет дополнительное поле `role`.

Используем `@thallesp/nestjs-better-auth` как Nest adapter. Важные особенности integration:

- `AuthModule.forRoot({ auth, bodyParser })` подключает BetterAuth в Nest;
- Nest body parser отключается в `NestFactory.create(..., { bodyParser: false })`, а adapter re-adds body parsers для non-auth routes;
- guard BetterAuth глобальный: routes protected by default;
- публичные routes должны явно использовать `@AllowAnonymous()`;
- текущая session/user доступны через request/session tooling adapter;
- decorators вроде `@Roles()`/`@UserHasPermission()` существуют, но доменные права «Бухты» должны проходить через наш backend policy layer, чтобы не смешивать auth identity и бизнес-инварианты.

Reference: https://github.com/thallesp/nestjs-better-auth

## Scope

Входит:

- backend folder/module structure;
- shared contracts baseline;
- role constants and policy matrix;
- BetterAuth user/session bridge into application actor;
- admin/director/courier/etc role model baseline;
- typed domain errors and HTTP error mapper;
- money and quantity primitives/helpers;
- Prisma models for:
  - BetterAuth tables compatibility;
  - users/roles baseline;
  - operation envelope;
  - audit log;
  - idempotency records;
  - balance projection placeholders where needed for next stages;
- test helpers for real Postgres integration tests;
- docs updates after implementation.

Не входит:

- полноценный CRUD справочников;
- production flow;
- sales flow;
- courier load/unload commands;
- cash withdrawal command;
- discount assignment command;
- final mobile UI;
- PWA implementation beyond possible placeholders;
- reports/statistics.

## Архитектурные решения этапа

### 1. BetterAuth владеет identity/session

BetterAuth отвечает за:

- sign-in/sign-out/session;
- session cookie;
- base user identity;
- password/email auth mechanics;
- technical auth routes under `/api/auth`.

BetterAuth не отвечает за:

- доменное решение, кто может продавать;
- кто может списывать наличные;
- кто может выпускать продукцию;
- кто может назначать дисконт;
- инварианты остатков и денег.

### 2. Backend policy layer владеет доменными правами

Вводим единое место для прав:

```text
actor + permission + optional resource/context -> allow/deny
```

Примерные permissions:

- `users.manage`
- `catalog.manage`
- `production.manage`
- `distributor.stock.read`
- `distributor.sale.create`
- `courier.stock.load`
- `courier.sale.create`
- `courier.unload.create`
- `cash.withdraw`
- `discount.assign`
- `operation.correct`
- `audit.read`
- `reports.read`

Текущая policy может быть простой role-to-permissions map. Главное: не размазывать `if role === ...` по controllers, UI и handlers.

### 3. Actor model отделяет auth user от доменного исполнителя

Application handlers получают не raw BetterAuth user, а `Actor`:

```text
Actor
- userId
- role
- permissions
- displayName
```

Actor строится из BetterAuth session/user и policy registry.

### 4. Operation/audit model не один JSON на все

Вводим общий operation/audit envelope:

```text
Operation
- id
- type
- actorId
- idempotencyKey
- status
- createdAt
```

Для важных операций позже добавляем typed details:

- `SaleOperationDetails`
- `CourierLoadOperationDetails`
- `CourierUnloadOperationDetails`
- `ProductionBatchOperationDetails`
- `DistributorTransferOperationDetails`
- `CashWithdrawalOperationDetails`
- `DiscountAssignmentOperationDetails`
- `CorrectionOperationDetails`

В этом этапе можно создать только envelope/idempotency/audit baseline и описать pattern. Детали добавлять по мере реализации конкретных доменных команд.

### 5. Command handler convention

Критичные write operations должны идти через command handlers:

```text
validate input -> build Actor -> policy check -> transaction -> operation/audit -> projections -> response
```

Форма:

```text
execute(actor, command, idempotencyKey)
```

### 6. Read/write separation

- Controllers не читают Prisma напрямую для сложных read-path.
- Для write-path используются command handlers.
- Для read-path используются query services.
- На этом этапе достаточно заложить структуру, не строить все query services заранее.

## Предлагаемая структура API

Целевая структура может быть уточнена при реализации:

```text
apps/api/src/
  app.module.ts
  main.ts
  auth/
    auth.ts
    auth.module.ts или текущая integration wiring
    current-actor.ts
    actor.decorator.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
  policy/
    policy.module.ts
    permissions.ts
    roles.ts
    policy.registry.ts
    policy.guard.ts
    require-permission.decorator.ts
  common/
    errors/
      app-error.ts
      error-codes.ts
      http-error.mapper.ts
    primitives/
      money.ts
      quantity.ts
  operations/
    operations.module.ts
    operation.types.ts
    operation.service.ts
    idempotency.service.ts
  prisma/
    client.ts
  health/
```

Следующие доменные модули можно создать позже или оставить placeholder-less до соответствующего этапа:

```text
catalog/
production/
inventory/
sales/
courier/
cash/
reports/
audit/
```

Не создавать пустые модули без пользы, если они не участвуют в текущем этапе.

## Shared Package Plan

`packages/shared` должен содержать только runtime contracts/types, которые реально нужны API и web.

На этом этапе добавить:

- role constants;
- permission constants;
- shared error shape;
- basic health contract уже есть;
- money/quantity schema helpers, если используются и на web, и на API;
- command/response schemas только для реализуемых endpoints этого этапа.

Не добавлять:

- Prisma helpers;
- backend services;
- UI components;
- domain command handlers.

## Prisma Baseline Plan

Существующие BetterAuth models остаются совместимыми:

- `User`
- `Session`
- `Account`
- `Verification`

Нужно уточнить/добавить:

### User

Поля:

- `id`
- `name`
- `email`
- `emailVerified`
- `image`
- `role`
- `createdAt`
- `updatedAt`

Роль хранится в auth user table как текущее базовое решение. Если позже понадобится отдельная role assignment history, добавить отдельную доменную таблицу, но не усложнять до необходимости.

### Operation

Baseline fields:

- `id`
- `type`
- `status`
- `actorUserId`
- `idempotencyKey`
- `createdAt`
- `metadata` only for non-critical display/debug context, not as единственный source для критичных details.

### AuditLog

Baseline fields:

- `id`
- `operationId`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `createdAt`
- `details`

`details` допустим для audit display context, но критичные расчеты и отчеты не должны зависеть только от arbitrary JSON.

### IdempotencyRecord

Baseline fields:

- `id`
- `key`
- `actorUserId`
- `commandName`
- `operationId`
- `requestHash`
- `responseHash` или response snapshot, если нужно;
- `createdAt`
- `expiresAt`

Цель: защитить критичные write-команды от двойного выполнения.

### Balance Projections

На этом этапе не обязательно создавать все projections. Но нужно выбрать pattern:

- balance projections обновляются в той же transaction, что operation/details/audit;
- отрицательные остатки запрещаются на уровне command transaction;
- future tables для distributor/courier/product/cash balances должны проектироваться под conditional update.

## API Endpoints Этого Этапа

Минимально:

- `GET /health` public via `@AllowAnonymous()`;
- `GET /me` или `GET /auth/me` protected: вернуть current actor/session summary;
- admin/users endpoints, если входит в первый coding pass:
  - list users;
  - create user or invite/create technical user;
  - update role;
  - activate/deactivate.

Если admin user management окажется слишком большим для одного этапа, разрешено выделить его в отдельный следующий plan, но role/policy foundation должен быть готов в этом этапе.

## Frontend Scope Этого Этапа

Минимально:

- не строить финальный UI всех ролей;
- подготовить type-safe API access pattern;
- подготовить auth-aware app shell placeholder;
- показать current user/role;
- заложить mobile-first layout direction, если затрагивается web.

PWA/mobile foundation может быть отдельным следующим plan, если этот этап фокусируется на backend/domain core.

## Test Plan

### Unit

- money helper:
  - create/format/add/subtract;
  - no float rounding bugs.
- quantity helper:
  - positive values;
  - unit handling;
  - reject negative.
- policy registry:
  - admin has all baseline permissions;
  - director has expected baseline permissions;
  - courier does not get director/admin permissions;
  - future role addition is local.
- error mapper:
  - domain error -> stable HTTP response.

### Integration

Use real Postgres where DB behavior matters:

- Prisma schema migrates;
- BetterAuth session/user still works after model changes;
- protected endpoint rejects anonymous `401`;
- wrong role rejected `403`;
- allowed role accepted `200`;
- operation/idempotency baseline can create records transactionally;
- duplicate idempotency key does not create duplicate operation.

### Verification Commands

Required:

- `corepack pnpm lint`
- `corepack pnpm lint:boundaries`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm docs:check`
- `corepack pnpm audit`
- Prisma migration/generate command for API package

If API/web runtime changes:

- `corepack pnpm -r build`
- `corepack pnpm smoke`

## Документы, которые обновить после реализации

- `docs/ARCHITECTURE.md` — фактическая module map, operation model, data flow.
- `docs/SECURITY.md` — BetterAuth + policy layer + roles/permissions matrix.
- `docs/HANDLER-MAP.md` — новые API handlers.
- `docs/DEVELOPMENT.md` — новые commands/migration/test notes, если появились.
- `docs/TECH-STACK.md` — только если меняется dependency/stack decision.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — отметить фактический прогресс roadmap, если этап закрыт.

## Риски

### R1. Смешать auth roles и доменные permissions

Риск: начать использовать BetterAuth decorators как единственный источник бизнес-прав.

Mitigation:

- BetterAuth отвечает за identity/session.
- Domain permissions проверяются нашим policy layer.
- Tests должны проверять policy отдельно от HTTP decorators.

### R2. Сделать policy слишком универсальной заранее

Риск: построить permission engine сложнее, чем нужно.

Mitigation:

- начать с простой role-to-permissions map;
- не добавлять groups/scopes/conditions без реальной потребности;
- оставить extension points через context argument.

### R3. Сделать operation model через один JSON payload

Риск: быстро, но плохо для отчетов и инвариантов.

Mitigation:

- общий envelope + typed details для критичных операций;
- JSON допустим только как вспомогательный metadata/audit context.

### R4. Перегрузить первый этап admin UI

Риск: уйти в полноценную админку до domain core.

Mitigation:

- сделать минимально нужный user/role management;
- если UI разрастается, выделить отдельный этапный plan.

## Критерии завершения

Этап считается завершенным, когда:

- структура backend modules создана или явно зафиксировано, почему часть модулей отложена;
- BetterAuth session превращается в application Actor;
- policy layer заменяет spike-style role guard для новых protected routes;
- роли и permissions описаны в коде и тестах;
- Prisma baseline для operation/audit/idempotency создан или обоснованно разбит на подэтапы;
- shared contracts/error shape готовы для первого набора endpoints;
- тесты покрывают auth/policy/error/idempotency baseline;
- документация обновлена;
- verification commands из плана выполнены.

## Progress Log

### 2026-05-28 — Policy and operation baseline

Выполнено:

- добавлены shared roles, permissions, error shape, money/quantity helpers;
- BetterAuth user/session преобразуется в application `Actor`;
- spike-style `DirectorOnlyGuard` заменен на `PolicyRegistry`, `RequirePermission` и `PolicyGuard`;
- добавлен `GET /auth/me` для current actor summary;
- добавлены минимальные admin users handlers: список пользователей и изменение роли;
- добавлен Prisma baseline: `Operation`, `AuditLog`, `IdempotencyRecord`;
- добавлен `OperationService` с idempotency hash/retry/conflict behavior;
- добавлены unit tests для policy, auth/me, users controller, errors, idempotency и shared primitives;
- добавлен real Postgres integration test для operation/audit/idempotency transaction baseline;
- добавлен real Postgres integration test для users role update baseline;
- обновлены `ARCHITECTURE.md`, `SECURITY.md`, `HANDLER-MAP.md`, `DOMAIN-EVENTS.md`, `RELIABILITY.md`, `DEVELOPMENT.md`.

Проверки:

- `corepack pnpm lint` — passed;
- `corepack pnpm lint:boundaries` — passed;
- `corepack pnpm typecheck` — passed;
- `corepack pnpm test` — passed;
- `corepack pnpm docs:check` — passed;
- `corepack pnpm build` — passed;
- `corepack pnpm audit` — passed.

Notes:

- `corepack pnpm test` с real Postgres integration test требует поднятого `postgres` и примененных миграций.
- В sandbox Prisma/DB и Next/Turbopack проверки могут падать с `EPERM`; runbook обновлен с правилами повтора вне sandbox.

## Out Of Scope Follow-up Plans

После этого этапа вероятные следующие plans:

1. `mobile-pwa-foundation`
2. `admin-user-management`
3. `catalog-and-product-templates`
4. `production-flow`
5. `inventory-distributor-courier`
6. `sales-and-cash`
7. `reports-and-audit`
