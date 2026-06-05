# Operation History

Статус: `Completed`
Дата: 2026-06-05
Связанный roadmap: `docs/exec-plans/active/2026-05-27-v1-roadmap.md`

## Цель

Сделать read-only экран `История операций` для Директора и администратора, чтобы они могли видеть проверяемую историю всех действий CRM, фильтровать события и открывать подробности операции в модалке.

Этап не меняет товарные или денежные балансы. Он строит управленческий read model поверх уже существующих `operation` и `audit_log`.

## Scope

- Добавить backend read endpoint истории операций.
- Добавить shared contracts для query params и response.
- Добавить отдельное право `operation.history.read` для `admin` и `director`.
- Показывать все audit/operation events, а не только продажи, деньги или товар.
- По умолчанию показывать последние 7 дней.
- Поддержать фильтры:
  - период `dateFrom` / `dateTo`;
  - тип операции `operationType`;
  - actor user;
  - actor role;
  - entity/source type.
- Поддержать cursor pagination.
- Показывать строку истории с кратким человекочитаемым описанием.
- Открывать details операции в модалке.
- Подключить экран в mobile shell:
  - для `admin` через вкладку `История`;
  - для `director` через новую вкладку нижней навигации `История`.
- Обновить SoR-документы и roadmap по факту реализации.

## Out Of Scope

- CSV/export.
- Аналитика и графики.
- Новые операции записи.
- Новые typed facts.
- Новые balance projections.
- Ручные корректировки балансов.
- Редактирование или удаление истории.
- Полнотекстовый поиск по details.
- Отдельная desktop-таблица с массовыми действиями.

## Архитектурные решения

### Источник данных

Источник истории: `audit_log` с join на:

- `operation`;
- `user` actor.

`operation` фиксирует общий факт и тип операции, `audit_log` хранит action/entity/details. Для UI истории строка строится из audit log, потому что именно audit содержит `entityType`, `entityId` и details.

Read endpoint не создает `operation` и не пишет `audit_log`.

### Permission

Ввести новое право:

```ts
operation.history.read
```

Дать его только:

- `admin`;
- `director`.

Не использовать текущее `audit.read` для этого экрана, потому что оно уже шире и выдано `production_manager`, `commercial_manager`, `distributor_worker`. Выбранный scope этапа: только `director + admin`.

`audit.read` оставить как существующее право до отдельного решения: оно может пригодиться для будущего технического аудита или локальных экранов ролей, но не должно открывать управленческую историю операций.

### API

Добавить backend module/controller в зоне `operations`, потому что это cross-domain read model:

```text
GET /operations/history
GET /operations/history/options
```

`GET /operations/history` query params:

- `dateFrom?: ISO date/datetime`;
- `dateTo?: ISO date/datetime`;
- `operationType?: operation type`;
- `actorUserId?: string`;
- `actorRole?: Role`;
- `entityType?: string`;
- `cursor?: string`;
- `limit?: number`.

Default:

- `dateFrom = now - 7 days`;
- `dateTo = now`;
- `limit = 30`.

Ограничения:

- `limit` min `1`, max `100`;
- `dateTo` не раньше `dateFrom`;
- максимальный период запроса — 90 дней;
- если период не передан, использовать последние 7 дней;
- если передан только `dateFrom`, `dateTo` по умолчанию `now`;
- если передан только `dateTo`, `dateFrom = dateTo - 7 days`.

Сортировка:

- `createdAt desc`;
- `id desc` как стабильный tie-breaker.

Cursor:

- opaque string, кодирует `createdAt` + `auditLogId`;
- frontend не должен разбирать cursor.

`GET /operations/history/options` возвращает варианты фильтров для экрана истории. Нельзя строить select options только из текущей страницы истории, потому что страница может содержать 30 записей и не включать всех пользователей или все типы событий.

Options response:

```ts
{
  operationTypes: string[];
  roles: Role[];
  actorUsers: Array<{
    userId: string;
    login: string;
    displayName: string;
    role: Role;
  }>;
  entityTypes: string[];
}
```

Право доступа то же: `operation.history.read`.

