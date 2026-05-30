# Distributor Inventory Read Model Plan

Статус: `Active`
Дата: 2026-05-30
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Distributor Inventory Read Model`

## Цель

Добавить read-only контур остатков распределителя после перемещения продукции из цеха.

После этапа роли с правом `distributor.stock.read` должны уметь:

- видеть товарные остатки распределителя по партиям продукции;
- видеть количество единиц на распределителе;
- видеть товарный баланс распределителя в рублях как `quantity * priceCents`;
- видеть цену и snapshot-название продукции из партии, а не текущую цену шаблона;
- получить понятное пустое состояние, если на распределителе пока нет продукции.

Backend должен читать существующую projection table `distributor_product_balance` и возвращать стабильный read model без изменения остатков, денег или истории.

## Анализ текущего состояния

Сейчас уже есть:

- `Distributor` как справочник с `active`;
- `ProductBatch` со snapshot названия продукции и `priceCents`;
- `DistributorProductBalance` по паре `distributorId + productBatchId`;
- перемещение продукции из цеха на распределитель, которое увеличивает `DistributorProductBalance`;
- permission `distributor.stock.read` у всех v1 ролей;
- placeholder-экраны для директора, коммерческого руководителя, работника распределителя и курьера;
- production UI заведующего производством с отдельным производственным flow.

Сейчас нет:

- отдельного read API для товарных остатков распределителя;
- distributor summary с количеством единиц и рублевым товарным балансом;
- shared contracts для distributor inventory read model;
- frontend feature для просмотра остатков распределителя;
- role routing, который показывает реальные остатки ролям с `distributor.stock.read`;
- тестов read-доступа к остаткам распределителя.

Важный вывод: этот этап должен быть read-only. Он не должен добавлять продажи, клиентов, cash balance, курьерскую загрузку или новые товарные операции.

## Scope

Входит:

- добавить shared zod contracts для distributor inventory read model;
- добавить backend read service/controller для остатков распределителя;
- добавить endpoints под permission `distributor.stock.read`;
- читать только ненулевые `DistributorProductBalance`;
- группировать/возвращать остатки по распределителю и партии;
- считать `stockValueCents = quantity * priceCents` на backend;
- считать summary:
  - `distributorCount`;
  - `stockItemCount`;
  - `totalUnits`;
  - `totalStockValueCents`;
- вернуть простую per-distributor summary по тем же ненулевым остаткам;
- показывать товарный баланс в рублях в UI;
- подключить read-only экран остатков распределителя для ролей с `distributor.stock.read`;
- добавить loading/error/empty states;
- добавить backend и frontend tests;
- обновить документацию и roadmap по фактическому результату.

## Out Of Scope

Не входит:

- денежный баланс распределителя;
- продажи с распределителя;
- клиенты;
- загрузка продукции курьеру;
- баланс курьера;
- списания наличных;
- дисконты;
- корректировки остатков;
- история операций с фильтрами;
- отдельные складские зоны внутри распределителя;
- ручное изменение остатков распределителя;
- новые permissions.

## Доменные решения этапа

### 1. Read model строится из `DistributorProductBalance`

`DistributorProductBalance` остается projection текущего товарного остатка распределителя.

Правила:

- read endpoints не меняют состояние;
- нулевые остатки скрываются из основного списка;
- цена берется из `ProductBatch.priceCents`;
- название продукции берется из `ProductBatch.productName`;
- текущий `ProductTemplate.priceCents` не используется для расчета остатков;
- текущий `Distributor.name` можно использовать для текущего read model;
- историческая читаемость переименований уже обеспечивается audit snapshot в операциях перемещения.

### 2. Рублевый товарный summary

В этом этапе добавить только товарную стоимость остатков:

```text
stockValueCents = DistributorProductBalance.quantity * ProductBatch.priceCents
```

Это не cash balance и не выручка. Это оценка текущего товарного остатка распределителя по зафиксированной цене партии.

Правила:

- `totalStockValueCents` считается суммой по ненулевым остаткам;
- frontend показывает значение в рублях через существующие money helpers;
- безналичные/наличные деньги в этом этапе не моделируются.

### 3. Доступ ролей

Использовать существующий permission:

```text
distributor.stock.read
```

Роли, которые должны видеть read model:

- `admin`;
- `director`;
- `production_manager`;
- `commercial_manager`;
- `distributor_worker`;
- `courier`.

Не добавлять новый permission. Если позже понадобится разделить просмотр собственного/общего распределителя, это будет отдельное решение.

### 4. UI placement

Не строить отдельную большую навигацию для всех будущих ролей.

Минимальное размещение:

- создать feature `apps/web/src/features/distributor/DistributorInventoryHome.tsx`;
- для ролей кроме `production_manager` показывать этот экран на `home`, если есть `distributor.stock.read`;
- для `production_manager` добавить отдельный раздел/таб `Распределитель` в нижнюю навигацию рядом с текущими production tabs;
- для `admin` в этом этапе не подключать отдельный UI, чтобы не усложнять admin navigation до audit/reports/admin navigation; backend/API read-доступ admin обязателен и должен быть покрыт тестами.

Причина: коммерческий руководитель, работник распределителя и курьер дальше будут развиваться вокруг распределителя, продаж и загрузки; production manager сохраняет основной production home, но должен иметь быстрый read-only просмотр остатков распределителя.

## Shared contracts

В `packages/shared/src` добавить отдельный файл или расширить существующий доменный файл по текущему стилю проекта:

```text
DistributorInventoryItem
DistributorInventorySummary
DistributorInventoryResponse
```

Минимальный item:

```ts
{
  id: string;
  distributorId: string;
  distributorName: string;
  productBatchId: string;
  productName: string;
  priceCents: number;
  quantity: number;
  stockValueCents: number;
  updatedAt: string;
}
```

Минимальный summary:

```ts
{
  distributorCount: number;
  stockItemCount: number;
  totalUnits: number;
  totalStockValueCents: number;
}
```

`stockItemCount` — количество ненулевых строк `DistributorProductBalance`, возвращенных в `items`. Не группировать разные партии с одинаковым `productName`, потому что партии могут иметь разную snapshot-цену.

Обязательная per-distributor summary:

```ts
{
  distributorId: string;
  distributorName: string;
  stockItemCount: number;
  totalUnits: number;
  totalStockValueCents: number;
}
```

Response shape:

```ts
{
  summary: DistributorInventorySummary;
  distributorSummaries: DistributorInventoryDistributorSummary[];
  items: DistributorInventoryItem[];
}
```

Не добавлять cash fields в этих contracts.

## API plan

Добавить backend module или минимальный controller/service в новой доменной зоне:

```text
apps/api/src/distributor/
```

Минимальные endpoints:

- `GET /distributor/inventory`
  - возвращает summary и список остатков;
  - защищен `distributor.stock.read`;
  - скрывает `quantity = 0`.

Если per-distributor drill-down нужен для чистой структуры:

- `GET /distributor/inventory/:distributorId`
  - можно отложить, если общий endpoint с grouped items закрывает UI.

Предпочтение для этапа: один endpoint `GET /distributor/inventory`, потому что v1 пока исходит из одного распределителя, но модель допускает несколько.

## Backend implementation steps

1. Добавить shared contracts и exports.
2. Добавить `DistributorModule`, `DistributorController`, `DistributorService`, mapper.
3. Подключить module в `AppModule`.
4. Реализовать query:
   - `prisma.distributorProductBalance.findMany`;
   - `where: { quantity: { gt: 0 } }`;
   - `include: { distributor: true, productBatch: true }`;
   - сортировка: distributor name asc, product name asc, updatedAt desc.
5. Смапить item с `stockValueCents`.
6. Сформировать общий summary и per-distributor summary.
7. Защитить controller через `@RequirePermission("distributor.stock.read")` + `PolicyGuard`.
8. Добавить typed controller validation не требуется, потому что endpoints read-only без body.
9. Не создавать operation/audit для read endpoints.

## Frontend implementation steps

1. Добавить API client function `getDistributorInventory()`.
2. Добавить `DistributorInventoryHome`:
   - summary card `Товар на распределителе`;
   - `totalUnits`;
   - `totalStockValueCents` в рублях;
   - список остатков по продукции;
   - distributor name в строке/карточке;
   - empty state `На распределителе пока нет продукции`;
   - loading state;
   - user-facing error state.
3. Подключить экран в `AppRoot`:
   - `production_manager`: новый tab `Распределитель`;
   - `commercial_manager`, `distributor_worker`, `courier`, `director`: `home` показывает distributor inventory вместо generic placeholder;
   - `settings` остается общим профилем;
   - `sale` остается placeholder до sales этапа.
4. Держать `AppRoot` тонким:
   - `AppRoot` только выбирает экран по роли и tab id;
   - загрузка данных, rendering summary, списков, empty/loading/error states живут в `features/distributor/DistributorInventoryHome.tsx`;
   - не добавлять бизнес-логику и вычисления inventory в `AppRoot`;
   - если потребуется внутренняя маршрутизация distributor screens, делать ее внутри `features/distributor`, а не раздувать `AppRoot`.
5. Обновить production navigation аккуратно:
   - production tabs должны остаться рабочими;
   - `production_manager` получает tab `Распределитель`;
   - `isProductionTab` или его аналог не должен ломать текущую production home.
6. Не добавлять write-действия на этом экране.
7. Не показывать cash balance.
8. Использовать existing CSS patterns: `summary-card`, `detail-list-panel`, `entity-card`, `screen-stack`.

## Затронутые документы

- `docs/crm-requirements.md`
  - уточнить, что distributor inventory read model уже показывает товарные остатки и товарную стоимость, но не cash balance.
- `docs/ARCHITECTURE.md`
  - добавить distributor read module и read model из `distributor_product_balance`.
- `docs/HANDLER-MAP.md`
  - добавить distributor inventory endpoint.
- `docs/SECURITY.md`
  - подтвердить `distributor.stock.read` для read-only inventory.
- `docs/FRONTEND.md`
  - описать placement distributor inventory screen для ролей.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`
  - обновить прогресс после completion.
