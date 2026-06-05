# Sale Cancellations Plan

Статус: `Completed`.
Дата: 2026-06-04.
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Corrections`.

## Цель

Добавить полную отмену ошибочной продажи отдельной операцией, без редактирования или удаления исходной продажи.

Операционная идея:

- продажу отменяет сотрудник, который работает с этим типом продаж;
- исходная продажа остается историческим фактом;
- отмена создает новый typed fact со ссылкой на исходную продажу;
- товар возвращается в исходную priced stock row;
- cash balance откатывается только если продажа была наличной и текущий cash balance позволяет уменьшение без минуса;
- причина отмены обязательна;
- Директор не проводит отмену как продавец, но сможет контролировать отмены через историю/audit.

## Принятые Решения

- Отмена всегда полная: частичная отмена количества не входит в этот этап.
- Причина отмены обязательна: trimmed строка, max 500 символов, min 3 символа после trim.
- Временной лимит отмены в v1 не добавляется: смены/рабочие дни пока не смоделированы, контроль обеспечивается обязательной причиной и audit.
- Отмена продажи с распределителя доступна ролям, которые оформляют продажи с распределителя:
  - `commercial_manager`;
  - `distributor_worker`;
  - `admin` остается системным superuser по общему правилу, но отдельный admin UI не добавляется.
- Отмена продажи курьером доступна:
  - `courier` только для собственной продажи;
  - `admin` остается системным backend superuser, но отдельный admin UI не добавляется.
- `director` не получает право проводить отмену продажи. Контроль Директора обеспечивается через `audit.read`/будущий audit UI.
- Отдельный read-only UI отмен для Директора не добавляется в этом этапе; он относится к следующему блоку audit/report UI.
- Существующее `operation.correct` не использовать для отмены продаж в этом этапе. Оно остается зарезервированным для будущих более широких корректировок.
- Для продаж вводятся точные permissions:
  - `distributor.sale.cancel`;
  - `courier.sale.cancel`.
- Operation types:
  - `distributor.sale.cancel`;
  - `courier.sale.cancel`.

## Scope

Входит:

- Prisma migration для typed facts отмен:
  - `DistributorSaleCancellation`;
  - `CourierSaleCancellation`.
- Shared contracts:
  - requests/responses отмены;
  - read model последних продаж с признаком `cancelled`.
- Backend:
  - `POST /distributor/sales/:saleId/cancel`;
  - `GET /distributor/sales/recent`;
  - `POST /courier/sales/:saleId/cancel`;
  - `GET /courier/sales/recent`;
  - policy checks для cancel/read;
  - транзакционный возврат товара и cash;
  - operation/audit для отмены.
- Frontend:
  - на экране продажи распределителя показать компактный список последних продаж;
  - на экране продажи курьера показать компактный список последних собственных продаж;
  - у неотмененной продажи показать действие `Отменить`;
  - форма подтверждения с обязательной причиной;
  - после успешной отмены обновить остатки, cash balances, sale options и recent sales.
- Tests:
  - shared contracts;
  - policy matrix;
  - controller validation;
  - real Postgres integration;
  - frontend flow.
- Обновление SoR-документов.

## Out Of Scope

Не входит:

- частичная отмена продажи;
- изменение клиента, количества, цены или способа оплаты в исходной продаже;
- отмена загрузки курьера, сгрузки курьера, списания наличных, дисконта или производственных операций;
- произвольная ручная корректировка товарного остатка;
- произвольная ручная корректировка cash balance;
- отдельный audit/report UI для Директора;
- редактирование исходной продажи или подмена даты продажи;
- восстановление cash, если наличные уже ушли другой операцией и текущий cash balance источника меньше суммы наличной продажи.

Если продажа была ошибочной, но cash уже сгружен/списан и текущий cash balance не позволяет полный откат, в этом этапе отмена отклоняется. Такой случай закрывается будущей ручной корректировкой с отдельной директорской операцией.

Cash balance в v1 считается агрегированным балансом источника, а не привязкой конкретных купюр к конкретной продаже. Поэтому допустим кейс: продажа A дала наличные, затем часть денег ушла другой операцией, затем продажа B пополнила общий cash balance, и после этого отмена A снова стала возможной, если общего текущего cash balance хватает. Audit показывает, какую продажу отменили и какой агрегированный cash balance был до/после отмены.

## Доменная Модель

Новые typed facts:

```text
DistributorSaleCancellation
- id
- distributorSaleId unique
- distributorProductBalanceId
- distributorId
- productBatchId
- clientId
- quantity
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- discountTotalCents
- totalCents
- paymentMethod
- reason
- operationId unique
- actorUserId
- createdAt
```

Prisma indexes:

- unique `distributorSaleId`;
- unique `operationId`;
- index `actorUserId`;
- index `createdAt`.

```text
CourierSaleCancellation
- id
- courierSaleId unique
- courierProductBalanceId
- courierUserId
- productBatchId
- clientId
- quantity
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- discountTotalCents
- totalCents
- paymentMethod
- reason
- operationId unique
- actorUserId
- createdAt
```

Prisma indexes:

- unique `courierSaleId`;
- unique `operationId`;
- index `actorUserId`;
- index `createdAt`.

Почему отдельные tables, а не один polymorphic `SaleCancellation`:

- исходные продажи уже разделены на `DistributorSale` и `CourierSale`;
- typed details остаются простыми и явно связаны с конкретной таблицей;
- уникальность `saleId -> cancellation` легко защищается DB constraint;
- будущие отчеты могут left join-ить отмены без универсального nullable payload.

Исходная продажа не получает `status` и не редактируется. Признак отмены для read models считается по существованию related cancellation row.

## Правила Отмены

Общие:

- продажа должна существовать;
- продажа не должна быть уже отменена;
- reason обязателен;
- отмена выполняется в одной Prisma transaction;
- cancellation fact создается до движения cash/product balances, чтобы unique constraint на исходную sale id первым захватывал право на отмену;
- товар возвращается в исходную balance row продажи:
  - distributor sale -> `DistributorProductBalance`;
  - courier sale -> `CourierProductBalance`;
- quantity возвращается ровно в размере исходной продажи;
- `unitPriceCents` не пересчитывается и берется из sale typed fact;
- отмена cashless sale не меняет cash balance;
- отмена cash sale уменьшает cash balance источника продажи на `sale.totalCents`;
- cash decrement выполняется conditional update с `amountCents >= sale.totalCents`;
- если cash balance недостаточен, операция отклоняется `DOMAIN_RULE_VIOLATION`;
- before/after для audit рассчитываются от результатов успешных atomic updates, а не от предварительного чтения.

Distributor sale cancellation:

- `commercial_manager` и `distributor_worker` могут отменять продажи распределителя;
- в v1 нет привязки пользователя к конкретному распределителю, поэтому при одном активном распределителе они видят последние продажи распределителя;
- `director` не может отменять, но видит историю через future audit UI.

Courier sale cancellation:

- курьер может отменить только свою продажу;
- если sale принадлежит другому курьеру, backend возвращает `DOMAIN_RULE_VIOLATION` или `FORBIDDEN` в зависимости от выбранного guard pattern;
- cash sale отменяется только если у этого курьера достаточно текущего cash balance.
- admin не получает отдельный courier recent UI в этом этапе. `GET /courier/sales/recent` для `admin` возвращает все последние courier sales без обязательного `courierUserId` фильтра; это backend/system read для поддержки superuser policy, но основной UI строится для курьера.

## API И Contracts

Permissions:

```text
distributor.sale.cancel
- admin
- commercial_manager
- distributor_worker

