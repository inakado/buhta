# TECH-STACK

Выбранный базовый стек проекта «Бухта».

## 1. Общая структура

- `pnpm 11.x workspace` — пакетный менеджер и workspace-основа.
- `turbo` — orchestration для monorepo, если структура будет `apps/web`, `apps/api`, `packages/shared`.
- `TypeScript` — единый язык для web, API и shared contracts.
- Monorepo по умолчанию:
  - `apps/web` — frontend;
  - `apps/api` — backend;
  - `packages/shared` — общие runtime-контракты, схемы и типы.

## 2. Frontend

- `Next.js`
- `React`
- `PWA` как целевое поведение frontend-приложения.
- `@tanstack/react-query` для server-state.
- `Radix UI primitives` для доступных составных UI controls; пакеты `@radix-ui/react-*` добавляются точечно под конкретный primitive, а не как готовая visual library.
- `react-day-picker` для календарной сетки выбора дат; доступность и позиционирование оболочки остаются на Radix Popover, визуальная тема задается локальными CSS tokens.
- `lucide-react` для иконок.
- Директорская аналитика v1 строится без chart-библиотеки: одиночная динамика выручки реализуется локальным SVG line chart, остальные срезы остаются компактными KPI/read-only строками. Chart-зависимость добавлять только отдельным решением для multi-series interaction, tooltips или глубокого drill-down.
- `Tailwind CSS` для стилей.
- `@testing-library/react` и `jsdom` для component tests.

Frontend не является источником доменных правил. Он может помогать пользователю, но финальные проверки прав, остатков, денег, дисконтов и статусов выполняются на backend.

Базовая поверхность продукта — mobile-first PWA. Desktop/tablet используются в основном для аудита, статистики, отчетов и администрирования.

PWA в v1 не означает offline-first. Критичные write-операции выполняются только online, чтобы не создавать конфликты остатков, денег и истории действий.

## 3. Backend

- `NestJS`
- `PostgreSQL`
- `Prisma`
- `zod` для shared contracts и boundary validation.
- `helmet` для базовых HTTP security headers.
- `cookie-parser`, если выбранный auth-flow использует cookies на стороне NestJS.

Backend является источником доменных операций, прав и транзакционных инвариантов.

## 4. Auth

Выбранное направление после technical spike — `BetterAuth` в связке `NestJS + Prisma`.

Spike подтвердил:

- `@thallesp/nestjs-better-auth` подключает BetterAuth в NestJS на `/api/auth`;
- email/password sign-up и sign-in работают через BetterAuth;
- BetterAuth username plugin добавляет sign-in по `username + password`;
- session cookie доступна backend guard-слою;
- backend route может различать anonymous, wrong role и allowed role;
- роль пользователя хранится в auth user table как дополнительное поле.

После уточнения пользовательского сценария целевой v1 auth-flow меняется на admin-managed login/password:

- пользователи не проходят самостоятельную регистрацию;
- администратор создает пользователя, назначает роль, генерирует логин и временный пароль;
- сотрудник входит по логину и паролю;
- email не является обязательным пользовательским идентификатором в CRM UI.

Техническое решение: BetterAuth username plugin в связке `NestJS + Prisma + @thallesp/nestjs-better-auth`.

BetterAuth продолжает требовать email на уровне таблицы, поэтому API создает внутренний технический email из логина: `login@internal.buhta.local`. Это поле остается техническим компромиссом, не показывается пользователю и не является бизнес-идентификатором.

Для admin-managed user lifecycle используется BetterAuth admin API:

- создание пользователя с password credential;
- username/displayUsername как login;
- role как CRM-specific user field;
- сброс пароля через admin set-user-password API с текущей admin session;
- fallback для seed/legacy users без password credential: reset создает credential с новым временным паролем.

Ожидаемая зона ответственности:

- `BetterAuth` отвечает за identity, sessions, cookies, user management и базовые permissions.
- Backend policy/guards и application services отвечают за доменные права: продажи, скидки, списания, выпуск продукции, загрузку и сгрузку курьера.

Fallback остается запасным вариантом, если при развитии доменной модели интеграция окажется хрупкой:

- auth-слой на `NestJS` с проверенными библиотеками;
- `argon2` для паролей;
- `httpOnly` cookies / JWT-сессии;
- guards и RBAC на backend.

Самописную auth-инфраструктуру не строить без явной причины.

## 5. Тесты и качество

- `vitest` для unit/service tests.
- `supertest` для API integration tests.
- `@testing-library/react` и `jsdom` для frontend component tests.
- `eslint`, `@typescript-eslint`, `eslint-plugin-boundaries` для статических проверок и границ модулей.
- `docs:check`: links, index, status и запрет старых терминов.

Frontend verification после появления PWA-контура должен включать mobile viewport checks, PWA manifest/installability checks и smoke основных mobile flows.

## 5.1 Dependency policy

- Для новых пакетов использовать последние стабильные версии.
- Не использовать устаревшие версии только ради привычки или копирования из старого проекта.
- Lockfile обязателен; обновления зависимостей должны проходить через тесты и релевантные проверки.
- Known high/critical vulnerability нельзя оставлять без явного решения: обновление, mitigation или временное исключение с причиной.
- Dependency audit входит в verification contour.
- Настройки pnpm, кроме registry/auth, хранятся в `pnpm-workspace.yaml`.
- Dependency overrides используются точечно для security fixes.
- Build scripts зависимостей разрешаются явно через `allowBuilds`; не включать глобальный режим запуска всех scripts.

Критичные доменные сценарии должны иметь тесты: деньги, остатки, права, история действий, скидки, наличные/безналичные продажи.

## 6. Docker для разработки

Цель — запуск локального окружения одной командой через Docker Compose.

Основное локальное Docker-окружение владельца проекта — `OrbStack`. Команды должны оставаться совместимыми с обычным Docker Compose, но runbook и troubleshooting должны учитывать OrbStack как основной dev runtime.

Минимальный dev-contour:

- `postgres`;
- `api`;
- `web`.

Локальный `postgres` публикуется на `localhost:5433`, чтобы не конфликтовать с возможным системным Postgres на `localhost:5432`. Внутри Docker Compose API подключается к `postgres:5432`.

Дополнительно после появления приложения:

- отдельная команда или compose service для миграций Prisma;
- seed для локальных ролей и тестовых пользователей;
- healthchecks для `postgres`, `api`, `web`;
- единый runbook в `docs/DEVELOPMENT.md`.

Docker Compose должен помогать разработке и онбордингу, но не заменять обычные быстрые команды проверки. Локально должны оставаться доступны `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm docs:check`.

В dev-режиме допустим гибрид:

- инфраструктура (`postgres`) работает в Docker;
- `web` и `api` можно запускать на host для скорости hot reload;
- полный `docker compose up` должен оставаться рабочим вариантом для проверки “как у нового разработчика”.
