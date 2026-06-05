# Operation History Details

Статус: `Completed`
Дата: 2026-06-05
Связанный roadmap: `docs/exec-plans/active/2026-05-27-v1-roadmap.md`
Предыдущий этап: `docs/exec-plans/completed/2026-06-05-operation-history.md`

## Цель

Сделать детали операции в экране `История` читаемыми для Директора и администратора: убрать технические id/raw keys из модалки и показывать управленческий смысл операции в понятных секциях.

Этап не меняет audit storage и не удаляет технические данные из БД. Полная проверяемая история остается в `operation`/`audit_log`; меняется только presentation layer read-only экрана.

## Scope

- Заменить универсальный raw/key-value вывод details на управленческое представление.
- Скрыть из UI технические поля:
  - `id`, `*Id`, `operationId`, `entityId`;
  - balance row ids: `distributorProductBalanceId`, `courierProductBalanceId`, `workshopProductBalanceId`, `sourceBalanceId`, `targetBalanceId`;
  - normalized/internal fields вроде `normalizedPhone`, если они не дают директору отдельного смысла;
  - redacted/sensitive служебные ключи, если они случайно пришли в details.
- Оставить в UI только человекочитаемые значения: продукция, клиент, распределитель, курьер, сумма, цена, количество, способ оплаты, причина, комментарий, статусы и изменения остатков/наличных.
- Добавить reusable frontend presenter для operation details, чтобы `OperationHistoryHome.tsx` не рос raw-логикой.
- Поддержать как минимум все operation types из текущего каталога:
  - продажи и отмены продаж распределителя;
  - продажи и отмены продаж курьера;
  - загрузка курьера;
  - возврат курьера;
  - списание наличных;
  - назначение дисконта;
  - production intake/release/transfer;
  - production notifications;
  - client create/update;
  - catalog create/update/archive;
  - user create/role update/password reset.
- Для неизвестных будущих details использовать безопасный fallback: скрыть technical/id-like keys, отформатировать известные money/quantity/status fields и не показывать raw JSON, если можно построить список.
- Массивы в details показывать как повторяющиеся группы строк с теми же правилами скрытия technical keys, а не как `[object Object]`, raw JSON или псевдо-JSON.
- Обновить frontend documentation и плановую roadmap по факту mini-этапа.

## Out Of Scope

- Новые endpoint и shared contracts.
- Изменение `audit_log.details` shape.
- Удаление id из backend response.
- Backend-side enrichment именами по id.
- Export/CSV.
- Полнотекстовый поиск по details.
- Специальный technical/debug view для администратора.
- Analytics/charts.

## Архитектурные решения

### Источник данных

`GET /operations/history` продолжает отдавать `details` как сейчас. Backend redaction остается обязательным security boundary.

Frontend не доверяет себе как security layer, но дополнительно не показывает технические и redacted поля в модалке, чтобы управленческий экран не превращался в технический audit log.

### Presentation Model

В frontend добавить отдельный presenter, например:

```text
apps/web/src/features/operations/operation-detail-presenter.ts
```

Он принимает `OperationHistoryItem` и возвращает presentation model:

```ts
type OperationDetailSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    tone?: "default" | "muted" | "positive" | "warning";
  }>;
};
```

`OperationDetailsModal` рендерит только эту модель и не занимается разбором raw details.

### Секции модалки

Базовая структура:

1. `Операция`
   - действие;
   - дата;
   - исполнитель;
   - роль;
   - статус в человекочитаемом виде.
2. `Участники`
   - клиент;
   - курьер;
   - распределитель;
   - создатель/исполнитель задачи, если есть.
3. `Товар`
   - продукция;
   - количество;
   - цена;
   - базовая цена и скидка, если операция связана с дисконтом;
   - стоимость строки.
4. `Деньги`
   - сумма;
   - наличные/безнал;
   - cash balance до/после, если есть.
5. `Остатки`
   - понятные пары `до -> после` для источника и получателя.
6. `Комментарий`
   - причина отмены;
   - комментарий списания/прихода/задачи;
   - текст задачи производству.

