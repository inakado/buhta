# Production Notifications Plan

Статус: `Completed`.
Дата: 2026-06-04.
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Production Notifications`.

## Цель

Добавить рабочий контур уведомлений от коммерческого руководителя заведующему производством.

В терминах продукта это не push-уведомления телефона и не чат, а простые текстовые задачи:

- коммерческий руководитель создает свободное уведомление производству;
- заведующий производством видит новые уведомления;
- заведующий производством отмечает уведомление выполненным;
- коммерческий руководитель, Директор и admin видят состояние уведомлений;
- каждое создание и выполнение попадает в operation/audit.

## Технологическое Решение

Для первого прохода использовать обычный HTTP API + React Query polling.

Решение:

- `GET /notifications` для списка;
- `POST /notifications` для создания;
- `PATCH /notifications/:id/complete` для отметки выполнения;
- frontend периодически обновляет список через React Query `refetchInterval`, например 15-30 секунд, и также обновляет список после create/complete;
- без WebSocket, SSE, внешней очереди, event bus и отдельного realtime-сервиса.

Почему не WebSocket:

- текущие уведомления не требуют мгновенной доставки как чат;
- в первой версии нет большого числа пользователей и нет SLA realtime;
- WebSocket добавит lifecycle соединений, reconnection, auth на socket layer, тесты и инфраструктурные edge cases;
- архитектурные принципы проекта прямо ограничивают лишние очереди/event bus/инфраструктуру, если задачу закрывает обычная транзакция.

Почему не SSE в первом проходе:

- SSE проще WebSocket, но все равно добавляет отдельный streaming endpoint и lifecycle соединения;
- HTTP polling уже закрывает пользовательскую потребность "увидеть новые задачи без ручной перезагрузки";
- SSE можно добавить позже без ломки доменной модели, если polling окажется недостаточным.

Целевой UX первого прохода: "обновляется само достаточно быстро", а не "мгновенный realtime".

## Scope

Входит:

- Prisma-модель typed fact/read model для уведомлений производства.
- Shared contracts в `packages/shared`:
  - request создания уведомления;
  - request отметки выполнения;
  - response уведомления;
  - list response с фильтрами.
- Backend module/API:
  - `GET /notifications`;
  - `POST /notifications`;
  - `PATCH /notifications/:id/complete`.
- Policy:
  - добавить явное право `notification.read`: `admin`, `director`, `production_manager`, `commercial_manager`;
  - `notification.create`: `admin`, `commercial_manager`;
  - `notification.complete`: `admin`, `production_manager`;
  - `GET /notifications` требует именно `notification.read`, а не ad hoc role check и не `audit.read`.
- Статусы:
  - `new`;
  - `completed`.
- Разрешенный переход:
  - `new -> completed`;
  - повторное выполнение `completed` запрещено typed domain error.
- Operation/audit:
  - operation type `production.notification.create`;
  - operation type `production.notification.complete`;
  - permission names остаются `notification.read`, `notification.create`, `notification.complete`, потому что они уже заведены как access-control namespace;
  - audit snapshot с текстом, creator, recipient role, status before/after.
- Frontend:
  - commercial manager получает экран/flow создания уведомления;
  - production manager получает рабочий экран списка уведомлений вместо placeholder;
  - production manager может отметить уведомление выполненным;
  - director/admin могут видеть read-only список, если текущая навигация уже дает подходящее место;
  - список обновляется polling через React Query;
  - write-действия disabled offline.

## Out Of Scope

Не входит:

- WebSocket;
- SSE;
- push notifications на телефон;
- service worker background sync;
- offline queue для создания/выполнения уведомлений;
- связь уведомления с конкретной партией, шаблоном продукции или остатком;
- приоритеты, дедлайны, вложения, файлы, адресаты кроме производства;
- комментарии-треды;
- удаление уведомлений;
- редактирование текста после создания;
- отдельный realtime-индикатор "пользователь сейчас онлайн";
- отдельный notifications bell/badge на всех экранах, если это раздувает первый flow.

## Доменная Модель

Предлагаемая модель:

```text
ProductionNotification
- id
- message
- status: new | completed
- createdByUserId
- completedByUserId nullable
- completedAt nullable
- createOperationId
- completeOperationId nullable
- createdAt
- updatedAt
```

Правила:

- `message` обязателен, trim, разумный лимит длины: 1-1000 символов.
- Создатель фиксируется из actor, не из request.
- Получатель в v1 не выбирается пользователем: уведомление всегда адресовано производству.
- Завершить можно только `new` уведомление.
- Completion фиксирует `completedByUserId` и `completedAt`.
- История не переписывается: если в будущем понадобится отмена или корректировка, это будет отдельная операция, не silent update.

Вопрос по nullable `completeOperationId`: для `new` уведомления его нет, после completion есть. Это проще, чем заводить отдельную таблицу item/fact для одного перехода.

## API И Contracts

Shared contracts:

- `CreateNotificationRequestSchema`:
  - `message: string`;
- `CompleteNotificationRequestSchema`:
  - пока пустой object или optional `comment`, если решим оставить комментарий выполнения;
- `NotificationSchema`:
  - id, message, status, creator summary, completedBy summary nullable, timestamps;
- `NotificationsListResponseSchema`:
  - `items`;
  - `summary` с количеством new/completed.

Endpoints:

```text
GET /notifications?status=new|completed|all
POST /notifications
PATCH /notifications/:id/complete
```

Default list behavior:

- production manager по умолчанию видит `new` сверху, затем последние completed;
- commercial manager видит все production notifications и их статусы, а не только созданные им: это общий рабочий канал коммерции -> производство;
- director/admin видят общий список.

Если первый UI проще сделать без фильтра query param, допустимо вернуть общий список с сортировкой:

```text
new first -> newest first inside status group
```

## Frontend Flow

Commercial manager:

- добавить действие или вкладку `Уведомления` в уже существующий role flow;
- экран содержит список последних уведомлений и форму создания;
- форма: textarea `Что передать производству`, кнопка `Записать`;
- после успешного create список обновляется и показывается global success notice.

Production manager:

- заменить placeholder `Уведомления` на рабочий экран;
- показывать новые уведомления первыми;
- у нового уведомления есть действие `Выполнено`;
- completed уведомления read-only, с датой выполнения и исполнителем;
- polling каждые 15-30 секунд, плюс manual refresh если это уже есть в паттернах.

Director/admin:

- read-only список можно добавить там, где уже есть навигационное место, но не строить отдельную сложную панель ради первого этапа.

Mobile UI:

- без декоративных карточек внутри карточек;
- компактный список;
- длинный текст не должен ломать layout;
- кнопки disabled offline;
- если submit disabled, причина должна быть понятна рядом с формой или кнопкой.

## Затронутые Документы

Создать/обновить:

- `docs/exec-plans/completed/2026-06-04-production-notifications.md` - закрытый план этапа;
- `docs/DOCS-INDEX.md` - добавить новый active plan.

После реализации обновить:

- `docs/crm-requirements.md` - обязательно коротко зафиксировать финальные правила: read scope, статусы, completion без комментария и polling как UI-механизм;
- `docs/SECURITY.md` - notification read/create/complete scope;
- `docs/HANDLER-MAP.md` - новые handlers;
- `docs/DOMAIN-EVENTS.md` - `production.notification.create` и `production.notification.complete`;
- `docs/FRONTEND.md` - фактический notification UI;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` - progress после завершения.