courier.sale.cancel
- admin
- courier
```

Endpoint:

```text
POST /distributor/sales/:saleId/cancel
```

Request:

```text
CancelDistributorSaleRequest
- reason: string trim min 3 max 500
```

Response:

```text
CancelDistributorSaleResponse
- cancellation
- distributorProductBalance
- cashBalance nullable
```

Endpoint:

```text
POST /courier/sales/:saleId/cancel
```

Request:

```text
CancelCourierSaleRequest
- reason: string trim min 3 max 500
```

Response:

```text
CancelCourierSaleResponse
- cancellation
- courierProductBalance
- cashBalance
```

Recent sales endpoints для UI:

```text
GET /distributor/sales/recent?limit=10
GET /courier/sales/recent?limit=10
```

Read item:

```text
SaleRecentItem
- id
- sourceType: distributor | courier
- productName
- clientId
- clientName
- clientPhone
- quantity
- baseUnitPriceCents
- unitPriceCents
- discountCentsPerUnit
- discountTotalCents
- totalCents
- paymentMethod
- comment nullable
- saleActorUserId
- saleActorDisplayName
- createdAt
- cancelled: boolean
- cancellationId nullable
- cancellationReason nullable
- cancelledByActorUserId nullable
- cancelledByActorDisplayName nullable
- cancelledAt nullable
```

Read scope:

- distributor recent sales: roles with `distributor.sale.create` or `distributor.sale.cancel`;
- courier recent sales: courier sees own sales; admin sees all latest courier sales. No `courierUserId` query param in this stage.

## Транзакция Отмены

Distributor sale cancellation:

1. Найти `DistributorSale` по `saleId` с product batch, distributor balance, distributor, client.
2. Проверить, что `DistributorSaleCancellation` для этой продажи не существует.
3. Проверить role permission `distributor.sale.cancel`.
4. Создать `Operation` type `distributor.sale.cancel`.
5. Создать `DistributorSaleCancellation` со snapshot исходной продажи и reason.
   - Если unique constraint `distributorSaleId` сработал, вернуть `DOMAIN_RULE_VIOLATION` / typed duplicate cancellation error.
   - Это действие должно происходить до движения balances, чтобы параллельная отмена не смогла дважды вернуть товар или дважды уменьшить cash.
6. Для cash sale:
   - conditional decrement `DistributorCashBalance` по `distributorId` и `amountCents >= sale.totalCents`;
   - если row отсутствует или decrement count `0`, вернуть `DOMAIN_RULE_VIOLATION`.
7. Increment `DistributorProductBalance.quantity` на `sale.quantity`.
8. Прочитать affected balance rows after update.
9. Рассчитать before/after:
   - product before = after - sale.quantity;
   - cash before = after + sale.totalCents для cash sale.
10. Создать `AuditLog` с reason, ссылкой на исходную sale operation, product/cash before/after.
11. Вернуть response.

Courier sale cancellation:

1. Найти `CourierSale` по `saleId` с courier balance, courier, product batch, client.
2. Проверить, что `CourierSaleCancellation` для этой продажи не существует.
3. Проверить, что actor courier отменяет только собственную sale.
4. Создать `Operation` type `courier.sale.cancel`.
5. Создать `CourierSaleCancellation` со snapshot исходной продажи и reason.
   - Если unique constraint `courierSaleId` сработал, вернуть `DOMAIN_RULE_VIOLATION` / typed duplicate cancellation error.
   - Это действие должно происходить до движения balances, чтобы параллельная отмена не смогла дважды вернуть товар или дважды уменьшить cash.
6. Для cash sale:
   - conditional decrement `CourierCashBalance` по `courierUserId` и `amountCents >= sale.totalCents`;
   - если row отсутствует или decrement count `0`, вернуть `DOMAIN_RULE_VIOLATION`.
7. Increment `CourierProductBalance.quantity` на `sale.quantity`.
8. Прочитать affected balance rows after update.
9. Рассчитать before/after от after values.
10. Создать `AuditLog` с reason, ссылкой на исходную sale operation, product/cash before/after.
11. Вернуть response.

## Frontend UX

Distributor sale screen:

- добавить отдельную нижнюю вкладку `История` с компактным блоком `Последние продажи`;
- показывать до 10 последних продаж;
- строка: продукт, клиент, количество, сумма, способ оплаты, время;
- если продажа отменена, показывать приглушенный статус `Отменена`;
- если не отменена, показывать действие `Отменить`;
- по нажатию открывать inline confirmation panel:
  - `Продажа ...`;
  - обязательная причина;
  - buttons `Отменить продажу` и `Закрыть`.

Courier sale screen:

- такой же блок, но только по собственным продажам курьера;
- курьер не видит продажи других курьеров.

После успешной отмены:

- показать global success notice;
- закрыть confirmation panel;
- invalidate:
  - sale options;
  - product balances/inventory;
  - cash balances;
  - recent sales;
  - director/commercial summaries, если они отдельными query key.

Текст:

- action: `Отменить`;
- confirmation submit: `Отменить продажу`;
- reason label: `Причина отмены`;
- empty state: `Продаж пока нет.`;
- cash insufficient error: backend message без попытки UI “починить” cash.

## Затронутые Документы

Создать/обновить:

- `docs/exec-plans/active/2026-06-04-sale-cancellations.md` — этот plan;
- `docs/DOCS-INDEX.md` — добавить active plan;
- `docs/crm-requirements.md` — финальные правила отмены продаж и cleanup прав дисконта;
- `docs/ARCHITECTURE.md` — append-only cancellation typed facts и transactional reverse movement pattern;
- `docs/SECURITY.md` — permissions и ограничения cancel endpoints;
- `docs/DOMAIN-EVENTS.md` — operation types `*.sale.cancel`;
- `docs/HANDLER-MAP.md` — новые handlers;
- `docs/FRONTEND.md` — recent sales/cancel UI;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — progress после завершения.

## Затронутые Модули И Файлы

Ожидаемые backend/shared:

- `apps/api/prisma/schema.prisma`;
- новая Prisma migration `*_sale_cancellations`;
- `packages/shared/src/distributor.ts`;
- `packages/shared/src/courier.ts`;
- `packages/shared/src/permissions.ts`;
- `packages/shared/src/index.test.ts`;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/src/distributor/distributor.controller.ts`;
- `apps/api/src/distributor/distributor.service.ts`;
- `apps/api/src/distributor/distributor.mapper.ts`;
- `apps/api/src/courier/courier.controller.ts`;
- `apps/api/src/courier/courier.service.ts`;
- `apps/api/src/courier/courier.mapper.ts`;
- `apps/api/test/policy.test.ts`;
- `apps/api/test/distributor-controller.test.ts`;
- `apps/api/test/distributor-sales-db.integration.test.ts`;
- `apps/api/test/courier-controller.test.ts`;
- `apps/api/test/courier-db.integration.test.ts`.

