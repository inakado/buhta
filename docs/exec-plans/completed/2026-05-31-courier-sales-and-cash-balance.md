# Courier Sales And Courier Cash Balance Plan

Статус: `Completed`
Дата: 2026-05-31
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Courier Sales`

## Цель

Добавить продажу курьером со своего товарного баланса и текущий наличный баланс курьера.

После этапа курьер должен уметь:

- видеть собственный товарный баланс;
- видеть собственный наличный баланс;
- выбрать существующего клиента или создать нового клиента прямо из продажи;
- выбрать продукцию из собственного `CourierProductBalance`;
- оформить продажу наличными или безналом;
- получить понятную ошибку, если товара на балансе недостаточно.

Коммерческий руководитель и Директор должны видеть товарные и наличные балансы курьеров read-only. Администратор должен иметь backend-доступ к courier sale endpoints как супер-пользователь, но отдельный admin UI в этом этапе не делаем.

Backend должен выполнять продажу транзакционно: validate -> policy -> resolve courier scope -> validate client -> conditional decrement courier stock -> optional cash increment -> operation/audit -> response.

## Фактический Результат

Реализовано:

- shared contracts для courier sale options, запроса продажи, ответа продажи и read model наличных балансов курьеров;
- permission `courier.cash.read` отдельно от `courier.sale.create`;
- Prisma-модели `CourierCashBalance` и `CourierSale` с DB check constraints для денежных сумм, количества и способа оплаты;
- operation type `courier.sale.create`;
- backend routes `GET /courier/sale-options`, `GET /courier/cash-balances`, `POST /courier/sales`;
- транзакционная продажа курьером: conditional decrement `courier_product_balance`, cash-only upsert/increment `courier_cash_balance`, `Operation`, `CourierSale`, `AuditLog`;
- cash audit before/after считается от результата cash increment, а не от предварительного read;
- read model наличных балансов возвращает всех видимых курьеров, включая строки `0 ₽` без `CourierCashBalance`;
- service-level scope: курьер продает только со своего баланса и не передает `courierUserId`, коммерческий руководитель и Директор читают cash/product балансы без права продажи, администратор имеет backend-доступ с явным `courierUserId`;
- mobile UI курьера для продажи со своего баланса;
- наличный баланс на home курьера;
- read-only наличные балансы курьеров на экране `Курьеры` для коммерческого руководителя и Директора;
- профильные SoR-документы обновлены по фактической реализации.

Не реализовано намеренно:

- сгрузка товара и наличных курьером;
- возврат наличных на распределитель;
- отдельный admin UI для продажи курьером;
- корректировки, отмены, отчеты и audit UI.

## Текущий Контекст

Уже реализовано:

- `Client` master data, `client.read`/`client.manage`, поиск клиентов и inline создание клиента в продаже с распределителя;
- `DistributorSale` и `DistributorCashBalance` как рабочий паттерн sale fact + cash projection;
- `GET /distributor/sale-options`, `GET /distributor/cash-balances`, `POST /distributor/sales`;
- `CourierProductBalance` как projection товарного остатка курьера по паре `courierUserId + productBatchId`;
- `CourierLoad` и `POST /courier/loads` для self-load курьера с распределителя;
- `GET /courier/product-balances` для собственного баланса курьера и read-only балансов всех курьеров у коммерческого руководителя и Директора;
- permission `courier.sale.create` уже есть в shared permission matrix у `admin` и `courier`;
- вкладка `Продажа` у курьера пока показывает placeholder;
- mobile flow продажи с распределителя уже содержит reusable UX pattern: поиск клиента, inline создание клиента, выбор товара, способ оплаты, итог, success notice.

Сейчас нет:

- projection наличного баланса курьера;
- typed fact продажи курьером;
- operation/audit type для продажи курьером;
- shared contracts для courier sale и courier cash balance;
- API courier sale options, cash balances и create sale;
- UI продажи курьером;
- UI наличного баланса курьера;
- read-only UI наличных балансов курьеров для коммерческого руководителя и Директора;
- real Postgres integration tests для courier sale/cash инвариантов.

Важное ограничение этапа: сгрузка товара и наличных курьером остается следующим этапом. Этот план создает cash projection, на которую дальше ляжет Courier Unload.

## Scope

Входит:

- добавить Prisma-модель `CourierCashBalance` для текущих наличных у курьера;
- добавить Prisma-модель `CourierSale` как typed fact продажи курьером;
- связать courier sale и cash balance с `User` роли `courier`;
- добавить operation type `courier.sale.create`;
- добавить permission `courier.cash.read`;
- добавить shared contracts:
  - варианты товара для продажи курьером;
  - запрос продажи курьером;
  - ответ продажи курьером;
  - read model наличных балансов курьеров;
- расширить backend module `courier`;
- добавить API:
  - `GET /courier/sale-options`;
  - `GET /courier/cash-balances`;
  - `POST /courier/sales`;
- разрешить `POST /courier/sales` только курьеру для продажи со своего баланса и администратору как backend-суперпользователю;
- при админском backend-вызове требовать явный `courierUserId`;
- для обычного курьера запрещать любой переданный `courierUserId`;
- `GET /courier/sale-options`:
  - курьеру возвращает только собственные товарные остатки;
  - администратору возвращает товарные остатки всех курьеров;
  - остальные роли не проходят permission;
- `GET /courier/cash-balances`:
  - курьеру возвращает только собственный наличный баланс;
  - директору возвращает наличные балансы всех курьеров;
  - коммерческому руководителю возвращает наличные балансы всех курьеров;
  - администратору возвращает наличные балансы всех курьеров;
  - для каждого видимого курьера возвращает строку даже без `CourierCashBalance`: `amountCents = 0`, `updatedAt = null`;
- списывать товар только через конкретный `courierProductBalanceId`;
- запрещать продажу сверх товарного остатка курьера;
- увеличивать `CourierCashBalance` только при `paymentMethod = "cash"`;
- не менять cash projection при `paymentMethod = "cashless"`;
- писать `operation` и `audit_log` в той же transaction;
- добавить mobile UI для курьера: форма продажи и cash balance на home;
- добавить read-only наличные балансы в экран курьеров для коммерческого руководителя и Директора;
- покрыть доменные инварианты, permissions, concurrency и frontend flow тестами;
- обновить профильные документы по фактической реализации.

## Out Of Scope

Не входит:

- сгрузка товара и наличных курьером;
- возврат наличных на распределитель;
- списание наличных;
- корректировка или отмена продажи;
- назначение дисконтов;
- отчеты и audit UI;
- отдельный UI для администратора;
- продажа курьером за другого курьера через UI;
- продажа commercial manager или director за курьера;
- изменение цены при продаже;
- snapshot имени или телефона клиента в courier sale fact;
- несколько касс или кошельков внутри одного курьера;
- интеграции с кассой, платежами, телефонией или внешними сервисами.

## Зафиксированные Ответы Перед Планом

1. `courier.cash.read` добавляем отдельным permission.
2. UI наличного баланса курьера входит в этап.
3. Backend admin-flow для courier sale входит в этап.
4. `GET /courier/sale-options` для администратора возвращает все курьерские товарные остатки; UI для этого не делаем.
5. Коммерческий руководитель и Директор не оформляют продажу курьером, только смотрят балансы.

## Доменные Решения Этапа

### 1. Продажа оформляется курьером на себя

Основной пользовательский сценарий:

1. Курьер открывает вкладку `Продажа`.
2. Выбирает существующего клиента или создает нового.
3. Выбирает конкретную строку `CourierProductBalance`.
4. Вводит целое положительное количество.
5. Выбирает способ оплаты: `cash` или `cashless`.
6. Подтверждает продажу.
7. Система уменьшает собственный товарный баланс курьера.
8. Если оплата наличными, система увеличивает собственный наличный баланс курьера.
9. Если оплата безналом, наличный баланс курьера не меняется.

Курьер не выбирает другого курьера-продавца. Продавец определяется из `actor.userId`.

Администратор как супер-пользователь может вызвать backend-команду с явным `courierUserId`, но UI для этого не строится. Это нужно для служебного восстановления или будущей админки, но не меняет основной бизнес-flow.

Коммерческий руководитель и Директор не оформляют продажу за курьера.

### 2. CourierCashBalance как projection

Добавить projection table:

```text
CourierCashBalance
```

Минимальные поля:

- `id`;
- `courierUserId`;
- `amountCents`;
- `updatedAt`;
- relation to `User`;
- unique `courierUserId`.

Правила:

- баланс увеличивается при наличной продаже курьером;
- безналичная продажа не меняет баланс;
- если cash row еще нет, read model показывает `0 ₽`;
- отрицательный наличный баланс невозможен;
- будущая сгрузка курьера будет делать conditional decrement этой projection и increment `DistributorCashBalance`.

### 3. CourierSale как typed fact

Добавить typed table:

```text
CourierSale
```

Минимальные поля:

- `id`;
- `courierProductBalanceId`;
- `courierUserId`;
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

`courierUserId` — чей товарный баланс списан и куда зачисляются наличные при cash sale.

`actorUserId` — кто оформил операцию. В основном flow это тот же пользователь, что и `courierUserId`. Для backend admin flow эти поля могут отличаться.

`unitPriceCents` и `totalCents` фиксируются в sale fact, чтобы будущие отчеты и корректировки не зависели от текущей цены шаблона или join-пересчета старого факта.

`clientId` хранится как ссылка на актуальную карточку клиента. Имя и телефон клиента не snapshot-ятся, как в продаже с распределителя.

### 4. Продажа строится вокруг строки остатка курьера

`CreateCourierSaleRequest` должен принимать `courierProductBalanceId`, а не свободную пару `courierUserId + productBatchId`.

Backend по `courierProductBalanceId` сам загружает:

- курьера-владельца баланса;
- партию продукции;
- цену партии;
- доступное количество.

Это повторяет паттерны продажи с распределителя и courier load: frontend выбирает готовую строку read model, backend сам получает source of truth и проверяет инварианты.

### 5. Транзакция продажи и rollback

`createCourierSale(actor, input)` выполняется в одной Prisma transaction:

1. Определить `targetCourierUserId`:
   - если `actor.role === "courier"` — только `actor.userId`;
   - если `actor.role === "admin"` — `input.courierUserId` обязателен;
   - остальные роли не проходят policy на write endpoint.
2. Для роли `courier` запретить любой переданный `courierUserId`.
3. Проверить, что `targetCourierUserId` существует и имеет роль `courier`.
4. Загрузить `CourierProductBalance` с `courier` и `ProductBatch`.
5. Проверить, что balance row принадлежит `targetCourierUserId`.
6. Проверить, что `Client` существует.
7. Прочитать текущий `CourierCashBalance`, если есть, только для cashless branch и response fallback; для cash branch audit before/after считать только от результата upsert/increment.
8. Выполнить conditional decrement `CourierProductBalance.quantity >= input.quantity`.
9. Если decrement не сработал, выбросить `DOMAIN_RULE_VIOLATION` и откатить transaction.
10. Прочитать `CourierProductBalance` после decrement и зафиксировать:
    - `courierStockBalanceAfter = balanceAfter.quantity`;
    - `courierStockBalanceBefore = courierStockBalanceAfter + input.quantity`.
11. Посчитать:
    - `unitPriceCents = productBatch.priceCents`;
    - `totalCents = input.quantity * unitPriceCents`.
12. Если `paymentMethod === "cash"`:
    - upsert/increment `CourierCashBalance`;
    - зафиксировать `courierCashBalanceAfter` из результата атомарного upsert/increment;
    - вычислить `courierCashBalanceBefore = courierCashBalanceAfter - totalCents`.
13. Если `paymentMethod === "cashless"`:
    - не создавать cash row ради самой продажи;
    - cash before/after равны текущему значению или `0`.
14. Создать `Operation` с типом `courier.sale.create`.
15. Создать `CourierSale`.
16. Создать `AuditLog` один раз с `entityId = courierSale.id`, `courierSaleId` и полными snapshot details.
17. Вернуть sale, affected courier product balance и cash balance item.

Если любой шаг падает, товарный и денежный балансы курьера не должны измениться.

Не читать `courierStockBalanceBefore` отдельным предварительным `findUnique` как источник истины для audit после decrement. При параллельных успешных продажах разных количеств одной партии у одного курьера transaction должны опираться на результат атомарного decrement: `before = after + input.quantity`.

Для cash increment audit не должен опираться на предварительный read `CourierCashBalance`. Две параллельные наличные продажи одного курьера могут прочитать один и тот же old cash balance. Для cash branch источником истины является результат атомарного upsert/increment: `cashAfter` из результата записи, `cashBefore = cashAfter - totalCents`. Предварительный read допустим только для cashless branch и response fallback.

### 6. Audit details

Audit details для `courier.sale.create` должны содержать:

- `courierSaleId`;
- `courierProductBalanceId`;
- `courierUserId`;
- `courierLogin`;
- `productBatchId`;
- `productName`;
- `clientId`;
- `quantity`;
- `unitPriceCents`;
- `totalCents`;
- `paymentMethod`;
- `courierStockBalanceBefore`;
- `courierStockBalanceAfter`;
- `courierCashBalanceBefore`;
- `courierCashBalanceAfter`;
- `comment`.

Историческая читаемость названия продукции и цены обеспечивается через snapshot партии `ProductBatch`. Клиент остается ссылкой на актуальную карточку, как в distributor sale.

### 7. Read permissions и видимость наличных

Добавить отдельный permission:

```text
courier.cash.read
```

`courier.cash.read` используется только для просмотра наличных балансов курьеров. `courier.sale.create` остается write-permission для продажи курьером. Не смешивать read и write в одном permission.

Ролевая матрица:

- `admin`: `courier.cash.read`, `courier.sale.create`;
- `director`: `courier.cash.read`, без `courier.sale.create`;
- `commercial_manager`: `courier.cash.read`, без `courier.sale.create`;
- `courier`: `courier.cash.read`, `courier.sale.create`;
- остальные роли: без courier cash permissions.

Важно: даже при наличии `courier.cash.read` backend ограничивает область данных:

- курьер видит только собственный наличный баланс;
- директор видит наличные балансы всех курьеров;
- коммерческий руководитель видит наличные балансы всех курьеров;
- администратор видит наличные балансы всех курьеров.

### 8. Sale options

`GET /courier/sale-options` возвращает только строки курьерского товарного баланса, которые можно продать:

- `quantity > 0`;
- для `courier` только `courierUserId = actor.userId`;
- для `admin` все курьерские остатки;
- с join на `User` и `ProductBatch`;
- сортировка по курьеру, названию продукции и `updatedAt desc`.

Для курьера это собственные товарные строки для продажи. Для администратора endpoint нужен для backend completeness, UI не делаем.

## UI Решения

### 1. Courier home

На home курьера показывать:

- товарный баланс курьера из `GET /courier/product-balances`;
- наличный баланс курьера из `GET /courier/cash-balances`;
- количество товарных позиций;
- общую товарную стоимость;
- сумму наличных.

Не смешивать товарный баланс и наличные в одну цифру.

### 2. Courier sale flow

Добавить `CourierSaleHome` по паттерну `DistributorSaleHome`:

- поиск клиента через `GET /clients?search=...`;
- выбор клиента;
- inline форма `Новый клиент`;
- выбор продукции из `GET /courier/sale-options`;
- количество;
- способ оплаты: `Наличные` / `Безнал`;
- комментарий;
- итоговая сумма;
- submit `POST /courier/sales`.

После успешной продажи:

- очистить форму;
- вернуть active tab на `home`;
- показать success notice `Продажа записана`;
- invalidate:
  - `courier/product-balances`;
  - `courier/sale-options`;
  - `courier/cash-balances`;
  - `clients`;
  - при необходимости `distributor/inventory` не инвалидировать, потому что продажа курьером не меняет распределитель.

Offline:

- submit disabled, когда `online=false`;
- inline создание клиента disabled, когда `online=false`;
- read endpoints могут оставаться доступными через текущий server-state behavior.

### 3. Commercial/director courier balances

Экран `Курьеры` для коммерческого руководителя и Директора должен показывать:

- товарные балансы курьеров;
- наличные балансы курьеров;
- общий cash summary;
- summary по каждому курьеру, где видно товарные единицы, товарную стоимость и наличные.

`GET /courier/cash-balances` должен сам гарантировать cash item для каждого видимого курьера. Combined summary товар + наличные на экране `Курьеры` можно считать в UI из двух стабильных read models: `GET /courier/product-balances` и `GET /courier/cash-balances`. Не делать скрытый непредсказуемый join в UI поверх отсутствующих cash rows.

Write controls на этом экране отсутствуют.

### 4. Admin UI

Не добавлять отдельный admin UI. Admin backend access проверяется API/integration tests.

## Предлагаемая Схема БД

Добавить связи:

```prisma
model User {
  courierCashBalance CourierCashBalance? @relation("CourierCashBalanceCourier")
  courierSales       CourierSale[]       @relation("CourierSaleCourier")
}

