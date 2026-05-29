# Production Intake And Release Plan

Статус: `Completed`
Дата: 2026-05-29
Roadmap stage: `5. Production Flow`

## Цель

Перейти от справочников к рабочему производственному контуру для заведующего производством:

- цена в шаблоне продукции;
- поступление сырья;
- поступление тары;
- текущие остатки сырья и тары в цеху;
- выпуск партии продукции по шаблону;
- списание сырья и тары при выпуске;
- начальный frontend экран заведующего производством в mobile shell.

Для пользователя “история” не является отдельной функцией при поступлении. Пользователь выполняет действие `Добавить поступление сырья` или `Добавить поступление тары`, а backend внутри этой write-команды создает operation/audit запись и обновляет остаток транзакционно.

## Обязательный просмотр локального мока

Перед составлением плана просмотрена структура локального демо:

- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/index.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/09-production.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/09-production-variants.html`.

Из мока берем структуру, а не стили один-в-один:

- production home: summary “Продукция в цеху”, агрегаты “Сырье” и “Тара”, быстрые действия;
- raw material details: список остатков сырья с кнопкой добавления;
- packaging details: список остатков тары с кнопкой добавления;
- notifications screen: список уведомлений от коммерческого руководителя, пока без полноценного backend notification module в этом этапе;
- release screen: выбор шаблона, количество, расчет списания сырья/тары, кнопка выпуска.

Стилизация остается нашей: светлый mobile shell, зеленые акцентные cards, черная нижняя навигация/actions, компактные формы без перегруза.

## Scope

Входит:

- расширить шаблон продукции ценой;
- price input в UI показывать и вводить в рублях с двумя знаками после запятой;
- хранить цену без floating point ошибок: `priceCents` в БД/API-domain;
- shared money/price schemas для ввода рублевого значения и отображения;
- Prisma models/migration для:
  - поступления сырья;
  - поступления тары;
  - текущих остатков сырья;
  - текущих остатков тары;
  - партии готовой продукции в цеху;
  - typed details для production operations, если они нужны для отчетов/тестов уже сейчас;
- backend module/API для production:
  - read summary для главной заведующего производством;
  - list raw material balances;
  - create raw material intake;
  - list packaging balances;
  - create packaging intake;
  - create product batch/release;
- transactional balance updates;
- запрет отрицательных остатков сырья/тары при выпуске;
- audit/operation records для поступлений и выпуска;
- frontend role screen для `production_manager`;
- mobile forms для поступления сырья, поступления тары и выпуска;
- offline write blocking;
- targeted tests и real Postgres integration tests.

Не входит:

- перемещение готовой продукции на распределитель;
- товарный остаток распределителя;
- продажи;
- клиенты;
- курьерские загрузки/сгрузки;
- денежные балансы;
- полноценный модуль уведомлений от коммерческого руководителя;
- manual packaging write-off отдельной операцией, если она не нужна для базового выпуска;
- сложные нормативы списания тары;
- фасовка как отдельная доменная модель, пока не будет согласована.

## Доменные решения этапа

### 1. Цена в шаблоне продукции

Шаблон продукции расширяется ценой за единицу.

Правила:

- пользователь видит и вводит цену в рублях;
- допускается максимум два знака после запятой;
- пустая, отрицательная и нечисловая цена запрещены;
- backend хранит цену как integer cents `priceCents`;
- responses могут возвращать `priceCents` и user-facing formatted value только если это не усложнит contracts;
- при выпуске партии цена копируется snapshot-ом в партию;
- изменение цены в шаблоне не меняет уже выпущенные партии.

### 2. Поступление сырья

Пользовательский flow:

1. Заведующий производством выбирает активный вид сырья.
2. Вводит количество.
3. При необходимости добавляет комментарий.
4. Нажимает `Добавить`.

Backend:

- проверяет permission;
- проверяет активность вида сырья;
- создает operation/audit запись;
- создает запись поступления;
- увеличивает текущий остаток сырья;
- выполняет все в одной transaction.

### 3. Поступление тары

Аналогично сырью:

- выбирается активный вид тары;
- вводится количество;
- остаток тары увеличивается;
- operation/audit фиксируются внутри write-команды.

### 4. Выпуск партии продукции

Пользовательский flow:

1. Заведующий производством выбирает активный шаблон продукции.
2. Вводит количество выпуска.
3. UI показывает расчет списания:
   - связанный вид сырья;
   - связанный вид тары;
   - доступные остатки;
   - сколько будет списано.
4. Нажимает `Выпустить`.

Минимальное правило списания для этого этапа:

- для каждой единицы продукции списывается 1 единица связанной тары;
- расход сырья требует отдельного решения: либо временно вводится вручную в форме выпуска, либо добавляется минимальное поле `rawMaterialQuantityPerUnit` в шаблон.

Предпочтение для реализации: не добавлять норматив сырья в шаблон без подтверждения. Для первого production flow безопаснее дать заведующему производством явное поле `Списать сырья` в форме выпуска, а позже заменить/дополнить нормативом, если процесс подтвердится.

Backend:

- проверяет активность шаблона, сырья и тары;
- проверяет доступный остаток сырья и тары;
- запрещает отрицательный остаток;
- создает партию продукции в статусе `in_workshop`;
- сохраняет snapshot:
  - template id;
  - product name;
  - raw material type id/name/unit;
  - packaging type id/name/unit;
  - priceCents;
  - quantity;
  - consumed raw material quantity;
  - consumed packaging quantity;
- списывает сырье и тару;
- пишет operation/audit.

## Права

Write-действия production stage:

- `production.manage` для `admin` и `production_manager`.

Read-доступ production screen:

- `production_manager` видит свой рабочий экран;
- `admin` может иметь доступ для проверки/поддержки;
- остальные роли не получают production write-действия.

Если текущая policy уже содержит `production.manage`, нужно покрыть это тестом и использовать `RequirePermission("production.manage")`.

## API Draft

Имена можно уточнить при реализации, но стартовое направление:

- `GET /production/summary`;
- `GET /production/options`;
- `GET /production/raw-material-balances`;
- `POST /production/raw-material-intakes`;
- `GET /production/packaging-balances`;
- `POST /production/packaging-intakes`;
- `GET /production/product-batches`;
- `POST /production/product-batches`;
- `PATCH /catalog/product-templates/:id` расширяется обновлением цены;
- `POST /catalog/product-templates` расширяется обязательной ценой.

Важно: если изменение catalog contract с обязательной ценой ломает существующие тесты/seed, обновить их явно. Если нужна мягкая миграция, добавить default для существующих шаблонов только на dev/test уровне и зафиксировать решение.

## Frontend Direction

Структура должна не раздувать role screen.

Целевая структура:

```text
apps/web/src/roles/production-manager/
  ProductionManagerHome.tsx

