# Director Cash Withdrawal Plan

Статус: `Completed`.
Дата: 2026-06-04.
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Director Cash Write-off`.

## Цель

Добавить рабочий контур списания наличных с распределителя Директором.

В терминах продукта это не расходный учет всех типов затрат и не финансовая аналитика, а простая операция:

- Директор видит наличный баланс распределителя;
- Директор списывает выбранную сумму наличных;
- комментарий можно оставить, но он не обязателен;
- система не разрешает списать больше доступного cash balance;
- списание попадает в operation/audit и сохраняет cash balance до/после.

## Технологическое Решение

Использовать существующую projection `DistributorCashBalance` и добавить отдельный typed fact для списания.

Решение:

- permission остается существующим: `cash.withdraw`;
- roles остаются существующими: `admin`, `director`;
- operation type: `distributor.cash.withdraw`;
- endpoint: `POST /distributor/cash-withdrawals`;
- отдельный options endpoint не нужен: для формы расширить существующий `GET /distributor/cash-balances`, добавив `active` в `DistributorCashBalanceItem`;
- frontend write-flow подключить во вкладке Директора `Распределитель`;
- если активный распределитель один, UI подставляет его по умолчанию;
- если активных распределителей несколько, UI дает выбрать распределитель из cash balance list;
- архивный распределитель с cash row остается видимым в read-only cash list, но не доступен для выбора в форме списания;
- после успешного списания инвалидировать `["distributor", "cash-balances"]` и директорские summary queries, если они не переиспользуют тот же query key;
- без WebSocket/SSE/offline queue.

Почему отдельная typed model:

- списание наличных должно быть самостоятельным проверяемым фактом, а не silent update cash balance;
- будущие отчеты смогут отличать cash sale, courier unload и director withdrawal;
- operation/audit сохраняют действие, а typed row хранит доменные поля операции.

## Scope

Входит:

- Prisma-модель `DistributorCashWithdrawal`.
- Migration:
  - таблица `distributor_cash_withdrawal`;
  - FK на `Distributor`, `Operation`, `User`;
  - indexes по `distributorId`, `actorUserId`, `createdAt`;
  - raw SQL check constraints для положительной суммы и лимита/trim комментария;
  - raw SQL check `distributor_cash_balance.amountCents >= 0`, если его еще нет.
- Shared contracts:
  - request списания;
  - response списания;
  - cash balance item/response переиспользуются из текущего distributor contract;
  - `DistributorCashBalanceItem` расширяется полем `active: boolean`, чтобы UI мог отличать активный распределитель от архивного read-only остатка.
- Backend:
  - `POST /distributor/cash-withdrawals`;
  - policy guard `cash.withdraw`;
  - service-level validation active distributor;
  - conditional decrement `amountCents >= amountCents`;
  - typed operation/audit.
- Frontend:
  - во вкладке Директора `Распределитель` добавить действие `Списать наличные`;
  - форма списания: распределитель, сумма, optional комментарий, operation summary;
  - если распределитель один, он выбран по умолчанию;
  - submit disabled offline, при нулевой/некорректной сумме, сумме сверх доступного баланса или отсутствии cash balance;
  - после успеха показать success notice `Наличные списаны` и обновить cash balance.
- Tests:
  - shared contract;
  - policy matrix;
  - controller validation;
  - real Postgres integration;
  - frontend flow Директора.
- Документация SoR по фактическому поведению.

## Out Of Scope

Не входит:

- списание наличных с курьера;
- учет категорий расходов;
- статьи затрат, кассовые ордера, файлы, чеки;
- обязательная причина списания;
- согласование списания вторым пользователем;
- отмена списания;
- корректировка ошибочного списания;
- отчеты по движению денег сверх audit/typed fact;
- отдельный admin UI для списания;
- offline queue/background sync;
- уведомления о списании.

Если нужно исправить ошибочное списание, это будет следующий этап корректировок через отдельную операцию, а не редактирование текущей записи.

## Доменная Модель

Новая модель:

```text
DistributorCashWithdrawal
- id
- distributorId
- amountCents
- comment nullable
- operationId unique
- actorUserId
- createdAt
```

Правила:

- `amountCents` обязателен и строго больше 0.
- `comment` optional, trim, максимум 500 символов.
- `distributorId` берется из request, но backend проверяет существование и активность распределителя.
- Списание возможно только с `DistributorCashBalance`.
- Если cash balance row отсутствует, доступный баланс считается `0`, и списание отклоняется.
- Списание сверх доступного cash balance запрещено.
- Архивный распределитель может отображаться в cash read model, если на нем остались наличные, но списание с него запрещено.
- Наличный баланс распределителя не может стать отрицательным ни через application logic, ни через DB constraint.
- История не переписывается: correction/cancel будет отдельной операцией в будущем этапе.

Планируемая транзакция:

1. Найти активный distributor.
2. Найти `DistributorCashBalance` по `distributorId`.
3. Выполнить conditional update:

```text
UPDATE distributor_cash_balance
SET amountCents = amountCents - input.amountCents
WHERE distributorId = input.distributorId
  AND amountCents >= input.amountCents