`operationTypes` брать из `BASELINE_OPERATION_TYPES`/shared operation catalog. `roles` брать из shared roles. `actorUsers` возвращать коротким списком активных и исторически присутствующих в `operation`/`audit_log` пользователей, чтобы старые действия не становились нефильтруемыми после смены роли или отключения пользователя. `entityTypes` в первом проходе можно получить distinct из `audit_log.entityType`; если появится стабильный shared catalog entity types, перейти на него отдельной правкой.

### Response shape

Shared response:

```ts
{
  items: OperationHistoryItem[];
  filters: {
    dateFrom: string;
    dateTo: string;
    limit: number;
  };
  nextCursor: string | null;
}
```

`OperationHistoryItem`:

```ts
{
  id: string;                 // auditLog id
  operationId: string;
  operationType: string;      // operation.type
  action: string;             // audit_log.action
  status: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: {
    userId: string;
    login: string;
    displayName: string;
    role: Role;
  };
  summary: string;
  amountCents?: number;
  quantity?: string | number;
  details: unknown;
}
```

`summary` формирует backend mapper. Он должен быть коротким и стабильным:

- `Продажа с распределителя`;
- `Отмена продажи с распределителя`;
- `Загрузка курьера`;
- `Возврат курьера`;
- `Списание наличных`;
- `Назначение дисконта`;
- `Создание клиента`;
- `Обновление клиента`;
- `Выпуск продукции`;
- `Перемещение на распределитель`;
- fallback: `action`.

Для суммы и количества mapper берет поля из `details`, если они есть. Если распознать сумму/количество нельзя, поля не возвращаются.

Перед возвратом `details` backend обязан прогнать generic redaction. Минимальный список ключей для маскирования на любой глубине объекта:

- `password`;
- `token`;
- `secret`;
- `accessToken`;
- `refreshToken`;
- `hash`.

Сравнение ключей делать case-insensitive. Значение заменять на строку `[redacted]`. Это предохранитель для общего управленческого экрана: даже если текущие audit details не должны хранить секреты, history endpoint не должен становиться каналом утечки при будущей ошибке.

### Details modal

Модалка показывает:

- заголовок summary;
- дату/время;
- actor;
- тип операции;
- entity type/id;
- статус;
- структурированные details.

Для первого прохода details можно показывать как аккуратный key-value/json block с безопасным форматированием:

- не использовать raw `JSON.stringify` без визуальной структуры;
- длинные строки переносить;
- nested object показывать в моноширинном блоке внутри модалки;
- не показывать секретные значения: frontend получает уже redacted details и дополнительно не должен раскрывать значения ключей из redaction-list, если они попадут в UI.

Для первого прохода не делать кастомные секции под каждую операцию. Допускается легкий label-map для частых полей (`totalCents` -> `Сумма`, `quantity` -> `Количество`), но без отдельных компонентов для продажи, отмены, дисконта и других типов.

### Frontend UX

Экран `История операций`:

- обычный экран, не hero и не card-heavy dashboard;
- верхняя строка: заголовок `История`, состояние обновления;
- фильтры компактной панелью:
  - период quick select `7 дней` по умолчанию;
  - date inputs для from/to;
  - select типа операции;
  - select пользователя;
  - select роли;
  - select entity/source type;
  - кнопка сброса.
- ниже список операций.

Строка операции:

- слева summary и secondary details: дата, actor, operationType/entity;
- справа сумма/количество, если есть;
- строка кликабельна и открывает модалку;
- не делать nested cards;
- использовать плотную table/list эстетику, как текущие history/read-only экраны.

Mobile:

- фильтры должны сворачиваться или занимать компактный блок без горизонтального overflow;
- длинные operation types не должны ломать layout;
- модалка должна помещаться на мобильном viewport и иметь scroll внутри body.

Offline:

- read screen может открываться offline только с кешем React Query, если он уже есть;
- при отсутствии сети и данных показывать обычную ошибку загрузки;
- никаких offline write queues.

## Затронутые документы

Обязательные после реализации:

- `docs/crm-requirements.md` — зафиксировать управленческую историю операций для Директора/admin.
- `docs/ARCHITECTURE.md` — описать operation history read model.
- `docs/DOMAIN-EVENTS.md` — убрать остаточный future-кандидат про корректировки, если больше не нужен, и добавить правило использования history endpoint.
- `docs/HANDLER-MAP.md` — добавить `GET /operations/history` и `GET /operations/history/options`.
- `docs/SECURITY.md` — добавить `operation.history.read` и scope.
- `docs/FRONTEND.md` — описать экран `История операций`.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — обновить фактический прогресс после завершения.
- `docs/DOCS-INDEX.md` — добавить этот plan.

