# Discounts Priced Stock Plan

Статус: `Completed`.
Дата: 2026-06-04.
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Discounts`.

## Цель

Добавить заранее назначаемый дисконт на конкретное количество товарного остатка.

В терминах продукта это не ручная скидка в момент продажи и не акция/промокод, а управленческое действие:

- Директор выбирает конкретную строку остатка на распределителе;
- задает количество и новую итоговую цену за штуку;
- система отделяет это количество в отдельную priced stock row;
- продавец или курьер дальше продает эту строку по уже заданной цене;
- цена дисконта сохраняется при загрузке курьеру и возврате обратно на распределитель;
- продажи фиксируют базовую цену, фактическую цену и сумму дисконта.

## Принятые Решения

Ответы на product review:

- этап включает только дисконты, без корректировок и отмен продаж;
- назначать дисконт могут `director` и `admin`;
- дисконт задается как итоговая цена за штуку в рублях, не процентом;
- итоговая цена должна быть строго больше `0`;
- дисконтированный остаток можно загрузить курьеру и вернуть обратно, цена должна сохраниться;
- основной UI назначения дисконта находится у Директора во вкладке `Распределитель`, рядом с товарными строками.

## Фактически Выполнено

- Balance projections распределителя и курьера переведены на priced stock через `unitPriceCents` и unique по владельцу, партии и фактической цене.
- Добавлена операция `distributor.discount.assign`, модель `ProductDiscountAssignment`, permission `discount.assign` для `admin` и `director`, endpoint `POST /distributor/discounts`.
- Продажи распределителя и курьера, загрузка курьера, возврат курьера и производственная передача сохраняют price snapshot: базовая цена, фактическая цена, дисконт и стоимость строки.
- UI Директора во вкладке `Распределитель` получил действие `Снизить цену`; остальные impacted screens показывают фактическую цену главным числом, а базовую цену и badge `Дисконт` только для discounted rows.
- SoR-документы обновлены по финальному поведению: `crm-requirements`, `ARCHITECTURE`, `DOMAIN-EVENTS`, `HANDLER-MAP`, `SECURITY`, `FRONTEND`, roadmap.

## Технологическое Решение

Перевести товарные balance projections на priced stock:

- `DistributorProductBalance` хранит `unitPriceCents`;
- уникальность распределителя становится `distributorId + productBatchId + unitPriceCents`;
- `CourierProductBalance` хранит `unitPriceCents`;
- уникальность курьера становится `courierUserId + productBatchId + unitPriceCents`;
- `ProductBatch.priceCents` остается базовой ценой партии и историческим snapshot выпуска;
- read models и sale options используют effective `balance.unitPriceCents`;
- если `balance.unitPriceCents < productBatch.priceCents`, строка считается дисконтированной;
- товарный баланс в рублях считается по effective price текущей balance row.

Единое правило именования цен:

- `baseUnitPriceCents` — базовая цена партии из `ProductBatch.priceCents`;
- `unitPriceCents` — фактическая цена конкретной строки остатка, по которой товар будет продаваться;
- `discountCentsPerUnit` — `baseUnitPriceCents - unitPriceCents`;
- `stockValueCents` — `quantity * unitPriceCents`;
- `priceCents` в новых priced stock contracts не использовать как равнозначное имя effective price.

Если в старых контрактах уже есть `priceCents`, implementation должен либо заменить его на `unitPriceCents` с обновлением всех потребителей в рамках этого этапа, либо временно оставить backward-compatible alias только в clearly documented legacy response. В новом поведении не должно быть двух равнозначных названий для одной цены.

Главный инвариант этапа:

- цена продажи берется только из выбранной balance row;
- UI не отправляет цену продажи;
- backend не доверяет frontend-цене;
- продавец/курьер не могут вручную изменить цену;
- дисконт создается только отдельной директорской операцией `distributor.discount.assign`.

Почему так:

- продавец не принимает решение о скидке в момент продажи;
- цена путешествует вместе с товаром при загрузке и возврате;
- concurrent sale/load/unload/discount защищаются теми же conditional updates по конкретной balance row;
- отчеты смогут считать сумму дисконта из sales typed facts, а не пытаться восстановить ее по текущей цене шаблона.

## Scope

Входит:

- Prisma migration для priced stock balances.
- Typed fact `ProductDiscountAssignment`.
- `POST /distributor/discounts`.
- Shared contracts для назначения дисконта и расширенных priced stock read models.
- Backend service:
  - проверка `discount.assign`;
  - active distributor guard;
  - positive discounted price;
  - discounted price должна быть меньше текущей цены выбранной balance row;
  - conditional decrement исходной balance row;
  - upsert target balance row с новой ценой;
  - operation/audit с before/after и discount snapshot.
- Изменение всех товарных операций, которые переносят priced stock:
  - production -> distributor transfer создает/увеличивает distributor balance по базовой цене партии и сохраняет price snapshot;
  - distributor sale списывает effective price balance row;
  - courier load переносит effective price на courier balance и сохраняет price snapshot;
  - courier sale списывает effective price courier balance row;
  - courier unload возвращает effective price на distributor balance.
- Frontend:
  - Директор во вкладке `Распределитель` видит цену строки, признак дисконта и действие назначения дисконта рядом с товаром;
  - форма назначения дисконта в той же поверхности: товар, доступное количество, новая цена, summary экономии, optional комментарий;
  - все экраны остатков/продаж/загрузки/возврата показывают effective price гармонично, без перегруза карточками;
  - sale screens показывают дисконт как свойство выбранного товара, но не дают продавцу менять цену.
- Tests:
  - shared contracts;
  - policy matrix;
  - controller validation;
  - real Postgres integration;
  - frontend flow и визуальные классы/состояния.
- Обновление SoR-документов.

## Out Of Scope

Не входит:

- отмена или корректировка продаж;
- повышение цены через этот механизм;
- проценты скидки;
- промокоды, акции, клиентские скидки;
- сложные правила скидок по датам или клиентам;
- отдельный отчет по дисконту;
- отдельный admin UI для назначения дисконта;
- редактирование уже назначенного дисконта;
- отмена дисконта обратным merge в базовую цену.

Если дисконт назначен ошибочно, исправление будет следующим этапом корректировок через отдельную операцию, а не редактирование старой записи.

## Доменная Модель

Новая typed model:

```text
ProductDiscountAssignment
- id
- sourceDistributorProductBalanceId
- discountedDistributorProductBalanceId
- distributorId
- productBatchId
- quantity
- baseUnitPriceCents
- sourceUnitPriceCents
- discountedUnitPriceCents
- discountCentsPerUnit
- stepDiscountCentsPerUnit
- discountTotalCents
- comment nullable
- operationId unique
- actorUserId
- createdAt
```

Изменение balance projections:

```text
DistributorProductBalance
- unitPriceCents
- unique(distributorId, productBatchId, unitPriceCents)

