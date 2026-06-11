# Admin User Identity Edit

Статус: `Completed`

Дата старта: `2026-06-11`

Дата завершения: `2026-06-12`

## 1. Цель

Дать администратору возможность менять имя и login существующего пользователя через штатный CRM user lifecycle.

Первый production seed создал пользователя `Nikita` с login `director`, что неудобно для реальной эксплуатации: сейчас администратор может создать пользователя, сменить роль и сбросить пароль, но не может исправить имя и login без ручного вмешательства в БД.

Цель реализации:

- исправлять имя сотрудника без пересоздания пользователя;
- менять login сотрудника без смены пароля и роли;
- сохранить вход по новому login с прежним паролем;
- закрыть изменение через `/users`, permissions и audit, а не через BetterAuth admin endpoints или ручной SQL.

## 2. Backend-анализ текущего состояния

Текущий user lifecycle находится в `apps/api/src/users/users.service.ts` и `apps/api/src/users/users.controller.ts`.

Уже есть:

- `GET /users` — список пользователей;
- `POST /users` — создание пользователя администратором;
- `PATCH /users/:userId/role` — смена роли;
- `POST /users/:userId/reset-password` — сброс пароля;
- `POST /account/password` — смена собственного пароля пользователем.

Все admin endpoints `/users` защищены `@RequirePermission("users.manage")` и `PolicyGuard`.

BetterAuth хранит identity в таблице `user`:

- `name` — отображаемое имя;
- `email` — обязательный BetterAuth email, в CRM используется как внутренний технический email;
- `username` — фактический login для входа через BetterAuth username plugin;
- `displayUsername` — отображаемый username BetterAuth;
- `role` — CRM роль.

Схема БД уже поддерживает нужное изменение:

- `email` уникальный;
- `username` уникальный;
- `displayUsername` не уникальный;
- отдельная миграция БД не нужна, если мы меняем только эти существующие поля.

Важный технический компромисс уже зафиксирован в `docs/TECH-STACK.md` и `docs/SECURITY.md`: BetterAuth требует email, поэтому CRM создает внутренний email вида `login@internal.buhta.local`. Это значит, что при изменении login нужно консистентно менять сразу:

- `username`;
- `displayUsername`;
- `email`.

Если поменять только часть этих полей, можно получить расхождение: UI показывает один login, а вход работает по другому идентификатору.

Сессии BetterAuth привязаны к `userId`, а не к login, поэтому смена login/name не должна инвалидировать текущие сессии. Для целевого пользователя следующий `/auth/me` должен вернуть обновленные `login` и `displayName`, потому что actor строится из текущей записи пользователя.

Существующие тесты уже покрывают основу:

- `apps/api/test/users-db.integration.test.ts` — создание пользователя, смена роли, сброс пароля, audit;
- `apps/api/test/users-controller.test.ts` — валидация payload на controller уровне;
- `apps/api/test/auth-http.integration.test.ts` — HTTP login по username, `/auth/me`, reset/change password;
- frontend API client уже централизован в `apps/web/src/lib/api-client.ts`;
- admin users UI находится в `apps/web/src/features/users/AdminUsersHome.tsx`.

## 3. Scope

Входит:

- новый shared contract для изменения identity пользователя;
- новый backend endpoint в `/users`;
- сервисная логика изменения `name`, `username`, `displayUsername`, `email`;
- проверка уникальности нового login;
- audit operation для изменения identity;
- frontend API client method;
- UI в админском списке пользователей: открыть редактирование, изменить имя/login, сохранить;
- отображение ошибок в UI, включая занятый login;
- targeted backend и frontend тесты;
- обновление SoR-документации по API, frontend и security нюансам.

## 4. Out Of Scope

Не входит:

- самостоятельное редактирование собственного login/name пользователем;
- смена email как бизнес-поля, потому что email в CRM сейчас технический;
- смена роли или пароля через новый endpoint;
- удаление пользователей;
- блокировка/ban пользователей;
- отключение BetterAuth admin plugin;
- миграция auth-провайдера или отказ от BetterAuth;
- ручная production SQL-правка seeded пользователя вместо продуктовой возможности.

## 5. Затронутые документы

Обязательно обновить при реализации:

- `docs/HANDLER-MAP.md` — добавить новый `/users/:userId/identity` route;
- `docs/FRONTEND.md` — зафиксировать, что admin users screen умеет редактировать имя и login;
- `docs/SECURITY.md` — описать правила изменения login, технический email и audit;
- `docs/DOMAIN-EVENTS.md` или `docs/HANDLER-MAP.md`, если operation/audit catalog ведется там;
- `docs/DOCS-INDEX.md` — при завершении переместить этот план из `active` в `completed`.