## Затронутые Модули И Файлы

Ожидаемые изменения backend/shared:

- `apps/api/prisma/schema.prisma`;
- новая Prisma migration `*_production_notifications`;
- `packages/shared/src/notifications.ts` или профильный раздел в shared;
- `packages/shared/src/index.ts`;
- `packages/shared/src/index.test.ts` или отдельные shared tests;
- `apps/api/src/notifications/*` новый backend module/service/controller/mapper;
- `apps/api/src/app.module.ts`;
- `packages/shared/src/permissions.ts` - добавить `notification.read` и role matrix;
- `apps/api/src/auth/policy.ts` или текущий policy registry, если permissions маппятся на backend отдельно;
- `apps/api/test/notifications-controller.test.ts`;
- `apps/api/test/notifications-db.integration.test.ts`;
- `apps/api/test/policy.test.ts`.

Ожидаемые изменения frontend:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/features/notifications/*`;
- `apps/web/src/app-shell/RoleHomeRouter.tsx`;
- `apps/web/src/roles/production-manager/*`, если текущий placeholder находится там;
- `apps/web/src/roles/commercial-manager/*`, если нужен вход в create flow;
- `apps/web/app/page.test.tsx`;
- `apps/web/app/globals.css`, только если существующих классов недостаточно.

## Implementation Steps

1. Уточнить текущую frontend-навигацию commercial/production roles и выбрать минимальное место входа.
2. Добавить shared notification contracts и тесты.
3. Добавить Prisma model и migration.
4. Реализовать backend notification service:
   - create;
   - list;
   - complete;
   - status transition guard;
   - operation/audit transaction.
5. Добавить controller endpoints и policy guards.
6. Добавить backend controller tests.
7. Добавить real Postgres integration tests.
8. Добавить frontend api-client methods.
9. Реализовать notification list/create/complete UI.
10. Включить React Query polling на read screen.
11. Обновить SoR-документы по фактическому поведению.
12. Запустить targeted verification.
13. Запустить полный relevant verification.
14. После завершения закрыть plan в `completed`.

## Test Plan

Targeted tests:

- shared contract validation:
  - message required;
  - trim;
  - max length;
  - status enum.
- policy matrix:
  - `notification.read` exists in shared permission registry;
  - commercial/admin can create;
  - production/admin can complete;
  - director/commercial/production/admin can read through `notification.read`;
  - distributor worker/courier cannot read/create/complete.
- controller tests:
  - validates create body;
  - validates complete id;
  - rejects wrong role.
- DB integration:
  - create notification writes model, operation and audit;
  - list returns new first;
  - commercial manager sees notifications created by another commercial/admin actor;
  - complete changes status and writes operation/audit;
  - completing already completed notification is rejected;
  - wrong actor cannot complete;
  - read operation does not write audit.
- frontend tests:
  - production manager sees notification list;
  - commercial manager creates notification;
  - production manager marks notification completed;
  - offline disables create/complete;
  - polling/refetch behavior covered at least by query invalidation or request count.

Full verification before completion:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm docs:check`;
- `pnpm audit`, если network/audit contour доступен.

Manual UI verification:

- commercial manager creates notification on mobile viewport;
- production manager sees it after refresh/polling;
- production manager completes it;
- completed item no longer exposes complete action;
- long text wraps cleanly;
- offline state disables writes;
- no horizontal overflow.

## Риски И Rollback

Риск: polling будет казаться недостаточно быстрым.

Mitigation: начать с 15-30 секунд и invalidation после write. Если владелец продукта почувствует задержку как проблему, добавить SSE отдельным последующим этапом без изменения доменной модели.

Rollback: отключить polling interval и оставить manual/server-state refresh; backend/API не меняются.

Риск: слово "уведомление" может восприниматься как push notification, а не задача.

Mitigation: в UI использовать более предметные подписи вроде `Задачи производству` или `Для производства`, если при ручной проверке "Уведомления" звучит слишком технически.

Rollback: поменять только UI labels, API/domain оставить `notification`.

Риск: выполнение уведомления silent update нарушит историю.

Mitigation: completion всегда отдельная operation/audit запись с before/after status.

Rollback: если completion flow не готов, оставить только create/list без кнопки выполнения до фикса.

Риск: отдельный notification module может раздуть навигацию ролей.

Mitigation: использовать существующие вкладки/placeholders, не добавлять новые глобальные badges и bells в первом проходе.

Rollback: скрыть frontend entry, оставив backend tests/API до следующей UI итерации.

## Критерии Завершения

Этап считается завершенным, когда:

- Prisma model и migration добавлены;
- shared contracts покрывают create/list/complete;
- `GET /notifications`, `POST /notifications`, `PATCH /notifications/:id/complete` работают через policy guard;
- создание и выполнение пишут operation/audit;
- статусный переход `new -> completed` защищен на backend;
- production manager имеет рабочий список и completion action;
- commercial manager может создать уведомление;
- read UI обновляется polling или явной query invalidation;
- документация обновлена по фактическому поведению;
- targeted и full relevant verification выполнены или причины пропуска явно зафиксированы;
- plan закрыт в `docs/exec-plans/completed/`.

## Фактический Результат

Реализован первый контур задач производству без realtime-инфраструктуры.

Что сделано:

- добавлена модель `ProductionNotification` и migration с raw SQL check constraints для статуса, текста и completion consistency;
- добавлены shared contracts для создания, списка и выполнения задачи;
- добавлено явное право `notification.read`;
- `notification.create` доступно admin и commercial manager;
- `notification.complete` доступно admin и production manager;
- `notification.read` доступно admin, director, production manager и commercial manager;
- добавлены API endpoints `GET /notifications`, `POST /notifications`, `PATCH /notifications/:id/complete`;
- создание и выполнение пишут отдельные operation/audit записи с operation types `production.notification.create` и `production.notification.complete`;
- коммерческий руководитель видит общий канал задач и может создать задачу производству;
- заведующий производством видит список задач и может отметить новую задачу выполненной;
- список обновляется через React Query polling 30 секунд, refetch on focus и invalidation после write-действий;
- директор/admin получили backend read-доступ; отдельный UI для них в первом проходе не добавлялся;
- постоянные правила обновлены в `docs/crm-requirements.md`, `docs/SECURITY.md`, `docs/DOMAIN-EVENTS.md`, `docs/HANDLER-MAP.md` и `docs/FRONTEND.md`;
- roadmap v1 обновлена по фактическому прогрессу.

## Выполненная Верификация

Targeted:

- `pnpm --filter @buhta/shared test`;
- `pnpm --filter @buhta/api exec vitest run test/policy.test.ts test/notifications-controller.test.ts`;
- `pnpm --filter @buhta/api exec vitest run test/notifications-db.integration.test.ts`;
- `pnpm --filter @buhta/web test -- page.test.tsx`;
- `pnpm --filter @buhta/web typecheck`;
- `pnpm --filter @buhta/api typecheck`.

Full relevant:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm docs:check`.

`pnpm audit` не запускался: новых npm-зависимостей этап не добавлял.

## Решенные Вопросы Для Ревью

1. Как лучше назвать экран в UI: `Уведомления`, `Задачи производству` или `Для производства`?
2. Нужен ли optional comment при отметке `Выполнено`, или достаточно самого факта выполнения?
3. Директор/admin должны видеть этот список уже в первом UI-проходе или достаточно backend read + production/commercial UI?
4. Polling interval: 15 секунд, 30 секунд или только refetch при входе на экран?

Принятые решения:

- UI name: `Задачи производству`;
- completion comment не нужен в первом проходе;
- director/admin read можно покрыть backend/API tests, UI добавить позже, если нет готового места;
- polling 30 секунд, плюс refetch on window focus и invalidation после write.