CourierProductBalance
- unitPriceCents
- unique(courierUserId, productBatchId, unitPriceCents)
```

Правила:

- `discountedUnitPriceCents > 0`;
- `discountedUnitPriceCents < sourceBalance.unitPriceCents`;
- `quantity > 0`;
- `quantity <= sourceBalance.quantity`;
- назначение возможно только на active distributor;
- дисконт можно назначить на обычную или уже дисконтированную строку, если новая цена ниже текущей цены этой строки;
- `baseUnitPriceCents` всегда равен исходной цене партии `ProductBatch.priceCents`;
- `sourceUnitPriceCents` — текущая цена строки, с которой Директор снижает цену сейчас;
- `discountedUnitPriceCents` / `unitPriceCents` — новая итоговая цена;
- `discountCentsPerUnit` всегда считается от базовой цены партии: `baseUnitPriceCents - discountedUnitPriceCents`;
- `stepDiscountCentsPerUnit` хранит шаг текущего назначения: `sourceUnitPriceCents - discountedUnitPriceCents`;
- `ProductBatch.priceCents` не меняется;
- existing balance rows после migration получают `unitPriceCents = productBatch.priceCents`;
- zero balance rows остаются техническими rows, но read models их скрывают как сейчас.

Повторный дисконт:

```text
Партия: 3000 ₽.
Первый дисконт строки: 3000 -> 2500 ₽.
Второй дисконт этой строки: 2500 -> 2200 ₽.
```

В продаже по строке `2200 ₽`:

- `baseUnitPriceCents = 300000`;
- `unitPriceCents = 220000`;
- `discountCentsPerUnit = 80000`;
- `discountTotalCents = quantity * 80000`.

Факт назначения второго дисконта хранит шаг `sourceUnitPriceCents = 250000`, `discountedUnitPriceCents = 220000`, `stepDiscountCentsPerUnit = 30000`, но sale/reporting discount считается от базовой цены партии.

Полный дисконт строки:

```text
Было: 100 шт по 3000 ₽.
Директор назначил дисконт на все 100 шт по 2500 ₽.
```

После операции:

- source row становится `quantity = 0`;
- read models ее скрывают;
- target row `distributorId + productBatchId + unitPriceCents=250000` содержит `100 шт`;
- если target row с такой ценой уже существовала, операция делает upsert/increment, а не создает дубль.

Планируемая транзакция назначения:

1. Найти `DistributorProductBalance` по id с distributor и productBatch.
2. Проверить active distributor.
3. Проверить новую цену и количество.
4. Conditional update source row:

```text
UPDATE distributor_product_balance
SET quantity = quantity - input.quantity
WHERE id = input.distributorProductBalanceId
  AND quantity >= input.quantity
