# DECISIONS

Короткий журнал архитектурных решений проекта «Бухта».

Статус: `Draft`. Решения ниже актуальны до появления кода; после scaffold источником истины становятся код, тесты и схемы.

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

Статус: `Accepted with spike`

Решение:

- предпочтительный кандидат — `BetterAuth`;
- перед финальным scaffold нужен technical spike `NestJS + Prisma + BetterAuth + роли Бухты`;
- BetterAuth отвечает за identity, sessions, cookies, user management и базовые permissions;
- backend policy/guards и application services отвечают за доменные права и бизнес-инварианты.

Причина:

- стандартную auth-инфраструктуру лучше брать из зрелой библиотеки;
- критичные правила «Бухты» нельзя отдавать только frontend или auth-plugin;
- NestJS-интеграция BetterAuth должна быть проверена до того, как она станет фундаментом проекта.

Fallback:

- если spike показывает хрупкую интеграцию, используем auth-слой на NestJS с проверенными библиотеками, `argon2`, `httpOnly` cookies/JWT-сессиями и backend RBAC.

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
