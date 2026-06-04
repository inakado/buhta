# ARCHITECTURE

Рабочая карта архитектуры проекта «Бухта».

Статус: `Draft`. Foundation scaffold создан; документ фиксирует текущую техническую карту, но не заменяет `docs/crm-requirements.md`, `docs/ARCHITECTURE-PRINCIPLES.md` и `docs/TECH-STACK.md`.

## 1. Назначение

Этот документ нужен, чтобы после scaffold приложения фиксировать:

- границы backend-модулей;
- основные потоки данных;
- владельцев доменных операций;
- точки интеграции между `web`, `api`, `shared`, БД и auth;
- принятые технические tradeoffs.

## 2. Что уже принято

- Базовый стек описан в `docs/TECH-STACK.md`.
- Инженерные принципы описаны в `docs/ARCHITECTURE-PRINCIPLES.md`.
- Бизнес-логика и роли описаны в `docs/crm-requirements.md`.
- Текущая структура:
  - `apps/web` — Next.js frontend;
  - `apps/api` — NestJS backend;
  - `packages/shared` — общие runtime constants/contracts;
  - `apps/api/prisma` — Prisma schema, migrations и seed.
- Auth foundation:
  - BetterAuth подключен в NestJS на `/api/auth`;
  - auth tables живут в PostgreSQL через Prisma;
  - BetterAuth user/session преобразуется в application `Actor`;
  - backend policy layer отвечает за доменные роли и доступ к операциям.
- Текущие backend-модули:
  - `auth` — BetterAuth wiring, `GET /auth/me`, current actor helpers;
  - `policy` — roles/permissions registry, `RequirePermission`, `PolicyGuard`;
  - `users` — минимальное backend-управление пользователями и ролями для администратора;
  - `catalog` — минимальные справочники сырья, тары, распределителей и шаблонов продукции;
  - `clients` — общая база клиентов, поиск, создание и редактирование текущей карточки клиента;
  - `production` — поступления сырья/тары, текущие балансы цеха и выпуск партии продукции;
  - `distributor` — read-only товарные остатки распределителя из projection table;
  - `operations` — baseline operation/idempotency services;
  - `common/errors` — единый `AppError` и mapper в `{ error: { code, message, details } }`;
  - `health` — публичный health contract.
- `packages/shared` содержит runtime contracts, которые нужны API и web:
  - роли и permissions;
  - error response shape;
  - money-in-cents и quantity helpers;
  - catalog contracts для сырья, тары, распределителей и шаблонов продукции;
  - client contracts для списка, поиска, создания и редактирования клиентов;
  - production contracts для поступлений, балансов цеха и выпуска партии;
  - distributor contracts для read-only inventory summary и строк остатков;
  - health constants.
- Foundation data flow:

```text
apps/web
  -> HTTP API
apps/api
  -> imports packages/shared
  -> BetterAuth sessions/cookies
  -> Prisma
PostgreSQL
```

## 3. V1 Implementation Strategy

v1 реализуется как цельный продукт до пользовательского тестирования. Это не означает, что проверки откладываются до конца: каждый крупный этап должен закрываться инженерным checkpoint.

Обязательный checkpoint этапа:

- targeted unit/integration tests;
- real Postgres integration tests для операций с деньгами, остатками и историей;
- `docs:check`;
- релевантные `lint`, `typecheck`, `test`, `build`;
- ручная проверка UI владельцем проекта для готовых flow.

Admin user management реализуется рано, потому что администратор создает пользователей и назначает роли.

Mobile/PWA foundation реализуется рано, а не в конце: app shell, role home screens, mobile navigation, PWA manifest и explicit offline write blocking должны формировать UX-каркас до полной реализации отчетов.

## 4. Operations And Audit Model

Критичные доменные действия проектируются как append-only операции.

Текущий baseline в Prisma:

