# Admin Login And Mobile Shell Plan

Статус: `Completed`
Дата: 2026-05-28
Roadmap stage: продолжение `1. Roles, Admin, Policy Foundation` + начало `2. Mobile/PWA Foundation`.

## Цель

Сделать первый пользовательский контур CRM: администратор входит в систему, создает сотрудников, выдает им логин и временный пароль, а сотрудники входят по логину/паролю и видят стартовый экран своей роли.

Ключевое продуктовое решение: пользователи не регистрируются самостоятельно и не входят по email. Email не является обязательным пользовательским идентификатором в CRM UI. Администратор управляет пользователями, ролями, логинами и временными паролями.

## Scope

Входит:

- техническая проверка login/password flow поверх BetterAuth;
- admin-created user flow на backend;
- генерация или ручное задание уникального логина;
- генерация временного пароля и возврат его администратору только один раз при создании/сбросе;
- смена роли пользователя;
- сброс временного пароля администратором;
- login/logout UI;
- загрузка current actor через `/auth/me`;
- мобильный app shell;
- role home placeholders для всех ролей;
- минимальный admin users screen;
- PWA manifest/icons/theme/standalone baseline;
- online/offline indicator и блокировка будущих write actions при offline.

Не входит:

- справочники сырья/тары/шаблонов продукции;
- производство, продажи, курьерские операции и деньги;
- полноценная политика паролей сверх безопасного временного пароля;
- self-service registration;
- email-based login в UI;
- восстановление пароля пользователем без администратора;
- offline queue/background sync;
- production deploy.

## Архитектурные решения этапа

### 1. Admin-owned identity lifecycle

Пользователь появляется в системе только через администратора.

Минимальный flow:

```text
admin -> create user(name, role, login?) -> system creates auth identity -> temporary password shown once
employee -> login(login, password) -> role home screen
admin -> reset password -> new temporary password shown once
```

Пароль не хранить и не логировать в открытом виде. В response возвращать временный пароль только в момент создания или сброса. История/audit должна фиксировать факт создания пользователя или сброса пароля, но не сам пароль.

### 2. BetterAuth login/password technical spike first

Перед UI нужно проверить технический путь:

- BetterAuth username plugin в связке `NestJS + Prisma + @thallesp/nestjs-better-auth`;
- sign-in по `username/login + password`;
- сохранение текущего `role` в user table;
- получение session user в Nest request;
- совместимость с текущим `Actor`/`PolicyGuard`;
- отсутствие email как обязательного UI/API поля для сотрудников.

Если BetterAuth требует email на уровне таблицы, допустимый fallback: генерировать внутренний технический email из логина, например `login@internal.buhta.local`, не показывать его в UI и не использовать как бизнес-идентификатор. Это решение нужно явно зафиксировать в `docs/SECURITY.md` и `docs/TECH-STACK.md` после spike.

Если username plugin плохо совместим с Nest adapter, не строить самописную auth-инфраструктуру сразу. Сначала зафиксировать проблему и выбрать минимальный fallback: технический email + login field на нашем уровне или отдельный проверенный BetterAuth-compatible approach.

### 3. Backend users API

Расширить текущий `/users` baseline:

- `GET /users` — список пользователей для admin;
- `POST /users` — создать пользователя с `name`, `role`, optional `login`;
- `PATCH /users/:userId/role` — изменить роль;
- `POST /users/:userId/reset-password` — сбросить пароль и вернуть новый временный пароль;
- возможно `PATCH /users/:userId/status` для activate/deactivate, если поддерживается чисто текущей auth-моделью без лишней сложности.

Все endpoints защищены `users.manage`.

Создание и сброс пароля должны писать `Operation`/`AuditLog` через уже созданный baseline. Audit details не должны содержать пароль.

### 4. Frontend app shell

Сделать фактическое приложение, не landing page:

- `/login` или login state на главном входе;
- authenticated app shell;
- current actor в server-state слое;
- role home placeholders;
- admin users screen;
- mobile-first layout;
- понятные loading/error/empty states;
- logout action.

Визуальное направление этапа описано в `docs/FRONTEND.md`: mobile-first app, светлая база, черные navigation/action элементы, зеленый акцент и точечные lime/green gradient summary cards. Это рабочий ориентир, не финальная дизайн-система.

Для временной структуры страниц использовать локальный мок `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta`: он задает набор ролей, стартовых экранов и будущих сценариев, но его текущую палитру не считать обязательной.

Структура компонентов должна следовать `docs/FRONTEND.md`:

- `page.tsx` остается тонким wrapper;
- `roles/*/*Home.tsx` собирают роль из секций;
- переиспользуемые бизнес-функции живут в `features/*`;
- admin users UI в этом этапе живет рядом с ролью администратора и использует `features/users`;
- будущая продажа должна быть `features/sales`, чтобы курьер, работник распределителя и коммерческий руководитель переиспользовали один сценарий вместо копирования форм.