```

5. Если обновлена не 1 строка, вернуть `DOMAIN_RULE_VIOLATION`.
6. Upsert discounted distributor balance по `distributorId + productBatchId + discountedUnitPriceCents`.
7. Прочитать source row после decrement и target row после upsert/increment.
8. Рассчитать audit quantities только от successful after values:
   - `sourceQuantityAfter = sourceAfter.quantity`;
   - `sourceQuantityBefore = sourceQuantityAfter + input.quantity`;
   - `targetQuantityAfter = targetAfter.quantity`;
   - `targetQuantityBefore = targetQuantityAfter - input.quantity`.
9. Создать `Operation` type `distributor.discount.assign`.
10. Создать `ProductDiscountAssignment`.
11. Создать `AuditLog` с:
   - source balance before/after;
   - discounted balance before/after;
   - base/source/effective prices;
   - discount total;
   - comment.

Важно: audit before/after нельзя брать из предварительного read. При двух параллельных назначениях дисконта предварительное чтение может увидеть один и тот же before. Достоверные before values считаются только от результата успешного conditional update/upsert.

## API И Contracts

Permission:

- permission name остается `discount.assign`;
- разрешены `admin`, `director`;
- operation type: `distributor.discount.assign`.

Endpoint:

```text
POST /distributor/discounts
```

Request:

```text
AssignDistributorDiscountRequest
- distributorProductBalanceId: string
- quantity: positive integer
- discountedUnitPriceCents: positive integer
- comment?: string trim max 500
```

Response:

```text
AssignDistributorDiscountResponse
- discount
- sourceBalance
- discountedBalance
```

Расширить priced stock item contracts:

```text
DistributorInventoryItem / DistributorSaleStockItem
- baseUnitPriceCents
- unitPriceCents
- discounted: boolean
- discountCentsPerUnit
- stockValueCents = quantity * unitPriceCents

CourierProductBalanceItem / CourierSaleOption / CourierLoadOption / CourierUnloadProductOption
- baseUnitPriceCents
- unitPriceCents
- discounted
- discountCentsPerUnit
- stockValueCents = quantity * unitPriceCents
```

Правило контрактов:

- `baseUnitPriceCents` всегда соответствует `ProductBatch.priceCents`;
- `unitPriceCents` всегда является effective price конкретной balance row;
- `stockValueCents` всегда считается от `unitPriceCents`;
- `priceCents` не использовать в новых priced stock item contracts как effective price.

Расширить sale typed facts:

```text
DistributorSale / CourierSale
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- discountTotalCents
- totalCents
```

Расширить typed facts товарных движений:

```text
ProductTransfer
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- stockValueCents

CourierLoad
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- stockValueCents

