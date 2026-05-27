# Foundation Scaffold Plan

Статус: `Completed`
Дата: 2026-05-26
Источник: non-interactive `gstack-plan-eng-review` для старта разработки «Бухты».

## Цель

Подготовить минимальный технический foundation проекта перед первой доменной реализацией:

- monorepo на `pnpm workspace`;
- `apps/web`, `apps/api`, `packages/shared`;
- Docker Compose под локальную разработку через OrbStack;
- PostgreSQL;
- Prisma;
- минимальный Next.js web;
- минимальный NestJS API;
- docs/test/lint/typecheck harness;
- короткий BetterAuth spike в связке `NestJS + Prisma + роли Бухты`.

## Scope

Входит:

- workspace и базовые package scripts;
- базовая структура приложений и shared package;
- Docker Compose с `postgres`, `api`, `web`;
- `.env.example`;
- Prisma init и миграционный контур;
- health endpoint API;
- простая web-страница/route для проверки старта;
- `docs:check` в общем verification contour;
- lint/typecheck/test skeleton;
- BetterAuth spike с одной защищенной API-точкой и одной проверкой роли/permission;
- seed локальных ролей и тестовых пользователей, если auth spike выбран как рабочий.

Не входит:

- полноценная доменная схема БД;
- продажи, остатки, скидки, производство, курьерские операции;
- финальная UI-навигация;
- сложная матрица прав сверх минимальной проверки spike;
- production deploy;
- очереди, внешние кэши, object storage, платежи, интеграции.

## Step 0 — Scope Challenge

### Что уже решено

- Бизнес-требования: `docs/crm-requirements.md`.
- Инженерные принципы: `docs/ARCHITECTURE-PRINCIPLES.md`.
- Стек: `docs/TECH-STACK.md`.
- ADR-журнал: `docs/DECISIONS.md`.
- Dev runbook target: `docs/DEVELOPMENT.md`.
- Docs harness уже реализован: `pnpm docs:check`.

### Минимальный путь

Не начинать с полной CRM-схемы. Первый foundation должен доказать, что:

- приложения стартуют;
- база доступна;
- миграции работают;
- shared contracts импортируются web/api;
- auth-интеграция не ломает NestJS;
- проверки запускаются одной командой.

### Complexity check

Ожидаемо будет затронуто больше 8 файлов, потому что scaffold создает workspace, app packages, config и Docker. Это допустимо для foundation, но каждый файл должен быть инфраструктурно необходимым.

Ограничение:

- не добавлять доменные services/controllers/tables, пока не завершен BetterAuth spike;
- не вводить очередь, event bus, CQRS или worker;
- не строить универсальный permission engine до первой реальной матрицы операций.

## Engineering Review Findings

### Architecture

#### A1. Auth должен быть первым проверенным интеграционным риском

Severity: P1
Confidence: 8/10

Риск: если сразу построить API вокруг BetterAuth, а NestJS-интеграция окажется хрупкой, придется переделывать foundation.

Решение:

- сделать BetterAuth spike до доменной схемы;
- проверить session/cookie flow;
- проверить protected Nest controller;
- проверить одну роль и один permission;
- покрыть это integration test.

Fallback уже зафиксирован: Nest-owned auth с проверенными библиотеками.

#### A2. Одна граница auth ownership

Severity: P1
Confidence: 8/10

Риск: если Next.js и NestJS оба начнут владеть auth-решениями, появятся разные источники прав, разные session assumptions и трудные тесты.

Решение:

- выбрать один source of truth для identity/session после spike;
- frontend не принимает доменные решения о доступе;
- backend guards/policies проверяют операции.

#### A3. DB foundation без преждевременной доменной схемы

Severity: P2
Confidence: 8/10

Риск: ранняя схема остатков/операций зацементирует решения до обсуждения первой вертикальной доменной задачи.

Решение:

- на foundation этапе ограничиться Prisma setup, миграционным контуром, auth tables и техническим seed;
- доменную schema проектировать отдельным active plan.

#### A4. Docker Compose должен быть и быстрым, и полным

