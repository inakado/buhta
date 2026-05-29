# Production To Distributor Transfer Plan

Статус: `Active`
Дата: 2026-05-29
Roadmap stage: `5. Production Flow` -> `Production → Distributor Transfer`

## Цель

Добавить надежное перемещение готовой продукции из цеха на распределитель.

После этапа заведующий производством должен уметь:

- видеть готовую продукцию, которая еще находится в цеху;
- выбрать активный распределитель;
- переместить конкретное количество выпущенной продукции на распределитель;
- получить понятную ошибку, если продукции в цеху недостаточно;
- видеть, что остаток в цеху уменьшился, а товарный остаток распределителя увеличился.

Backend должен выполнять перемещение транзакционно: validate -> policy -> conditional decrement workshop stock -> increment distributor stock -> operation/audit -> response.

## Анализ текущего состояния

Сейчас уже есть:

- справочник распределителей (`Distributor`) с `active`;
- шаблоны продукции с `priceCents`;
- выпуск партии продукции (`ProductBatch`) в статусе `in_workshop`;
- snapshot в партии: название продукции, сырье, тара, единицы измерения и цена на момент выпуска;
- списание сырья и тары при выпуске;
- production UI заведующего производством с disabled-действием `На распределитель`;
- permission `production.manage` для `admin` и `production_manager`;
- read permission `distributor.stock.read` для всех ролей.

Сейчас нет:

- отдельного остатка готовой продукции в цеху;
- остатка продукции на распределителе;
- модели или команды перемещения;
- operation type для перемещения;
- API/contract для выбора распределителя и количества;
- UI формы перемещения;
- read model распределителя.

Важный вывод: нельзя делать перемещение только через `ProductBatch.status`.
Партия может быть перемещена частично: часть остается в цеху, часть находится на распределителе, позже часть может быть продана или загружена курьеру. Поэтому `ProductBatch` должен оставаться фактом выпуска и snapshot-источником, а доступные остатки должны жить в отдельных balance projection tables.

## Scope

Входит:

- добавить projection остатка готовой продукции в цеху;
- добавить projection товарного остатка распределителя;
- добавить write-команду перемещения продукции из цеха на распределитель;
- поддержать частичное перемещение партии;
- запретить перемещение больше доступного остатка в цеху;
- запретить перемещение на неактивный или отсутствующий распределитель;
- при выпуске новой партии сразу создавать остаток продукции в цеху;
- миграцией backfill-нуть остатки в цеху для уже существующих `ProductBatch`;
- добавить operation/audit type для перемещения;
- сохранять snapshot названия продукта, цены и распределителя в audit details;
- добавить shared zod contracts и API client functions;
- включить форму `На распределитель` в production UI;
- после успешного перемещения инвалидировать production queries;
- добавить backend integration tests на real Postgres;
- добавить frontend tests для формы перемещения;
- обновить документацию и roadmap по фактическому результату.

## Out Of Scope

Не входит:

- продажи с распределителя;
- клиенты;
- денежный баланс распределителя;
- загрузка продукции курьеру;
- курьерский баланс;
- сгрузка курьера;
- дисконты;
- отмена или корректировка перемещения;
- ручные корректировки остатков;
- полноценный отдельный экран распределителя для коммерческого руководителя и работника распределителя;
- история с фильтрами/пагинацией;
- несколько складских зон внутри одного распределителя.

Минимальный read для распределителя можно добавить только настолько, насколько он нужен для проверки результата перемещения и следующего этапа `Distributor Inventory Read Model`.

## Доменные решения этапа

### 1. ProductBatch остается фактом выпуска

`ProductBatch` не должен быть единственным источником текущего товарного остатка.

Правило:

- `ProductBatch.quantity` — сколько единиц было выпущено изначально;
- текущий остаток в цеху хранится отдельно;
- текущий остаток на распределителе хранится отдельно;
- исторический snapshot партии не меняется при переименовании шаблона, сырья, тары или распределителя.

Поле `ProductBatch.status` на этом этапе не использовать как source of truth для доступного остатка. Если потребуется, его можно обновлять как вспомогательный coarse state (`in_workshop`, `partially_transferred`, `transferred`), но бизнес-инварианты должны опираться на balance tables.