CourierUnloadItem
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- stockValueCents
```

`ProductTransfer` в текущем flow всегда создает stock по базовой цене партии, поэтому `baseUnitPriceCents = unitPriceCents = ProductBatch.priceCents`, `discountCentsPerUnit = 0`. Поля все равно нужны, чтобы все товарные движения имели единый ценовой след для будущих отчетов.

Existing sales после migration:

- `baseUnitPriceCents = unitPriceCents`;
- `discountCentsPerUnit = 0`;
- `discountTotalCents = 0`.

Existing product transfers / courier loads / courier unload items после migration:

- `baseUnitPriceCents = ProductBatch.priceCents`;
- `unitPriceCents = ProductBatch.priceCents`;
- `discountCentsPerUnit = 0`;
- `stockValueCents = quantity * unitPriceCents`.

До этого этапа priced stock еще не существовал, поэтому migration не должна пытаться восстанавливать старую цену movements из текущих balance projections. Projection уже могла измениться после операции; безопасный backfill для всех старых movement facts — базовая цена партии и нулевой дисконт.

Error cases:

- invalid payload -> `VALIDATION_ERROR`;
- source balance not found -> `NOT_FOUND`;
- inactive distributor -> `DOMAIN_RULE_VIOLATION`;
- quantity greater than source balance -> `DOMAIN_RULE_VIOLATION`;
- discounted price `<= 0` -> `VALIDATION_ERROR`;
- discounted price `>= sourceUnitPriceCents` -> `DOMAIN_RULE_VIOLATION`;
- missing auth -> `UNAUTHENTICATED`;
- wrong role -> `FORBIDDEN`.

## Frontend Impact Map

Затрагиваемые экраны и surfaces:

1. Директор `Главная`:
   - total stock value должен использовать effective priced stock values.
2. Директор `Распределитель`:
   - строки товара показывают базовую/дисконтную цену;
   - у строки есть компактное действие назначения дисконта;
   - форма дисконта открывается рядом с выбранной строкой, без отдельной нижней вкладки.
3. Commercial manager home:
   - summary стоимости распределителя использует effective price;
   - визуально не перегружать discount badges, если это только summary.
4. Commercial manager `Остатки`:
   - read-only список показывает дисконтированные строки как отдельные priced rows.
5. Distributor worker home:
   - inline продукция показывает дисконтированные строки понятно, без кнопок управления.
6. Distributor sale screen:
   - product select показывает effective price;
   - selected stock info показывает, что цена уже снижена;
   - ручного поля цены нет.
7. Courier home / courier balance:
   - стоимость и строки товара используют effective price;
   - discount badge должен быть компактным.
8. Courier load screen:
   - загрузка выбирает priced distributor row;
   - цена сохраняется на courier balance.
9. Courier sale screen:
   - sale option показывает effective price;
   - ручного поля цены нет.
10. Courier unload screen:
    - возврат показывает effective price и возвращает priced stock на распределитель.
11. Read-only courier balances у Директора/коммерческого:
    - discounted priced rows видны как отдельные строки.

## Frontend UX Решение

Для Директора во вкладке `Распределитель`:

- не добавлять отдельную bottom nav вкладку;
- не добавлять disabled/future tiles;
- рядом со строкой товара использовать короткое действие `Дисконт` или icon+label `Снизить цену`;
- при выборе строки раскрывать `form-panel` ниже списка или рядом с выбранной строкой в текущей `screen-stack`;
- форма:
  - товар и текущая цена read-only;
  - доступно;
  - количество для дисконта;
  - новая цена за штуку;
  - summary: было, станет, скидка за штуку, скидка итого;
  - optional комментарий;
  - submit `Назначить`;
- disabled states:
  - offline;
  - нет выбранной строки;
  - количество пустое/0/сверх остатка;
  - новая цена пустая/0;
  - новая цена не ниже текущей;
  - request pending.

Для остальных экранов:

- обычная строка показывает только фактическую цену, например `3000.00 ₽`;
- дисконтированная строка показывает фактическую цену как главное число, например `2500.00 ₽`;
- базовая цена показывается вторично, например `было 3000.00 ₽`;
- использовать компактный badge `Дисконт`, а не крупную зеленую карточку;
- не превращать product rows в перегруженные карточки;
- суммы в overview считаются по effective price, чтобы не расходиться с будущей выручкой.
- продавец и курьер не видят ручное поле цены и не отправляют цену в request.

## Затронутые Документы

Создать/обновить:

- `docs/exec-plans/completed/2026-06-04-discounts-priced-stock.md` - завершенный plan;
- `docs/DOCS-INDEX.md` - добавить active plan.

После реализации обновить:

- `docs/crm-requirements.md` - финальное правило priced stock discount;
- `docs/ARCHITECTURE.md` - priced stock balance projections и расчет стоимости через `unitPriceCents`;
- `docs/SECURITY.md` - `discount.assign` handler/scope;
- `docs/HANDLER-MAP.md` - новый handler;
- `docs/DOMAIN-EVENTS.md` - `distributor.discount.assign`;
- `docs/FRONTEND.md` - фактический UI дисконта и отображение discounted rows;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` - progress после завершения.

