# Courier Load And Courier Balance Plan

Статус: `Active`
Дата: 2026-05-31
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Courier Load And Courier Balance`

## Цель

Добавить первый курьерский товарный контур после продаж с распределителя.

После этапа курьер должен уметь:

- видеть товарный остаток распределителя;
- загрузить продукцию с распределителя только на свой курьерский баланс;
- видеть собственный товарный баланс;
- получить понятную ошибку, если на распределителе недостаточно продукции.

Коммерческий руководитель и Директор должны уметь видеть товарные балансы курьеров для контроля, но не оформлять загрузку за курьера. Администратор должен иметь backend-доступ к courier endpoints как супер-пользователь, но отдельный admin UI в этом этапе не делаем.

Backend должен выполнять загрузку транзакционно: validate -> policy -> conditional decrement distributor stock -> increment courier stock -> operation/audit -> response.

## Текущий Контекст

Уже реализовано:

- `DistributorProductBalance` как projection товарного остатка распределителя по паре распределитель + партия продукции;
- `GET /distributor/inventory` как read-only товарные остатки и товарный баланс в рублях;
- `DistributorSale` и `DistributorCashBalance` для продажи с распределителя;
- `GET /distributor/sale-options`, `GET /distributor/cash-balances`, `POST /distributor/sales`;
- `Client` master data и UI клиентов;
- permission `courier.stock.load`, `courier.sale.create`, `courier.unload.create` уже есть в shared permission matrix;
- роль `courier` уже видит остатки распределителя через `distributor.stock.read`;
- mobile shell и role-based navigation.

Сейчас нет:

- projection товарного баланса курьера;
- typed fact загрузки курьера;
- operation/audit type для загрузки;
- shared contracts для courier load/balance;
- API курьерских балансов и загрузки;
- UI собственного курьерского баланса;
- UI загрузки товара курьером;
- UI просмотра балансов курьеров для коммерческого руководителя;
- real Postgres integration tests для курьерского товарного контура.

Важное ограничение этапа: денежный баланс курьера, продажи курьером и сгрузка курьера остаются следующими этапами. Этот план создает только товарный контур, на который дальше лягут courier sales и courier unload.

## Scope

Входит:

- добавить Prisma-модель `CourierProductBalance` для текущего товарного остатка курьера;
- добавить Prisma-модель `CourierLoad` как typed fact загрузки;
- связать курьерский баланс и загрузку с `User`-получателем роли `courier`;
- добавить operation type `courier.stock.load.create`;
- добавить shared contracts:
  - варианты товара для загрузки;
  - запрос загрузки;
  - ответ загрузки;
  - read model курьерских балансов;
- добавить backend module `courier`;
- добавить API:
  - `GET /courier/load-options`;
  - `GET /courier/product-balances`;
  - `POST /courier/loads`;
- разрешить `POST /courier/loads` только курьеру для загрузки на собственный баланс и администратору как backend-суперпользователю;
- при админском backend-вызове требовать явный `courierUserId`, но UI для этого не делать;
- для обычного курьера запрещать любой переданный `courierUserId`, чтобы нельзя было загрузить товар другому курьеру или скрыть попытку подмены;
- `GET /courier/product-balances`:
  - курьеру возвращает только собственный баланс;
  - директору возвращает балансы всех курьеров;
  - коммерческому руководителю возвращает балансы всех курьеров;
  - администратору возвращает балансы всех курьеров;
- списывать товар только через конкретный `distributorProductBalanceId`;
- запрещать загрузку с неактивного распределителя;
- запрещать загрузку сверх остатка распределителя;
- увеличивать `CourierProductBalance` по паре `courierUserId + productBatchId`;
- писать `operation` и `audit_log` в той же transaction;
- добавить mobile UI для курьера: собственный баланс и форма загрузки;
- добавить mobile UI для коммерческого руководителя: read-only просмотр балансов курьеров;
- покрыть доменные инварианты, permissions, concurrency и frontend flow тестами;
- обновить профильные документы по фактической реализации.

## Out Of Scope

Не входит:

- продажа курьером;
- наличный баланс курьера;
- безналичная продажа курьером;
- сгрузка товара и наличных курьером;
- списание наличных с распределителя;
- назначение дисконтов;
- корректировки и отмены загрузки;
- история операций с фильтрами/пагинацией;
- отдельный UI для администратора;
- загрузка товара коммерческим руководителем за курьера;
- выбор произвольной цены или скидки при загрузке;
- несколько складских зон внутри одного курьера;
- интеграции с кассой, платежами, телефонией или внешними сервисами.

## Доменные Решения Этапа

### 1. Загрузка оформляется курьером на себя

Основной пользовательский сценарий:

1. Курьер открывает экран загрузки.
2. Видит доступные строки товарного остатка распределителя.
3. Выбирает конкретную строку `DistributorProductBalance`.
4. Вводит целое положительное количество.
5. Подтверждает загрузку.
6. Система уменьшает остаток распределителя и увеличивает собственный баланс курьера.

Курьер не выбирает другого курьера-получателя. Получатель определяется из `actor.userId`.

Администратор как супер-пользователь может вызвать backend-команду с явным `courierUserId`, но UI для этого не строится. Это нужно для служебного восстановления или будущей админки, но не меняет основной бизнес-flow.

Коммерческий руководитель не оформляет загрузку за курьера.

### 2. CourierProductBalance как projection

Добавить projection table:

```text
CourierProductBalance
```

Минимальные поля:

- `id`;
- `courierUserId`;
- `productBatchId`;
- `quantity`;
- `updatedAt`;
- relation to `User`;
- relation to `ProductBatch`;
- unique `(courierUserId, productBatchId)`.

Правила:

- баланс увеличивается при загрузке курьера;
- нулевые строки можно оставлять, но read endpoints скрывают `quantity = 0`;
- отрицательный остаток невозможен;
- будущая продажа курьером будет делать conditional decrement этой же projection;
- будущая сгрузка курьера будет делать conditional decrement этой же projection и increment `DistributorProductBalance`.

На этом этапе курьерский баланс хранится по `productBatchId`, а не по `distributorId + productBatchId`. После загрузки товар находится у курьера, а не на складе конкретного распределителя. Это осознанное v1-решение: если одна и та же партия попадет курьеру с разных распределителей, баланс курьера по этой партии сольется. Для будущей сгрузки товар можно вернуть на выбранный распределитель отдельной операцией.

### 3. CourierLoad как typed fact

Добавить typed table:

```text
CourierLoad
```

Минимальные поля:

- `id`;
- `courierUserId`;
- `distributorProductBalanceId`;
- `distributorId`;
- `productBatchId`;
- `quantity`;
- `operationId`;
- `actorUserId`;
- `comment`;
- `createdAt`.

`courierUserId` — кому физически загружен товар.

`actorUserId` — кто оформил операцию. В основном flow это тот же пользователь, что и `courierUserId`. Для backend admin flow эти поля могут отличаться.

### 4. Загрузка строится вокруг строки остатка распределителя

`CreateCourierLoadRequest` должен принимать `distributorProductBalanceId`, а не свободную пару `distributorId + productBatchId`.

Backend по `distributorProductBalanceId` сам загружает:

- распределитель;
- партию продукции;
- цену партии;
- доступное количество.

Это повторяет уже принятый паттерн продажи с распределителя и исключает рассинхрон между frontend и backend.

### 5. Транзакция загрузки и rollback

`createCourierLoad(actor, input)` выполняется в одной Prisma transaction:

1. Определить `targetCourierUserId`:
   - если `actor.role === "courier"` — только `actor.userId`;
   - если `actor.role === "admin"` — `input.courierUserId` обязателен;
   - остальные роли не проходят policy на write endpoint.
2. Проверить, что `targetCourierUserId` существует и имеет роль `courier`.
3. Загрузить `DistributorProductBalance` с `Distributor` и `ProductBatch`.
4. Проверить, что распределитель активен.
5. Выполнить conditional decrement `DistributorProductBalance.quantity >= input.quantity`.
7. Если decrement не сработал, выбросить `DOMAIN_RULE_VIOLATION` и откатить transaction.
8. Прочитать `DistributorProductBalance` после decrement и зафиксировать:
   - `distributorBalanceAfter = balanceAfter.quantity`;
   - `distributorBalanceBefore = distributorBalanceAfter + input.quantity`.
9. Upsert/increment `CourierProductBalance` по `(targetCourierUserId, productBatchId)`.
10. Зафиксировать:
   - `courierBalanceAfter` из результата upsert;
   - `courierBalanceBefore = courierBalanceAfter - input.quantity`.
11. Создать `Operation` с типом `courier.stock.load.create`.
12. Создать `CourierLoad`.
13. Создать `AuditLog` один раз с `entityId = courierLoad.id`, `courierLoadId` и полными snapshot details.
14. Вернуть load, affected distributor balance и courier balance item.

Если любой шаг падает, товарный остаток распределителя и курьера не должны измениться.

Не читать `courierBalanceBefore` отдельным предварительным `findUnique` как источник истины для audit. При параллельных успешных загрузках одной партии одному курьеру обе transaction могут увидеть один и тот же старый баланс. Для audit before/after нужно опираться на результат атомарного increment/upsert: `before = after - input.quantity`.

### 6. Audit details

Audit details для `courier.stock.load.create` должны содержать:

- `courierLoadId`;
- `courierUserId`;
- `courierLogin`;
- `distributorProductBalanceId`;
- `distributorId`;
- `distributorName`;
- `productBatchId`;
- `productName`;
- `unitPriceCents`;
- `quantity`;
- `distributorBalanceBefore`;
- `distributorBalanceAfter`;
- `courierBalanceBefore`;
- `courierBalanceAfter`;
- `comment`.

Историческая читаемость названия продукции и цены обеспечивается через snapshot партии `ProductBatch`. Название распределителя фиксируется в audit details, чтобы переименование распределителя позже не ломало историю загрузки.

### 7. Read permissions и видимость балансов

Добавить отдельный permission:

```text
courier.stock.read
```

`courier.stock.read` используется только для просмотра курьерских товарных балансов. `courier.stock.load` остается write-permission для загрузки товара курьером. Не смешивать read и write в одном permission.

Ролевая матрица:

- `admin`: `courier.stock.read`, `courier.stock.load`;
- `director`: `courier.stock.read`, без `courier.stock.load`;
- `commercial_manager`: `courier.stock.read`, без `courier.stock.load`;
- `courier`: `courier.stock.read`, `courier.stock.load`;
- остальные роли: без courier stock permissions.

Важно: даже при наличии `courier.stock.read` backend ограничивает область данных:

- курьер видит только собственный баланс;
- директор видит балансы всех курьеров;
- коммерческий руководитель видит балансы всех курьеров;
- администратор видит балансы всех курьеров.

### 8. Load options

`GET /courier/load-options` возвращает только строки распределителя, которые можно загрузить:

- `distributorProductBalanceId`;
- `distributorId`;
- `distributorName`;
- `productBatchId`;
- `productName`;
- `unitPriceCents`;
- `availableQuantity`;
- `stockValueCents`;
- `updatedAt`.

Endpoint доступен ролям, которые могут оформлять загрузку:

- `courier`;
- `admin`.

Для курьера это товарные строки распределителя, доступные для self-load. Для администратора endpoint нужен для backend completeness, UI не делаем.

Коммерческому руководителю load options не нужны, потому что он не оформляет загрузку.

### 9. Frontend flow

Для курьера:

- home должен показывать собственный товарный баланс курьера, а не только общий остаток распределителя;
- отдельная вкладка или экран `Загрузка` должен показывать доступные строки распределителя и форму загрузки;
- форма загрузки:
  - select продукции из `GET /courier/load-options`;
  - quantity input;
  - readonly preview доступного остатка и суммы товарного баланса;
  - comment textarea;
  - submit disabled offline и while pending;
  - после успеха invalidate courier balances, distributor inventory и load options;
  - success notice `Загрузка записана`.

Для коммерческого руководителя:

- добавить read-only блок или вкладку курьерских балансов;
- показывать курьера, продукцию, количество, цену партии и товарную стоимость;
- не показывать форму загрузки.

Для администратора:

- backend доступ покрыть тестами;
- UI не добавлять.

## Prisma/schema Changes

Добавить связи:

```prisma
model Operation {
  courierLoads CourierLoad[]
}

