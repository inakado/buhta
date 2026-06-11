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
- публичная самостоятельная регистрация через BetterAuth отключена; пользователей v1 создает только администратор через users API;
- backend policy/guards и application services отвечают за доменные права и бизнес-инварианты.

Причина:

- стандартную auth-инфраструктуру лучше брать из зрелой библиотеки;
- критичные правила «Бухты» нельзя отдавать только frontend или auth-plugin;
- NestJS-интеграция BetterAuth должна быть проверена до того, как она станет фундаментом проекта.

Fallback:

- если spike показывает хрупкую интеграцию, используем auth-слой на NestJS с проверенными библиотеками, `argon2`, `httpOnly` cookies/JWT-сессиями и backend RBAC.

Проверка spike:

- `/api/auth/sign-up/email` отклоняет самостоятельную регистрацию и не создает пользователя;
- protected route без сессии возвращает `401`;
- courier-сессия на test-only director-only route возвращает `403`;
- director-сессия на test-only director-only route возвращает `200`;
- диагностический `auth-spike` route не регистрируется в production `AppModule`.

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

## DEC-06 — Mobile-first PWA

Статус: `Accepted`

Решение:

- основная поверхность продукта — mobile-first PWA;
- ежедневные операционные сценарии проектируются сначала под телефон;
- компьютер и планшет используются преимущественно для аудита, статистики, отчетов и администрирования;
- интерфейс должен ощущаться как нативное приложение: быстрый доступ, app-like layout, понятные touch controls;
- полноценный offline-first режим не входит в v1;
- все операции, меняющие деньги, остатки, статусы или историю, выполняются только online.

Причина:

- большая часть пользователей будет работать с мобильных устройств;
- CRM используется ежедневно, поэтому скорость доступа и 2-3 касания до частого действия важнее desktop-плотности;
- offline writes для денег и остатков создают риск конфликтов и требуют отдельной синхронизационной модели;
- большой экран полезнее для аудита и аналитики, а не для базовых операций.

## DEC-07 — V1 Development Strategy

Статус: `Accepted`

Решение:

- v1 разрабатывается как цельный продукт до пользовательского тестирования;
- частичные production-релизы отдельных доменных slices пользователям до готовности полной v1 не планируются;
- разработка остается последовательной и основательной: роли/админка, mobile/PWA foundation, domain core, справочники, производство, продажи/курьер, отчеты/audit;
- после каждого крупного этапа обязателен инженерный checkpoint: автотесты, docs check, релевантный build/typecheck и ручная проверка UI владельцем проекта;
- admin user management делается рано, потому что администратор создает пользователей и назначает роли;
- права реализуются через единый policy layer, чтобы изменения ролей и разрешений были локальными и быстрыми;
- append-only операции проектируются как общий operation/audit envelope + typed details для важных доменных операций.

Причина:

- цель первой версии — не ранний частичный запуск, а цельная внутренняя CRM для первого пользовательского тестирования;
- деньги, остатки, роли и история действий требуют основательной сквозной реализации;
- при этом регулярные внутренние checkpoints не дают копить ошибки до конца разработки;
- typed operation details лучше подходят для отчетов, тестов и инвариантов, чем один универсальный JSON payload для всех операций.

## DEC-08 — BetterAuth admin plugin MVP risk acceptance

Статус: `Accepted Risk`

Решение:

- для MVP оставляем BetterAuth `admin()` plugin включенным;
- публичная самостоятельная регистрация BetterAuth остается отключенной;
- рабочий user-management flow CRM остается только через `/users`;
- риск отдельного `/api/auth/admin/*` control plane принимается как admin-only риск до production-hardening этапа;
- перед production-запуском нужно вернуться к этому решению и либо отключить/заблокировать HTTP admin endpoints BetterAuth, либо доказать тестами, что они не обходят CRM audit/lifecycle.

Причина:

- `/api/auth/admin/*` требует уже существующую admin-сессию и не дает anonymous или lower-role escalation;
- при компрометации admin account ущерб и так высокий, поэтому для MVP этот риск не блокирует следующий этап;
- при этом риск остается важным для audit integrity: BetterAuth admin endpoints могут выполнить user lifecycle действия вне `UsersService`, где сейчас находятся CRM audit records и self-guard правила.