Ожидаемые frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/sales/DistributorSaleHome.tsx`;
- `apps/web/src/features/courier/CourierSaleHome.tsx`;
- возможно общий компонент `apps/web/src/features/sales/RecentSalesList.tsx`;
- `apps/web/app/globals.css`;
- `apps/web/app/page.test.tsx`.

## Implementation Steps

1. Добавить typed cancellation models в Prisma schema.
2. Добавить migration с unique constraint на исходную sale id, unique `operationId`, index `actorUserId`, index `createdAt`.
3. Добавить operation types `distributor.sale.cancel`, `courier.sale.cancel`.
4. Добавить shared permissions `distributor.sale.cancel`, `courier.sale.cancel`; `operation.correct` оставить reserved.
5. Обновить policy matrix и tests.
6. Добавить shared request/response schemas для cancel commands.
7. Добавить shared recent sale read schemas.
8. Реализовать distributor recent sales query.
9. Реализовать courier recent sales query с own-courier scope.
10. Реализовать distributor sale cancellation transaction.
11. Реализовать courier sale cancellation transaction.
12. Добавить controller endpoints.
13. Обновить frontend api client.
14. Добавить recent sales list на distributor sale screen.
15. Добавить recent sales list на courier sale screen.
16. Добавить cancellation confirmation panel с обязательной причиной.
17. Обновить SoR-документы.
18. Запустить targeted verification.
19. Запустить full relevant verification.
20. После реализации перенести plan в completed.

## Test Plan

Shared:

- cancel request требует reason;
- reason trim;
- пустая/короткая reason rejected;
- response schemas принимают cancellation + affected balances;
- recent sale item schema содержит `cancelled`.

Policy/controller:

- `commercial_manager` и `distributor_worker` имеют `distributor.sale.cancel`;
- `courier` имеет `courier.sale.cancel`;
- `director` не имеет sale cancel permissions;
- `production_manager` не имеет sale cancel permissions;
- controller missing actor -> `UNAUTHENTICATED`;
- wrong role -> `FORBIDDEN`;
- invalid reason -> `VALIDATION_ERROR`.

DB integration distributor:

- cash sale cancel:
  - создает `DistributorSaleCancellation`;
  - возвращает товар в `DistributorProductBalance`;
  - уменьшает `DistributorCashBalance`;
  - пишет operation/audit;
  - recent sales показывает `cancelled=true`.
- cashless sale cancel:
  - возвращает товар;
  - cash balance не меняется;
  - пишет operation/audit.
- discounted sale cancel:
  - возвращает товар именно в priced row с тем же `unitPriceCents`;
  - discount fields в cancellation совпадают с sale snapshot.
- repeated cancel rejected.
- cash sale cancel rejected when current cash balance is insufficient.
- director cannot cancel.
- two parallel cancellations of the same distributor sale result in exactly one success; product returns once and cash decrements once.

DB integration courier:

- courier cash sale cancel:
  - возвращает товар на `CourierProductBalance`;
  - уменьшает `CourierCashBalance`;
  - пишет operation/audit.
- courier cashless sale cancel:
  - cash balance не меняется.
- courier cannot cancel another courier sale.
- discounted courier sale cancel returns item to same priced courier row.
- repeated cancel rejected.
- cash sale cancel rejected if courier cash already unloaded and balance insufficient.
- two parallel cancellations of the same courier sale result in exactly one success; product returns once and cash decrements once.

Frontend:

- distributor/commercial/worker history screen показывает последние продажи без ввода поиска;
- cancel button opens reason panel;
- submit disabled without reason;
- successful cancel invalidates sale options/inventory/cash/recent sales and shows success notice;
- cancelled sale displays status and no cancel action;
- courier sees only own recent sales in the `История` tab and can cancel own sale;
- director does not see operational cancel action.

Full verification before completion:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm audit`, если network/audit contour доступен.

