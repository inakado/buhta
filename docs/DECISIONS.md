# DECISIONS

Короткий журнал архитектурных решений проекта «Бухта».

Статус: `Draft`. После scaffold источником истины становятся код, тесты и схемы; этот журнал фиксирует принятые решения и причины.

## DEC-01 — Базовый стек

Статус: `Accepted`

Решение:

- monorepo на `pnpm workspace`;
- `turbo` для orchestration, если структура будет `apps/web`, `apps/api`, `packages/shared`;
- `Next.js + React + TypeScript` для web;
- `NestJS + TypeScript` для backend;
- `PostgreSQL + Prisma` для хранения данных;
- `zod` для shared contracts и boundary validation;
- `@tanstack/react-query`, `Radix UI primitives`, `lucide-react`, `Tailwind CSS` для frontend;
- `vitest`, `supertest`, `@testing-library/react`, `jsdom` для тестов;
- `eslint`, `@typescript-eslint`, `eslint-plugin-boundaries` для качества и границ.

Причина:

- стек знакомый, зрелый и хорошо подходит для внутренней CRM;
- можно строить простую модульную систему без микросервисов;
- удобно переиспользовать contracts между API и web.

## DEC-02 — Docker dev-contour

Статус: `Accepted`

Решение:

- целевой запуск одной командой через Docker Compose;
- минимум сервисов: `postgres`, `api`, `web`;
- для повседневной разработки допустим гибрид: `postgres` в Docker, `api` и `web` на host через `pnpm`;
- полный `docker compose up --build` должен оставаться проверкой нового окружения.

Причина:

- Docker снижает расхождения окружений;
- host-run для web/api ускоряет hot reload;
- оба режима нужны: быстрый рабочий и полностью повторяемый.

## DEC-03 — Auth direction

Статус: `Accepted`

Решение:

- auth foundation строится на `BetterAuth` через `@thallesp/nestjs-better-auth`;
- spike `NestJS + Prisma + BetterAuth + роли Бухты` пройден;
- BetterAuth отвечает за identity, sessions, cookies, user management и базовые permissions;
- backend policy/guards и application services отвечают за доменные права и бизнес-инварианты.

Причина:

- стандартную auth-инфраструктуру лучше брать из зрелой библиотеки;
- критичные правила «Бухты» нельзя отдавать только frontend или auth-plugin;
- NestJS-интеграция BetterAuth должна быть проверена до того, как она станет фундаментом проекта.

Fallback:

- если spike показывает хрупкую интеграцию, используем auth-слой на NestJS с проверенными библиотеками, `argon2`, `httpOnly` cookies/JWT-сессиями и backend RBAC.

Проверка spike:

- `/api/auth/sign-up/email` создает пользователя с ролью по умолчанию `courier`;
- protected route без сессии возвращает `401`;
- courier-сессия на director-only route возвращает `403`;
- director-сессия на director-only route возвращает `200`.

## DEC-04 — Docs harness

Статус: `Accepted`

Решение:

- документация ведется вместе с кодом;
- будущая команда `pnpm docs:check` должна проверять ссылки, индекс, обязательные разделы и отсутствие старых проектных терминов;
- активные SoR-документы перечисляются в `docs/DOCS-INDEX.md`.

Причина:

- проект активно проектируется через документацию;
- без автоматической проверки документация быстро начнет расходиться с кодом;
- перенос документов из других проектов требует явной очистки.

## DEC-05 — Local Postgres port

Статус: `Accepted`

Решение:

- проектный Postgres в Docker публикуется на host port `5433`;
- внутри Docker Compose сервис остается доступен как `postgres:5432`;
- `DATABASE_URL` для host-run использует `localhost:5433`.

Причина:

- на машине владельца проекта уже может быть системный Postgres на `localhost:5432`;
- явный порт `5433` убирает конфликт между OrbStack container port publishing и локальным Postgres;
- внутри compose сохраняется стандартный порт Postgres.