model User {
  courierProductBalances CourierProductBalance[] @relation("CourierProductBalanceCourier")
  courierLoads           CourierLoad[]           @relation("CourierLoadCourier")
}

model ProductBatch {
  courierBalances CourierProductBalance[]
  courierLoads    CourierLoad[]
}

model DistributorProductBalance {
  courierLoads CourierLoad[]
}

model Distributor {
  courierLoads CourierLoad[]
}
```

Добавить модели:

```prisma
model CourierProductBalance {
  id             String       @id @default(cuid())
  courierUserId  String
  productBatchId String
  quantity       Int
  updatedAt      DateTime     @updatedAt
  courier        User         @relation("CourierProductBalanceCourier", fields: [courierUserId], references: [id], onDelete: Restrict)
  productBatch   ProductBatch @relation(fields: [productBatchId], references: [id], onDelete: Restrict)

  @@unique([courierUserId, productBatchId])
  @@index([courierUserId])
  @@index([productBatchId])
  @@map("courier_product_balance")
}

model CourierLoad {
  id                          String                    @id @default(cuid())
  courierUserId               String
  distributorProductBalanceId String
  distributorId               String
  productBatchId              String
  quantity                    Int
  comment                     String?
  operationId                 String                    @unique
  actorUserId                 String
  createdAt                   DateTime                  @default(now())
  courier                     User                      @relation("CourierLoadCourier", fields: [courierUserId], references: [id], onDelete: Restrict)
  distributorProductBalance   DistributorProductBalance @relation(fields: [distributorProductBalanceId], references: [id], onDelete: Restrict)
  distributor                 Distributor               @relation(fields: [distributorId], references: [id], onDelete: Restrict)
  productBatch                ProductBatch              @relation(fields: [productBatchId], references: [id], onDelete: Restrict)
  operation                   Operation                 @relation(fields: [operationId], references: [id], onDelete: Restrict)

  @@index([courierUserId])
  @@index([distributorId])
  @@index([productBatchId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("courier_load")
}
```

Миграция должна добавлять non-negative check constraints для `quantity >= 0`, если текущий стиль проекта уже допускает raw SQL checks в migration. Если нет, минимум — application-level conditional updates плюс integration tests.

## Shared Contracts

Добавить файл:

```text
packages/shared/src/courier.ts
```

Минимальные contracts:

```ts
CourierLoadOption
CourierLoadOptionsResponse
CreateCourierLoadRequest
CourierLoad
CourierProductBalanceItem
CourierProductBalancesSummary
CourierProductBalancesResponse
CourierLoadResponse
```

`CreateCourierLoadRequest`:

```ts
{
  distributorProductBalanceId: string;
  quantity: number;
  courierUserId?: string;
  comment?: string;
}
```

Правило:

- `courierUserId` используется только admin backend flow;
- для actor role `courier` backend принудительно использует `actor.userId`;
- если actor role `courier` передал любой `courierUserId`, backend возвращает `VALIDATION_ERROR`;
- если actor role `admin`, `courierUserId` обязателен и должен указывать на существующего пользователя с role `courier`.

`CourierProductBalanceItem`:

```ts
{
  id: string;
  courierUserId: string;
  courierLogin: string;
  courierDisplayName: string;
  productBatchId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  stockValueCents: number;
  updatedAt: string;
}
```

Response должен позволять коммерческому руководителю видеть grouped list по всем курьерам, а курьеру — тот же shape, но только с собственными строками.

## API Plan

Добавить модуль:

```text
apps/api/src/courier/
```

Файлы:

- `courier.module.ts`;
- `courier.controller.ts`;
- `courier.service.ts`;
- `courier.mapper.ts`.

Endpoints:

```text
GET /courier/load-options
GET /courier/product-balances
POST /courier/loads
```

Права:

- `GET /courier/load-options` -> `courier.stock.load`;
- `GET /courier/product-balances` -> `courier.stock.read`;
- `POST /courier/loads` -> `courier.stock.load`.

Controllers валидируют body через zod schemas из `packages/shared`. Service отвечает за domain checks, transaction и mapping.

## Backend Implementation Steps

1. Добавить shared `courier.ts` contracts и exports.
2. Добавить permission `courier.stock.read` и обновить role permission matrix.
3. Добавить Prisma schema models/relations.
4. Создать migration `courier_load_and_balance`.
5. Добавить `courier` backend module/controller/service/mapper.
6. Подключить module в `AppModule`.
7. Реализовать `getLoadOptions()`:
   - читает активные distributor balances с `quantity > 0`;
   - возвращает product snapshot и цену партии.
8. Реализовать `getProductBalances(actor)`:
   - courier -> только `actor.userId`;
   - director/commercial/admin -> все курьеры;
   - скрывает нулевые строки.
9. Реализовать `createCourierLoad(actor, input)` по transaction steps выше.
10. Добавить operation type `courier.stock.load.create`.
11. Добавить audit details.
12. Обновить error handling только если текущего `AppError` contract недостаточно.

## Frontend Implementation Steps

1. Добавить API client functions:
   - `getCourierLoadOptions()`;
   - `getCourierProductBalances()`;
   - `createCourierLoad()`.
2. Добавить feature:
   - `apps/web/src/features/courier/CourierBalanceHome.tsx`;
   - `apps/web/src/features/courier/CourierLoadHome.tsx`.
3. Для роли `courier`:
   - home -> собственный товарный баланс;
   - tab `Загрузка` -> форма загрузки;
   - tab `Продажа` оставить placeholder до Courier Sales;
   - tab `Сгрузка` в этом этапе не добавлять; он появится только в Courier Unload.
4. Для роли `commercial_manager`:
   - добавить read-only раздел курьерских балансов;
   - не показывать форму загрузки.
5. Для роли `director`:
   - добавить read-only просмотр курьерских балансов или подключить тот же read-only блок, что у коммерческого руководителя;
   - не показывать форму загрузки.
6. Не добавлять отдельный admin UI.
7. После успешной загрузки:
   - invalidate `courier/product-balances`;
   - invalidate `courier/load-options`;
   - invalidate `distributor/inventory`;
   - показать success notice `Загрузка записана`.
8. Offline:
   - submit disabled, когда `online=false`;
   - read endpoints могут оставаться доступными через текущий server-state behavior.

## Test Plan

Shared:

- zod schemas принимают валидную загрузку;
- `quantity <= 0` отклоняется;
- optional comment trim/max length.

API/controller:

- `GET /courier/load-options` вызывает service;
- `GET /courier/product-balances` передает actor в service;
- `POST /courier/loads` валидирует body и actor.

Policy:

- `courier` имеет `courier.stock.read` и `courier.stock.load`;
- `director` имеет `courier.stock.read`, но не `courier.stock.load`;
- `commercial_manager` имеет `courier.stock.read`, но не `courier.stock.load`;
- `admin` имеет оба права;
- `production_manager`, `distributor_worker` не имеют courier stock permissions.

Real Postgres integration:

- happy path: курьер загружает товар на свой баланс;
- distributor balance уменьшается;
- courier balance увеличивается;
- повторная загрузка той же партии тем же курьером increment-ит existing `CourierProductBalance`;
- недостаточный остаток распределителя отклоняется и не меняет оба баланса;
- неактивный распределитель отклоняется;
- отсутствующий `distributorProductBalanceId` возвращает `NOT_FOUND`;
- admin backend flow может загрузить товар указанному courier user;
- admin backend flow отклоняет `courierUserId`, если пользователь не role `courier`;
- courier actor не может загрузить товар другому courier user;
- commercial manager не проходит write permission;
- director не проходит write permission, но может читать балансы всех курьеров;
- audit log содержит snapshot и balances before/after;
- concurrent loads на одну единицу не double-spend-ят distributor stock.

Frontend:

- courier видит собственный баланс;
- courier открывает загрузку, выбирает товар, вводит количество и submit вызывает API;
- offline submit disabled;
- после success показывается notice и обновляются query keys;
- commercial manager видит read-only courier balances и не видит форму загрузки;
- director видит read-only courier balances и не видит форму загрузки;
- admin UI не появляется.

Full verification перед завершением этапа:

- `corepack pnpm --filter @buhta/shared test`;
- `corepack pnpm --filter @buhta/api typecheck`;
- targeted API/controller/policy/integration tests;
- `corepack pnpm --filter @buhta/web typecheck`;
- targeted web tests;
- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`;
- browser sanity для courier и commercial mobile flows.

Примечание: real Postgres integration tests, Prisma migrate/deploy, `pnpm build` и `pnpm audit` могут требовать запуск вне sandbox по уже зафиксированным ограничениям `docs/DEVELOPMENT.md`.

## Затронутые Документы

Обновить во время или после реализации:

- `docs/crm-requirements.md` — если итоговая role matrix или видимость балансов уточнится;
- `docs/ARCHITECTURE.md` — добавить courier balance projection и load typed fact;
- `docs/DOMAIN-EVENTS.md` — добавить `courier.stock.load.create`;
- `docs/HANDLER-MAP.md` — добавить фактические courier endpoints после реализации;
- `docs/SECURITY.md` — добавить `courier.stock.read` и разделение read/load permissions;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — обновить прогресс после завершения этапа;
- `docs/DOCS-INDEX.md` — добавить plan и после завершения перенести ссылку в completed.

## Затронутые Модули И Файлы

Ожидаемые изменения:

- `packages/shared/src/courier.ts`;
- `packages/shared/src/index.ts`;
- `packages/shared/src/permissions.ts`;
- `packages/shared/src/index.test.ts`;
- `apps/api/prisma/schema.prisma`;
- `apps/api/prisma/migrations/<timestamp>_courier_load_and_balance/migration.sql`;
- `apps/api/src/courier/*`;
- `apps/api/src/app.module.ts`;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/test/courier-controller.test.ts`;
- `apps/api/test/courier-db.integration.test.ts`;
- `apps/api/test/policy.test.ts`;
- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/app-shell/AppRoot.tsx`;
- `apps/web/src/features/courier/*`;
- `apps/web/app/page.test.tsx`;
- профильные docs.

## Риски И Rollback

Риски:

- смешать право просмотра балансов и право загрузки в одном permission;
- случайно дать коммерческому руководителю write-доступ к загрузке;
- позволить курьеру загрузить товар другому курьеру через подмену `courierUserId`;
- не учесть concurrent load и получить отрицательный остаток распределителя;
- преждевременно добавить cash balance курьера и смешать этап с courier sales/unload.

Mitigation:

- разделить `courier.stock.read` и `courier.stock.load`;
- проверять target courier внутри service, а не только в UI;
- использовать conditional decrement `DistributorProductBalance.quantity >= requestedQuantity`;
- покрыть concurrency integration test;
- оставить cash/sales/unload out of scope.

Rollback:

- если миграция еще не применена в shared dev DB, удалить migration и schema changes;
- если применена локально, создать обратную миграцию, удаляющую `courier_load` и `courier_product_balance` после удаления зависимых test/dev rows;
- UI можно отключить через role routing, оставив backend недоступным без permission.

## Критерии Завершения

Этап считается завершенным, когда:

- courier load transaction реализована и покрыта real Postgres tests;
- курьер не может загрузить товар другому курьеру;
- коммерческий руководитель видит балансы курьеров, но не может оформлять загрузку;
- Директор видит балансы курьеров, но не может оформлять загрузку;
- администратор имеет backend-доступ без отдельного UI;
- distributor balance и courier balance меняются атомарно;
- audit/operation пишутся в той же transaction;
- concurrent loads не создают отрицательный остаток;
- courier UI позволяет увидеть собственный баланс и оформить загрузку online;
- commercial UI показывает read-only курьерские балансы;
- director UI показывает read-only курьерские балансы;
- docs обновлены по фактической реализации;
- план перемещен в `docs/exec-plans/completed/` с фактически выполненными проверками.

## Открытые Вопросы

1. Нужен ли коммерческому руководителю и Директору отдельный summary по каждому курьеру уже в этом этапе, или достаточно общего списка строк баланса с группировкой по имени курьера?
2. Нужно ли seed-ить отдельного demo courier user для ручной проверки courier UI, или достаточно создавать пользователя через текущую админку перед browser sanity?