Severity: P2
Confidence: 7/10

Риск: если работает только полный container-run, hot reload будет медленным. Если работает только host-run, новый разработчик не поднимет окружение одной командой.

Решение:

- `postgres` всегда в Docker;
- `api`/`web` можно запускать на host;
- полный `docker compose up --build` остается обязательным smoke-контуром.

### Code Quality

#### C1. Shared package не должен стать свалкой

Severity: P2
Confidence: 7/10

Риск: `packages/shared` быстро превратится в общий мусорный пакет.

Решение:

- класть туда только runtime contracts, schemas, shared error codes и общие типы;
- не класть туда backend services, Prisma helpers или UI components;
- добавить boundary lint после появления app structure.

#### C2. Dependency policy должна быть частью scaffold

Severity: P2
Confidence: 8/10

Риск: старт со старыми версиями переносит уязвимости и будущую боль обновлений в первый день.

Решение:

- использовать последние стабильные версии на момент scaffold;
- зафиксировать package manager;
- держать lockfile;
- добавить audit в verification contour после появления полноценного workspace.

### Tests

#### T1. Foundation без тестов быстро станет хрупким

Severity: P1
Confidence: 8/10

Риск: база, auth, env и Docker ломаются чаще всего на стыках, а не в чистых функциях.

Решение:

- unit/test skeleton сразу;
- API integration test для health;
- integration test для auth spike;
- docs check в verification;
- smoke test после появления runnable web/api.

### Performance / Reliability

#### R1. Idempotency не нужна в foundation, но место под нее нужно не забыть

Severity: P3
Confidence: 7/10

Риск: если позже добавлять защиту от двойных продаж поверх неподходящего request/operation pattern, будет дорого.

Решение:

- в foundation не реализовывать idempotency;
- в архитектурном документе после scaffold отметить, что write commands для денег/товара должны получить idempotency key или эквивалентную защиту.

## Data Flow Sketch

Foundation target:

```text
developer
  |
  | pnpm / docker compose
  v
+------------------+       imports        +------------------+
| apps/web         | -------------------> | packages/shared  |
| Next.js          |                      | zod contracts    |
+--------+---------+                      +---------+--------+
         |                                          ^
         | HTTP                                     |
         v                                          | imports
+--------+---------+        Prisma        +---------+--------+
| apps/api         | -------------------> | PostgreSQL       |
| NestJS           |                      | Docker/OrbStack  |
+--------+---------+                      +------------------+
         |
         | session / role check
         v
  BetterAuth spike
```

Auth ownership decision:

```text
BetterAuth spike
  |
  +-- clean NestJS integration --> BetterAuth is default auth foundation
  |
  +-- brittle integration -------> fallback to Nest-owned auth layer
```

## Implementation Steps

1. Создать workspace structure:
   - `pnpm-workspace.yaml`;
   - root scripts;
   - `apps/web`;
   - `apps/api`;
   - `packages/shared`.

2. Зафиксировать runtime versions:
   - package manager;
   - Node version file или equivalent;
   - latest stable dependency install at scaffold time.

3. Поднять Docker Compose:
   - `postgres`;
   - env names;
   - healthcheck;
   - persistent volume;
   - OrbStack-compatible commands.

4. Настроить Prisma:
   - init in API package;
   - `DATABASE_URL`;
   - migration command;
   - generate command;
   - seed placeholder.

5. Настроить NestJS API:
   - health endpoint;
   - config/env validation;
   - test skeleton;
   - structured app errors placeholder.

6. Настроить Next.js web:
   - минимальная стартовая страница;
   - API base URL env;
   - React Query provider placeholder only if needed immediately.

7. Настроить shared package:
   - экспорт одного тестового zod contract;
   - импорт contract в API и web;
   - typecheck validates cross-package imports.

8. Провести BetterAuth spike:
   - минимальная конфигурация;
   - Prisma integration;
   - protected Nest route/controller;
   - current session retrieval in guard;
   - one role/permission check;
   - integration test.