apps/web/src/features/production/
  ProductionHome.tsx
  ProductionSummaryCard.tsx
  RawMaterialBalancesPanel.tsx
  PackagingBalancesPanel.tsx
  RawMaterialIntakeForm.tsx
  PackagingIntakeForm.tsx
  ProductReleaseForm.tsx
  ProductBatchList.tsx
```

Роль `production_manager` подключает feature, но не содержит всю бизнес-логику в одном файле.

Из демо-мока берем:

- home с агрегированными остатками;
- drill-down на сырье/тару;
- release screen с расчетом списания;
- нижнюю навигацию: `Главная`, `Уведомления`, `История`, `Профиль`;
- выпуск как быстрое действие на главной, а не как отдельный пункт нижнего меню.

Корректировки относительно демо:

- не показывать неработающие уведомления как полноценный backend flow, если notification module еще не реализован;
- не добавлять декоративные warning states без реальных thresholds;
- не делать горизонтальные чипы как основной layout, если они ухудшают читаемость на маленьком экране;
- все write-кнопки disabled offline.

## Затронутые документы

- `docs/crm-requirements.md` — цена в шаблоне, правила поступления, выпуска и snapshot партии.
- `docs/ARCHITECTURE.md` — production module и balance update flow.
- `docs/SECURITY.md` — `production.manage`.
- `docs/HANDLER-MAP.md` — production endpoints.
- `docs/DOMAIN-EVENTS.md` — production operation/audit actions.
- `docs/FRONTEND.md` — production feature placement и фактические UI conventions.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — фактический прогресс.

## Затронутые модули

- `packages/shared/src` — production contracts, price schemas, updated catalog contracts.
- `apps/api/prisma/schema.prisma` и новая migration.
- `apps/api/src/catalog` — product template price support.
- `apps/api/src/production` — новый module/controller/service.
- `apps/api/src/operations` — operation types для поступлений и выпуска.
- `apps/api/src/policy` — tests for `production.manage`.
- `apps/web/src/features/catalog` — product template price field.
- `apps/web/src/features/production` — production UI.
- `apps/web/src/roles/production-manager` — role composition.
- `apps/web/src/app-shell/AppRoot.tsx` — routing/nav for production role.

## Шаги реализации

1. Уточнить минимальную модель цены и выпуска без фасовки/нормативов.
2. Расширить shared catalog contracts ценой в рублях/копейках.
3. Добавить shared production contracts.
4. Добавить Prisma migration для price и production tables/balances.
5. Обновить catalog service/API/UI под цену шаблона.
6. Реализовать `ProductionModule`.
7. Добавить transactional updates для поступлений сырья/тары.
8. Добавить transactional release: проверка остатков, списание, создание партии, audit.
9. Подключить production manager frontend по структуре из demo.
10. Добавить loading/error/empty/offline states.
11. Обновить SoR-документацию.
12. Прогнать verification contour и browser/manual check.

## Тестовый план

### Shared/unit

- price schema принимает `1200`, `1200.00`, `950.50`;
- price schema отклоняет `-1`, `abc`, `10.999`;
- product template требует price;
- production command schemas требуют id активных справочников и положительные quantity.

### API/Integration with real Postgres

- `production_manager` может создать поступление сырья;
- поступление сырья увеличивает raw balance;
- поступление тары увеличивает packaging balance;
- роль без `production.manage` получает `403` на write;
- выпуск партии запрещен без достаточного сырья;
- выпуск партии запрещен без достаточной тары;
- успешный выпуск списывает сырье и тару;
- успешный выпуск создает партию со snapshot цены и названий;
- изменение шаблона после выпуска не меняет snapshot партии;
- duplicate/idempotency behavior не создает двойное списание, если будет idempotency key в command;
- operation/audit пишутся для intakes и release.

### Frontend

- `production_manager` видит production home;
- admin/director catalog продолжает работать после добавления цены;
- форма шаблона продукции требует цену;
- заведующий может открыть сырье/тару, добавить поступление и увидеть обновление списка;
- выпуск показывает расчет списания;
- ошибки API показываются по-русски;
- offline блокирует write-кнопки;
- layout проверен на mobile viewport `375x812` и desktop shell.

## Verification commands

Перед завершением этапа:

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`;
- `corepack pnpm smoke`;
- browser/manual check production manager flow.