## Затронутые модули и файлы

Shared:

- `packages/shared/src/permissions.ts`;
- новый или существующий shared contract file для operations history, например `packages/shared/src/operations.ts`;
- `packages/shared/src/index.test.ts`.

API:

- `apps/api/src/operations/operations.module.ts`;
- `apps/api/src/operations/operations.controller.ts` новый;
- `apps/api/src/operations/operations.service.ts` или расширение текущего service отдельным read service;
- `apps/api/src/operations/operation-history.mapper.ts` новый;
- `apps/api/src/operations/operation-history-redaction.ts` новый или private helper mapper;
- `apps/api/src/operations/operation.types.ts` при необходимости;
- `apps/api/test/operation-history-controller.test.ts` новый;
- `apps/api/test/operation-history-db.integration.test.ts` новый;
- `apps/api/test/policy.test.ts`.

Web:

- `apps/web/src/lib/api-client.ts`;
- `apps/web/src/app-shell/AppRoot.tsx`;
- `apps/web/src/app-shell/RoleHomeRouter.tsx`;
- `apps/web/src/features/operations/OperationHistoryHome.tsx` новый;
- `apps/web/src/features/operations/OperationDetailsModal.tsx` новый или локальный компонент;
- `apps/web/app/globals.css`;
- `apps/web/app/page.test.tsx`.

## Prisma / migration

Новая таблица не нужна.

Желательно добавить индексы миграцией, если текущих недостаточно для фильтрации:

- `audit_log(created_at, id)` для default history query;
- `audit_log(action, created_at)` для фильтра по событию;
- `audit_log(actor_user_id, created_at, id)` для фильтра по пользователю;
- `audit_log(entity_type, created_at, id)` для фильтра по source/entity type;
- `operation(type, created_at)` если фильтр будет идти через operation type;
- `user(role)` обычно не нужен, но можно не добавлять до измерений.

Сейчас в schema есть отдельные индексы `operationId`, `actorUserId`, `entityType/entityId`, но нет индекса по `createdAt` и нет составных индексов, которые одновременно покрывают фильтр и сортировку истории. Для истории по периоду и фильтров нужны составные индексы.

Решение плана: добавить migration с индексами:

```sql
CREATE INDEX "audit_log_created_at_id_idx" ON "audit_log" ("createdAt" DESC, "id" DESC);
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log" ("action", "createdAt" DESC);
CREATE INDEX "audit_log_actor_user_id_created_at_id_idx" ON "audit_log" ("actorUserId", "createdAt" DESC, "id" DESC);
CREATE INDEX "audit_log_entity_type_created_at_id_idx" ON "audit_log" ("entityType", "createdAt" DESC, "id" DESC);
CREATE INDEX "operation_type_created_at_idx" ON "operation" ("type", "createdAt" DESC);
```

Если Prisma index naming отличается, использовать имена в стиле существующих migrations.

## Тестовый план

Shared:

- query schema принимает пустой query и выставляет defaults на уровне backend mapper/service;
- query schema валидирует limit max 100;
- query schema валидирует максимальный период 90 дней;
- response schema валидирует item с details.

API controller/policy:

- anonymous получает `401`;
- `director` и `admin` получают `200`;
- `commercial_manager`, `production_manager`, `distributor_worker`, `courier` получают `403`;
- query params прокидываются в service.
- `GET /operations/history/options` защищен тем же правом `operation.history.read`.

API integration:

- default query возвращает события последних 7 дней;
- событие старше default периода не возвращается;
- запрос с периодом больше 90 дней отклоняется понятной ошибкой;
- фильтр по `operationType` возвращает только нужные operation types;
- фильтр по `actorUserId` возвращает только события пользователя;
- фильтр по `actorRole` возвращает только события роли;
- фильтр по `entityType` возвращает только нужный source/entity;
- options endpoint возвращает operationTypes, roles, actorUsers и entityTypes;
- pagination возвращает `nextCursor`, а второй запрос не дублирует элементы первой страницы;
- read endpoint не создает `operation` и не пишет `audit_log`;
- details возвращаются структурно и не теряются;
- details redaction маскирует ключи `password`, `token`, `secret`, `accessToken`, `refreshToken`, `hash` на любой глубине и без учета регистра;
- summary/amount/quantity корректно мапятся минимум для:
  - distributor sale;
  - courier sale;
  - sale cancellation;
  - cash withdrawal;
  - discount assignment;
  - production notification.