9. Verification contour:
   - `pnpm docs:check`;
   - `pnpm lint`;
   - `pnpm typecheck`;
   - `pnpm test`;
   - `pnpm smoke` after web/api are runnable.

10. Обновить документы:
   - `docs/DEVELOPMENT.md` real commands;
   - `docs/ARCHITECTURE.md` actual folders/data flow;
   - `docs/SECURITY.md` chosen auth/session decision;
   - `docs/DECISIONS.md` if BetterAuth decision becomes final or fallback triggers.

## Test Plan

Minimum checks for foundation:

- `pnpm docs:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `docker compose up --build`
- API health returns OK
- web route loads
- Prisma migration/generate succeeds
- BetterAuth protected route rejects anonymous request
- BetterAuth protected route accepts seeded allowed user
- role/permission test rejects wrong role

Coverage target for this stage:

```text
CODE PATHS                                      CHECK
root scripts                                    docs/lint/typecheck/test run
Docker Compose                                  postgres healthcheck
API health                                      integration test
Prisma setup                                    migrate/generate command
shared contract                                 imported by API and web
BetterAuth guard                                anonymous / allowed / denied role
web boot                                        smoke route loads
```

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| BetterAuth/Nest integration is brittle | foundation rewrite | spike before domain implementation |
| Docker hot reload is slow | poor DX | support host-run for web/api |
| Shared package becomes too broad | coupling | restrict to contracts/errors/types |
| Prisma schema starts too domain-heavy | premature model lock-in | defer domain tables to next plan |
| Latest stable packages introduce breaking config | setup delay | lock versions and verify immediately |
| Docs drift after scaffold | stale guidance | `docs:check` in verification contour |

## Open Questions

1. Exact Node.js/current LTS version to pin at scaffold time: `24.14.0`.
2. Whether BetterAuth remains source of truth after spike: yes, accepted as current auth foundation.
3. Whether `turbo` is needed immediately or after first two apps exist: yes, included for workspace verification.
4. Exact local ports for `web`, `api`, `postgres`: `3001`, `3000`, `5433` on host.
5. Whether seed users should include all roles immediately or only auth-spike roles: only technical admin/director seed for now; domain users will be designed later.

## Completion Notes

- Workspace scaffold created: `apps/web`, `apps/api`, `packages/shared`.
- Docker Compose created for `postgres`, `api`, `web`.
- Project Postgres uses host port `5433` to avoid local `5432` conflicts.
- Prisma auth schema migrated with `init_auth`.
- BetterAuth spike passed on live API:
  - sign-up creates default `courier`;
  - anonymous protected route returns `401`;
  - wrong role returns `403`;
  - director role returns `200`.
- API/web smoke passed.
- Manual render check confirmed by owner.
- Dependency audit is clean after patched transitive overrides.

Verification completed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm docs:check`
- `pnpm -r build`
- `pnpm smoke`
- `pnpm audit`

## NOT In Scope For This Plan

- Domain sale/inventory/cash command handlers.
- Full Prisma domain schema.
- Final permission matrix implementation.
- Production deploy and CI/CD.
- UI design system.
- Multi-distributor behavior beyond keeping naming non-blocking.

## GSTACK REVIEW REPORT

STATUS: DONE_WITH_CONCERNS

Reason:

- Foundation direction is sound: boring stack, Docker/OrbStack, docs harness, tests-first posture.
- Main concern is auth ownership. BetterAuth should be tested before domain scaffold depends on it.
- Second concern is premature domain schema. The first scaffold should prove infrastructure and auth, not implement product operations.

Recommendation:

- Proceed with this foundation plan.
- Treat BetterAuth spike as the first real implementation checkpoint.
- Do not start production/sales/courier schema until auth/session/Prisma/Docker foundation is verified.

Evidence reviewed:

- `docs/crm-requirements.md`
- `docs/TECH-STACK.md`
- `docs/ARCHITECTURE-PRINCIPLES.md`
- `docs/DEVELOPMENT.md`
- `docs/DECISIONS.md`
- `docs/PLANS.md`