Практика sandbox:

- Prisma migrate/deploy, real Postgres integration tests, build/audit/smoke при sandbox-сбоях повторять вне sandbox с escalation.

## Риски и rollback

### R1. Преждевременно добавить фасовку и нормативы

Mitigation: в этом плане фиксируем только цену и минимальный выпуск. Фасовка/нормативы добавляются отдельным решением.

Rollback: удалить неподтвержденные поля из plan/code до миграции; после миграции — корректирующая migration.

### R2. Float-ошибки в цене

Mitigation: UI работает в рублях, backend хранит integer cents.

Rollback: заменить decimal/float поля на `priceCents`, добавить migration и тесты на формат.

### R3. Выпуск без корректного списания

Mitigation: выпуск только transaction: validate balances → decrement balances → create batch → operation/audit.

Rollback: отключить release endpoint/UI, оставить только intakes, если списание не готово.

### R4. Production role screen превратится в большой файл

Mitigation: `roles/production-manager` только собирает feature-компоненты; бизнес UI живет в `features/production`.

Rollback: вынести разросшиеся секции в feature components до завершения этапа.

### R5. Placeholder уведомлений создаст ложное ожидание backend flow

Mitigation: на этом этапе уведомления можно показать только как disabled/placeholder или не включать в первый production release, пока notification module не реализован.

