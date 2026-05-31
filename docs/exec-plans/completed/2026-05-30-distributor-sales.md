# Distributor Sales Plan

Статус: `Completed`
Дата: 2026-05-30
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Sales From Distributor`

## Цель

Реализовать продажу готовой продукции с распределителя клиенту.

После этапа коммерческий руководитель и работник распределителя должны уметь оформить продажу конкретной строки товарного остатка распределителя, выбрать клиента, количество и способ оплаты. Система должна транзакционно уменьшить товарный остаток, зафиксировать факт продажи, а при наличной оплате увеличить наличный баланс распределителя.

Этап закрывает только продажи с распределителя. Курьерские операции, дисконты, корректировки и полноценные отчеты остаются следующими этапами.

## Текущий Контекст

Уже реализовано:

- `DistributorProductBalance` как projection товарного остатка распределителя по паре распределитель + партия продукции;
- `GET /distributor/inventory` как read-only товарные остатки и товарный баланс в рублях;
- `Client` master data, `GET /clients`, `POST /clients`, `PATCH /clients/:clientId`;
- permission `distributor.sale.create` для `admin`, `commercial_manager`, `distributor_worker`;
- permission `distributor.cash.read` для `admin`, `director`, `commercial_manager`, `distributor_worker`;
- mobile shell, вкладка `Продажа` как placeholder у операционных ролей распределителя;
- success notice pattern для коротких write-операций.

Важные принятые решения:

- продажа использует цену конкретной партии `ProductBatch.priceCents`, а не текущую цену шаблона продукции;
- продавец не вводит цену вручную;
- клиентская карточка является mutable master data: продажа хранит `clientId`, UI показывает актуальные имя/телефон клиента;
- cash balance распределителя не равен товарному балансу в рублях и должен храниться отдельной projection table.

## Фактический Результат

- Добавлены shared contracts для `PaymentMethod`, sale options, `CreateDistributorSaleRequest`, `DistributorCashBalancesResponse` и `DistributorSaleResponse`.
- Добавлены Prisma-модели `DistributorCashBalance` и `DistributorSale` с migration `20260530130000_distributor_sales`.
- Добавлен operation type `distributor.sale.create`.
- `DistributorService` получил:
  - `getSaleOptions()` для строк товарного остатка, доступных продаже;
  - `getCashBalances()` для наличного баланса распределителя с `0 ₽` до первой cash-операции;
  - `createDistributorSale()` с transactional conditional decrement товарного остатка и cash upsert/increment только для `cash`.
- Добавлены endpoints:
  - `GET /distributor/sale-options` под `distributor.sale.create`;
  - `GET /distributor/cash-balances` под `distributor.cash.read`;
  - `POST /distributor/sales` под `distributor.sale.create`.
- `DistributorSale` хранит `unitPriceCents` и `totalCents`; клиент хранится как `clientId` без snapshot имени/телефона.
- Audit details продажи фиксируют товар, распределитель, цену, сумму, способ оплаты и balances before/after.
- Frontend получил `features/sales/DistributorSaleHome.tsx`: выбор клиента, раскрываемая мини-форма нового клиента, выбор товарной строки, количество, способ оплаты, итог и комментарий.
- После успешной продажи вкладка переключается на distributor home и показывает notice `Продажа записана`.
- `DistributorInventoryHome` показывает cash balance только ролям с `distributor.cash.read`; роли без права не делают cash fetch.

## Выполненные Проверки

Targeted проверки во время реализации:

- `corepack pnpm --filter @buhta/shared test` — прошел.
- `corepack pnpm --filter @buhta/api typecheck` — прошел.
- `corepack pnpm --filter @buhta/api prisma:deploy` — в sandbox упал на schema engine из-за доступа к `localhost:5433`, вне sandbox прошел и применил migration `20260530130000_distributor_sales`.
- `corepack pnpm --filter @buhta/api exec vitest run test/distributor-controller.test.ts test/distributor-sales-db.integration.test.ts test/policy.test.ts` — в sandbox упал на real Postgres доступе, вне sandbox прошел: 3 files, 21 tests.
- `corepack pnpm --filter @buhta/web typecheck` — прошел.
- `corepack pnpm --filter @buhta/web test -- app/page.test.tsx` — прошел: 2 files, 16 tests.
- `corepack pnpm --filter @buhta/api lint` — прошел.
- `corepack pnpm --filter @buhta/web lint` — прошел.

Финальные проверки полного контура:

- `corepack pnpm lint` — прошел.
- `corepack pnpm lint:boundaries` — прошел.
- `corepack pnpm typecheck` — прошел.
- `corepack pnpm test` — в sandbox упал на real Postgres integration tests из-за доступа к БД, вне sandbox прошел: API 18 files / 88 tests, web 2 files / 16 tests, shared 1 file / 10 tests.
- `corepack pnpm docs:check` — прошел.
- `corepack pnpm build` — в sandbox упал из-за Turbopack `binding to a port / Operation not permitted`, вне sandbox прошел.
- `corepack pnpm audit` — прошел, уязвимости не найдены.
- Browser sanity на временном `PORT=3004 corepack pnpm dev:web` с mock API — вкладка `Продажа`, выбор клиента/товара, submit продажи и возврат на distributor home проверены; временный dev server остановлен.

## Scope

Входит:

- добавить Prisma-модели `DistributorCashBalance` и `DistributorSale`;
- добавить operation type `distributor.sale.create`;
- добавить shared contracts для продажи с распределителя, cash balance и sale options;
- добавить API:
  - `GET /distributor/sale-options`;
  - `GET /distributor/cash-balances`;
  - `POST /distributor/sales`;
- реализовать transactional `createDistributorSale(actor, input)`;
- списывать товар только через конкретный `distributorProductBalanceId`;
- при наличной продаже увеличивать `DistributorCashBalance.amountCents`;
- при безналичной продаже не менять cash balance;
- показывать cash balance распределителя на distributor home только ролям с `distributor.cash.read`;
- заменить placeholder вкладки `Продажа` на форму продажи для `commercial_manager` и `distributor_worker`;
- дать возможность создать нового клиента из формы продажи через раскрываемую компактную мини-форму;
- после успешной продажи возвращать пользователя на distributor home и показывать success notice `Продажа записана`;
- покрыть доменные инварианты, permissions, concurrency и frontend flow тестами;
- обновить профильные документы по фактической реализации.

## Out Of Scope

Не входит:

- продажа курьером;
- загрузка продукции курьеру;
- сгрузка продукции и наличных курьером;
- баланс курьера;
- назначение и использование дисконтов;
- ручное изменение цены продажи;
- отмена или корректировка продажи;
- полноценный журнал продаж и отчеты;
- интеграции с кассой, платежами, телефонией или внешними сервисами;
- UI продажи для администратора;
- отдельный экран управления cash balance сверх read-only отображения.

## Доменные Решения Этапа

### 1. Продажа строится вокруг строки остатка

`CreateDistributorSaleRequest` должен принимать `distributorProductBalanceId`, а не свободную пару `distributorId + productBatchId`.

Форма продажи выбирает конкретную строку остатка:

- `DistributorProductBalance.id`;
- распределитель;
- партия продукции;
- snapshot-название продукции из партии;
- snapshot-цена партии;
- доступное количество.

Backend по `distributorProductBalanceId` сам загружает `DistributorProductBalance`, `Distributor` и `ProductBatch`. Это исключает рассинхрон, когда frontend мог бы отправить несовпадающие `distributorId` и `productBatchId`.

### 2. DistributorSale фиксирует денежный факт

`DistributorSale` хранит:

- `id`;
- `distributorProductBalanceId`;
- `distributorId`;
- `productBatchId`;
- `clientId`;
- `quantity`;
- `unitPriceCents`;
- `totalCents`;
- `paymentMethod`;
- `comment`;
- `operationId`;
- `actorUserId`;
- `createdAt`.

`unitPriceCents` берется из `ProductBatch.priceCents` на момент продажи. `totalCents = quantity * unitPriceCents` сохраняется в sale record и audit details. Будущие отчеты и корректировки не должны пересчитывать старую продажу только через join на текущие связанные записи.

### 3. Клиент без snapshot

Продажа хранит `clientId`.

Не сохранять в `DistributorSale` отдельные `clientName` или `clientPhone` snapshots. Это осознанное доменное решение: клиентская карточка уточняемая, и UI продаж/отчетов должен показывать актуальные имя, телефон и описание через join на `Client`.

Audit продажи может хранить `clientId`, но не должен превращать старые имя/телефон клиента в operational source of truth.

### 4. Cash balance как projection

Добавить `DistributorCashBalance`:

- `id`;
- `distributorId @unique`;
- `amountCents`;
- `updatedAt`.

Правила:

- cash sale делает atomic upsert/increment `amountCents`;
- cashless sale не меняет cash balance;
- cash balance не должен становиться отрицательным;
- read endpoint возвращает `0` для активного/существующего распределителя, даже если строки cash balance еще нет;
- будущие списания наличных будут делать conditional decrement этой же projection table.

### 5. Permissions endpoints

Использовать уже существующие permissions:

- `GET /distributor/sale-options` -> `distributor.sale.create`;
- `POST /distributor/sales` -> `distributor.sale.create`;
- `GET /distributor/cash-balances` -> `distributor.cash.read`.

`sale-options` не отдавать всем, кто просто видит остатки. Это данные для оформления продажи, поэтому они доступны только ролям, которые могут продавать.

`cash-balances` не показывать ролям без `distributor.cash.read`. В частности, `production_manager` и `courier` могут видеть товарные остатки распределителя, но не наличный баланс распределителя.

### 6. Sale options не содержит клиентов

`GET /distributor/sale-options` возвращает только товарные строки, доступные к продаже:

- `distributorProductBalanceId`;
- `distributorId`;
- `distributorName`;
- `productBatchId`;
- `productName`;
- `unitPriceCents`;
- `availableQuantity`;
- `stockValueCents`;
- `updatedAt`.

Клиентов искать через существующий `GET /clients?search=...`.

Нового клиента создавать через существующий `POST /clients`. Форма продажи может раскрывать компактную мини-форму, но не должен появляться отдельный sales-specific endpoint для создания клиента.

### 7. Транзакция продажи и rollback

`createDistributorSale(actor, input)` выполняется в одной Prisma transaction:

1. Загрузить `DistributorProductBalance` по `input.distributorProductBalanceId` вместе с `Distributor` и `ProductBatch`.
2. Загрузить `Client` по `input.clientId`.
3. Проверить, что клиент существует.
4. Проверить, что распределитель существует и `active=true`.
5. Зафиксировать `stockBalanceBefore`.
6. Выполнить conditional decrement `DistributorProductBalance.quantity >= input.quantity`.
7. Если decrement не сработал, выбросить `DOMAIN_RULE_VIOLATION` и откатить transaction.
8. Посчитать `unitPriceCents` и `totalCents`.
9. Если `paymentMethod = cash`, upsert/increment `DistributorCashBalance.amountCents`.
10. Если `paymentMethod = cashless`, cash balance не менять.
11. Создать `Operation` с типом `distributor.sale.create`.
12. Создать `DistributorSale`.
13. Создать `AuditLog` с snapshot деталей операции.
14. Вернуть sale, affected product balance и cash balance summary.

Если любой шаг падает, товарный остаток и cash balance не должны измениться.

### 8. Audit details

Audit details для `distributor.sale.create` должны содержать:

- `distributorSaleId`;
- `distributorProductBalanceId`;
- `distributorId`;
- `distributorName`;
- `productBatchId`;
- `productName`;
- `clientId`;
- `quantity`;
- `unitPriceCents`;
- `totalCents`;
- `paymentMethod`;
- `stockBalanceBefore`;
- `stockBalanceAfter`;
- `cashBalanceBefore`;
- `cashBalanceAfter`;
- `comment`.

`cashBalanceBefore/cashBalanceAfter` для cashless sale можно фиксировать как текущее значение без изменения или `null`, если принято в реализации. Главное: audit должен явно показывать, что безналичная продажа cash balance не увеличила.

### 9. Frontend flow

Во вкладке `Продажа` для `commercial_manager` и `distributor_worker` добавить `DistributorSaleHome` или feature `features/sales/DistributorSaleHome.tsx`.

Форма:

- выбор клиента из существующей базы;
- поиск клиента через `GET /clients?search=...`;
- кнопка `Новый клиент`;
- по нажатию `Новый клиент` раскрывается компактная мини-форма имени, телефона и описания;
- после успешного `POST /clients` новый клиент автоматически выбирается в продаже;
- выбор товарной строки из `GET /distributor/sale-options`;
- под выбранным товаром показать `доступно`, цену и сумму по выбранному количеству;
- ввод количества;
- выбор способа оплаты `Наличные` / `Безнал`;
- комментарий;
- итоговая сумма продажи.

Submit disabled при:

- `!online`;
- pending mutation;
- нет выбранного клиента;
- нет выбранного товарного остатка;
- количество невалидно;
- нет доступных товарных строк.

После успешной продажи:

- сбросить sale form state;
- сбросить local/backend error;
- для `commercial_manager` и `distributor_worker` переключить active tab на `home`;
- показать success notice `Продажа записана` на distributor home;
- инвалидировать queries:
  - distributor inventory;
  - distributor sale options;
  - distributor cash balances;
  - clients, если в форме был создан новый клиент.

Ошибки:

- local validation errors остаются inline;
- backend errors остаются inline;
- при ошибке не возвращать на home и не показывать success notice.

### 10. Distributor home cash balance

`DistributorInventoryHome` или новый distributor home composition должен показывать:

- товарный остаток и товарный баланс как сейчас;
- наличный баланс распределителя только при `actor.permissions.includes("distributor.cash.read")`.

Для ролей без `distributor.cash.read` не делать скрытый fetch cash balance.

Если cash balance row еще нет, UI показывает `0 ₽`.

## Shared Contracts

Добавить в `packages/shared/src` файл или расширение доменного файла по текущему стилю:

```ts
export const PaymentMethodSchema = z.enum(["cash", "cashless"]);

