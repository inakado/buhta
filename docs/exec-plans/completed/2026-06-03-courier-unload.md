# Courier Unload Plan

Статус: `Completed`.
Дата: 2026-06-03.
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Courier Unload`.

## Цель

Добавить операцию сгрузки курьера: курьер одной транзакционной операцией возвращает товарный остаток и/или накопленные наличные на выбранный активный распределитель.

После этапа курьер должен уметь:

- открыть реальный flow `Сгрузить` с главного экрана роли;
- видеть свои текущие товарные строки и наличные перед сгрузкой;
- по умолчанию подготовить сгрузку всего доступного товара и всех наличных;
- уменьшить количество по одной или нескольким товарным строкам, если нужна частичная сгрузка;
- выполнить cash-only сгрузку, если товара нет, но наличные есть;
- выбрать распределитель, при этом единственный активный распределитель подставляется по умолчанию;
- получить понятную ошибку, если пытается сгрузить больше товара или наличных, чем есть на его балансе.

Backend должен выполнить сгрузку атомарно:

```text
validate -> policy -> resolve courier scope -> validate distributor -> conditional courier stock/cash decrement -> distributor stock/cash increment -> operation/audit -> response
```

## Почему Этот Этап Следующий

Текущий код уже реализует:

- товарный баланс распределителя;
- наличный баланс распределителя;
- загрузку продукции курьером с распределителя;
- товарный баланс курьера;
- продажу курьером;
- наличный баланс курьера.

Без сгрузки курьерский цикл не замкнут: наличные от courier cash sales остаются у курьера, а непроданный товар нельзя вернуть на распределитель. Поэтому `Courier Unload` должен идти перед уведомлениями, списаниями наличных, дисконтом, корректировками и отчетами.

## Зафиксированные Ответы Перед Планом

1. Сгрузка должна поддерживать несколько товарных строк в одной операции.
2. По умолчанию UI подставляет все доступные остатки и все наличные, но пользователь может выполнить частичную сгрузку.
3. Cash-only сгрузка разрешена: если товара нет, но у курьера есть наличные, он может вернуть только деньги.
4. Распределитель выбирается в форме. Если активный распределитель один, он подставляется по умолчанию.
5. Следующий этап подтвержден как `Courier Unload`.
6. Отдельный admin options endpoint не нужен до появления admin UI; admin backend-flow достаточно покрыть create-command tests.
7. После successful unload UI возвращает курьера на home и показывает global success notice.
8. Для первого прохода quantity `0` означает "не сгружать строку"; отдельный toggle не нужен.
9. Комментарий остается optional, как в sale/load. Частичная сгрузка не требует обязательного комментария.

Постоянные бизнес-правила этапа после реализации зафиксированы в `docs/crm-requirements.md`.

## Фактический Результат

Реализована транзакционная сгрузка курьера:

- курьер может сгрузить несколько товарных строк и/или наличные на активный распределитель;
- `CourierUnloadItem` хранит `courierProductBalanceId` и `distributorProductBalanceId`;
- DB migration добавляет typed fact tables и raw SQL check constraints для денежных и количественных полей;
- `GET /courier/unload-options` работает как courier self-flow;
- `POST /courier/unloads` поддерживает courier self-flow и admin backend-flow с явным `courierUserId`;
- backend защищает owner scope, active distributor, over-unload и concurrent double-spend conditional updates;
- audit snapshot фиксирует product/cash before/after и affected balance rows;
- courier UI получил action tile `Сгрузить`, default full unload, partial quantities, cash-only/product-only cases, optional comment и возврат на home после успеха.

## Scope

Входит:

- Prisma-модели typed fact для сгрузки курьера:
  - `CourierUnload`;
- `CourierUnloadItem` для нескольких товарных строк.
- Shared contracts в `packages/shared/src/courier.ts`:
  - options для формы сгрузки;
  - request сгрузки;
  - response сгрузки;
  - typed item факта сгрузки, если он нужен API/UI.
- Backend API:
  - `GET /courier/unload-options`;
  - `POST /courier/unloads`.
- Backend service logic в `CourierService`:
  - курьер сгружает только собственный баланс;
  - admin может backend-вызовом сгрузить за конкретного курьера с обязательным `courierUserId`;
  - обычный курьер не может передать `courierUserId`;
  - распределитель должен существовать и быть активным;
  - в request должна быть хотя бы одна ненулевая товарная строка или положительная сумма наличных;
  - товарные строки списываются conditional updates без ухода в минус;
  - cash списывается conditional update `amountCents >= cashAmountCents`;
  - распределительские товарные балансы увеличиваются через upsert по `distributorId + productBatchId`;
  - распределительский cash balance увеличивается только если `cashAmountCents > 0`;
  - operation и audit пишутся в той же transaction.
- Permission:
  - использовать существующий `courier.unload.create`;
  - сохранить role matrix: `admin`, `courier`.
- Frontend:
  - добавить реальную action tile `Сгрузить` на courier home только после появления backend flow;
  - добавить `CourierUnloadHome` как feature-компонент, а не как часть role home;
  - добавить routing/tab entry в `RoleHomeRouter` и bottom-nav rules без disabled placeholders;
  - форма должна показывать распределитель, товарные строки, наличные, итог и submit;
  - единственный активный распределитель выбирается автоматически;
  - все write-действия disabled при offline.
- Tests:
  - shared contract tests;
  - backend controller/service/integration tests на real Postgres;
  - policy tests;
  - frontend component tests для courier unload flow.
- Документация:
  - обновить профильные SoR-документы по фактической реализации;
  - добавить handler map строки только после появления handlers;
  - обновить roadmap после завершения этапа.

## Out Of Scope

Не входит:

- уведомления производству;
- списание наличных директором с распределителя;
- назначение дисконта;
- отмена или корректировка продаж;
- корректировка сгрузки;
- отчеты и audit UI;
- отдельный admin UI для сгрузки за курьера;
- автоматическая сгрузка при окончании смены;
- несколько денежных кошельков внутри одного курьера;
- offline queue, background sync и локально успешные write-операции;
- изменение правил courier sale/load, кроме query invalidation после сгрузки.

## Доменные Решения Этапа

### 1. Сгрузка как одна операция

Сгрузка является одним command/fact, даже если внутри возвращается несколько товарных строк.

Минимальная структура операции:

- выбранный распределитель;
- курьер;
- список товарных строк;
- сумма наличных;
- комментарий;
- actor;
- дата создания;
- operation/audit.

Если товарных строк несколько, все изменения должны пройти в одной transaction. Если хотя бы одна строка не проходит проверку остатка, вся операция откатывается.

### 2. Товарные строки

Request должен принимать массив товарных строк вида:

```text
items: [
  {
    courierProductBalanceId,
    quantity
  }
]
```

Backend по `courierProductBalanceId` сам определяет:

- владельца баланса;
- `productBatchId`;
- текущую цену партии;
- текущее доступное количество.

Frontend не передает `productBatchId`, цену, название товара или итоговую стоимость как источник истины для записи. Эти значения можно показывать как preview, но backend пересчитывает их сам.

Правила:

- `quantity` в каждой строке должен быть целым положительным числом;
- нулевые строки в request не отправлять;
- дубли одного `courierProductBalanceId` запрещены на boundary validation;
- строка должна принадлежать целевому курьеру;
- нельзя сгрузить больше доступного `CourierProductBalance.quantity`;
- после успешной сгрузки строки с нулевым остатком остаются в projection table, но read model скрывает нулевые строки, как сейчас.

### 3. Наличные

Request содержит:

```text
cashAmountCents
```

Правила:

- `cashAmountCents` должен быть целым неотрицательным числом;
- cash-only сгрузка разрешена, если `cashAmountCents > 0`;
- если `cashAmountCents = 0`, в request должна быть хотя бы одна товарная строка;
- нельзя сгрузить больше, чем текущий `CourierCashBalance.amountCents`;
- если cash row у курьера отсутствует, доступный cash считается `0`;
- `DistributorCashBalance` увеличивается только на фактически сгружаемую cash-сумму;
- `CourierCashBalance` уменьшается только на фактически сгружаемую cash-сумму;
- cash audit before/after должен опираться на результат conditional update, а не на предварительный read как источник истины.

### 4. Распределитель

Options endpoint возвращает активные распределители и баланс курьера.

Правила UI:

- если активный распределитель один, он выбран по умолчанию;
- если активных распределителей несколько, пользователь выбирает явно;
- если активных распределителей нет, submit невозможен, UI показывает понятную ошибку.

Правила backend:

- `distributorId` обязателен в create request;
- распределитель должен существовать;
- распределитель должен быть `active=true`;
- сгрузка на неактивный распределитель отклоняется.

### 5. Scope курьера и admin backend flow

Основной пользовательский сценарий:

1. Курьер открывает `Сгрузить`.
2. Backend возвращает только его собственные товарные и cash balances.
3. Курьер выбирает распределитель.
4. Форма по умолчанию подставляет весь товар и все наличные.
5. Курьер может уменьшить количество по строкам или убрать строку из сгрузки.
6. Курьер подтверждает операцию.

Правила:

- `actor.role === "courier"`: целевой курьер всегда `actor.userId`;
- курьеру запрещено передавать `courierUserId`;
- `actor.role === "admin"`: `courierUserId` обязателен для create request;
- отдельный admin UI не входит в этап;
- `commercial_manager` и `director` могут читать courier balances, но не создают unload.

## Prisma / Database Plan

Добавить модели:

```text
CourierUnload
```

Поля:

- `id`;
- `courierUserId`;
- `distributorId`;
- `cashAmountCents`;
- `comment`;
- `operationId`;
- `actorUserId`;
- `createdAt`;
- relations to `User`, `Distributor`, `Operation`;
- relation `items`.

```text
CourierUnloadItem
```

Поля:

- `id`;
- `courierUnloadId`;
- `courierProductBalanceId`;
- `distributorProductBalanceId`;
- `productBatchId`;
- `quantity`;
- `unitPriceCents`;
- `stockValueCents`;
- relations to `CourierUnload`, `CourierProductBalance`, `DistributorProductBalance`, `ProductBatch`.

`distributorProductBalanceId` обязателен: typed fact должен хранить конкретную строку распределителя, которую увеличила сгрузка после upsert. Это нужно для audit, будущих корректировок и расследования расхождений, даже если текущая projection уникальна по `distributorId + productBatchId`.

Нужные constraints и индексы:

- positive quantity для item;
- non-negative `cashAmountCents`;
- non-negative `unitPriceCents`;
- non-negative `stockValueCents`;
- unique pair `courierUnloadId + courierProductBalanceId`, чтобы один balance row не попал в unload дважды;
- indexes по `courierUserId`, `distributorId`, `actorUserId`, `createdAt`, `productBatchId`, `distributorProductBalanceId`.

Важно: Prisma schema сама не выражает все нужные check constraints. Для денежных и товарных инвариантов этого этапа migration должна добавить raw SQL checks минимум для:

- `courier_unload.cash_amount_cents >= 0`;
- `courier_unload_item.quantity > 0`;
- `courier_unload_item.unit_price_cents >= 0`;
- `courier_unload_item.stock_value_cents >= 0`.

Shared/backend validation остается обязательной boundary-защитой, но DB checks должны страховать прямые записи и ошибки application layer.

Обновить existing relations:

- `User.courierUnloads`;
- `Distributor.courierUnloads`;
- `Operation.courierUnloads`;
- `CourierProductBalance.unloadItems`;
- `DistributorProductBalance.unloadItems`;
- `ProductBatch.courierUnloadItems`.

## Shared Contracts Plan

Добавить в `packages/shared/src/courier.ts`.

Options response:

```text
CourierUnloadOptionsResponse {
  distributors: ActiveDistributorOption[]
  productItems: CourierUnloadProductOption[]
  cashBalance: CourierCashBalanceItem
}
```

`ActiveDistributorOption`:

- `distributorId`;
- `distributorName`.

`CourierUnloadProductOption`:

- `courierProductBalanceId`;
- `productBatchId`;
- `productName`;
- `unitPriceCents`;
- `availableQuantity`;
- `stockValueCents`;
- `updatedAt`.

Create request:

```text
CreateCourierUnloadRequest {
  distributorId: string
  items: Array<{
    courierProductBalanceId: string
    quantity: positive integer
  }>
  cashAmountCents: non-negative integer
  courierUserId?: string
  comment?: string
}
```

Validation rules:

- `distributorId` не пустой;
- `items` может быть пустым только если `cashAmountCents > 0`;
- `cashAmountCents` может быть `0`;
- каждый item quantity positive integer;
- duplicate `courierProductBalanceId` запрещен;
- comment trim/max 500, как в sale/load.

Response:

```text
CourierUnloadResponse {
  unload: CourierUnload
  items: CourierUnloadItem[]
  courierProductBalances: CourierProductBalanceItem[]
  courierCashBalance: CourierCashBalanceItem
  distributorProductBalances: DistributorInventoryItem[]
  distributorCashBalance: DistributorCashBalanceItem
}
```

Если reuse `DistributorInventoryItem` или `DistributorCashBalanceItem` создает циклический или неудобный импорт, добавить узкие balance-after schemas в `courier.ts`, как уже сделано для `CourierLoadResponse`.

## API / Backend Plan

### `GET /courier/unload-options`

Permission: `courier.unload.create`.

Назначение:

- вернуть активные распределители;
- вернуть товарные строки курьера;
- вернуть cash balance курьера;
- дать frontend достаточно данных, чтобы выставить default unload values.

Scope:

- courier видит только свой баланс;
- admin может читать options для всех курьеров только если endpoint получит явный query `courierUserId` или если будет отдельный backend-only branch. Для первого прохода можно ограничить публичный UI-сценарий courier-only и оставить admin create backend-flow покрытым service tests.

Решение для review:

- предпочтительный вариант: `GET /courier/unload-options` в v1 UI работает для courier self-flow. Admin backend-flow проверяется на `POST /courier/unloads`, но отдельный admin options endpoint не нужен до admin UI.

### `POST /courier/unloads`

Permission: `courier.unload.create`.

Транзакционный алгоритм:

1. Определить `targetCourierUserId`:
   - courier -> `actor.userId`, `input.courierUserId` запрещен;
   - admin -> `input.courierUserId` обязателен.
2. Проверить, что target user существует и имеет role `courier`.
3. Проверить, что `distributorId` существует и distributor active.
4. Нормализовать input:
   - убрать неотправленные нулевые строки на frontend;
   - на backend валидировать, что нет duplicate balance ids;
   - проверить, что есть хотя бы item или cash.
5. Для каждой товарной строки:
   - загрузить `CourierProductBalance` с `ProductBatch`;
   - проверить ownership target courier;
   - выполнить conditional decrement by `id + courierUserId + quantity >= input.quantity`;
   - если update count != 1, выбросить domain error и откатить transaction;
   - прочитать balance after;
   - upsert/increment `DistributorProductBalance` по `distributorId + productBatchId`;
   - сохранить `distributorProductBalanceId` результата upsert в `CourierUnloadItem`;
   - посчитать `stockBalanceBefore = stockBalanceAfter + quantity`;
   - посчитать distributor balance before/after от результата upsert.
6. Если `cashAmountCents > 0`:
   - conditional decrement `CourierCashBalance` по `courierUserId + amountCents >= cashAmountCents`;
   - если update count != 1, выбросить domain error и откатить transaction;
   - прочитать courier cash after;
   - upsert/increment `DistributorCashBalance`;
   - before/after считать от результатов записей.
7. Если `cashAmountCents = 0`:
   - courier cash before/after равны текущему cash или `0`;
   - distributor cash before/after можно вернуть текущим значением или `0`, без создания cash row.
8. Создать `Operation` type `courier.unload.create`.
9. Создать `CourierUnload`.
10. Создать `CourierUnloadItem[]`.
11. Создать один `AuditLog` с entity `courier_unload` и полным snapshot:
    - courier;
    - distributor;
    - items, включая `courierProductBalanceId`, `distributorProductBalanceId`, `productBatchId`, quantity, unit price и stock value;
    - cash before/after;
    - distributor balances before/after;
    - comment.
12. Вернуть typed response с измененными balance rows.

## Frontend Plan

Перед реализацией frontend обязательно заново сверить `docs/FRONTEND.md` и текущие role-screen conventions.

Правила:

- не добавлять плитку `Сгрузить` до рабочего backend flow;
- не показывать disabled action tile как placeholder;
- `CourierUnloadHome` держать в `apps/web/src/features/courier/`, потому что это доменный flow;
- `CourierHome` только открывает действие через `onTabChange("unload")`;
- `RoleHomeRouter` добавляет route branch для `unload`;
- bottom navigation не должна дублировать action tile `Сгрузить`, как сейчас не дублирует `Продать` и `Загрузить`;
- форма остается compact mobile flow, без wizard;
- server-state через React Query и `api-client`, без ручного дублирования backend balances;
- после успешной сгрузки invalidate:
  - `["courier", "product-balances"]`;
  - `["courier", "cash-balances"]`;
  - `["courier", "unload-options"]`;
  - `["courier", "sale-options"]`;
  - `["distributor", "inventory"]`;
  - `["distributor", "cash-balances"]`;
  - `["courier", "load-options"]`, если options зависят от distributor stock.

UI structure:

1. Заголовок `Сгрузка`.
2. Блок выбора распределителя:
   - если один active distributor, selected by default;
   - если несколько, select/list.
3. Блок `Товар`:
   - список собственных товарных строк;
   - default quantity = full available quantity;
   - quantity input/stepper для частичной сгрузки;
   - возможность убрать строку из сгрузки через quantity `0`, но в request нулевые строки не отправлять.
4. Блок `Наличные`:
   - default cash = full available cash;
   - input в рублях или копейках UI-helper, request в cents;
   - нельзя ввести больше доступной суммы.
5. Operation summary:
   - количество товарных строк;
   - total units;
   - товарная стоимость preview;
   - cash amount;
   - selected distributor.
6. Submit button:
   - disabled offline;
   - disabled, если нет distributor;
   - disabled, если нет ненулевого товара и cash amount `0`;
   - disabled pending.

Success state:

- использовать existing global success notice pattern;
- после success очистить/перезагрузить options;
- после success показать notice и вернуться на courier home, потому что операция закрывает сменный action.

## Затронутые Документы

Обновлено:

- `docs/crm-requirements.md` - постоянные бизнес-правила сгрузки;
- `docs/SECURITY.md` - scope `courier.unload.create`;
- `docs/HANDLER-MAP.md` - route строки unload handlers;
- `docs/DOMAIN-EVENTS.md` - добавить `courier.unload.create` в operation/audit catalog и убрать сгрузку из будущих кандидатов;
- `docs/FRONTEND.md` - фактический courier unload flow;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` - current progress и следующий рекомендуемый блок;
- `docs/DOCS-INDEX.md` - plan указан в completed-разделе.