Frontend:

- `admin` видит вкладку `История` и экран `История`;
- `director` видит вкладку `История` и экран `История`;
- `commercial_manager` не видит этот экран;
- default запрос идет без ручного периода или с периодом последних 7 дней по контракту;
- фильтр типа операции меняет query как `operationType`;
- options endpoint используется для select-фильтров, а не текущая страница истории;
- клик по строке открывает модалку details;
- кнопка закрытия модалки работает;
- empty state и loading/error states отображаются;
- нет горизонтального overflow на мобильной ширине в тестовом snapshot/DOM regression, насколько это покрывается unit tests.

Verification:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- ручная UI-проверка на mobile viewport после запуска dev-сервера.

## Риски и rollback

- Риск: `audit_log.details` неоднородны, UI details может выглядеть шумно.
  - Снижение: строка истории показывает короткий backend summary; details остаются в модалке.
- Риск: audit details будущих операций случайно будут содержать секретные поля.
  - Снижение: backend redaction по чувствительным ключам на любой глубине объекта перед отдачей details.
- Риск: слишком широкий доступ через существующий `audit.read`.
  - Снижение: использовать новое `operation.history.read`, только `admin/director`.
- Риск: медленная история при росте audit.
  - Снижение: индексы по `createdAt`, action/type, actor/date, entity/date, обязательный `limit` и max range 90 дней.
- Риск: фильтры станут слишком тяжелыми для mobile.
  - Снижение: компактный фильтр-блок, no cards-in-cards, sensible defaults.
- Rollback: удалить route/frontend tab и оставить таблицы/индексы; read-only этап не меняет доменные записи.

## Критерии завершения

- `director` и `admin` видят `История`.
- По умолчанию отображаются события последних 7 дней.
- Все типы событий доступны в общем списке и фильтруются.
- Детали открываются в модалке.
- Остальные роли не получают доступ к endpoint и экрану.
- Read endpoint не пишет историю.
- Документация и roadmap обновлены.
- Verification из плана выполнен и зафиксирован перед переносом плана в `completed`.

## Зафиксированные решения review

1. Нижняя вкладка у Директора называется `История`, а не `Аудит`.
2. Фильтры получают варианты через отдельный `GET /operations/history/options`.
3. Details в первом проходе универсальные structured/raw с безопасным форматированием, backend redaction и коротким summary. Кастомные секции под отдельные типы операций не входят в этап.

## Итог реализации

Этап завершен 2026-06-05.

Реализовано:

- shared contracts истории операций и новое право `operation.history.read`;
- `GET /operations/history` и `GET /operations/history/options` с фильтрами, cursor pagination, max range 90 дней и backend redaction details;
- индексы для истории и фильтров по времени, типу операции, actor и entity;
- экран `История` для `admin` и `director` в mobile shell;
- универсальная details modal без кастомных секций под отдельные операции;
- SoR-документы и roadmap обновлены под фактическое поведение.

Выполненные проверки:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`;
- `corepack pnpm --filter @buhta/api typecheck`;
- `corepack pnpm --filter @buhta/api exec vitest run test/operation-history-controller.test.ts test/operation-history-db.integration.test.ts test/policy.test.ts test/health.test.ts`;
- `corepack pnpm --filter @buhta/api exec vitest run test/auth-http.integration.test.ts`;
- `corepack pnpm --filter @buhta/web typecheck`;
- `corepack pnpm --filter @buhta/web exec vitest run app/page.test.tsx`;
- ручная проверка `http://localhost:3001/`: у администратора открывается вкладка `История`, список и фильтры отображаются, details открываются в модалке.

Примечание: `corepack pnpm build` один раз упал в sandbox на Turbopack filesystem/process restriction, затем был повторен вне sandbox и прошел успешно.
