# SECURITY

Security notes проекта «Бухта».

Статус: `Draft`. Заполняется по мере появления кода и auth-интеграции.

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
- Проведенные операции не редактируются задним числом; исправления идут отдельной операцией.
- Секреты не попадают в git.
- Auth-решение фиксируется после BetterAuth/NestJS spike.

## 3. Заполнить после scaffold

- выбранный session/cookie flow;
- roles/permissions matrix в коде;
- правила CORS/origin;
- политика audit log;
- security test cases.