- `docs/DOCS-INDEX.md`
  - добавить этот active plan.

## Затронутые модули

- `packages/shared/src` — distributor inventory contracts.
- `apps/api/src/distributor` — новый read module/controller/service/mapper.
- `apps/api/src/app.module.ts` — подключение module.
- `apps/web/src/lib/api-client.ts` — API client function.
- `apps/web/src/features/distributor` — read-only UI.
- `apps/web/src/app-shell/AppRoot.tsx` — role routing/nav.
- Tests:
  - `packages/shared/src/index.test.ts`;
  - новый `apps/api/test/distributor-inventory-db.integration.test.ts`;
  - `apps/api/test/policy.test.ts` или controller test для permission boundary;
  - `apps/web/app/page.test.tsx` или отдельный feature test.

## Tests

### Shared/unit

- validates empty inventory response;
- validates item with `stockValueCents`;
- rejects negative quantity/value;
- rejects non-integer money/quantity fields.

### API integration with real Postgres

1. Empty state:
   - no distributor balances -> summary zeros and empty items.
2. Happy path:
   - create product batch;
   - transfer to distributor;
   - inventory endpoint returns item with product snapshot and `stockValueCents`.
3. Multiple batches:
   - same product name or different product names from different batches;
   - totals sum units and value correctly.
