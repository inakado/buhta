# ARCHITECTURE

Рабочая карта архитектуры проекта «Бухта».

Статус: `Draft`. Foundation scaffold создан; документ фиксирует текущую техническую карту, но не заменяет `docs/crm-requirements.md`, `docs/ARCHITECTURE-PRINCIPLES.md` и `docs/TECH-STACK.md`.

## 1. Назначение

Этот документ нужен, чтобы после scaffold приложения фиксировать:

- границы backend-модулей;
- основные потоки данных;
- владельцев доменных операций;
- точки интеграции между `web`, `api`, `shared`, БД и auth;
- принятые технические tradeoffs.

## 2. Что уже принято

- Базовый стек описан в `docs/TECH-STACK.md`.
- Инженерные принципы описаны в `docs/ARCHITECTURE-PRINCIPLES.md`.
- Бизнес-логика и роли описаны в `docs/crm-requirements.md`.
- Текущая структура:
  - `apps/web` — Next.js frontend;
  - `apps/api` — NestJS backend;
  - `packages/shared` — общие runtime constants/contracts;
  - `apps/api/prisma` — Prisma schema, migrations и seed.
- Auth foundation:
  - BetterAuth подключен в NestJS на `/api/auth`;
  - auth tables живут в PostgreSQL через Prisma;
  - backend guards отвечают за доменные роли и доступ к операциям.
- Foundation data flow:

```text
apps/web
  -> HTTP API
apps/api
  -> imports packages/shared
  -> BetterAuth sessions/cookies
  -> Prisma
PostgreSQL
```

## 3. V1 Implementation Strategy

v1 реализуется как цельный продукт до пользовательского тестирования. Это не означает, что проверки откладываются до конца: каждый крупный этап должен закрываться инженерным checkpoint.

Обязательный checkpoint этапа:

- targeted unit/integration tests;
- real Postgres integration tests для операций с деньгами, остатками и историей;
- `docs:check`;
- релевантные `lint`, `typecheck`, `test`, `build`;
- ручная проверка UI владельцем проекта для готовых flow.

Admin user management реализуется рано, потому что администратор создает пользователей и назначает роли.

Mobile/PWA foundation реализуется рано, а не в конце: app shell, role home screens, mobile navigation, PWA manifest и explicit offline write blocking должны формировать UX-каркас до полной реализации отчетов.

## 4. Operations And Audit Model

Критичные доменные действия проектируются как append-only операции.

Базовый принцип:

- `Operation`/audit envelope фиксирует общий факт: id, тип операции, actor, время, idempotency key, источник и статус;
- typed operation details фиксируют доменные поля конкретного действия;
- balance projections обновляются в той же transaction, что и operation/details/audit records;
- read models/query services читают надежные projections или факты операций, а не UI-state.

Typed details нужны минимум для:

- продажи;
- загрузки курьера;
- сгрузки курьера;
- выпуска продукции;
- перемещения на распределитель;
- списания наличных;
- назначения дисконта;
- корректировки/отмены.

Не использовать один универсальный JSON payload как единственное место хранения деталей критичных операций, если эти детали нужны для отчетов, тестов, связей и доменных инвариантов.

## 5. Что пока не фиксируем

Пока не фиксировать преждевременно:

- окончательный список backend-модулей;
- структуру таблиц;
- структуру API routes;
- финальную форму UI-навигации сверх mobile-first/PWA направления;
- модель permissions сверх уже описанных ролей и открытых решений.

## 6. Когда заполнять

Расширять после появления первых доменных операций: продажи, выпуск продукции, загрузка/сгрузка курьера, списание наличных и заранее назначенный дисконт.