### 2. Остаток продукции в цеху

Новая projection table:

```text
WorkshopProductBalance
```

Минимальные поля:

- `id`;
- `productBatchId` unique;
- `quantity` integer non-negative;
- `updatedAt`;
- relation to `ProductBatch`.

Правила:

- при выпуске партии создается `WorkshopProductBalance(quantity = batch.quantity)`;
- при перемещении на распределитель quantity уменьшается;
- запись с `quantity = 0` можно оставлять, но read endpoints должны скрывать нулевые остатки из основного списка;
- отрицательный остаток невозможен: использовать conditional update `where quantity >= requestedQuantity`.

### 3. Остаток продукции на распределителе

Новая projection table:

```text
DistributorProductBalance
```

Минимальные поля:

- `id`;
- `distributorId`;
- `productBatchId`;
- `quantity` integer non-negative;
- `updatedAt`;
- relation to `Distributor`;
- relation to `ProductBatch`;
- unique constraint `(distributorId, productBatchId)`.

Правила:

- при перемещении товара на распределитель остаток увеличивается через upsert;
- цена берется из `ProductBatch.priceCents`, а не из текущего шаблона;
- название продукции берется из `ProductBatch.productName`;
- если распределитель переименуют позже, история перемещения должна остаться читаемой через snapshot в audit details.

### 4. Операция перемещения

Новая command/event:

```text
production.product_transfer.create
```

Пользовательский смысл: заведующий производством переместил готовую продукцию из цеха на распределитель.

Минимальная operation detail:

- `productBatchId`;
- `productName`;
- `priceCents`;
- `distributorId`;
- `distributorName`;
- `quantity`;
- `workshopBalanceBefore`;
- `workshopBalanceAfter`;
- `distributorBalanceBefore`;
- `distributorBalanceAfter`;
- `comment`, если был введен.

Отдельная typed table для факта перемещения:

```text
ProductTransfer
```

Минимальные поля:

- `id`;
- `productBatchId`;
- `distributorId`;
- `quantity`;
- `operationId` unique;
- `actorUserId`;
- `comment`;
- `createdAt`.

Audit details хранят snapshot, а `ProductTransfer` хранит структурную связь и количество для будущих отчетов.

### 5. Частичное перемещение

Нужно поддержать частичное перемещение.

Пример:

- выпущено `10` единиц `Икра кеты 250 г`;
- перемещено `4` единицы на `Распределитель Центральный`;
- в цеху осталось `6`;
- на распределителе появилось `4`.

Повторное перемещение той же партии на тот же распределитель увеличивает существующий `DistributorProductBalance`.

### 6. Идемпотентность

Текущий production flow пока не использует public idempotency key на командах production. В этом этапе не добавлять новый cross-cutting idempotency механизм, если это не будет локально просто.

Минимальное требование:

- операция должна быть транзакционной;
- повторный ручной submit UI должен блокироваться `mutation.isPending`;
- concurrency safety обеспечивается conditional decrement.

Если во время реализации появится небольшой общий idempotency wrapper для production commands без большой переделки, его можно добавить только вместе с тестом retry/same request и reused key/different request. Без этого не усложнять.

## Prisma/schema changes

Добавить модели:

```prisma
model WorkshopProductBalance {
  id             String       @id @default(cuid())
  productBatchId String       @unique
  quantity       Int
  updatedAt      DateTime     @updatedAt
  productBatch   ProductBatch @relation(fields: [productBatchId], references: [id], onDelete: Restrict)

  @@map("workshop_product_balance")
}

model DistributorProductBalance {
  id             String       @id @default(cuid())
  distributorId  String
  productBatchId String
  quantity       Int
  updatedAt      DateTime     @updatedAt
  distributor    Distributor  @relation(fields: [distributorId], references: [id], onDelete: Restrict)
  productBatch   ProductBatch @relation(fields: [productBatchId], references: [id], onDelete: Restrict)

  @@unique([distributorId, productBatchId])
  @@index([distributorId])
  @@index([productBatchId])
  @@map("distributor_product_balance")
}

model ProductTransfer {
  id             String       @id @default(cuid())
  productBatchId String
  distributorId  String
  quantity       Int
  comment        String?
  operationId    String       @unique
  actorUserId    String
  createdAt      DateTime     @default(now())
  productBatch   ProductBatch @relation(fields: [productBatchId], references: [id], onDelete: Restrict)
  distributor    Distributor  @relation(fields: [distributorId], references: [id], onDelete: Restrict)
  operation      Operation    @relation(fields: [operationId], references: [id], onDelete: Restrict)

  @@index([productBatchId])
  @@index([distributorId])
  @@index([actorUserId])
  @@map("product_transfer")
}
```