model Operation {
  courierSales CourierSale[]
}

model ProductBatch {
  courierSales CourierSale[]
}

model Client {
  courierSales CourierSale[]
}

model CourierProductBalance {
  sales CourierSale[]
}
```

Новые модели:

```prisma
model CourierCashBalance {
  id            String   @id @default(cuid())
  courierUserId String   @unique
  amountCents   Int      @default(0)
  updatedAt     DateTime @updatedAt
  courier       User     @relation("CourierCashBalanceCourier", fields: [courierUserId], references: [id], onDelete: Restrict)

  @@map("courier_cash_balance")
}

model CourierSale {
  id                      String                @id @default(cuid())
  courierProductBalanceId String
  courierUserId           String
  productBatchId          String
  clientId                String
  quantity                Int
  unitPriceCents          Int
  totalCents              Int
  paymentMethod           String
  comment                 String?
  operationId             String                @unique
  actorUserId             String
  createdAt               DateTime              @default(now())
  courierProductBalance   CourierProductBalance @relation(fields: [courierProductBalanceId], references: [id], onDelete: Restrict)
  courier                 User                  @relation("CourierSaleCourier", fields: [courierUserId], references: [id], onDelete: Restrict)
  productBatch            ProductBatch          @relation(fields: [productBatchId], references: [id], onDelete: Restrict)
  client                  Client                @relation(fields: [clientId], references: [id], onDelete: Restrict)
  operation               Operation             @relation(fields: [operationId], references: [id], onDelete: Restrict)

  @@index([courierProductBalanceId])
  @@index([courierUserId])
  @@index([productBatchId])
  @@index([clientId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("courier_sale")
}
```

Migration должна добавить DB constraints:

- `courier_cash_balance_amount_check`: `amountCents >= 0`;
- `courier_sale_quantity_check`: `quantity > 0`;
- `courier_sale_unit_price_check`: `unitPriceCents >= 0`;
- `courier_sale_total_check`: `totalCents >= 0`;
- `courier_sale_payment_method_check`: `paymentMethod IN ('cash', 'cashless')`.

Для новых денежных и товарных таблиц принимаем усиленный стандарт: базовые non-negative/positive инварианты дублируются DB check constraints поверх application-level checks. Приведение старых таблиц к тому же стандарту не входит в этот этап; если потребуется, это отдельный tech debt.

## Shared Contracts

Добавить в `packages/shared/src/courier.ts`:

```text
CourierSaleOption
CourierSaleOptionsResponse
CreateCourierSaleRequest
CourierCashBalanceItem
CourierCashBalancesResponse
CourierSale
CourierSaleResponse
```

`CourierSaleOption`:

- `courierProductBalanceId`;
- `courierUserId`;
- `courierLogin`;
- `courierDisplayName`;
- `productBatchId`;
- `productName`;
- `unitPriceCents`;
- `availableQuantity`;
- `stockValueCents`;
- `updatedAt`.

`CreateCourierSaleRequest`:

- `courierProductBalanceId: string`;
- `clientId: string`;
- `quantity: positive int`;
- `paymentMethod: "cash" | "cashless"`;
- `courierUserId?: string` admin-only;
- `comment?: string max 500`.

`CourierCashBalancesResponse`:

- `totalAmountCents`;
- `courierCount`;
- `items`.

`CourierCashBalanceItem`:

- `courierUserId`;
- `courierLogin`;
- `courierDisplayName`;
- `amountCents`;
- `updatedAt: string | null`.

`CourierSaleResponse`:

- `sale`;
- `courierProductBalance`;
- `cashBalance`.

`cashBalance` в `CourierSaleResponse` всегда non-null. При cashless sale без существующей cash row backend возвращает cash balance item целевого курьера с `amountCents = 0` и `updatedAt = null`, чтобы UI не делал special-case nullable branch.

## API Контракты

```text
GET /courier/sale-options
GET /courier/cash-balances
POST /courier/sales
```

Permissions:

- `GET /courier/sale-options` -> `courier.sale.create`;
- `GET /courier/cash-balances` -> `courier.cash.read`;
- `POST /courier/sales` -> `courier.sale.create`.

Response `GET /courier/sale-options`:

```json
{
  "items": [
    {
      "courierProductBalanceId": "string",
      "courierUserId": "string",
      "courierLogin": "courier",
      "courierDisplayName": "Courier",
      "productBatchId": "string",
      "productName": "Икра горбуши",
      "unitPriceCents": 125000,
      "availableQuantity": 2,
      "stockValueCents": 250000,
      "updatedAt": "2026-05-31T00:00:00.000Z"
    }
  ]
}
```

Response `GET /courier/cash-balances`:

```json
{
  "totalAmountCents": 125000,
  "courierCount": 1,
  "items": [
    {
      "courierUserId": "string",
      "courierLogin": "courier",
      "courierDisplayName": "Courier",
      "amountCents": 125000,
      "updatedAt": "2026-05-31T00:00:00.000Z"
    }
  ]
}
```

Для курьера response содержит одну строку собственного баланса. Если row еще нет, backend возвращает `amountCents = 0` и `updatedAt = null`. Для Директора, коммерческого руководителя и администратора response содержит всех пользователей с ролью `courier`, включая курьеров без cash row.

Request `POST /courier/sales`:

```json
{
  "courierProductBalanceId": "string",
  "clientId": "string",
  "quantity": 1,
  "paymentMethod": "cash",
  "comment": "optional"
}
```

Admin-only variant:

```json
{
  "courierUserId": "string",
  "courierProductBalanceId": "string",
  "clientId": "string",
  "quantity": 1,
  "paymentMethod": "cash"
}
```

## Implementation Steps

1. Добавить shared schemas/types для courier sale и courier cash balance.
2. Добавить permission `courier.cash.read` и обновить role permission matrix.
3. Обновить shared tests:
   - permission matrix;
   - валидный sale request;
   - invalid quantity;
   - invalid payment method;
   - cash balance response.
4. Обновить Prisma schema:
   - `CourierCashBalance`;
   - `CourierSale`;
   - relations.
5. Создать migration:
   - tables;
   - indexes;
   - FKs;
   - check constraints.
6. Выполнить `prisma format` и `prisma generate`.
7. Расширить `apps/api/src/operations/operation.types.ts`.
8. Расширить courier mapper:
   - sale options;
   - cash balance items;
   - sale response.
9. Расширить `CourierService`:
   - `getSaleOptions(actor)`;
   - `getCashBalances(actor)`;
   - `createCourierSale(actor, input)`;
   - helpers для role/scope checks.
10. Расширить `CourierController`:
    - `GET /courier/sale-options`;
    - `GET /courier/cash-balances`;
    - `POST /courier/sales`.
11. Добавить controller tests.
12. Добавить policy tests.
13. Добавить real Postgres integration tests.
14. Расширить API client в web.
15. Добавить `CourierSaleHome`.
16. Обновить `CourierBalanceHome`, чтобы показывать cash balance.
17. Подключить courier sale tab вместо placeholder.
18. Обновить commercial/director courier read-only screen.
19. Обновить web tests.
20. Обновить профильные docs.
21. Прогнать verification.
22. После реализации перенести план в `completed` и зафиксировать фактические проверки.

## Test Plan

### Shared

- `courier.cash.read` есть у `admin`, `director`, `commercial_manager`, `courier`;
- `courier.cash.read` отсутствует у `production_manager`, `distributor_worker`;
- `courier.sale.create` остается только у `admin`, `courier`;
- valid `CreateCourierSaleRequest` проходит;
- `quantity <= 0` отклоняется;
- invalid `paymentMethod` отклоняется;
- optional comment trim/max length работает;
- cash balance response shape валиден.

### API/controller

- `GET /courier/sale-options` вызывает service с actor;
- `GET /courier/cash-balances` вызывает service с actor;
- `POST /courier/sales` валидирует body и actor;
- invalid body возвращает `VALIDATION_ERROR`.

### Policy

- `courier` имеет `courier.sale.create` и `courier.cash.read`;
- `admin` имеет `courier.sale.create` и `courier.cash.read`;
- `director` имеет `courier.cash.read`, но не `courier.sale.create`;
- `commercial_manager` имеет `courier.cash.read`, но не `courier.sale.create`;
- `production_manager` и `distributor_worker` не имеют courier cash/sale write permissions.

### Real Postgres integration

- happy path: курьер продает товар со своего баланса за наличные;
- товарный баланс курьера уменьшается;
- cash sale увеличивает `CourierCashBalance`;
- cashless sale не меняет `CourierCashBalance`;
- `CourierSaleResponse` после cashless sale без cash row возвращает non-null cash item с `0 ₽`;
- read cash balance возвращает `0 ₽`, если cash row еще нет;
- director/commercial/admin cash read возвращает всех курьеров, включая курьеров с `0 ₽` и `updatedAt = null`;
- повторная cash sale increment-ит existing `CourierCashBalance`;
- две параллельные cash sale при достаточном товарном остатке увеличивают `CourierCashBalance` ровно на сумму обеих продаж;
- audit для параллельных cash sale использует cash before/after из результата atomic increment, без дублирования одного old before;
- недостаточный остаток отклоняется и не меняет товарный/cash balance;
- отсутствующий клиент отклоняется;
- отсутствующий `courierProductBalanceId` возвращает `NOT_FOUND`;
- courier actor не может продать с чужого courier balance;
- courier actor не может передать `courierUserId`;
- admin backend flow может продать с явным `courierUserId`;
- admin backend flow отклоняется, если `courierProductBalanceId` принадлежит другому courier user;
- admin backend flow отклоняет `courierUserId`, если пользователь не role `courier`;
- commercial manager не проходит write permission;
- director не проходит write permission;
- director/commercial/admin могут читать наличные балансы всех курьеров;
- courier читает только собственный наличный баланс;
- audit log содержит snapshot и balances before/after;
- concurrent sales не создают отрицательный товарный остаток и не теряют cash increment.

### Frontend

- courier home показывает товарный и наличный баланс;
- courier открывает `Продажа`, выбирает клиента, товар, количество, способ оплаты и submit вызывает API;
- inline создание клиента работает в courier sale flow;
- cash/cashless выбор попадает в payload;
- offline submit disabled;
- после success показывается notice `Продажа записана` и обновляются query keys;
- commercial manager видит read-only товарные и наличные балансы курьеров;
- director видит read-only товарные и наличные балансы курьеров;
- admin UI для courier sales не появляется.

## Full Verification

Фактически выполнено перед завершением этапа:

- `corepack pnpm --filter @buhta/shared test` — passed, 12 tests;
- `corepack pnpm --filter @buhta/api typecheck` — passed;
- `corepack pnpm --filter @buhta/web typecheck` — passed;
- `corepack pnpm --filter @buhta/api exec vitest run test/courier-controller.test.ts test/courier-db.integration.test.ts test/policy.test.ts` — passed, 30 tests, outside sandbox for local PostgreSQL;
- `corepack pnpm --filter @buhta/web test -- app/page.test.tsx` — passed, 20 tests;
- `corepack pnpm docs:check` — passed;
- `corepack pnpm lint` — passed;
- `corepack pnpm lint:boundaries` — passed;
- `corepack pnpm typecheck` — passed;
- `corepack pnpm test` — passed: shared 12, API 107, web 20 tests;
- `corepack pnpm build` — passed outside sandbox; sandbox run failed with Turbopack `EPERM` while binding to a local port;
- `corepack pnpm audit` — passed, no known vulnerabilities;
- `corepack pnpm smoke` — passed outside sandbox: API health and web home.

Browser sanity:

- real browser opened `http://localhost:3001`;
- login screen rendered;
- courier login attempt was blocked by runtime CORS response from the already-running local API: preflight did not include `Access-Control-Allow-Credentials: true`;
- repository code has `app.enableCors({ credentials: true })`, so this looks like a stale/local API process issue rather than an implementation regression in this stage;
- courier sale and commercial read-only UI are covered by component tests and backend integration tests listed above.

Примечание: real Postgres integration tests, Prisma migrate/deploy, `pnpm build`, `pnpm smoke` и `pnpm audit` могут требовать запуск вне sandbox по уже зафиксированным ограничениям `docs/DEVELOPMENT.md`.

## Затронутые Документы

Обновить во время или после реализации:

- `docs/crm-requirements.md` — наличный баланс курьера, права и фактический sale behavior;
- `docs/ARCHITECTURE.md` — courier cash projection и courier sale typed fact;
- `docs/DOMAIN-EVENTS.md` — добавить `courier.sale.create`;
- `docs/HANDLER-MAP.md` — добавить фактические courier sale endpoints после реализации;
- `docs/SECURITY.md` — добавить `courier.cash.read` и read/write scope;
- `docs/FRONTEND.md` — описать courier sale UI и cash balance display;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — обновить прогресс после завершения этапа;
- `docs/DOCS-INDEX.md` — добавить active plan и после завершения обновить ссылку на completed.

## Затронутые Модули И Файлы

Ожидаемые изменения:

- `packages/shared/src/courier.ts`;
- `packages/shared/src/index.test.ts`;
- `packages/shared/src/permissions.ts`;
- `apps/api/prisma/schema.prisma`;
- `apps/api/prisma/migrations/<timestamp>_courier_sales_and_cash_balance/migration.sql`;
- `apps/api/src/courier/courier.controller.ts`;
- `apps/api/src/courier/courier.mapper.ts`;
- `apps/api/src/courier/courier.service.ts`;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/test/courier-controller.test.ts`;
- `apps/api/test/courier-db.integration.test.ts`;
- `apps/api/test/policy.test.ts`;
- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/app-shell/AppRoot.tsx`;
- `apps/web/src/features/courier/CourierBalanceHome.tsx`;
- `apps/web/src/features/courier/CourierSaleHome.tsx`;
- `apps/web/app/page.test.tsx`;
- профильные docs.

## Риски И Rollback

Риски:

- смешать `courier.cash.read` и `courier.sale.create`;
- случайно дать commercial manager или director write-доступ к продаже курьером;
- позволить курьеру продать с чужого товарного баланса;
- не учесть concurrent sale и получить отрицательный товарный остаток курьера;
- не учесть concurrent cash sale и потерять часть cash increment или записать неверный audit before/after;
- при cashless sale случайно изменить cash balance;
- преждевременно начать Courier Unload внутри этого этапа;
- дублировать слишком много кода `DistributorSaleHome` без общего решения.

Mitigation:

- разделить `courier.cash.read` и `courier.sale.create`;
- проверять target courier внутри service, а не только в UI;
- использовать conditional decrement `CourierProductBalance.quantity >= requestedQuantity`;
- покрыть concurrency integration test;
- явно тестировать cash и cashless отдельно;
- оставить unload out of scope;
- если UI продажи с распределителя и курьера начнет сильно дублироваться, не выделять общий компонент в этом этапе без явной пользы; можно оставить локальное дублирование и вынести позже после второго рабочего flow.

Rollback:

- если миграция еще не применена в shared dev DB, удалить migration и schema changes;
- если применена локально, создать обратную миграцию, удаляющую `courier_sale` и `courier_cash_balance` после удаления зависимых test/dev rows;
- UI можно отключить через role routing, оставив backend недоступным без permission.

## Критерии Завершения

Этап считается завершенным, когда:

- courier sale transaction реализована и покрыта real Postgres tests;
- курьер не может продать с чужого товарного баланса;
- commercial manager и Директор не могут оформлять продажу курьером;
- commercial manager и Директор видят наличные балансы курьеров read-only;
- администратор имеет backend-доступ без отдельного UI;
- cash sale увеличивает `CourierCashBalance`;
- cashless sale не меняет `CourierCashBalance`;
- товарный баланс курьера не уходит в минус;
- concurrent sales не создают отрицательный остаток;
- concurrent cash sales не теряют cash increment;
- audit/operation пишутся в той же transaction;
- courier UI позволяет оформить продажу online;
- courier home показывает товарный и наличный баланс;
- docs обновлены по фактической реализации;
- план перемещен в `docs/exec-plans/completed/` с фактически выполненными проверками.

## Открытые Вопросы

Нет открытых продуктовых вопросов перед началом реализации. Ответы по `courier.cash.read`, cash UI, admin backend-flow, admin sale options и read-only ролям зафиксированы в разделе “Зафиксированные Ответы Перед Планом”.