```

4. Если обновлена не 1 строка, вернуть domain error `DOMAIN_RULE_VIOLATION`.
5. Прочитать `cashBalanceAfter` после записи.
6. Посчитать `cashBalanceBefore = cashBalanceAfter.amountCents + input.amountCents`.
7. Создать `Operation` с type `distributor.cash.withdraw`.
8. Создать `DistributorCashWithdrawal`.
9. Создать `AuditLog` с before/after snapshot.

Важно: предварительный read cash balance можно использовать для сообщения об отсутствии строки, но нельзя использовать как источник `cashBalanceBefore` для audit. При двух параллельных списаниях оба запроса могут прочитать один и тот же before; достоверный before для audit считается только от результата после успешного conditional update.

## API И Contracts

Shared request:

```text
CreateDistributorCashWithdrawalRequest
- distributorId: string
- amountCents: positive integer
- comment?: string trim max 500
```

Shared response:

```text
DistributorCashWithdrawalResponse
- withdrawal
- cashBalance
```

Изменение существующего cash read model:

```text
DistributorCashBalanceItem
- distributorId
- distributorName
- active
- amountCents
- updatedAt nullable
```

`active` нужен не для скрытия archived cash rows, а для выбора в write-form: read-only список может показывать архивный распределитель с оставшимися наличными, но форма списания должна фильтровать selectable options по `active = true`.

`withdrawal`:

```text
- id
- distributorId
- amountCents
- comment nullable
- operationId
- actorUserId
- createdAt
```

Endpoint:

```text
POST /distributor/cash-withdrawals
```

Policy:

- controller guard: `@RequirePermission("cash.withdraw")`;
- admin разрешен как backend super-user;
- director разрешен как основной пользователь flow;
- commercial manager, distributor worker, courier, production manager запрещены.

Error cases:

- invalid payload -> `VALIDATION_ERROR`;
- distributor not found -> `NOT_FOUND`;
- inactive distributor -> `DOMAIN_RULE_VIOLATION`;
- amount greater than cash balance -> `DOMAIN_RULE_VIOLATION`;
- missing auth -> `UNAUTHENTICATED`;
- wrong role -> `FORBIDDEN`.

## Frontend Flow

Основной UI:

- вход через нижнюю вкладку Директора `Распределитель`;
- рядом с cash summary добавить компактное действие `Списать наличные`;
- по действию открывается форма в этом же feature-surface, без отдельной глобальной страницы.

Форма:

- заголовок: `Списать наличные`;
- распределитель:
  - если один доступный, выбрать автоматически;
  - если больше одного, показать select;
- сумма в рублях;
- комментарий optional;
- operation summary:
  - доступно;
  - будет списано;
  - остаток после списания;
- кнопка `Списать`.

Disabled states:

- offline;
- нет выбранного распределителя;
- cash balance = 0;
- сумма пустая, 0 или некорректная;
- сумма больше доступного cash balance;
- request pending.

После успеха:

- показать `Наличные списаны`;
- очистить сумму и комментарий;
- обновить cash balances;
- оставить пользователя на вкладке `Распределитель`, чтобы он видел новый баланс.

Admin UI:

- отдельный admin UI не добавлять в первом проходе;
- backend endpoint и tests должны покрывать admin permission.

## Затронутые Документы

Создать/обновить:

- `docs/exec-plans/active/2026-06-04-director-cash-withdrawal.md` - этот draft plan;
- `docs/DOCS-INDEX.md` - добавить active plan.

После реализации обновить:

- `docs/crm-requirements.md` - финальное правило списания наличных с распределителя;
- `docs/SECURITY.md` - уточнить `cash.withdraw` handler/scope;
- `docs/HANDLER-MAP.md` - новый handler;
- `docs/DOMAIN-EVENTS.md` - `distributor.cash.withdraw`;
- `docs/FRONTEND.md` - фактический UI списания;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` - progress после завершения.

## Затронутые Модули И Файлы

Ожидаемые изменения backend/shared:

