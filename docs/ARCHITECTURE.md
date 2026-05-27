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

## 3. Что пока не фиксируем

Пока не фиксировать преждевременно:

- окончательный список backend-модулей;
- структуру таблиц;
- структуру API routes;
- форму UI-навигации;
- модель permissions сверх уже описанных ролей и открытых решений.

## 4. Когда заполнять

Расширять после появления первых доменных операций: продажи, выпуск продукции, загрузка/сгрузка курьера, списание наличных и заранее назначенный дисконт.
