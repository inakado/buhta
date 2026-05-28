# HANDLER-MAP

Карта обработчиков проекта «Бухта».

Статус: `Draft`.

## 1. Назначение

Документ заполняется после появления API и нужен, чтобы быстро видеть:

- HTTP route;
- command/query handler;
- сервис или policy, где проверяются права;
- какие балансы меняются;
- какие события/записи истории создаются;
- какие тесты покрывают поток.

## 2. Текущие handlers

| Route | Handler | Domain operation | Rights | History | Tests |
|---|---|---|---|---|---|
| `GET /health` | `HealthController.health` | runtime health | public via `AllowAnonymous` | нет | `apps/api/test/health.test.ts` |
| `GET /auth/me` | `AuthMeController.me` | current actor/session summary | BetterAuth protected route | нет | покрывается policy unit tests indirectly |
| `GET /auth-spike/director-only` | `AuthSpikeController.directorOnly` | protected policy smoke route | `cash.withdraw` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/policy.test.ts` |
| `GET /users` | `UsersController.listUsers` | user list for admin baseline | `users.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/users-controller.test.ts`, `apps/api/test/users-db.integration.test.ts` |
| `PATCH /users/:userId/role` | `UsersController.updateUserRole` | update user role | `users.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/users-controller.test.ts`, `apps/api/test/users-db.integration.test.ts` |

## 3. Минимальный формат будущей строки

Не описывать вымышленные endpoints до появления handler в коде. Новые строки добавлять только по фактической реализации route и тестов.

| Route | Handler | Domain operation | Rights | History | Tests |
|---|---|---|---|---|---|