- `apps/api/prisma/schema.prisma`;
- новая Prisma migration `*_director_cash_withdrawal`;
- `packages/shared/src/distributor.ts`;
- `packages/shared/src/index.test.ts`;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/src/distributor/distributor.service.ts`;
- `apps/api/src/distributor/distributor.controller.ts`;
- `apps/api/src/distributor/distributor.mapper.ts`;
- `apps/api/test/distributor-controller.test.ts`;
- `apps/api/test/distributor-sales-db.integration.test.ts` или отдельный `distributor-cash-withdrawal-db.integration.test.ts`;
- `apps/api/test/policy.test.ts`.

Ожидаемые изменения frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx`;
- возможно новый локальный компонент в `apps/web/src/features/distributor/*`;
- `apps/web/app/page.test.tsx`;
- `apps/web/app/globals.css`, только если текущих classes недостаточно.

## Implementation Steps

1. Добавить shared request/response schemas для cash withdrawal.
2. Расширить shared `DistributorCashBalanceItem` полем `active`.
3. Обновить mapper/read tests для `GET /distributor/cash-balances`, чтобы активность распределителя попадала в response.
4. Добавить Prisma model `DistributorCashWithdrawal`.
5. Добавить migration:
   - новая table;
   - raw SQL checks;
   - `distributor_cash_balance.amountCents >= 0`, если constraint отсутствует.
6. Добавить operation type `distributor.cash.withdraw`.
7. Реализовать mapper для withdrawal response.
8. Реализовать service method:
   - validation;
   - active distributor guard;
   - conditional cash decrement;
   - расчет audit before через `cashBalanceAfter + input.amountCents`;
   - operation/audit;
   - response cash balance after.
9. Добавить controller endpoint `POST /distributor/cash-withdrawals`.
10. Добавить controller tests.
11. Добавить real Postgres integration tests.
12. Добавить frontend api-client method.
13. Добавить UI action/form во вкладке Директора `Распределитель`.
14. Добавить frontend tests.
15. Обновить SoR-документы.
16. Запустить targeted verification.
17. Запустить full relevant verification.
18. После завершения закрыть plan в `docs/exec-plans/completed/`.

## Test Plan

Targeted tests:

- shared contract validation:
  - `distributorId` required;
  - `amountCents` positive integer;
  - `comment` optional;
  - `comment` trim/max length;
  - `DistributorCashBalanceItem` содержит `active`.
- policy matrix:
  - `cash.withdraw` есть у `admin` и `director`;
  - `commercial_manager`, `distributor_worker`, `production_manager`, `courier` не имеют `cash.withdraw`.
- controller tests:
  - валидирует body;
  - требует actor;
  - вызывает service с parsed payload;
  - wrong payload -> `VALIDATION_ERROR`.
- DB integration:
  - director списывает часть наличных с активного распределителя;
  - admin списывает часть наличных с активного распределителя;
  - comment optional: списание без комментария успешно;
  - comment trim сохраняется в typed row/audit;
  - списание сверх cash balance отклоняется;
  - списание при отсутствующей cash row отклоняется как недостаточный баланс;
  - inactive distributor с cash row остается видимым в `GET /distributor/cash-balances` как read-only row с `active=false`;
  - direct POST на inactive distributor отклоняется;
  - wrong actor не проходит policy/service;
  - operation/audit содержит cash balance before/after, где before рассчитан от after после successful conditional update;
  - concurrent withdrawals не уводят balance ниже 0.
- frontend tests:
  - Директор видит действие `Списать наличные` во вкладке `Распределитель`;
  - единственный распределитель выбран по умолчанию;
  - inactive distributor с cash row виден read-only, но не попадает в selectable options;
  - кнопка disabled при сумме сверх баланса;
  - optional comment не обязателен;
  - успешное списание отправляет `POST /distributor/cash-withdrawals`, показывает success notice и обновляет cash balance;
  - offline disables submit.