4. Multiple distributors:
   - response includes balances from both active distributors;
   - summary has correct `distributorCount`.
   - `distributorSummaries` contains one summary per distributor with non-zero stock.
5. Zero balances hidden:
   - `quantity = 0` row is not returned.
6. Snapshot price safety:
   - update product template price after batch release;
   - inventory still uses `ProductBatch.priceCents`.
7. Permission:
   - anonymous request -> `401`;
   - role with `distributor.stock.read` -> allowed.

Разделить тесты доступа и тесты данных:

- service/integration tests проверяют данные, summary, нулевые остатки и snapshot price;
- controller/HTTP или guard-level test проверяет permission boundary:
  - anonymous request -> `401`;
  - actor с `distributor.stock.read` -> `200`;
  - искусственный actor без `distributor.stock.read` -> `403`.

Все реальные v1 роли сейчас имеют `distributor.stock.read`, поэтому `403` нужно покрыть искусственным actor/mock guard context, не меняя реальные роли ради теста.

Read endpoints не создают `operation` и `audit_log`; это нужно покрыть тестом или проверить в integration test через отсутствие новых audit records после read-запроса.

### Frontend

- role with distributor stock access sees summary card and inventory list;
- empty state renders when list empty;
- production manager has `Распределитель` tab and keeps production `Главная`;
- sale tab remains placeholder;
- money value renders in rubles;
- loading/error states do not overlap layout.