Если реализация не меняет постоянные бизнес-правила сверх user lifecycle, `docs/crm-requirements.md` можно не менять.

## 6. Затронутые модули

Shared:

- `packages/shared/src/users.ts`;
- возможно `packages/shared/src/index.test.ts`, если там проверяется экспорт контрактов.

Backend:

- `apps/api/src/users/users.controller.ts`;
- `apps/api/src/users/users.service.ts`;
- `apps/api/src/users/login.ts`, если потребуется helper для проверки доступности login с исключением текущего пользователя;
- `apps/api/src/operations/operation.types.ts`;
- `apps/api/src/operations/operation-history.mapper.ts`;
- `apps/api/test/users-db.integration.test.ts`;
- `apps/api/test/users-controller.test.ts`;
- `apps/api/test/auth-http.integration.test.ts`.

Frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/users/AdminUsersHome.tsx`;
- `apps/web/src/features/operations/operation-detail-presenter.ts`;
- targeted frontend tests, если рядом есть подходящий тестовый слой.

## 7. Предлагаемый API contract

Новый route:

```text
PATCH /users/:userId/identity
```

Request:

```json
{
  "name": "Никита Иванов",
  "login": "nikita"
}
```

Response:

```json
{
  "user": {
    "id": "...",
    "name": "Никита Иванов",
    "login": "nikita",
    "role": "director",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Правила:

- `name` обязателен, trim, минимум 1 символ;
- `login` обязателен и проходит текущий `LoginSchema`;
- login нормализуется в lower-case;
- login должен быть уникален по `username` и производному `email`;
- тот же login у того же пользователя разрешен, если меняется только имя;
- endpoint не принимает `role`, `password`, `email`, `banned` и другие BetterAuth/admin поля.

## 8. Шаги реализации

1. Shared contract:
   - добавить `UpdateUserIdentityRequestSchema`;
   - добавить `UpdateUserIdentityResponseSchema`;
   - экспортировать соответствующие типы.

2. Backend controller:
   - добавить `PATCH /users/:userId/identity`;
   - валидировать body через shared schema;
   - требовать actor через существующий `requireActor`;
   - вернуть `{ user }`.

3. Backend service:
   - добавить `updateUserIdentity(actor, userId, input)`;
   - найти пользователя или вернуть `NOT_FOUND`;
   - нормализовать login;
   - построить новый technical email через `technicalEmailForLogin(login)`;
   - проверить, что другой пользователь не занимает `username` или `email`;
   - обновить `name`, `username`, `displayUsername`, `email`;
   - записать audit operation `user.identity.update`.

4. Audit details:
   - записывать `targetUserId`;
   - записывать старые и новые `name/login`;
   - не записывать пароли и не затрагивать credential account.

5. Operation catalog:
   - добавить `user.identity.update` в `BASELINE_OPERATION_TYPES`;
   - добавить человекочитаемые подписи в backend/frontend history presenters.

6. Frontend API client:
   - добавить `updateUserIdentity(userId, input)`;
   - использовать shared request/response types.

7. Admin UI:
   - добавить edit action в строку пользователя рядом с copy/reset/role controls;
   - открыть modal/dialog с текущими `name` и `login`;
   - на save вызвать новый API method;
   - после успеха инвалидировать `["users"]`;
   - заблокировать submit offline и during pending mutation;
   - показывать ошибку занятого login как понятный текст.

8. Документация:
   - обновить документы из раздела 5;
   - после завершения переместить plan в `completed` и записать фактически выполненные проверки.

## 9. Тестовый план

Backend unit/controller:

- controller отклоняет пустое имя;
- controller отклоняет невалидный login;
- controller вызывает service с actor, userId и parsed body;
- controller возвращает `{ user }`.

Backend integration:

- admin меняет только имя, login остается прежним;
- admin меняет login, в БД обновляются `username`, `displayUsername`, `email`;
- старый login больше не входит;
- новый login входит с прежним паролем;
- `/auth/me` после входа возвращает новый login/displayName;
- duplicate login дает typed `CONFLICT`;
- отсутствующий пользователь дает `NOT_FOUND`;
- audit `user.identity.update` создается и не содержит password/credential данных.

Frontend:

- в строке пользователя есть edit action;
- dialog открывается с текущим `name/login`;
- submit отправляет `PATCH /users/:userId/identity`;
- successful submit закрывает dialog и обновляет список;
- конфликт login показывает понятную ошибку;
- offline состояние блокирует сохранение.

Полная релевантная проверка перед коммитом:

- `pnpm lint`;
- `pnpm typecheck`;
- targeted backend tests по users/auth;
- targeted frontend tests по admin users UI, если доступны;
- `pnpm docs:check`;
- `pnpm -r build` или общий production build, если изменения frontend/backend contracts затрагивают сборку.

Smoke в браузере нужен после реализации UI, но не на этапе создания плана.

## 10. Риски и rollback

Риск: рассинхронизация login и technical email.

- Митигация: менять `username`, `displayUsername`, `email` в одной сервисной операции и покрыть integration test.
- Rollback: повторить update через тот же endpoint на прежний login; при аварии restore из pre-deploy backup.

Риск: конфликт с существующим пользователем.

- Митигация: проверять `username` и `email` с исключением текущего `userId`.
- Rollback не нужен, операция должна не применяться.

Риск: текущая сессия целевого пользователя продолжит жить после смены login.

- Это ожидаемо для MVP, потому что сессия привязана к `userId`. Пароль и роль не меняются.
- Если позже потребуется принудительный re-login после смены login, это отдельное security/product решение.

Риск: self-edit администратора.

- Для первого прохода admin users screen уже исключает текущего actor из списка. Сохраняем это поведение, чтобы не ломать текущую сессию и не усложнять UX.
- Самостоятельное редактирование собственного профиля можно добавить отдельным account endpoint позже.

Риск: обход через BetterAuth admin endpoints.

- Это уже принятый MVP-риск в `docs/DECISIONS.md`. Новую функцию реализуем только через CRM `/users`, чтобы штатный путь имел audit и проверки.

Rollback deployment:

- обычный production rollback по `docs/DEPLOYMENT.md` на предыдущий image SHA;
- миграции БД не ожидаются, значит rollback простой.

## 11. Открытые вопросы

- Нужен ли администратору отдельный account screen для изменения собственного имени/login, или достаточно редактирования других сотрудников?
- Нужно ли после смены login принудительно завершать сессии целевого пользователя?
- Нужно ли показывать в истории операций отдельные поля `fromLogin/toLogin` красиво в details modal, или достаточно общего details JSON formatter текущей истории?
- Нужно ли разрешить кириллицу в `name` без дополнительных ограничений? Сейчас `name` просто trim/min(1), это соответствует текущему созданию пользователя.

## 12. Definition Of Done

Задача считается завершенной, когда:

- администратор может изменить имя и login существующего пользователя из UI;
- seeded `Nikita/director` можно исправить без ручного SQL;
- вход по новому login работает со старым паролем;
- старый login больше не проходит;
- audit фиксирует изменение identity;
- tests и docs check пройдены;
- план перемещен в `docs/exec-plans/completed/` с фактическим списком проверок.

## 13. Фактическая реализация

Сделано:

- добавлены shared contracts `UpdateUserIdentityRequestSchema` и `UpdateUserIdentityResponseSchema`;
- добавлен `PATCH /users/:userId/identity`;
- `UsersService.updateUserIdentity` обновляет `name`, `username`, `displayUsername` и технический `email` вместе;
- self-identity update администратора запрещен в CRM users API;
- duplicate login возвращает typed `CONFLICT`;
- audit operation `user.identity.update` фиксирует старые и новые `name/login` без password/credential данных;
- admin users UI получил compact edit action в строке пользователя и `operation-dialog` для сохранения имени/login;
- frontend форма реализована без derived React state: поля используют `defaultValue`, submit читает `FormData`;
- SoR-документация обновлена: `docs/HANDLER-MAP.md`, `docs/SECURITY.md`, `docs/FRONTEND.md`, `docs/DOMAIN-EVENTS.md`.

Выполненные проверки:

- `pnpm install --frozen-lockfile`;
- `pnpm --filter @buhta/shared exec vitest run src/index.test.ts`;
- `pnpm --filter @buhta/web exec vitest run src/features/users/AdminUsersHome.test.tsx`;
- `pnpm --filter @buhta/api exec vitest run test/users-controller.test.ts`;
- `pnpm --filter @buhta/api exec vitest run test/users-db.integration.test.ts test/auth-http.integration.test.ts`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm -r build`;
- `pnpm docs:check`;
- `npx react-doctor@latest --verbose --diff`.

Примечание по локальному запуску: Prisma/Postgres integration tests внутри sandbox падали до выполнения тестовых сценариев на Prisma/IPC. Тот же targeted DB набор успешно прошел вне sandbox.
