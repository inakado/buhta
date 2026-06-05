# SECURITY

Security notes проекта «Бухта».

Статус: `Draft`. Foundation auth-интеграция создана, доменные security rules будут расширяться по мере появления операций.

## 1. Scope

Документ должен покрывать:

- authentication и sessions;
- authorization и роли;
- защиту денежных и товарных операций;
- audit/history guarantees;
- env/secrets policy;
- базовые HTTP/security настройки.

## 2. Текущие принципы

- Не принимать решение о доступе только на frontend.
- Критичные операции проверяются на backend.
- Права ролей проверяются через единый backend policy layer.
- Изменение разрешений роли должно быть локальным изменением policy, а не правкой множества controllers, handlers и UI-условий.
- Проведенные операции не редактируются задним числом; исправления идут отдельной операцией.
- Секреты не попадают в git.
- Auth foundation строится на BetterAuth через NestJS adapter.

## 3. Текущий auth/session flow

- BetterAuth подключен в API на `/api/auth`.
- Текущий v1 flow использует BetterAuth email/password + username plugin.
- Администратор создает пользователя, назначает роль, получает логин и временный пароль, а сотрудник входит по логину и паролю.
- Email не является пользовательским идентификатором в интерфейсе CRM.
- BetterAuth все еще требует email на уровне auth user table, поэтому API генерирует внутренний технический email вида `login@internal.buhta.local`. Это поле не показывать в UI и не использовать как бизнес-идентификатор.
- Session хранится в httpOnly cookie `better-auth.session_token`.
- Роль пользователя хранится в user table как дополнительное поле.
- Логин хранится в BetterAuth username fields `username/displayUsername`.
- Временный пароль возвращается только в response создания пользователя или сброса пароля.
- Сброс пароля должен гарантировать наличие `credential` account: для seed/legacy users без password credential API создает credential при reset, иначе новый пароль не сможет использоваться для входа.
- Администратор не может изменить собственную роль через users API.
- Администратор не может сбросить временный пароль самому себе; смена собственного пароля должна быть отдельным защищенным flow, когда он появится.
- Audit для создания пользователя, смены роли и сброса пароля не должен содержать plaintext password.
- Публичные routes должны быть явно отмечены как anonymous.
- Protected routes проходят через BetterAuth session guard и затем через backend role/policy guards.

## 4. Policy Layer Direction

Policy layer отвечает за доменные разрешения. Текущий кодовый baseline:

- roles и permissions описаны в `packages/shared`;
- `PolicyRegistry` строит application `Actor` из BetterAuth user/session;
- `RequirePermission` + `PolicyGuard` проверяют доменное permission на backend;
- protected handlers не должны проверять `role === ...` напрямую;
- `admin` получает все baseline permissions.
- `/users` handlers защищены permission `users.manage`; сейчас это только `admin`.
- `/catalog/*` handlers защищены permission `catalog.manage`; сейчас это `admin` и `director`.
- `/production/*` handlers защищены permission `production.manage`; сейчас это `admin` и `production_manager`.
- Перемещение продукции из цеха на распределитель использует тот же `production.manage`: `production_manager` выполняет рабочую операцию, `admin` имеет support-доступ. Отдельный permission для transfer пока не введен.
- `/clients` read handlers защищены `client.read`; write handlers защищены `client.manage`.
- `client.read` и `client.manage` разделены намеренно: директор видит клиентскую базу, но не создает и не редактирует клиентов.

Текущие baseline permissions:

- кто может назначать дисконт;
- кто может отменять операции;
- кто может списывать наличные;
- кто может выпускать продукцию;
- кто может загружать и сгружать продукцию курьера;
- кто может видеть аудит и статистику.

Текущая policy для дисконта: `director` и `admin`. Отмена продажи является операционным действием продавца: продажу с распределителя отменяют роли с `distributor.sale.cancel`, курьерскую продажу отменяет курьер по своему контуру через `courier.sale.cancel`. Директор контролирует такие действия через историю операций. Администратор остается backend-суперпользователем.

Назначение дисконта защищено `discount.assign`: `POST /distributor/discounts` доступен `director` и `admin`. Backend принимает только id строки остатка, количество, новую итоговую цену и optional комментарий; исходную цену, базовую цену партии, сумму дисконта и affected balances он рассчитывает сам в transaction. Продажи, загрузки и возвраты не принимают цену от frontend: цена берется только из выбранной priced stock row.

Read-only товарные остатки распределителя защищены `distributor.stock.read`. Это право есть у всех v1 ролей, включая `admin`, но endpoint не создает операции, не меняет остатки и не раскрывает наличный денежный баланс.

Продажа с распределителя разделяет права чтения, создания и отмены: `GET /distributor/sale-options`, `GET /distributor/sales/recent` и `POST /distributor/sales` требуют `distributor.sale.create`, `POST /distributor/sales/:saleId/cancel` требует `distributor.sale.cancel`, а `GET /distributor/cash-balances` требует `distributor.cash.read`. Роли без `distributor.cash.read` не должны получать наличный баланс распределителя ни через API, ни через UI. Отмена требует причину, создает отдельный typed fact и не редактирует исходную продажу.