## Затронутые Модули И Файлы

Ожидаемые изменения backend/shared:

- `apps/api/prisma/schema.prisma`;
- новая Prisma migration в `apps/api/prisma/migrations/*_courier_unload/`;
- `packages/shared/src/courier.ts`;
- `packages/shared/src/index.test.ts` или профильные shared tests;
- `apps/api/src/courier/courier.controller.ts`;
- `apps/api/src/courier/courier.service.ts`;
- `apps/api/src/courier/courier.mapper.ts`;
- `apps/api/test/courier-controller.test.ts`;
- `apps/api/test/courier-db.integration.test.ts`;
- `apps/api/test/policy.test.ts`.

Ожидаемые изменения frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/courier/CourierUnloadHome.tsx`;
- `apps/web/src/features/courier/CourierHomeOverview.tsx`;
- `apps/web/src/roles/courier/CourierHome.tsx`;
- `apps/web/src/app-shell/RoleHomeRouter.tsx`;
- `apps/web/app/page.test.tsx`;
- `apps/web/app/globals.css`, только если текущих classes недостаточно.

## Implementation Steps

### 1. Plan Review And SoR Update

- Провести ревью этого draft plan.
- После подтверждения зафиксировать постоянные бизнес-правила сгрузки в `docs/crm-requirements.md`.
- При необходимости уточнить `docs/SECURITY.md`, если права или admin scope изменятся до кода.

### 2. Shared Contracts

- Добавить schemas/types для unload options, request и response.
- Покрыть validation:
  - several items;
  - cash-only request;
  - empty request rejected;
  - duplicate balance ids rejected;
  - invalid quantities rejected;
  - invalid cash amount rejected.

### 3. Prisma Migration

- Добавить `CourierUnload` и `CourierUnloadItem`.
- Добавить relations и constraints.
- Добавить raw SQL check constraints для positive/non-negative полей.
- Сгенерировать migration.
- Проверить, что existing migrations и seed не ломаются.

### 4. Backend Query Endpoint

- Добавить `GET /courier/unload-options`.
- Вернуть active distributors, own courier stock rows и own cash balance.
- Покрыть controller tests:
  - anonymous 401;
  - wrong role 403;
  - courier 200;
  - active distributors only.

### 5. Backend Command Endpoint

- Добавить `POST /courier/unloads`.
- Реализовать transaction command.
- Покрыть integration tests:
  - unload several product rows and cash;
  - partial product unload;
  - cash-only unload;
  - product-only unload;
  - product-only unload succeeds when courier cash row is missing;
  - cash-only unload with missing courier cash row is rejected;
  - cash-only unload with zero courier cash balance is rejected;
  - reject over courier product balance;
  - reject over courier cash balance;
  - reject inactive distributor;
  - reject another courier balance for courier actor;
  - admin requires explicit `courierUserId`;
  - courier cannot pass `courierUserId`;
  - operation and audit are written;
  - rollback leaves all balances unchanged after failed item;
  - parallel unload/sale attempts cannot make negative courier balance.

### 6. Frontend API Client

- Добавить `getCourierUnloadOptions`.
- Добавить `createCourierUnload`.
- Подключить shared response/request types.
- Сохранить existing error mapping.

### 7. Frontend Flow

- Добавить `CourierUnloadHome`.
- Добавить action tile `Сгрузить` на courier home после backend readiness.
- Добавить route branch `unload` в `RoleHomeRouter`.
- Реализовать defaults:
  - единственный active distributor выбран;
  - все товарные строки включены с full quantity;
  - cash amount = full cash balance.
- Реализовать partial edit.
- Запретить submit offline и при пустой операции.
- После success invalidate relevant queries и показать success notice.

### 8. Documentation Update After Implementation

- Обновить `docs/crm-requirements.md`.
- Обновить `docs/SECURITY.md`.
- Обновить `docs/HANDLER-MAP.md`.
- Обновить `docs/DOMAIN-EVENTS.md`.
- Обновить `docs/FRONTEND.md`.
- Обновить roadmap progress.
- Перенести plan в `docs/exec-plans/completed/` после verification.

## Test Plan

Targeted tests:

- `pnpm --filter @buhta/shared test`;
- `pnpm --filter @buhta/api test -- courier-controller.test.ts`;
- `pnpm --filter @buhta/api test -- courier-db.integration.test.ts`;
- `pnpm --filter @buhta/api test -- policy.test.ts`;
- `pnpm --filter @buhta/web test -- page.test.tsx`.

Full relevant verification before completion:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm docs:check`;
- `pnpm smoke`, если dev-contour поднят;
- `pnpm audit`, если доступен network/audit contour.