## Затронутые Модули И Файлы

Ожидаемые backend/shared:

- `apps/api/prisma/schema.prisma`;
- новая Prisma migration `*_discounts_priced_stock`;
- `packages/shared/src/distributor.ts`;
- `packages/shared/src/courier.ts`;
- `packages/shared/src/production.ts`;
- `packages/shared/src/index.test.ts`;
- `packages/shared/src/permissions.ts`;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/src/production/production.service.ts`;
- `apps/api/src/production/production.mapper.ts`;
- `apps/api/src/distributor/distributor.controller.ts`;
- `apps/api/src/distributor/distributor.service.ts`;
- `apps/api/src/distributor/distributor.mapper.ts`;
- `apps/api/src/courier/courier.service.ts`;
- `apps/api/src/courier/courier.mapper.ts`;
- `apps/api/test/policy.test.ts`;
- `apps/api/test/distributor-controller.test.ts`;
- `apps/api/test/distributor-sales-db.integration.test.ts`;
- `apps/api/test/production-db.integration.test.ts`;
- `apps/api/test/courier-db.integration.test.ts`.

Ожидаемые frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx`;
- `apps/web/src/features/distributor/DistributorStockList.tsx`;
- `apps/web/src/features/distributor/DistributorHomeOverview.tsx`;
- `apps/web/src/features/sales/DistributorSaleHome.tsx`;
- `apps/web/src/features/courier/CourierHomeOverview.tsx`;
- `apps/web/src/features/courier/CourierBalanceHome.tsx`;
- `apps/web/src/features/courier/CourierLoadHome.tsx`;
- `apps/web/src/features/courier/CourierSaleHome.tsx`;
- `apps/web/src/features/courier/CourierUnloadHome.tsx`;
- `apps/web/src/features/courier/CourierStockList.tsx`;
- `apps/web/src/roles/director/DirectorHome.tsx`;
- `apps/web/app/page.test.tsx`;
- `apps/web/app/globals.css`.

## Implementation Steps

1. Добавить `unitPriceCents` в distributor/courier product balance Prisma models.
2. Добавить migration:
   - preflight для balance rows и связанных партий с `priceCents <= 0`;
   - если row имеет `quantity = 0`, допускается cleanup/delete или backfill только после явного решения в migration;
   - если row имеет `quantity > 0` и связанная партия `priceCents <= 0`, migration должна падать явно с понятной причиной;
   - add nullable columns;
   - backfill из `product_batch.priceCents`;
   - сделать not null;
   - заменить unique constraints на owner + productBatch + unitPriceCents;
   - добавить raw SQL checks `quantity >= 0`, `unitPriceCents > 0`.
3. Добавить sale fields `baseUnitPriceCents`, `discountCentsPerUnit`, `discountTotalCents` в distributor/courier sales.
4. Backfill existing sales.
5. Добавить price snapshot fields в `ProductTransfer`, `CourierLoad`, `CourierUnloadItem`.
6. Backfill existing product movement typed facts.
7. Добавить `ProductDiscountAssignment`.
8. Добавить shared contracts для assign discount и priced stock metadata.
9. Обновить mappers, чтобы read models возвращали effective/base/discount fields.
10. Обновить production transfer: distributor balance upsert по base price и price snapshot.
11. Обновить distributor sale: использовать balance `unitPriceCents` и сохранять discount fields.
12. Реализовать `POST /distributor/discounts`.
13. Обновить courier load: переносить source `unitPriceCents` в courier balance и сохранять price snapshot.
14. Обновить courier sale: использовать courier balance `unitPriceCents` и сохранять discount fields.
15. Обновить courier unload: возвращать priced stock на distributor balance по `unitPriceCents` и сохранять price snapshot.
16. Обновить query invalidation после дисконта:
    - distributor inventory;
    - distributor sale-options;
    - courier load-options;
    - director/commercial summaries, если они отдельными query key.