Стартовые экраны ролей пока могут быть заглушками, но должны соответствовать будущим сценариям:

- admin: пользователи;
- director: остатки/деньги/отчеты placeholders;
- production manager: сырье/тара/производство placeholders;
- commercial manager: распределитель/клиенты/уведомления placeholders;
- distributor worker: остатки/продажи placeholders;
- courier: загрузка/баланс/продажи placeholders.

Первый UI должен сразу выделять reusable component families: `AppShell`, `HeaderBar`, `BottomNav`, `SummaryCard`, `ActionTile`, `EntityListCard`, `StatusBadge`, `ActionFooter`, `FormPanel`.

### 5. PWA and online-only baseline

Добавить:

- manifest;
- app name;
- theme/background colors;
- standalone display mode;
- базовые icons;
- mobile viewport-safe shell;
- online/offline indicator.

Offline write behavior: пока write-действия уровня UI должны быть disabled или возвращать понятную ошибку. Offline queue не делать.

## Затронутые документы

- `docs/crm-requirements.md` — если уточнится постоянное правило auth/user lifecycle;
- `docs/SECURITY.md` — итоговый auth/session/login/password flow;
- `docs/TECH-STACK.md` — итог BetterAuth username/plugin spike;
- `docs/FRONTEND.md` — app shell, mobile navigation, login/logout conventions;
- `docs/HANDLER-MAP.md` — новые auth/users handlers;
- `docs/ARCHITECTURE.md` — обновить module/data flow;
- `docs/DEVELOPMENT.md` — новые verification/runtime notes, если появятся;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — фактический прогресс.

## Затронутые модули

- `apps/api/src/auth`;
- `apps/api/src/users`;
- `apps/api/src/policy`;
- `apps/api/src/operations`;
- `apps/api/prisma/schema.prisma` и новая migration, если username/login/status требуют schema changes;
- `packages/shared/src`;
- `apps/web/app`;
- `apps/web/src`;
- PWA assets/config в `apps/web`.

## Шаги реализации

1. Провести BetterAuth username/login spike в коде и тестах.
2. Зафиксировать выбранный технический auth-flow в документации.
3. Обновить Prisma schema/shared contracts под login/password admin lifecycle.
4. Реализовать backend create user/reset password/update role/list users через policy `users.manage`.
5. Подключить audit write для create/reset/update role без записи паролей в audit details.
6. Добавить frontend login/logout/current actor flow.
7. Добавить mobile app shell и role home placeholders.
8. Добавить admin users screen: список, создание, смена роли, сброс пароля.
9. Добавить PWA manifest/icons/theme и online/offline indicator.
10. Обновить документы и handler map.
11. Прогнать verification contour.

## Тестовый план

### Unit

- shared contracts для create user/reset password/login;
- login generation/validation;
- password generation constraints;
- mapper не возвращает password hash;
- policy: только `admin` имеет `users.manage`;
- audit details не содержат temporary password.

### API/Integration with real Postgres

- admin создает пользователя с логином и ролью;
- duplicate login отклоняется стабильной ошибкой;
- созданный пользователь может войти по логину/паролю;
- wrong password возвращает unauthorized;
- courier не может вызвать `/users`;
- admin может изменить роль;
- admin может сбросить пароль;
- старый пароль после сброса не работает, новый работает;
- create/update/reset пишут operation/audit без plaintext password;
- `/auth/me` возвращает actor после login/password sign-in.

### Frontend

- login form happy path;
- login error state;
- logout;
- role home screen после входа;
- admin users list/create/update/reset flows;
- mobile viewport без horizontal overflow;
- offline indicator visible;
- write actions disabled или показывают понятную ошибку при offline.

### Smoke

- `GET /health`;
- web home/login доступен;
- login as seeded/admin user;
- `/auth/me` возвращает actor;
- admin users screen открывается.

## Verification commands

Перед завершением этапа:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test` с поднятым Postgres и примененными миграциями;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`;
- `corepack pnpm smoke`;
- browser/manual check mobile viewport для login/admin users/role home screens.

Практика sandbox:

- `build`, `audit`, API tests с real Postgres и smoke запускать вне sandbox по правилам `docs/DEVELOPMENT.md`;
- Prisma migrate/status/deploy повторять вне sandbox при schema engine `undefined`.

## Риски и rollback

### R1. BetterAuth username plugin не убирает email полностью

Mitigation: email остается внутренним техническим полем, генерируемым из login, без показа в UI. Решение фиксируется в security/tech-stack docs.

Rollback: оставить текущий email/password baseline технически, но UI/API принимают `login`; conversion login -> technical email выполняется в auth/users layer.