Также добавить обратные relations в:

- `Operation.productTransfers`;
- `ProductBatch.workshopBalance`;
- `ProductBatch.distributorBalances`;
- `ProductBatch.transfers`;
- `Distributor.productBalances`;
- `Distributor.productTransfers`.

Migration:

1. Создать новые таблицы.
2. Backfill для существующих партий:

```sql
insert into workshop_product_balance ("productBatchId", quantity)
select id, quantity
from product_batch
where quantity > 0
on conflict ("productBatchId") do nothing;
```

3. Не создавать distributor balances для старых данных, потому что перемещений еще не было.

## Shared contracts

В `packages/shared/src/production.ts` добавить:

```text
WorkshopProductBalanceItem
DistributorProductBalanceItem
ProductionTransferOption
CreateProductTransferRequest
ProductTransfer
ProductTransferResponse
WorkshopProductBalancesResponse
DistributorProductBalancesResponse
ProductionTransferOptionsResponse
```

Минимальная request shape:

```ts
{
  productBatchId: string;
  distributorId: string;
  quantity: positive integer;
  comment?: string;
}
```

Минимальная response:

```ts
{
  transfer: ProductTransfer;
  workshopProductBalance: WorkshopProductBalanceItem;
  distributorProductBalance: DistributorProductBalanceItem;
}
```

Если balance после операции стал `0`, response все равно может вернуть item с `quantity: 0`, но list endpoints должны фильтровать нули.

## API plan

Вариант минимального API в `ProductionController`:

- `GET /production/workshop-product-balances`
  - возвращает продукцию, доступную в цеху;
  - фильтрует `quantity > 0`;
  - защищен `production.manage` на текущем этапе.

- `GET /production/transfer-options`
  - возвращает активные распределители и доступную продукцию в цеху;
  - нужен форме перемещения;
  - защищен `production.manage`.

- `POST /production/product-transfers`
  - создает перемещение из цеха на распределитель;
  - защищен `production.manage`;
  - body: `productBatchId`, `distributorId`, `quantity`, `comment?`.

Минимальный distributor read для следующего этапа можно добавить сразу, если это не увеличит scope:

- `GET /distributor/product-balances` или `GET /distributors/:id/product-balances`;
- permission `distributor.stock.read`;
- только read, без продаж и денег.

Если этот endpoint начинает тянуть отдельный module, оставить его на следующий этап `Distributor Inventory Read Model` и в текущем этапе проверять результат через production response/integration tests.

## Backend implementation steps

1. Добавить Prisma models и migration.
2. Сгенерировать Prisma client.
3. Обновить `ProductBatch` creation:
   - после создания партии создавать `WorkshopProductBalance`.
4. Добавить mapper для `WorkshopProductBalanceItem`.
5. Добавить mapper для `DistributorProductBalanceItem`.
6. Добавить operation type `production.product_transfer.create`.
7. Добавить `createProductTransfer(actor, input)` в `ProductionService`:
   - загрузить product batch + workshop balance + distributor;
   - проверить distributor exists и `active=true`;
   - проверить `quantity > 0`;
   - в transaction выполнить conditional decrement workshop balance;
   - upsert distributor product balance;
   - создать operation/audit;
   - создать `ProductTransfer`;
   - вернуть transfer + affected balances.
8. Обновить `getSummary()`:
   - `readyProductUnits` считать из `WorkshopProductBalance`, а не из суммы всех `ProductBatch` со статусом `in_workshop`.
9. Обновить `listProductBatches()` или заменить read path:
   - экран “Продукция в цеху” должен показывать доступный остаток, а не все выпущенные партии.