17. Добавить UI назначения дисконта у Директора во вкладке `Распределитель`.
18. Добавить compact display discounted rows на всех impacted surfaces.
19. Обновить frontend tests.
20. Обновить SoR-документы.
21. Запустить targeted verification.
22. Запустить full relevant verification.
23. После завершения закрыть plan в `docs/exec-plans/completed/`.

## Test Plan

Shared:

- priced stock item schemas принимают effective/base/discount fields;
- контракты не имеют двусмысленности между `priceCents` и `unitPriceCents`;
- new priced stock contracts используют `unitPriceCents`, `baseUnitPriceCents`, `discountCentsPerUnit`, `stockValueCents`;
- assign discount request trim comment;
- invalid quantity rejected;
- discounted price `0` rejected;
- discounted price non-integer rejected;
- sale response содержит discount fields.

Policy/controller:

- `discount.assign` есть у `admin` и `director`;
- `commercial_manager`, `distributor_worker`, `production_manager`, `courier` не имеют `discount.assign`;
- controller требует actor;
- controller валидирует body;
- wrong actor -> `FORBIDDEN`.

DB integration:

- migration backfill делает existing distributor/courier balances priced by product batch price;
- migration/preflight явно падает для ненулевых balance rows, связанных с партией `priceCents <= 0`;
- migration/preflight behavior для нулевых цен покрыт отдельным тестом или migration smoke fixture;
- Директор назначает частичный дисконт:
  - source row уменьшается;
  - discounted row создается;
  - operation/audit пишутся;
  - response возвращает обе строки;
- Директор назначает полный дисконт на всю source row;
  - старая строка становится `quantity = 0`;
  - read model показывает только новую priced row;
- admin может назначить дисконт через backend;
- discounted price `>= sourceUnitPriceCents` отклоняется;
- discounted price `0` отклоняется;
- quantity сверх source balance отклоняется атомарно;
- inactive distributor rejected;
- повторный дисконт на тот же productBatch/price upsert-ит существующую discounted row;
- discount upsert не создает дубль, если target row с новой ценой уже существует;
- повторный дисконт already discounted row разрешен, а sale discount считается от базовой цены партии, не от предыдущей сниженной цены;
- `ProductTransfer` typed fact сохраняет base/effective price snapshot;
- продажа с распределителя по discounted row использует discounted price, discount fields и cash increment по discounted total;
- безналичная продажа discounted row не меняет cash balance;
- загрузка курьера переносит discounted price на `CourierProductBalance`;
- `CourierLoad` typed fact сохраняет `baseUnitPriceCents`, `unitPriceCents`, `discountCentsPerUnit`, `stockValueCents`;
- продажа курьером discounted row использует discounted price и discount fields;
- возврат курьера возвращает discounted row на distributor balance с той же price;
- `CourierUnloadItem` typed fact сохраняет price snapshot и возвращает товар именно в строку с тем же `unitPriceCents`;
- concurrent sale/load/discount не уводят stock ниже 0.

Frontend:

- Директор видит действие назначения дисконта во вкладке `Распределитель`;
- форма disabled offline;
- единственная/выбранная строка показывает current price, new price и discount summary;
- submit отправляет `POST /distributor/discounts`;
- после успеха видны отдельные строки обычной и discounted цены;
- distributor sale screen показывает discounted option и продает без ручного price field;
- courier load screen показывает discounted option;
- courier sale screen показывает discounted option;
- courier unload screen сохраняет discounted price in summary;
- commercial/distributor/courier home summaries считают стоимость по effective price;
- UI не имеет horizontal overflow на mobile viewport.