- `operation` — общий envelope действия: тип, статус, actor, idempotency key, metadata и время создания;
- `audit_log` — append-only запись действия с actor, operation, action, entity и display/details context;
- `idempotency_record` — защита write-команды от повторного выполнения по паре `actorUserId + key`.

Admin user management уже пишет audit operations:

- `user.create`;
- `user.role.update`;
- `user.password.reset`.

Audit details для password lifecycle не содержат plaintext password.

Catalog management пишет audit operations:

- `catalog.raw_material_type.create`;
- `catalog.raw_material_type.update`;
- `catalog.raw_material_type.archive`;
- `catalog.packaging_type.create`;
- `catalog.packaging_type.update`;
- `catalog.packaging_type.archive`;
- `catalog.distributor.create`;
- `catalog.distributor.update`;
- `catalog.distributor.archive`;
- `catalog.product_template.create`;
- `catalog.product_template.update`;
- `catalog.product_template.archive`.

Clients foundation пишет audit operations:

- `client.create`;
- `client.update`.

Production baseline пишет audit operations:

- `production.raw_material_intake.create`;
- `production.packaging_intake.create`;
- `production.product_batch.create`;
- `production.product_transfer.create`.

Distributor sales пишет audit operations:

- `distributor.sale.create`.
- `distributor.cash.withdraw`.
- `distributor.discount.assign`.

Courier sales пишет audit operations:

- `courier.sale.create`.
- `courier.stock.load.create`.
- `courier.unload.create`.

Справочники отключаются через `active=false`, без физического удаления. Шаблон продукции хранит название, связи на активные вид сырья и вид тары, а также цену за единицу в `priceCents`. Фасовки, нормативы и остатки не входят в catalog foundation.

Production balance baseline:

- `raw_material_balance` — текущий остаток сырья в цеху по виду сырья;
- `packaging_balance` — текущий остаток тары в цеху по виду тары;
- `raw_material_intake` и `packaging_intake` — факты поступления;
- `product_batch` — выпущенная партия в статусе `in_workshop` со snapshot названий, единиц учета и цены.
- `workshop_product_balance` — доступный остаток готовой продукции в цеху по выпущенной партии;
- `distributor_product_balance` — товарный остаток распределителя по тройке распределитель + партия продукции + фактическая цена строки;
- `product_transfer` — typed record факта перемещения партии из цеха на распределитель с price snapshot.

Поступления и выпуск выполняются в Prisma transaction. Выпуск партии использует conditional decrement: сырье и тара списываются только если текущего остатка достаточно, иначе операция отклоняется и партия не создается.

Выпуск партии в той же transaction создает `workshop_product_balance` с количеством выпущенной продукции. Перемещение на распределитель использует conditional decrement `workshop_product_balance.quantity >= requestedQuantity` и upsert/increment `distributor_product_balance`. `ProductBatch.status` не является источником доступного остатка, потому что партия может быть перемещена частично.

Distributor inventory read model строится из ненулевых строк `distributor_product_balance` с join на `product_batch` и `distributor`. API считает `stockValueCents = quantity * distributor_product_balance.unitPriceCents`, возвращает базовую цену партии (`baseUnitPriceCents`), фактическую цену строки (`unitPriceCents`), признак дисконта, общий summary и summary по распределителям. Read endpoint не создает `operation`/`audit_log` и не моделирует cash balance.

Priced stock model: `ProductBatch.priceCents` остается базовой ценой партии, а `DistributorProductBalance.unitPriceCents` и `CourierProductBalance.unitPriceCents` являются фактической ценой конкретной строки остатка. Уникальность balance projections включает `unitPriceCents`, поэтому одна партия может одновременно существовать в нескольких ценовых строках. Продажи, загрузки, возвраты и перемещения хранят price snapshot: `baseUnitPriceCents`, `unitPriceCents`, `discountCentsPerUnit` и стоимость строки.