10. Добавить controller endpoints.
11. Добавить API error cases:
   - missing product batch -> `NOT_FOUND`;
   - missing distributor -> `NOT_FOUND`;
   - inactive distributor -> `DOMAIN_RULE_VIOLATION`;
   - insufficient workshop quantity -> `DOMAIN_RULE_VIOLATION`;
   - invalid payload -> `VALIDATION_ERROR`.

## Frontend implementation steps

Текущий экран `ProductionHome.tsx` уже содержит disabled tile `На распределитель`.

Сделать:

1. Добавить screen mode `transfer`.
2. Включить кнопку `На распределитель`, если online.
3. Добавить `ProductTransferForm`:
   - select продукции из доступного остатка в цеху;
   - select активного распределителя;
   - input количества;
   - comment;
   - отображение доступного количества и цены выбранной партии;
   - submit button `Переместить`.
4. После успешного submit:
   - сбросить форму;
   - invalidate production summary, workshop product balances, product batches/read model, transfer options;
   - оставить пользователя на форме или показать обновленный список без лишнего toast framework.
5. Экран “Продукция в цеху” должен показывать только доступные остатки `quantity > 0`.
6. Offline write blocking:
   - submit disabled при `!online`;
   - не отправлять mutation offline.
7. Использовать русские доменные примеры в тестах и ручных проверках:
   - `Икра кеты`;
   - `Икра горбуши`;
   - `Распределитель Центральный`.
8. После ручной/browser проверки удалить временные данные из dev-базы, если они не являются seed/demo данными.

## UI details

Минимальный мобильный flow:

1. Главная заведующего производством.
2. Нажатие `На распределитель`.
3. Экран с кнопкой `Назад`.
4. Форма:
   - `Продукция`;
   - `Распределитель`;
   - `Количество, шт`;
   - `Комментарий`;
   - основная черная кнопка `Переместить`.
5. Под выбранной продукцией показать:
   - доступно в цеху;
   - цена;
   - дата выпуска.

Не добавлять табы внутри формы и не делать вложенные карточки.

## Permissions

Write:

- `production.manage`: `admin`, `production_manager`.

Read:

- production transfer options на текущем этапе: `production.manage`;
- distributor stock read model на следующем этапе: `distributor.stock.read`.

Не добавлять новый permission, если текущий `production.manage` покрывает все write-действия этапа. Если во время реализации станет нужна более узкая гранулярность, добавить `production.transfer.create` только вместе с обновлением:

- `packages/shared/src/permissions.ts`;
- `docs/SECURITY.md`;
- policy tests;
- controller guards.

## Tests

### Shared/unit

- `CreateProductTransferRequestSchema`:
  - accepts valid payload;
  - rejects zero/negative/non-integer quantity;
  - trims/limits comment.

### API integration with real Postgres

Новый/расширенный `production-db.integration.test.ts`:

1. Happy path:
   - create product batch;
   - workshop balance created;
   - transfer part of quantity to active distributor;
   - workshop balance decreases;
   - distributor balance increases;
   - transfer row created;
   - audit/operation created with snapshots.
2. Full transfer:
   - quantity in workshop becomes 0;
   - list endpoint hides zero workshop balance.
3. Repeated transfer same product/distributor:
   - distributor balance increments existing row.
4. Insufficient workshop balance:
   - command rejects;
   - workshop/distributor balances unchanged;
   - no successful transfer operation created.
5. Inactive distributor:
   - command rejects.
6. Missing product batch/distributor:
   - typed `NOT_FOUND`.
7. New product batch creation:
   - creates workshop balance in same transaction.
8. Snapshot safety:
   - rename distributor/product template after transfer;
   - audit details keep original `productName` and `distributorName`.

Если concurrency test остается простым:

- two parallel transfers over available stock cannot both succeed beyond total quantity.

### API/policy

- anonymous request -> `401`;
- role without `production.manage` -> `403`;
- `production_manager` and `admin` -> allowed.

### Frontend

Extend `apps/web/app/page.test.tsx` or split feature test:

- production home enables `На распределитель`;
- transfer form renders product/distributor selects;
- submit sends `POST /production/product-transfers`;
- after success invalidates/refetches visible production data;
- empty state when no workshop products;
- offline disables submit.