export const DistributorSaleStockItemSchema = z.object({
  distributorProductBalanceId: z.string(),
  distributorId: z.string(),
  distributorName: z.string(),
  productBatchId: z.string(),
  productName: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative(),
  stockValueCents: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const DistributorSaleOptionsResponseSchema = z.object({
  items: z.array(DistributorSaleStockItemSchema),
});

export const CreateDistributorSaleRequestSchema = z.object({
  distributorProductBalanceId: z.string().min(1),
  clientId: z.string().min(1),
  quantity: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
  comment: z.string().trim().max(500).optional(),
});

export const DistributorCashBalanceItemSchema = z.object({
  distributorId: z.string(),
  distributorName: z.string(),
  amountCents: z.number().int().nonnegative(),
  updatedAt: z.string().nullable(),
});

export const DistributorCashBalancesResponseSchema = z.object({
  totalAmountCents: z.number().int().nonnegative(),
  items: z.array(DistributorCashBalanceItemSchema),
});
```

Response продажи должен вернуть минимум:

```ts
{
  sale: {
    id: string;
    distributorProductBalanceId: string;
    distributorId: string;
    productBatchId: string;
    clientId: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    paymentMethod: "cash" | "cashless";
    comment: string | null;
    operationId: string;
    actorUserId: string;
    createdAt: string;
  };
  distributorProductBalance: DistributorInventoryItem | null;
  cashBalance: DistributorCashBalanceItem | null;
}
```

Если товарный остаток после продажи стал нулевым, response может вернуть affected balance с `quantity=0` или `null`. Реализация должна быть стабильной и покрыта тестом; предпочтительно вернуть affected balance с `quantity=0`, чтобы frontend мог показать результат при необходимости.

## Prisma / Migration Plan

Добавить модели:

```prisma
model DistributorCashBalance {
  id            String      @id @default(cuid())
  distributorId String      @unique
  amountCents   Int         @default(0)
  updatedAt     DateTime    @updatedAt
  distributor   Distributor @relation(fields: [distributorId], references: [id], onDelete: Restrict)

  @@map("distributor_cash_balance")
}

model DistributorSale {
  id                          String                    @id @default(cuid())
  distributorProductBalanceId String
  distributorId               String
  productBatchId              String
  clientId                    String
  quantity                    Int
  unitPriceCents              Int
  totalCents                  Int
  paymentMethod               String
  comment                     String?
  operationId                 String                    @unique
  actorUserId                 String
  createdAt                   DateTime                  @default(now())
  distributorProductBalance   DistributorProductBalance @relation(fields: [distributorProductBalanceId], references: [id], onDelete: Restrict)
  distributor                 Distributor               @relation(fields: [distributorId], references: [id], onDelete: Restrict)
  productBatch                ProductBatch              @relation(fields: [productBatchId], references: [id], onDelete: Restrict)
  client                      Client                    @relation(fields: [clientId], references: [id], onDelete: Restrict)
  operation                   Operation                 @relation(fields: [operationId], references: [id], onDelete: Restrict)

  @@index([distributorId])
  @@index([productBatchId])
  @@index([clientId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("distributor_sale")
}
```

Также добавить relations:

- `Distributor.cashBalance`;
- `Distributor.sales`;
- `DistributorProductBalance.sales`;
- `ProductBatch.distributorSales`;
- `Client.distributorSales`;
- `Operation.distributorSales`.

Колонки оставить в текущем стиле Prisma schema: camelCase без `@map` на каждое поле.

## API Plan

### `GET /distributor/sale-options`

Rights: `distributor.sale.create`.

Возвращает только ненулевые `DistributorProductBalance.quantity > 0`, связанные с активным распределителем.

Сортировка:

- distributor name asc;
- product name asc;
- updatedAt desc.

Не возвращает клиентов.

### `GET /distributor/cash-balances`

Rights: `distributor.cash.read`.

Возвращает активные/существующие распределители и cash amount:

- если row есть, вернуть `amountCents`;
- если row нет, вернуть `0`;
- `totalAmountCents` сумма по строкам.

Не создает operation/audit.

### `POST /distributor/sales`

Rights: `distributor.sale.create`.

Flow:

- controller валидирует body через shared zod schema;
- policy guard проверяет permission;
- service выполняет transaction;
- ошибки мапятся через общий AppError contract.

Ошибки:

- `VALIDATION_ERROR` для невалидного payload;
- `NOT_FOUND` для отсутствующего balance/client;
- `DOMAIN_RULE_VIOLATION` для inactive distributor и недостаточного остатка;
- `FORBIDDEN` через policy для ролей без права продажи.

## Frontend Plan

Файлы:

- `apps/web/src/features/sales/DistributorSaleHome.tsx`;
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx` или композиция home;
- `apps/web/src/app-shell/AppRoot.tsx`;
- `apps/web/src/lib/api-client.ts`;
- `apps/web/app/page.test.tsx`;
- `apps/web/app/globals.css`, если нужны небольшие стили.

Навигация:

- `commercial_manager` и `distributor_worker` получают реальную вкладку `Продажа`;
- `admin` UI продажи не получает;
- `courier` остается без продажи с распределителя, его продажа будет отдельным этапом;
- `production_manager` не видит cash balance.

Success pattern:

- использовать текущий короткий notice pattern;
- если общего компонента еще нет, допустимо минимально расширить существующую реализацию без глобального toast framework;
- не добавлять spinner-first flow.

## Documentation Plan

Обновить при реализации:

- `docs/crm-requirements.md`:
  - продажа с распределителя;
  - cash/cashless behavior;
  - `DistributorCashBalance`;
  - sale stores price/total snapshot but not client name/phone snapshot.
- `docs/ARCHITECTURE.md`:
  - sale typed detail;
  - cash balance projection;
  - transaction boundaries.
- `docs/DOMAIN-EVENTS.md`:
  - `distributor.sale.create`.
- `docs/HANDLER-MAP.md`:
  - новые distributor sale/cash endpoints.
- `docs/SECURITY.md`:
  - permissions endpoints and cash visibility.
- `docs/FRONTEND.md`:
  - distributor sale screen;
  - inline create client pattern;
  - cash balance visibility;
  - success feedback.
- `docs/DOCS-INDEX.md`:
  - active plan сейчас;
  - completed plan после завершения.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`:
  - после завершения отметить Sales From Distributor закрытым и обновить следующий recommended block.

## Test Plan

### Shared

- sale request accepts valid payload;
- rejects zero/negative/non-integer quantity;
- rejects invalid payment method;
- trims/limits comment;
- cash balance response schema accepts `0` and nullable `updatedAt`;
- sale options schema exposes `distributorProductBalanceId`, not free user-controlled distributor/product pair.

### API Controller / Policy

- invalid body rejected before service with `VALIDATION_ERROR`;
- anonymous user gets `401`;
- `production_manager`, `courier`, `director` get `403` for `POST /distributor/sales`;
- `admin`, `commercial_manager`, `distributor_worker` allowed for sales backend;
- `GET /distributor/sale-options` requires `distributor.sale.create`;
- `GET /distributor/cash-balances` requires `distributor.cash.read`;
- `GET /distributor/cash-balances` does not create operation/audit.

### API Integration With Real Postgres

- cash sale decrements distributor product balance and increments distributor cash balance;
- cashless sale decrements stock and does not change cash balance;
- sale `totalCents = quantity * ProductBatch.priceCents`;
- full sale leaves product balance at zero and hides it from inventory/options;
- repeated cash sales increment existing cash balance;
- missing client rejected and stock/cash unchanged;
- missing balance rejected;
- inactive distributor rejected;
- insufficient stock rejected atomically;
- audit snapshot includes product/distributor/price/quantity/total/payment method/balances before/after;
- audit does not need client name/phone snapshot;
- sale survives later product template price changes because `unitPriceCents/totalCents` are stored in `DistributorSale`;
- cash balance read returns `0` before first cash sale;
- concurrency/double-spend:
  - one unit in stock;
  - two parallel sales attempt to sell one unit;
  - only one succeeds;
  - stock does not go negative;
  - cash balance increments once.

### Frontend

- `Продажа` tab renders real form for `commercial_manager` and `distributor_worker`;
- `admin` does not get sale UI in this stage;
- sale form renders stock options and selected option shows available quantity, price and total;
- submit disabled offline;
- invalid local quantity does not call API and shows inline error;
- backend error remains inline and does not navigate to home;
- new client mini-form can be opened, creates client through `POST /clients`, and selects the created client;
- successful sale calls `POST /distributor/sales`;
- after success active tab becomes `home`, notice `Продажа записана` appears, form state clears;
- inventory, sale-options and cash-balance queries are invalidated/refetched;
- cash balance visible only for actors with `distributor.cash.read`;
- `production_manager` and `courier` do not fetch/show distributor cash balance.

### Verification

Минимальный targeted cycle:

```text
corepack pnpm --filter @buhta/shared test
corepack pnpm --filter @buhta/api typecheck
corepack pnpm --filter @buhta/api exec vitest run test/distributor-sales-controller.test.ts test/distributor-sales-db.integration.test.ts test/policy.test.ts
corepack pnpm --filter @buhta/web lint
corepack pnpm --filter @buhta/web typecheck
corepack pnpm --filter @buhta/web test -- app/page.test.tsx
corepack pnpm docs:check
```

Финальный verification перед коммитом реализации:

```text
corepack pnpm lint
corepack pnpm lint:boundaries
corepack pnpm typecheck
corepack pnpm test
corepack pnpm docs:check
corepack pnpm build
corepack pnpm audit
```

Если real Postgres integration tests падают в sandbox из-за доступа к `localhost:5433`, повторить вне sandbox и явно указать это в completed plan.

## Риски И Rollback

Риски:

- double-spend товара при одновременных продажах;
- cash balance и товарный баланс могут разойтись, если операция не полностью транзакционная;
- UI может перегрузиться, если одновременно показать поиск клиента, создание клиента, товар, цену, количество и оплату;
- bottom nav у ролей распределителя может стать тесной по мере добавления будущих вкладок.

Снижение рисков:

- conditional decrement `DistributorProductBalance.quantity >= quantity`;
- cash update и sale record в той же transaction;
- concurrency integration test;
- sale-options по конкретному `distributorProductBalanceId`;
- компактный collapsible create-client блок;
- cash balance visibility строго по permission.

Rollback:

- если migration еще не применена, удалить новые модели/миграцию и код sales module;
- если migration применена локально, откатить через новую обратную migration только в dev-contour;
- удалить endpoints и shared contracts этапа;
- вернуть вкладку `Продажа` к placeholder;
- документацию вернуть к состоянию до этапа или закрыть план со статусом `Superseded`, если выбран другой подход.

## Критерии Завершения

Этап считается завершенным, когда:

- продажа с распределителя проходит через backend transaction и защищает товарный и cash balance;
- `DistributorSale` хранит `unitPriceCents` и `totalCents`;
- cash/cashless поведение покрыто integration tests;
- concurrency test доказывает отсутствие double-spend;
- роли и permissions покрыты policy/controller tests;
- UI позволяет выбрать существующего клиента или создать нового внутри продажи;
- после успеха пользователь возвращается на distributor home и видит `Продажа записана`;
- cash balance видят только роли с `distributor.cash.read`;
- профильные документы обновлены;
- plan перемещен в completed с фактическими проверками;
- roadmap обновлена по фактическому прогрессу.

## Открытые Вопросы

На старте реализации открытых продуктовых вопросов нет.

Принятые уточнения:

- новый клиент создается из формы продажи только по явному нажатию `Новый клиент`;
- после продажи возвращаем пользователя на distributor home;
- UI продажи для администратора не добавляем;
- наличный баланс распределителя показываем на distributor home только ролям с `distributor.cash.read`;
- продажа создается по `distributorProductBalanceId`;
- `DistributorSale` хранит `unitPriceCents` и `totalCents`.