### Verification commands

Targeted during implementation:

```bash
corepack pnpm --filter @buhta/shared test
corepack pnpm --filter @buhta/api typecheck
corepack pnpm --filter @buhta/api exec vitest run test/distributor-inventory-db.integration.test.ts
corepack pnpm --filter @buhta/web test -- app/page.test.tsx
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

- API integration tests need local Postgres on `localhost:5433`.
- If Prisma/Postgres access fails in sandbox, repeat targeted DB tests outside sandbox and record it.
- If Next/Turbopack build fails in sandbox on port binding, repeat build outside sandbox and record it.

## Risks

### Risk: товарный summary примут за cash balance

Mitigation:

- назвать поле и UI как `Товарный баланс`, не `Деньги` и не `Выручка`;
- не добавлять cash fields в contracts;
- явно обновить docs.

### Risk: AppRoot станет перегруженным role routing

Mitigation:

- вынести inventory UI в `features/distributor`;
- в `AppRoot` оставить только routing decision;
- не реализовывать будущие sales/courier screens в этом этапе.

### Risk: multiple distributors усложнят первый UI

Mitigation:

- показывать distributor name в каждой строке;
- summary считать общий;
- отдельный drill-down по distributor отложить до реальной необходимости.

### Risk: устаревшие строки с нулевым остатком засорят UI

Mitigation:

- read query фильтрует `quantity > 0`;
- тест покрывает скрытие нулей.

## Rollback

Миграции, скорее всего, нет. Rollback до commit:

- удалить distributor read module/API contracts/UI;
- вернуть `AppRoot` routing;
- удалить строки из docs/HANDLER-MAP/FRONTEND/ARCHITECTURE/SECURITY;
- удалить этот plan или отметить `Superseded`, если выбран другой следующий этап.

После commit rollback обычным revert commit. Данных read-only этап не меняет.

## Open questions

1. Нужен ли endpoint `GET /distributor/inventory/:distributorId` сразу, если в UI пока достаточно общего списка?
   - Текущее решение плана: не добавлять.
2. Показывать ли inactive distributors, если у них есть остаток?
   - Текущее решение плана: показывать текущий товарный остаток независимо от `Distributor.active`, потому что archive не должен скрывать историю/остаток. Новые перемещения на inactive уже запрещены.
3. Подключать ли экран распределителя для `admin` в UI сейчас?
   - Текущее решение плана: не подключать admin UI в этом этапе; backend/API access для admin покрыть обязательно.

## Критерии завершения

Этап считается завершенным, когда:

- `GET /distributor/inventory` возвращает summary и ненулевые остатки;
- `totalStockValueCents` считается из `ProductBatch.priceCents`;
- роли с `distributor.stock.read` имеют backend read access;
- `admin` покрыт backend/API tests, но отдельный admin UI не входит в scope этапа;
- frontend показывает товарный остаток и рублевый товарный баланс;
- production manager сохраняет production home и получает read-only tab распределителя;
- cash balance, продажи, клиенты и courier operations не добавлены;
- targeted и полный verification contour выполнены;
- docs обновлены;
- plan перемещен в `completed`, roadmap обновлен.