Пустые секции не показывать. Не показывать одну и ту же информацию дважды, если она уже есть в summary header.

### Форматирование

- Money values в копейках показывать как рубли: `2 500.00 ₽`.
- Payment method:
  - `cash` -> `Наличные`;
  - `cashless` -> `Безнал`.
- Status:
  - `succeeded` -> `Выполнено`;
  - `failed` -> `Ошибка`;
  - production notification statuses -> `Новая`, `Выполнена`.
- Boolean:
  - `true` -> `Да`;
  - `false` -> `Нет`.
- Quantities показывать с единицей, если она есть в details (`шт`, `кг`, `банок` и т.п.); иначе `шт` только для товарных операций.
- Balance changes показывать как `10 -> 8`, без внутренних balance ids.
- Даты форматировать как в текущем history row, без ISO strings.

### Technical Field Policy

Скрывать ключ, если:

- key равен `id` в любом регистре;
- key заканчивается на `id` в любом регистре, включая `Id` и `ID`;
- key содержит `token`, `secret`, `password`, `hash`;
- value равен `[redacted]`;
- key является внутренним normalized/cache/source key и не имеет отдельного user-facing label.

Исключение: если поле содержит понятный snapshot рядом с id, показывать snapshot, а не id:

- `clientName` вместо `clientId`;
- `productName` вместо `productBatchId`;
- `distributorName` вместо `distributorId`;
- `courierDisplayName`/`courierLogin` вместо `courierUserId`;
- `rawMaterialTypeName` вместо `rawMaterialTypeId`;
- `packagingTypeName` вместо `packagingTypeId`.

### Operation-Specific Adapters

Presenter должен иметь адаптеры по `operationType` или `entityType`, но без чрезмерного UI-компонента под каждую операцию. Достаточно функций, которые собирают секции:

- sale/cancel sale adapter;
- courier load/unload adapter;
- cash withdrawal adapter;
- discount assignment adapter;
- production adapter;
- notification adapter;
- client/catalog/user adapter;
- generic fallback adapter.

Если конкретный adapter не распознал данные, fallback все равно должен скрыть technical fields.

## Затронутые документы

- `docs/FRONTEND.md` — зафиксировать, что operation history details показываются как director-facing секции без technical ids.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — добавить mini-этап перед Analytics или отметить по завершении.
- `docs/DOCS-INDEX.md` — добавить этот active plan.

`docs/crm-requirements.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN-EVENTS.md`, `docs/HANDLER-MAP.md`, `docs/SECURITY.md` менять не требуется, если backend contracts и security redaction не меняются.

## Затронутые модули и файлы

Web:

- `apps/web/src/features/operations/OperationHistoryHome.tsx`;
- новый `apps/web/src/features/operations/operation-detail-presenter.ts`;
- возможно новый `apps/web/src/features/operations/operation-detail-presenter.test.ts`;
- `apps/web/app/globals.css`;
- `apps/web/app/page.test.tsx`.

Документы:

