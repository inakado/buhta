# Tech Debt Tracker

Техдолг проекта «Бухта».

Статус: `Draft`.

Правило: сюда попадает только признанный техдолг после появления кода или harness.

## API Integration Test Isolation

- Дата фиксации: `2026-06-10`.
- Статус: `Open`.
- Область: `apps/api/test/*db.integration.test.ts`.
- Симптом: полный `pnpm --filter @buhta/api test` вне sandbox может быть нестабильным в общей локальной dev-БД: отдельные targeted integration tests проходят, но полный suite иногда ловит baseline drift по аналитике или конфликт уникального телефона клиента.
- Влияние: снижает надежность full-suite проверки перед коммитом; targeted API/controller tests и отдельные integration files остаются полезными.
- Нужно: изолировать integration tests по данным или схеме, убрать зависимость от общей baseline-сводки и сделать тестовые телефоны/ключи уникальными для каждого запуска.

## Prisma CLI DATABASE_URL Fail-Closed

- Дата фиксации: `2026-06-11`.
- Статус: `Open`.
- Область: `apps/api/prisma.config.ts`, `apps/api/package.json`.
- Симптом: `prisma.config.ts` использует local fallback `postgresql://buhta:buhta@localhost:5433/buhta`, а `prisma:deploy` вызывает `prisma migrate deploy`. Runtime guard приложения не покрывает Prisma CLI path.
- Влияние: при production/deploy запуске без `DATABASE_URL` Prisma CLI может целиться в локальную dev-БД вместо fail-fast. Это не внешний exploit, но плохое fail-open поведение для миграций.
- Нужно: сделать `DATABASE_URL` обязательным для `prisma migrate deploy` и оставить local fallback только для явно local-dev команд или убрать fallback полностью.

## API Production Runtime Bundling

- Дата фиксации: `2026-06-11`.
- Статус: `Open`.
- Область: `apps/api/Dockerfile`, `packages/shared/package.json`, API build/runtime.
- Симптом: production API image выполняет build-step, но runtime пока запускает `tsx src/main.ts`, потому что `@buhta/shared` экспортирует TS-исходники для dev-contour и compiled `dist/src/main.js` не может напрямую использовать текущий shared export contract.
- Влияние: production image больше и содержит dev runtime dependency `tsx`. Это приемлемо для первого закрытого MVP deploy, но не финальное production-hardening решение.
- Нужно: выбрать bundling/module-resolution подход для API runtime: например bundled server build, отдельные `dist` exports для shared с dev-friendly path strategy или другой явный runtime packaging contract.
