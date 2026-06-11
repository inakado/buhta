# History And Sale Cancellation Hardening

Статус: `Completed`
Дата: `2026-06-10`
Дата завершения: `2026-06-10`

## 1. Цель

Закрыть первый UX hardening блок после frontend design migration: история операций должна догружать страницы без потери текущего контекста, а история продаж должна позволять найти и отменить продажу за пределами последних 10 строк.

## 2. Scope

- Append pagination для `OperationHistoryHome`.
- Paginated sales history для продаж с распределителя и курьера.
- Поиск продаж по клиенту или товару.
- Фильтр статуса `Все / Активные / Отмененные`.
- Отмена активной продажи из любой загруженной строки истории продаж.
- Обновление shared schemas, API client, tests and docs.

## 3. Out Of Scope

- Быстрые периоды `7/30/90`.
- Export, print and copy operation details.
- Частичные отмены, ручные корректировки балансов or editing original sale records.
- Новые аналитические отчеты.
- Новый visual language: используется текущий ledger/dialog standard.

## 4. Затронутые Модули

- `packages/shared/src/distributor.ts`
- `packages/shared/src/courier.ts`
- `apps/api/src/distributor/*`
- `apps/api/src/courier/*`
- `apps/web/src/features/operations/OperationHistoryHome.tsx`
- `apps/web/src/features/sales/*`
- `apps/web/src/lib/api-client.ts`
- `docs/FRONTEND.md`
- `docs/exec-plans/completed/2026-06-11-cross-role-ux-hardening.md`
- `docs/FRONTEND.md`

## 5. Реализация

1. Перевести историю операций на `useInfiniteQuery`: первая страница остается на месте, `Показать еще` добавляет строки ниже, смена фильтров сбрасывает список.
2. Ввести shared contract для sales history query/response: `limit`, `cursor`, `search`, `status`.
3. Добавить API endpoints `GET /distributor/sales/history` and `GET /courier/sales/history`.
4. Реализовать backend cursor pagination по `createdAt/id`, search по клиенту/телефону/товару and status filter by cancellation relation.
5. Перевести `SalesHistoryHome` from recent-only query to paginated history with search/status controls and `Показать еще`.
6. Сохранить текущую modal cancellation flow, but allow selecting any loaded active sale.
7. Обновить docs and mark completed hardening items.

## 6. Тестовый План

- Shared schema tests for new sales history responses.
- Targeted web tests where existing harness supports component behavior.
- `pnpm --filter @buhta/web test -- page.test.tsx`
- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/web lint`
- `pnpm --filter @buhta/api test` if available, otherwise targeted package checks/build.
- `pnpm docs:check`
- `pnpm -r build`

## 7. Риски И Rollback

- Cursor pagination must be stable when multiple sales share the same timestamp. Use `createdAt desc, id desc`.
- Courier history must keep role scoping: courier sees only own sales, elevated roles can see all courier sales if permitted by existing service policy.
- Cancellation invalidation must refresh history and balance queries.
- Rollback is safe by reverting the API endpoints and frontend query back to recent-only if contract issues appear.

## 8. Completion Notes

Implemented:

- `OperationHistoryHome` now uses `useInfiniteQuery`; `Показать еще` appends the next cursor page below existing rows.
- Operation history filters are stored in browser local storage and restored on return to the screen. Quick periods were intentionally not added.
- Added `GET /distributor/sales/history` and `GET /courier/sales/history` with cursor pagination, `search` and `status`.
- `SalesHistoryHome` now uses paginated history instead of recent-only lists, with search by client/phone/product, status filters and cancellation from any loaded active sale.
- Existing cancel modal behavior remains append-only and requires a reason.
- History/cancellation findings were closed and later folded into the active cross-role hardening plan / deferred roadmap split.

Final verification:

- `pnpm --filter @buhta/shared test` passed.
- `pnpm --filter @buhta/api exec vitest run test/distributor-controller.test.ts test/courier-controller.test.ts` passed.
- `pnpm --filter @buhta/web test -- page.test.tsx` passed.
- `pnpm --filter @buhta/web typecheck` passed.
- `pnpm --filter @buhta/api typecheck` passed.
- `pnpm --filter @buhta/web lint` passed.
- `pnpm --filter @buhta/api lint` passed.
- `pnpm docs:check` passed.
- `pnpm -r build` passed.
- `pnpm --filter @buhta/api exec prisma migrate status` passed outside sandbox: local Postgres `localhost:5433` is up to date with 16 migrations.
- `pnpm --filter @buhta/api exec vitest run test/analytics-db.integration.test.ts` passed outside sandbox.

Known verification caveat:

- `pnpm --filter @buhta/api test` is not deterministic in the shared local dev database: one outside-sandbox run passed, later outside-sandbox runs failed in unrelated existing integration tests (`analytics-db.integration.test.ts`, `clients-db.integration.test.ts`) with baseline/current-state drift and duplicate phone data. This is tracked as test harness tech debt, not as a regression in the history/cancellation hardening.