Full verification before completion:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm docs:check`;
- `pnpm audit`, если network/audit contour доступен.

Manual UI verification:

- открыть Директора на mobile viewport;
- перейти во вкладку `Распределитель`;
- убедиться, что cash balance виден;
- открыть `Списать наличные`;
- списать часть суммы без комментария;
- увидеть новый баланс и success notice;
- проверить disabled state для суммы сверх баланса;
- проверить, что форма не дает write при offline state;
- убедиться, что layout без horizontal overflow.

## Риски И Rollback

Риск: списание выглядит как финансовый расходный модуль, хотя это только кассовое уменьшение.

Mitigation: UI называть `Списать наличные`, не добавлять категории расходов и отчеты в этом этапе.

Rollback: скрыть frontend action, оставить backend tests/API до следующей итерации.

Риск: комментарий optional ухудшит диагностику.

Mitigation: audit всегда сохраняет actor, distributor, amount, before/after; комментарий сохраняется, если директор его оставил.

Rollback: сделать комментарий обязательным в следующем plan/update, если бизнес-проверка покажет потребность.

Риск: race condition при двух списаниях.

Mitigation: conditional decrement по `amountCents >= amountCents` внутри transaction и DB check `amountCents >= 0`.

Rollback: если concurrency test выявит проблему, запретить endpoint до исправления transaction logic.

Риск: в UI директор спишет не тот распределитель при будущем множестве распределителей.

Mitigation: при нескольких распределителях показывать явный select и operation summary с названием распределителя.

Rollback: временно разрешить flow только при одном активном распределителе.

## Критерии Завершения

Этап считается завершенным, когда:

- Prisma model и migration добавлены;
- `DistributorCashBalance.amountCents >= 0` защищен DB constraint;
- shared contracts покрывают request/response списания;
- `POST /distributor/cash-withdrawals` работает через `cash.withdraw`;
- списание выполняет conditional decrement и не допускает отрицательный cash balance;
- operation/audit пишутся с before/after cash balance;
- Директор может списать наличные во вкладке `Распределитель`;
- комментарий optional;
- единственный активный распределитель подставляется по умолчанию;
- документация обновлена по фактическому поведению;
- targeted и full relevant verification выполнены или причины пропуска явно зафиксированы;
- plan закрыт в `docs/exec-plans/completed/`.

## Решения По Вопросам Ревью

1. После успешного списания форма закрывается, пользователь остается во вкладке `Распределитель`, видит success notice и обновленный баланс.
2. История последних списаний не добавлена в этом этапе; она остается для будущего reports/audit этапа.
3. Permission остается `cash.withdraw`; operation type зафиксирован как `distributor.cash.withdraw`.

## Фактический Результат

Реализовано:

- добавлена Prisma-модель `DistributorCashWithdrawal` и migration `20260604110000_director_cash_withdrawal`;
- `DistributorCashBalanceItem` расширен полем `active`, чтобы UI мог отделять активные распределители от архивных read-only остатков;
- добавлен shared contract `CreateDistributorCashWithdrawalRequest` и response списания;
- добавлен API endpoint `POST /distributor/cash-withdrawals` под `cash.withdraw`;
- списание выполняется транзакционно через conditional decrement и DB check против отрицательного `DistributorCashBalance.amountCents`;
- `cashBalanceBefore` для audit считается от результата successful update: `cashBalanceAfter + amountCents`;
- inactive distributor с cash row остается в read model, но прямой POST на списание отклоняется;
- UI Директора во вкладке `Распределитель` получил форму `Списать наличные` с optional комментарием, summary и auto-select единственного активного распределителя;
- после успеха UI показывает `Наличные списаны`, закрывает форму и обновляет cash balance;
- SoR-документация обновлена в `crm-requirements`, `SECURITY`, `DOMAIN-EVENTS`, `HANDLER-MAP`, `FRONTEND` и v1 roadmap.

Дополнительно исправлена изоляция `notifications-db.integration.test.ts`: список задач производства глобальный, поэтому integration spec очищает production notifications перед каждым сценарием и не зависит от остатков после прерванных прогонов.

## Выполненная Верификация

- `pnpm --filter @buhta/api prisma:generate` - passed.
- `pnpm --filter @buhta/api prisma:deploy` - passed после запуска вне sandbox; migration применена к локальной Postgres БД.
- `pnpm --filter @buhta/shared test` - passed.
- `pnpm --filter @buhta/api exec vitest run test/distributor-controller.test.ts test/policy.test.ts` - passed.
- `pnpm --filter @buhta/api exec vitest run test/distributor-sales-db.integration.test.ts` - passed после запуска вне sandbox.
- `pnpm --filter @buhta/api exec vitest run test/notifications-db.integration.test.ts` - passed после исправления изоляции теста.
- `pnpm --filter @buhta/web test -- page.test.tsx` - passed.
- `pnpm --filter @buhta/web typecheck` - passed.
- `pnpm --filter @buhta/api typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm typecheck` - passed.
- `pnpm lint:boundaries` - passed.
- `pnpm test` - passed после запуска вне sandbox: API `22` files / `131` tests, web/shared `3` files / `41` tests.
- `pnpm docs:check` - passed после переноса плана в `completed`.

Manual UI verification не выполнялась: локальный frontend на `http://localhost:3001` в момент финальной проверки не отвечал (`curl` вернул `000`). Новый frontend flow покрыт автоматическим `apps/web/app/page.test.tsx`.