Выполненная верификация:

- `pnpm --filter @buhta/shared test`;
- `pnpm --filter @buhta/api exec vitest run test/courier-controller.test.ts`;
- `pnpm --filter @buhta/api exec vitest run test/policy.test.ts test/courier-controller.test.ts`;
- `pnpm --filter @buhta/api exec vitest run test/courier-db.integration.test.ts`;
- `pnpm --filter @buhta/web test -- page.test.tsx`;
- `pnpm --filter @buhta/web test`;
- `pnpm --filter @buhta/api typecheck`;
- `pnpm typecheck`;
- `pnpm lint:boundaries`;
- `pnpm lint`;
- `pnpm test`;
- `pnpm docs:check`.

Не выполнено в рамках этапа:

- `pnpm smoke` - требует поднятого dev-contour, не использовался как targeted verification для этой реализации;
- `pnpm audit` - будет выполняться отдельным dependency/security контуром, так как этап не добавлял внешние библиотеки.

Manual UI verification:

- courier login;
- home shows real `Сгрузить` action tile only after backend flow exists;
- unload defaults to all stock and all cash;
- partial quantities work;
- cash-only unload works;
- offline state disables submit;
- after unload courier balances decrease and distributor balances increase;
- no horizontal overflow on mobile viewport.

## Риски И Rollback