### R2. Admin user creation начинает обходить BetterAuth

Mitigation: не писать парольные hash руками, если BetterAuth предоставляет server API для создания пользователя/password credential. Если прямой API неудобен, сначала сделать маленький spike/test.

Rollback: ограничиться documented manual seed/admin bootstrap и отложить create user до выбранного BetterAuth-compatible способа.

### R3. Временный пароль может попасть в audit/logs

Mitigation: тест на отсутствие password в audit details; не логировать response body; возвращать temporary password только в create/reset response.

Rollback: отключить audit details для password reset до безопасной структуры.

### R4. UI этап разрастется в полноценную админку

Mitigation: ограничиться users list/create/role/reset и role home placeholders. Справочники и бизнес-операции не добавлять.

## Открытые вопросы

- Требовать ли смену временного пароля при первом входе в v1 или отложить до отдельного hardening этапа?
- Нужен ли deactivate/reactivate user уже сейчас или достаточно create/update role/reset password?

Решено в первом backend pass:

- Формат логина: `3-30` символов, нижний регистр, латиница/цифры/дефис; логин должен начинаться и заканчиваться буквой или цифрой.
- Пароль в текущем API генерируется системой автоматически при создании и сбросе; ручное задание пароля администратором не входит в этот pass.

## Progress Log

### 2026-05-28 — Backend admin login/password pass

Сделано:

- подключен BetterAuth username plugin;
- добавлены Prisma поля `username`, `displayUsername` и admin-plugin поля пользователя;
- выбран технический fallback `login@internal.buhta.local` для внутреннего email;
- `UserSummary` и `Actor` переведены на `login` как пользовательский идентификатор;
- добавлены `POST /users`, `PATCH /users/:userId/role`, `POST /users/:userId/reset-password`;
- создание пользователя и сброс пароля идут через BetterAuth API;
- `user.create`, `user.role.update`, `user.password.reset` пишут operation/audit без plaintext password;
- добавлены unit, shared contract, service integration и HTTP integration tests.

Остается в этом этапе:

- frontend login/logout/current actor flow;
- mobile app shell и role home placeholders;
- admin users screen;
- PWA manifest/icons/theme;
- online/offline indicator;
- smoke/browser checks после появления frontend shell.

### 2026-05-28 — Frontend mobile shell pass

Сделано:

- добавлен client app shell с React Query;
- реализован login/logout/current actor flow;
- добавлены role home placeholders для не-admin ролей;
- добавлен минимальный admin users screen: список, создание, смена роли, сброс пароля;
- добавлен online/offline indicator;
- добавлен PWA manifest и базовая SVG icon;
- dev seed обновлен для bootstrap admin `admin / Pass123!`;
- browser check выполнен на `localhost:3003` против API `localhost:3002`: вход admin, список пользователей, создание пользователя, показ временного пароля, сброс пароля, mobile viewport.

### 2026-05-28 — Frontend polish and session behavior pass

Сделано:

- входная форма упрощена: убраны лишние бренд-элементы, добавлен показ/скрытие пароля;
- ошибки auth/API нормализуются на русский через frontend utility;
- текущий admin скрыт из списка сотрудников, а backend запрещает self role update и self password reset;
- logout находится в настройках/профиле и сразу возвращает пользователя на экран логина;
- `401` в server-state слое сбрасывает локальную сессию и останавливает повторные запросы `/users`;
- online-индикатор убран из нормального состояния, offline-индикатор показывается только при потере сети;
- выполнен React/Next best-practices pass: критичных оптимизаций на текущем размере frontend не требуется.

Финальный verification:

- `corepack pnpm lint` — ok;
- `corepack pnpm lint:boundaries` — ok;
- `corepack pnpm typecheck` — ok;
- `corepack pnpm test` — ok;
- `corepack pnpm docs:check` — ok;
- `corepack pnpm build` — ok;
- `corepack pnpm audit` — ok;
- `corepack pnpm smoke` — ok;
- targeted API integration `apps/api/test/users-db.integration.test.ts` вне sandbox — ok;
- browser/manual check login/admin users/create/reset/mobile viewport — ok.

## Критерии завершения

Этап завершен, когда:

- сотрудники входят по логину и паролю без email в UI;
- администратор может создать пользователя, назначить роль и получить временный пароль;
- администратор может сменить роль и сбросить пароль другим пользователям;
- protected API проверяет права через policy layer;
- create/update/reset покрыты unit, HTTP и real Postgres integration tests;
- audit/operation records создаются без plaintext password;
- frontend имеет login/logout/current actor flow;
- есть mobile-first app shell и role home placeholders;
- есть минимальный admin users screen;
- PWA manifest/icons/theme добавлены;
- online/offline indicator реализован;
- smoke и manual mobile check выполнены;
- документация обновлена;
- план перемещен в `completed`.