Full verification before completion:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm docs:check`;
- `pnpm audit`, если network/audit contour доступен.

Manual UI verification:

- mobile viewport, директор:
  - открыть `Распределитель`;
  - назначить дисконт на часть строки;
  - проверить две строки товара и визуальную читаемость;
- commercial/distributor worker:
  - открыть home/остатки/продажу и проверить discounted price display;
- courier:
  - загрузить discounted row;
  - продать discounted row;
  - вернуть discounted row;
  - проверить, что цена не потерялась;
- проверить отсутствие горизонтального скролла и перегруза бейджами.

## Риски И Rollback

Риск: переход balance uniqueness на price dimension затронет все товарные операции.

Mitigation: менять операции последовательно и закрыть real Postgres integration tests на transfer, sale, load, unload, discount.

Rollback: не включать frontend action; migration rollback возможен только до применения на production-like данных, поэтому до этого этап остается локальным dev checkpoint.

Риск: migration сломается на старых dev/test данных с ненулевыми остатками и `ProductBatch.priceCents <= 0`.

Mitigation: добавить явный preflight в migration. Нулевые технические rows можно очистить/исправить только при `quantity = 0`; ненулевые rows с нулевой ценой должны останавливать migration понятной ошибкой.

Rollback: исправить fixture/dev data до повторного применения migration, не подставлять случайную цену.

Риск: UI будет перегружен ценами, бейджами и summary.

Mitigation: effective price всегда главный; base price показывать только если есть дисконт; badge компактный; не добавлять отдельные декоративные карточки.

Rollback: скрыть base price на summary/home, оставив подробности только в operation forms и lists.

Риск: повторный дисконт на уже discounted row может запутать историю.

Mitigation: typed fact назначения хранит step `sourceUnitPriceCents -> discountedUnitPriceCents`, а sale facts всегда считают discount от `ProductBatch.priceCents`. В UI это выглядит просто как новая строка с более низкой ценой.

Rollback: если после реализации это окажется слишком сложно для пользователей, запретить discount на already discounted row через `sourceUnitPriceCents === productBatch.priceCents` отдельной доменной правкой.

Риск: reports later need discount total, а текущие sales не сохранят достаточный snapshot.

Mitigation: сразу добавить `baseUnitPriceCents`, `discountCentsPerUnit`, `discountTotalCents` в sales typed facts и price snapshot в товарные движения.

## Критерии Завершения

Этап считается завершенным, когда:

- distributor/courier product balances имеют `unitPriceCents` и новую unique granularity;
- existing balances, sales и товарные movement facts корректно backfilled migration;
- migration имеет preflight для ненулевых остатков с нулевой/невалидной базовой ценой;
- `POST /distributor/discounts` работает через `discount.assign`;
- назначение дисконта split/upsert-ит priced stock rows транзакционно;
- полный дисконт строки скрывает старую zero row из read models;
- повторный дисконт считает sale discount от базовой цены партии;
- продажи, загрузки и возвраты используют effective balance price;
- sales typed facts сохраняют base/effective/discount snapshot;
- `ProductTransfer`, `CourierLoad`, `CourierUnloadItem` сохраняют price snapshot;
- UI Директора позволяет назначить дисконт во вкладке `Распределитель`;
- все impacted screens показывают discounted rows компактно и понятно;
- в новых contracts нет двусмысленности между `priceCents` и `unitPriceCents`;
- документация обновлена по фактическому поведению;
- targeted и full relevant verification выполнены или причины пропуска явно зафиксированы;
- plan закрыт в `docs/exec-plans/completed/`.

## Выполненные Проверки

- `corepack pnpm --filter @buhta/shared test` — passed.
- `corepack pnpm --filter @buhta/web typecheck` — passed.
- `corepack pnpm --filter @buhta/web test` — passed.
- `corepack pnpm --filter @buhta/api typecheck` — passed.
- `corepack pnpm --filter @buhta/api exec vitest run test/distributor-sales-db.integration.test.ts test/courier-db.integration.test.ts` — passed, targeted Postgres integration.
- `corepack pnpm --filter @buhta/api test` — passed, 22 files / 134 tests.
- `corepack pnpm docs:check` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm lint:boundaries` — passed.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm test` — passed.

## Решения После Ревью

- В строке товара используется действие `Снизить цену`, а признак сниженной строки отображается badge `Дисконт`.
- Отдельный admin UI не добавлен в первом проходе; `admin` покрыт backend permission/API tests, основной операционный UI находится у Директора.