- `docs/FRONTEND.md`;
- `docs/DOCS-INDEX.md`;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`;
- этот plan-файл.

## API / Contracts / Prisma

Изменений API, shared contracts и Prisma не планируется.

Если во время реализации окажется, что текущие audit details не содержат user-facing snapshot для важного значения, не добавлять backend enrichment в этот mini-этап автоматически. Зафиксировать конкретный missing snapshot как отдельный follow-up или расширить scope после review.

## UI Требования

- Модалка должна читаться сверху вниз как короткая карточка операции, а не как JSON.
- Не использовать nested cards.
- Секции разделять заголовками и плотными строками.
- На мобильном viewport модалка должна скроллиться внутри body и не выходить за экран.
- Длинные значения должны переноситься и не ломать layout.
- Технические ключи не должны появляться даже в fallback.
- Нет видимого `[redacted]` в обычном UI: если поле замаскировано, строка скрывается.

## Тестовый план

Frontend unit/component:

- details модалки для продажи показывает клиента, товар, количество, цену, сумму и оплату, но не показывает `clientId`, `productBatchId`, `distributorProductBalanceId`.
- details для отмены продажи показывает причину и обратное движение, но не показывает id исходной продажи.
- details для дисконта показывает `было -> стало`, скидку и количество, но не показывает source/target balance ids.
- details для courier unload показывает курьера, распределитель, товарные строки и cash movement, но не показывает balance ids.
- details для production transfer показывает продукцию, распределитель и остатки `до -> после`, но не показывает `productBatchId`/`distributorId`.
- redacted/sensitive fields не отображаются.
- details для `user.password.reset` показывает действие пользователя, но не показывает password/token/hash/id.
- details для `client.update` показывает имя, телефон и описание, но скрывает `normalizedPhone` и `clientId`.
- details для `catalog.*.archive/update` показывает название и статус активности, но скрывает ids.
- details для `production.notification.create/complete` показывает текст задачи, создателя/исполнителя и статус.
- unknown/fallback details скрывает id-like keys и форматирует money/boolean/status.
- unknown/fallback details с nested object/array показывает вложенные данные как повторяющиеся группы без technical keys.
- модалка сохраняет accessibility role `dialog`, заголовок и кнопку закрытия.

Targeted verification:

- `corepack pnpm --filter @buhta/web typecheck`;
- `corepack pnpm --filter @buhta/web exec vitest run app/page.test.tsx`;
- если presenter получает отдельный тест: `corepack pnpm --filter @buhta/web exec vitest run src/features/operations/operation-detail-presenter.test.ts`;
- `corepack pnpm docs:check`.

Full verification перед коммитом:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`.

Manual UI:

- открыть `http://localhost:3001/`;
- зайти администратором или Директором во вкладку `История`;
- открыть несколько операций: продажа, дисконт, передача продукции, сброс пароля или создание пользователя;
- убедиться, что id/raw keys не видны, значения читаемы, модалка не ломается на мобильной ширине.

## Риски и rollback

- Риск: разные operation details уже имеют неодинаковые ключи.
  - Снижение: adapter + generic fallback; тесты на основные текущие operation types.
- Риск: скрытие id затруднит техническое расследование.
  - Снижение: этот экран управленческий; технический debug/audit view не входит в v1 mini-этап и может быть отдельным решением.
- Риск: часть операций потеряет полезные данные из-за слишком агрессивного hide list.
  - Снижение: hide policy только для id-like/sensitive/internal keys, остальные неизвестные поля показывать с humanized label.
- Rollback: вернуть старый `renderDetails` key-value layout; backend/API не меняются.

## Критерии завершения

- В модалке details больше не видны technical ids и raw internal keys.
- Основные операции показывают понятные секции и отформатированные значения.
- Unknown/fallback operation не раскрывает id-like/sensitive keys.
- Тексты и layout читаемы на mobile viewport.
- Frontend tests и docs check пройдены.
- После реализации план закрыт в `completed`, а `docs/FRONTEND.md` и roadmap обновлены.

## Открытые вопросы

Нет блокирующих вопросов перед реализацией.

Решение по умолчанию: полностью скрывать технические id из UI истории. Если для support/debug позже понадобится доступ к id, проектировать отдельный technical view, а не смешивать его с директорской модалкой.

## Итог реализации

Этап завершен 2026-06-05.

Реализовано:

- добавлен `operation-detail-presenter.ts`, который строит director-facing секции details;
- `OperationHistoryHome.tsx` больше не рендерит raw details напрямую;
- technical ids, id-like keys, sensitive/redacted fields и normalized fields скрываются в UI;
- деньги, статусы, оплаты, количества и остатки форматируются в читаемый вид;
- nested object/array fallback отображается как повторяющиеся группы строк без technical keys;
- `priceCents` и похожие money fields показываются как рубли, а не raw cents.

Выполненные проверки:

- `corepack pnpm --filter @buhta/web typecheck`;
- `corepack pnpm --filter @buhta/web exec vitest run src/features/operations/operation-detail-presenter.test.ts app/page.test.tsx`;
- `corepack pnpm docs:check`;
- ручная browser-проверка `http://localhost:3001/`: модалка истории показывает секции без technical ids, деньги и остатки читаемы.