## Риски И Rollback

Риск: cash уже перемещен после продажи, и автоматическая отмена не сможет откатить денежный баланс без минуса.

Mitigation: в этом этапе отмена разрешена только при достаточном текущем cash balance источника продажи. Остальные случаи отклоняются и ждут будущей ручной корректировки.

При этом cash считается агрегированным balance источника, а не привязкой конкретных купюр к продаже. Если общий cash balance снова стал достаточным после других наличных операций, отмена исходной cash sale разрешена.

Rollback: отключить frontend action, оставить backend migration только до применения на production-like данных; после применения откат требует отдельной migration.

Риск: пользователи начнут отменять старые продажи вместо будущих корректировок.

Mitigation: recent UI показывает ограниченный список последних продаж; backend не ограничивает по времени в первом проходе, но reason обязательна и audit сохраняет actor/time.

Rollback: добавить временное правило "можно отменять только продажи за последние N часов" отдельным доменным решением, если бизнес это потребует.

Риск: Director expected to control cancellations, но audit UI еще не реализован.

Mitigation: cancellation writes operation/audit and typed details now; director-facing audit/report UI остается следующим крупным этапом.

## Критерии Завершения

Этап считается завершенным, когда:

- есть typed cancellation tables с unique исходной sale;
- cancellation fact создается до движения balances, а параллельная повторная отмена одной sale покрыта integration test;
- `POST /distributor/sales/:saleId/cancel` и `POST /courier/sales/:saleId/cancel` работают транзакционно;
- `GET /distributor/sales/recent` и `GET /courier/sales/recent` дают данные для UI;
- отмена cash sale откатывает cash только при достаточном текущем cash balance;
- отмена cashless sale не меняет cash;
- товар возвращается в исходную priced stock row;
- повторная отмена невозможна;
- courier не может отменить чужую sale;
- director не может проводить cancel action;
- UI продавца и курьера позволяет отменить продажу с обязательной причиной;
- документация обновлена по фактическому поведению;
- targeted и full relevant verification выполнены или причины пропуска явно зафиксированы;
- plan закрыт в `docs/exec-plans/completed/`.