Риск: multi-item transaction усложнит audit details и response.

Mitigation: держать один `CourierUnload` + массив `CourierUnloadItem`, а audit details строить как snapshot массива items.

Rollback: удалить endpoint/UI branch и migration только до попадания в shared development baseline. После применения migration откатывать отдельной обратной migration, не ручным удалением таблиц.

Риск: параллельная продажа и сгрузка одной courier stock row могут создать отрицательный остаток.

Mitigation: все списания делать conditional update `quantity >= requested`; не использовать предварительный read как authority.

Rollback: оставить endpoint выключенным из UI, если backend tests выявят concurrency issue.

Риск: cash before/after в audit может быть неверным при параллельных cash operations.

Mitigation: для cash decrement/increment считать before/after от результата записи, а не от stale preliminary read.

Риск: UI со многими строками станет тяжелым на телефоне.

Mitigation: компактный list/form pattern, default full unload, без wizard и без декоративных карточек.

## Критерии Завершения

Этап считается завершенным, когда:

- `CourierUnload` и `CourierUnloadItem` добавлены в схему и migration;
- shared contracts валидируют multi-item, partial и cash-only cases;
- `GET /courier/unload-options` и `POST /courier/unloads` работают через policy guard;
- backend command атомарно меняет courier/distributor product and cash balances;
- operation и audit пишутся в transaction;
- `CourierUnloadItem` хранит и исходную courier balance row, и affected distributor balance row;
- курьерский UI имеет реальную плитку `Сгрузить` и рабочую форму;
- frontend не показывает disabled placeholders;
- документация обновлена по фактическому поведению;
- plan перемещен в `completed`;
- targeted и full relevant verification выполнены или явно зафиксированы причины пропуска.

## Открытые Вопросы Для Ревью

Открытых продуктовых развилок на текущий draft нет. При ревью нужно проверить, достаточно ли `CourierUnload` + `CourierUnloadItem` для будущих корректировок, или сразу нужен отдельный correction-link contract. По текущему scope корректировки остаются отдельным будущим этапом.