Client master data хранится в таблице `client`. Телефон нормализуется в `phoneNormalized` удалением всех нецифровых символов и защищается unique constraint. Клиентская карточка является mutable master data: создание и редактирование пишут `operation`/`audit_log`, но будущие продажи должны ссылаться на `clientId` и показывать актуальные имя/телефон/описание через join на `Client`, а не хранить старые ошибочные данные как operational source of truth.

Distributor sales добавляет `distributor_sale` как typed fact продажи и `distributor_cash_balance` как projection наличного баланса распределителя. Продажа создается по `distributorProductBalanceId`: backend сам загружает распределитель, партию и цену строки, затем в одной transaction делает conditional decrement товарного остатка, при наличной оплате upsert/increment cash projection, создает `Operation`, `DistributorSale` и `AuditLog`. `DistributorSale` хранит базовую цену партии, фактическую цену, дисконт за единицу, суммарный дисконт и `totalCents`, поэтому будущие отчеты и корректировки не зависят от текущей цены шаблона или join-пересчета старого факта.

Courier load добавляет `courier_product_balance` как projection товарного остатка курьера по тройке курьер + партия продукции + фактическая цена строки и `courier_load` как typed fact загрузки. Загрузка создается по `distributorProductBalanceId`: backend сам загружает распределитель, партию и цену строки, затем в одной transaction делает conditional decrement `distributor_product_balance`, upsert/increment `courier_product_balance` с той же `unitPriceCents`, создает `Operation`, `CourierLoad` и `AuditLog`. Курьерский товарный баланс не делится по распределителям: после загрузки товар считается находящимся у курьера, а источник загрузки остается в `courier_load` и audit details.

Courier sales добавляет `courier_sale` как typed fact продажи курьером и `courier_cash_balance` как projection наличного баланса курьера. Продажа создается по `courierProductBalanceId`: backend сам проверяет владельца строки, партию, клиента и фактическую цену строки, затем в одной transaction делает conditional decrement `courier_product_balance`, при наличной оплате upsert/increment `courier_cash_balance`, создает `Operation`, `CourierSale` и `AuditLog`. Для cash audit источником истины является результат increment: `cashAfter` берется из обновленной projection, а `cashBefore = cashAfter - totalCents`, чтобы параллельные наличные продажи не записывали устаревший before/after.

Distributor discount assignment добавляет typed fact `product_discount_assignment`. Операция `distributor.discount.assign` доступна Директору и администратору, делает conditional decrement исходной строки `distributor_product_balance`, upsert/increment целевой строки с новой `unitPriceCents`, сохраняет базовую цену партии, текущую цену исходной строки, новую цену, общий дисконт и шаг текущего снижения. Audit before/after рассчитывается от результатов успешного update/upsert, а не от предварительного чтения.

Базовый принцип для следующих доменных операций:

- `Operation`/audit envelope фиксирует общий факт: id, тип операции, actor, время, idempotency key, источник и статус;
- typed operation details фиксируют доменные поля конкретного действия;
- balance projections обновляются в той же transaction, что и operation/details/audit records;
- read models/query services читают надежные projections или факты операций, а не UI-state.

Typed details нужны минимум для:

- продажи;
- загрузки курьера;
- сгрузки курьера;
- выпуска продукции;
- перемещения на распределитель;
- списания наличных;
- назначения дисконта;
- корректировки/отмены.

Не использовать один универсальный JSON payload как единственное место хранения деталей критичных операций, если эти детали нужны для отчетов, тестов, связей и доменных инвариантов.

## 5. Что пока не фиксируем

Пока не фиксировать преждевременно:

- окончательный список backend-модулей;
- typed detail таблицы для конкретных операций;
- финальные API routes бизнес-сценариев;
- финальную форму UI-навигации сверх mobile-first/PWA направления;
- conditional balance projection tables до проектирования конкретных денежных и товарных операций.

## 6. Когда заполнять

Расширять после появления первых доменных операций: продажи, выпуск продукции, загрузка/сгрузка курьера, списание наличных и заранее назначенный дисконт.
