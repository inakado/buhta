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
- кто может отменять или корректировать операции;
- кто может списывать наличные;
- кто может выпускать продукцию;
- кто может загружать и сгружать продукцию курьера;
- кто может видеть аудит и статистику.

Текущая policy для дисконта, отмены и корректировок: `director` и `admin`. Если позже право нужно добавить коммерческому руководителю или другой роли, это должно быть одно изменение в policy matrix/helper и соответствующих тестах.

Read-only товарные остатки распределителя защищены `distributor.stock.read`. Это право есть у всех v1 ролей, включая `admin`, но endpoint не создает операции, не меняет остатки и не раскрывает наличный денежный баланс.

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
| `courier.stock.load` | `admin`, `courier` |
| `courier.sale.create` | `admin`, `courier` |
| `courier.unload.create` | `admin`, `courier` |
| `notification.create` | `admin`, `commercial_manager` |
| `notification.complete` | `admin`, `production_manager` |
| `cash.withdraw` | `admin`, `director` |
| `discount.assign` | `admin`, `director` |
| `operation.correct` | `admin`, `director` |
| `audit.read` | `admin`, `director`, `production_manager`, `commercial_manager`, `distributor_worker` |
| `reports.read` | `admin`, `director`, `commercial_manager` |

## 5. Заполнить после доменного scaffold

- правила CORS/origin;
- политика audit log;
- security test cases.
