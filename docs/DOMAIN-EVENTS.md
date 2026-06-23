# DOMAIN-EVENTS

Каталог доменных событий и журнала действий проекта «Бухта».

Статус: `Draft`.

## 1. Назначение

Документ должен фиксировать события/записи истории после того, как они появятся в коде.

Использование:

- audit log;
- диагностика действий пользователей;
- восстановление истории операций;
- будущие отчеты и проекции.

## 2. Принципы

- Не подменять прошлое редактированием.
- Исправления и отмены оформлять отдельной операцией.
- Денежные и товарные операции должны оставлять проверяемый след.
- События должны быть названы в терминах «Бухты», а не техническими деталями UI.

## 3. Текущий operation/audit baseline

Кодовый baseline добавляет общие таблицы:

- `operation` — envelope факта действия;
- `audit_log` — append-only запись действия;
- `idempotency_record` — запись ключа идемпотентности write-команды.

Текущие operation types:

| Type | Назначение | Typed details |
|---|---|---|
| `foundation.baseline` | проверочный baseline для operation/idempotency service | нет |
| `user.create` | администратор создал пользователя с логином и временным паролем | нет, audit details без пароля |
| `user.identity.update` | администратор изменил имя и/или login пользователя | нет, audit details содержат старые и новые `name/login`, без пароля |
| `user.role.update` | администратор изменил роль пользователя | нет |
| `user.password.reset` | администратор сбросил временный пароль пользователя | нет, audit details без пароля |
| `catalog.raw_material_type.create` | администратор, директор или заведующий производством создал вид сырья | нет |
| `catalog.raw_material_type.update` | администратор, директор или заведующий производством изменил вид сырья, включая восстановление через `active=true` | нет |
| `catalog.raw_material_type.archive` | администратор, директор или заведующий производством отключил вид сырья через `active=false` | нет |
| `catalog.packaging_type.create` | администратор, директор или заведующий производством создал вид тары | нет |
| `catalog.packaging_type.update` | администратор, директор или заведующий производством изменил вид тары, включая восстановление через `active=true` | нет |
| `catalog.packaging_type.archive` | администратор, директор или заведующий производством отключил вид тары через `active=false` | нет |
| `catalog.distributor.create` | администратор или директор создал распределитель | нет |
| `catalog.distributor.update` | администратор или директор изменил распределитель | нет |
| `catalog.distributor.archive` | администратор или директор отключил распределитель через `active=false` | нет |
| `catalog.product_template.create` | администратор или директор создал шаблон продукции | нет, audit details содержат связи сырья/тары, `priceCents` и `netWeightGrams` |
| `catalog.product_template.update` | администратор или директор изменил шаблон продукции | нет, audit details содержат старые/новые связи сырья/тары, `priceCents`, `netWeightGrams` и active-state |
| `catalog.product_template.archive` | администратор или директор отключил шаблон продукции через `active=false` | нет |
| `client.create` | пользователь с правом `client.manage` создал клиента | нет, audit details содержат id клиента, имя, телефон, нормализованный телефон и описание |
| `client.update` | пользователь с правом `client.manage` уточнил данные клиента | нет, audit details содержат id клиента и измененные поля |
| `production.raw_material_intake.create` | заведующий производством или администратор зафиксировал поступление сырья | нет, audit details содержат id вида сырья, snapshot названия, количество, единицу и комментарий |
| `production.packaging_intake.create` | заведующий производством или администратор зафиксировал поступление тары | нет, audit details содержат id вида тары, snapshot названия, количество, единицу и комментарий |
| `production.product_batch.create` | заведующий производством или администратор выпустил партию продукции в цеху | нет, audit details содержат шаблон, snapshot названия продукции, сырья, тары, цену, `quantity`, `quantityInput*`, `netWeightGrams`, `totalNetWeightGrams` и расход сырья/тары |
| `production.product_transfer.create` | заведующий производством или администратор переместил готовую продукцию из цеха на распределитель | `product_transfer`; audit details содержат snapshot продукции, цены, распределителя, `quantity`, `quantityInput*`, `netWeightGrams`, `totalNetWeightGrams` и остатки до/после |
| `distributor.sale.create` | коммерческий руководитель, работник распределителя или администратор оформил продажу с распределителя | `distributor_sale`; audit details содержат строку товарного остатка, snapshot продукции/цены/распределителя, `clientId`, `quantity`, `quantityInput*`, `netWeightGrams`, `totalNetWeightGrams`, сумму, способ оплаты и товарный/cash баланс до/после |
| `distributor.sale.cancel` | коммерческий руководитель, работник распределителя или администратор отменил продажу с распределителя с обязательной причиной | `distributor_sale_cancellation`; audit details содержат исходную продажу, строку priced stock, snapshot продукции/цены/массы нетто, `clientId`, количество, сумму, способ оплаты, причину и товарный/cash баланс до/после обратного движения |
| `distributor.cash.withdraw` | Директор или администратор списал наличные с активного распределителя | `distributor_cash_withdrawal`; audit details содержат распределитель, сумму, optional комментарий и cash balance до/после |
| `distributor.discount.assign` | Директор или администратор назначил новую цену на часть товарного остатка распределителя | `product_discount_assignment`; audit details содержат исходную и целевую строки остатка, базовую цену партии, текущую цену исходной строки, новую цену, скидку от базовой цены, шаг текущего снижения, `quantity`, `quantityInput*`, `netWeightGrams`, `totalNetWeightGrams` и балансы строк до/после |
| `courier.stock.load.create` | курьер загрузил продукцию с распределителя на собственный товарный баланс; администратор может вызвать backend-команду с явным курьером | `courier_load`; audit details содержат строку товарного остатка распределителя, курьера, snapshot продукции/цены/распределителя, `quantity`, `quantityInput*`, `netWeightGrams`, `totalNetWeightGrams` и остатки распределителя/курьера до/после |
| `courier.sale.create` | курьер оформил продажу клиенту со своего товарного баланса; администратор может вызвать backend-команду с явным курьером | `courier_sale`; audit details содержат строку товарного остатка курьера, snapshot продукции/цены/массы нетто, `clientId`, `quantity`, `quantityInput*`, `totalNetWeightGrams`, сумму, способ оплаты и товарный/cash баланс курьера до/после |
| `courier.sale.cancel` | курьер отменил собственную продажу с обязательной причиной; администратор может вызвать backend-команду для support-flow | `courier_sale_cancellation`; audit details содержат исходную продажу, строку priced stock курьера, snapshot продукции/цены/массы нетто, `clientId`, количество, сумму, способ оплаты, причину и товарный/cash баланс курьера до/после обратного движения |
| `courier.unload.create` | курьер сгрузил одну или несколько товарных строк и/или наличные на выбранный активный распределитель; администратор может вызвать backend-команду с явным курьером | `courier_unload` + `courier_unload_item`; audit details содержат курьера, распределитель, строки товара с `courierProductBalanceId`, `distributorProductBalanceId`, snapshot продукции/цены/массы нетто, `quantity`, `quantityInput*`, `totalNetWeightGrams`, стоимость, товарные балансы курьера/распределителя до/после и cash balance курьера/распределителя до/после |
| `production.notification.create` | коммерческий руководитель или администратор создал свободную задачу производству | `production_notification`; audit details содержат `notificationId`, текст, создателя, recipient role и статус после создания |
| `production.notification.complete` | заведующий производством или администратор отметил задачу производству выполненной | `production_notification`; audit details содержат `notificationId`, текст, создателя, исполнителя и статус до/после |

## 4. Read Model Истории

`GET /operations/history` не создает новый operation type. Это управленческий read model поверх `audit_log`, `operation` и actor user.

Правила выдачи:

- доступ только по `operation.history.read`;
- default period — последние 7 дней;
- максимальный период одного запроса — 90 дней;
- фильтр типа события называется `operationType`;
- cursor pagination строится по `audit_log.createdAt desc, audit_log.id desc`;
- `details` перед выдачей маскирует потенциально секретные ключи `password`, `token`, `secret`, `accessToken`, `refreshToken`, `hash` на любой глубине объекта.

`GET /operations/history/options` возвращает варианты фильтров отдельно от текущей страницы истории.

## 5. Кандидаты на будущую фиксацию

Раздел не фиксирует финальный список будущих событий. Финальные имена и payload новых событий фиксируются только после проектирования schema/API.
