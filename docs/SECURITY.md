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
- Используется email/password flow.
- Session хранится в httpOnly cookie `better-auth.session_token`.
- Роль пользователя хранится в user table как дополнительное поле.
- Публичные routes должны быть явно отмечены как anonymous.
- Protected routes проходят через BetterAuth session guard и затем через backend role/policy guards.

## 4. Policy Layer Direction

Policy layer отвечает за доменные разрешения:

- кто может назначать дисконт;
- кто может отменять или корректировать операции;
- кто может списывать наличные;
- кто может выпускать продукцию;
- кто может загружать и сгружать продукцию курьера;
- кто может видеть аудит и статистику.

Текущая policy для дисконта, отмены и корректировок: `director` и `admin`. Если позже право нужно добавить коммерческому руководителю или другой роли, это должно быть одно изменение в policy matrix/helper и соответствующих тестах.

## 5. Заполнить после доменного scaffold

- roles/permissions matrix в коде;
- правила CORS/origin;
- политика audit log;
- security test cases.