### Verification commands

Targeted during implementation:

```bash
corepack pnpm --filter @buhta/shared test
corepack pnpm --filter @buhta/api typecheck
corepack pnpm --filter @buhta/api exec vitest run test/production-db.integration.test.ts
corepack pnpm --filter @buhta/web test
corepack pnpm --filter @buhta/web lint
corepack pnpm lint:boundaries
corepack pnpm docs:check
```

Before commit/finish:

```bash
corepack pnpm lint
corepack pnpm lint:boundaries
corepack pnpm typecheck
corepack pnpm test
corepack pnpm docs:check
corepack pnpm build
corepack pnpm audit
```

Notes:

- Prisma/Postgres integration tests may need `corepack pnpm dev:infra` and migration deploy.
- If Prisma returns `Schema engine error: undefined` in sandbox, repeat the same Prisma command outside sandbox and record it.
- If Next build fails in sandbox on Turbopack port binding, repeat build outside sandbox.

## Docs to update during implementation

- `docs/crm-requirements.md`
  - clarify workshop product balance and distributor product balance;
  - clarify partial transfer and no negative stock.
- `docs/DOMAIN-EVENTS.md`
  - add `production.product_transfer.create`.
- `docs/ARCHITECTURE.md`
  - document product balance projections.
- `docs/HANDLER-MAP.md`
  - add new production transfer endpoints after handlers exist.
- `docs/SECURITY.md`
  - confirm permission used for transfer.
- `docs/FRONTEND.md`
  - production transfer screen and UI conventions.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`
  - update progress after completion.

## Risks

### Risk: ProductBatch.status becomes misleading

Mitigation:

- do not use status as availability source;
- use workshop/distributor balance projections for business checks;
- update UI labels from “партии” to “остатки” where needed.

### Risk: partial transfer creates future sales complexity

Mitigation:

- distributor balance is keyed by `productBatchId`, preserving price snapshot;
- future sales can decrement the exact priced stock row.

### Risk: stale names after catalog/distributor rename

Mitigation:

- transfer audit details store `productName` and `distributorName` snapshot;
- product batch already stores product snapshot.

### Risk: test data pollution in dev DB

Mitigation:

- tests clean their own fixtures;
- manual/browser checks use Russian domain names and cleanup after verification.

### Risk: large ProductionHome file

Mitigation:

- if transfer UI makes `ProductionHome.tsx` too large, split feature components in the same stage:
  - `ProductTransferForm.tsx`;
  - `ProductStockList.tsx`;
  - `ProductionSummary.tsx`.

## Rollback

Before user-facing production release, rollback is local/dev only:

- revert migration and generated Prisma client if implementation is not committed;
- if migration was applied locally, use `docker compose down -v` and reseed dev DB;
- remove transfer endpoints/contracts/UI if plan changes before completion.

After commit, rollback by reverting the commit and applying a compensating migration only if needed. No real production data is expected before full v1 readiness.

## Open questions

1. Нужно ли на этом этапе показывать заведующему производством остатки на распределителе после перемещения, или достаточно обновления остатка в цеху и backend тестов?
2. Перемещение всегда делает заведующий производством, или администратор только для поддержки? Текущая policy отвечает: `production_manager` и `admin`.
3. Нужна ли причина/комментарий обязательной при перемещении? План делает комментарий optional.
4. Нужно ли разрешить перемещение только на один активный распределитель, если он единственный, без выбора в UI? План оставляет select, потому что справочник уже допускает несколько распределителей позже.

## Критерии завершения

Этап считается завершенным, когда:

- новая миграция применима на пустой и текущей dev DB;
- выпуск партии создает workshop product balance;
- transfer command транзакционно уменьшает цех и увеличивает распределитель;
- частичные перемещения работают;
- отрицательные остатки невозможны;
- inactive distributor отклоняется;
- operation/audit содержит snapshot details;
- production UI позволяет выполнить перемещение и не создает горизонтального overflow;
- тесты и docs verification из плана выполнены;
- временные данные ручной проверки удалены из dev-базы;
- plan перемещен в `completed`, а roadmap обновлен по факту.