Rollback: убрать tab/section уведомлений из production nav до этапа notification flow.

## Открытые вопросы

- Решено: для первого выпуска сырье списывается ручным полем `consumedRawMaterialQuantity`; норматив `rawMaterialQuantityPerUnit` не добавлен.
- Решено: количество партии хранится как целое число единиц.
- Решено: отдельная фасовка пока не добавлена; при необходимости она появится отдельным решением.
- Решено: вкладка `Уведомления` показывается как placeholder, без backend notification module.

## Фактическая реализация

- `packages/shared` расширен `RublePriceSchema`, `rublePriceToCents`, production contracts и `priceCents` в product template contracts.
- Prisma migration `20260529100000_production_intake_and_release` добавляет `priceCents`, балансы сырья/тары, поступления и `product_batch`.
- `CatalogService` и catalog UI поддерживают цену шаблона продукции в рублях на frontend и `priceCents` в API/БД.
- Добавлен `ProductionModule` с route set из API Draft.
- Добавлен `GET /production/options`, чтобы `production_manager` получал read-only список активных справочников для форм без `catalog.manage`.
- Поступления сырья/тары и выпуск партии выполняются транзакционно и пишут operation/audit.
- Выпуск партии запрещает отрицательные остатки через conditional decrement сырья и тары.
- `production_manager` получил отдельный mobile flow: главная, уведомления-placeholder, история, профиль.
- Быстрые действия на главной открывают отдельные экраны с кнопкой `Назад`: выпуск продукции, приход сырья, приход тары. В нижнем меню отдельной кнопки `Выпуск` нет.
- Кликабельные карточки главной открывают отдельные экраны с кнопкой `Назад`: зеленый summary — список продукции в цеху, агрегаты `Сырье`/`Тара` — остатки по каждому активному виду.
- По структуре использован локальный production demo: summary, агрегаты сырья/тары, быстрые действия, отдельные рабочие экраны, история.

## Выполненная верификация

- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test` с доступом к локальному Postgres в Orbstack;
- `corepack pnpm docs:check`;
- `corepack pnpm build` вне sandbox из-за Turbopack `binding to a port`;
- `corepack pnpm audit`;
- `corepack pnpm smoke`;
- browser/manual check production manager flow на `http://localhost:3001`.

## Критерии завершения

Этап завершен, когда:

- шаблон продукции содержит цену и UI/API работают с рублями до 2 знаков;
- цена хранится без floating point ошибок;
- заведующий производством может добавить поступление сырья и тары;
- текущие остатки сырья/тары доступны с production home на отдельных экранах;
- список продукции в цеху доступен с зеленого summary на production home;
- заведующий может выпустить партию продукции;
- выпуск запрещает отрицательные остатки;
- партия хранит snapshot цены и связанных справочников;
- operation/audit records пишутся для поступлений и выпуска;
- UI production manager соответствует структуре локального demo, но визуально остается в нашем стиле;
- tests/docs/checks/browser verification выполнены;
- plan-файл находится в `docs/exec-plans/completed/`.