Списание наличных с распределителя защищено `cash.withdraw`: `POST /distributor/cash-withdrawals` доступен `director` и `admin`. Backend разрешает списание только с активного распределителя, выполняет conditional decrement по cash balance и запрещает отрицательный остаток. `GET /distributor/cash-balances` может показывать архивный распределитель с cash row read-only, но response содержит `active`, чтобы UI не давал выбрать архивную строку для списания.

Курьерский товарный контур разделяет чтение и загрузку: `GET /courier/product-balances` требует `courier.stock.read`, а `GET /courier/load-options` и `POST /courier/loads` требуют `courier.stock.load`. Backend дополнительно ограничивает область данных: курьер читает только собственный товарный баланс и не может передать `courierUserId` при загрузке, коммерческий руководитель и Директор читают балансы всех курьеров без права загрузки, администратор имеет backend-доступ к чтению и загрузке с явным `courierUserId`.

Курьерская продажа разделяет чтение cash, создание и отмену: `GET /courier/cash-balances` требует `courier.cash.read`, `GET /courier/sale-options`, `GET /courier/sales/recent` и `POST /courier/sales` требуют `courier.sale.create`, а `POST /courier/sales/:saleId/cancel` требует `courier.sale.cancel`. Курьер видит и меняет только собственный контур; коммерческий руководитель и Директор видят наличные балансы всех курьеров read-only, но не могут оформить или отменить продажу за курьера. Администратор имеет backend-доступ как супер-пользователь: для write-команды с чужим курьером требуется явный `courierUserId`, а recent sales backend scope для admin — все courier sales.

Отмена cash sale считает наличные агрегированным балансом источника, а не привязкой конкретных купюр к продаже. Backend разрешает отмену только если текущий aggregate cash balance распределителя или курьера достаточен для обратного decrement. Если cash уже сгружен или списан и текущего остатка не хватает, отмена отклоняется и ждет будущего ручного исправления.

Курьерская сгрузка защищена `courier.unload.create`: `GET /courier/unload-options` работает как courier self-flow и возвращает только собственные товарные строки, собственный cash balance и активные распределители; `POST /courier/unloads` разрешает курьеру сгружать только собственный баланс, а администратору как backend-суперпользователю требуется явный `courierUserId`. Коммерческий руководитель и Директор читают courier balances, но не создают сгрузку. Backend запрещает сгрузку сверх товарного или cash balance и отклоняет неактивный распределитель.

Общая история операций защищена отдельным `operation.history.read`: `GET /operations/history` и `GET /operations/history/options` доступны только `admin` и `director`. Не использовать `audit.read` для этого экрана, потому что `audit.read` исторически шире и выдан операционным ролям. History endpoint не пишет новые audit records, ограничивает максимальный период запроса 90 днями и маскирует в `details` потенциально секретные ключи (`password`, `token`, `secret`, `accessToken`, `refreshToken`, `hash`) case-insensitive.

Минимальная матрица ролей в коде:

| Permission | Роли |
|---|---|
| `users.manage` | `admin` |
| `catalog.manage` | `admin`, `director` |
| `production.manage` | `admin`, `production_manager` |
| `distributor.stock.read` | все роли |
| `distributor.cash.read` | `admin`, `director`, `commercial_manager`, `distributor_worker` |
| `client.read` | `admin`, `director`, `commercial_manager`, `distributor_worker`, `courier` |
| `client.manage` | `admin`, `commercial_manager`, `distributor_worker`, `courier` |
| `distributor.sale.create` | `admin`, `commercial_manager`, `distributor_worker` |
| `distributor.sale.cancel` | `admin`, `commercial_manager`, `distributor_worker` |
| `courier.stock.read` | `admin`, `director`, `commercial_manager`, `courier` |
| `courier.stock.load` | `admin`, `courier` |
| `courier.cash.read` | `admin`, `director`, `commercial_manager`, `courier` |
| `courier.sale.create` | `admin`, `courier` |
| `courier.sale.cancel` | `admin`, `courier` |
| `courier.unload.create` | `admin`, `courier` |
| `notification.read` | `admin`, `director`, `production_manager`, `commercial_manager` |
| `notification.create` | `admin`, `commercial_manager` |
| `notification.complete` | `admin`, `production_manager` |
| `cash.withdraw` | `admin`, `director` |
| `discount.assign` | `admin`, `director` |
| `operation.correct` | `admin`, `director` |
| `operation.history.read` | `admin`, `director` |
| `audit.read` | `admin`, `director`, `production_manager`, `commercial_manager`, `distributor_worker` |
| `reports.read` | `admin`, `director`, `commercial_manager` |

## 5. Заполнить после доменного scaffold

- правила CORS/origin;
- политика audit log;
- security test cases.