## Решения После Ревью

- Временной лимит отмены продажи не добавляется.
- Директорский read-only список отмен не добавляется в этом этапе; полноценный контроль выносится в будущий audit/report UI.

## Фактическая Верификация

Выполнено 2026-06-04:

- `corepack pnpm --filter @buhta/shared test` — passed.
- `corepack pnpm --filter @buhta/api typecheck` — passed.
- `corepack pnpm --filter @buhta/web typecheck` — passed.
- `corepack pnpm --filter @buhta/web test` — passed.
- `corepack pnpm --filter @buhta/api exec vitest run test/distributor-controller.test.ts test/courier-controller.test.ts test/policy.test.ts test/distributor-sales-db.integration.test.ts test/courier-db.integration.test.ts` — passed вне sandbox после применения migration.
- `corepack pnpm --filter @buhta/api prisma:deploy` — migration `20260604170000_sale_cancellations` applied к локальной Postgres БД.
- `corepack pnpm lint` — passed.
- `corepack pnpm lint:boundaries` — passed.
- `corepack pnpm docs:check` — passed.

Примечание: DB integration tests и `prisma:deploy` запускались вне sandbox, потому что sandbox блокировал локальный Prisma/tsx/IPC доступ и давал Prisma failures до выполнения доменной логики.

## UI Корректировка После Завершения

После ревью UX список последних продаж вынесен из формы продажи в отдельную нижнюю вкладку `История` для коммерческого руководителя, работника распределителя и курьера. `Продать` остается единственным крупным action tile на home, а отмена продажи теперь выполняется в контексте истории уже созданных операций.

Дополнительная проверка 2026-06-04:

- `corepack pnpm --filter @buhta/web typecheck` — passed.
- `corepack pnpm --filter @buhta/web test` — passed.
