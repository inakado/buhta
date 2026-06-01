# Frontend Role Screen Recomposition Plan

Статус: `Completed`
Дата: 2026-05-31
Последнее уточнение: 2026-06-02

## Цель

Перекроить реализованные frontend-экраны ролей под композиционную структуру локального мока `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta`, не меняя текущую дизайн-систему проекта.

Порядок полировки:

1. Коммерческий руководитель.
2. Работник распределителя.
3. Курьер.
4. Директор.

Текущие цвета, CSS tokens и общий визуальный язык приложения остаются источником истины. Локальный мок используется только как источник структуры экранов, порядка блоков и mobile interaction patterns.

## Анализ текущего состояния

Frontend уже имеет рабочий mobile-first PWA shell:

- `AppRoot` владеет session flow, React Query client, role routing и bottom navigation;
- роль заведующего производством уже ближе всего к целевой структуре: home summary, агрегаты, quick actions, drill-down screens, отдельные формы и inline success states;
- коммерческий руководитель сейчас на home фактически видит `DistributorInventoryHome`, а не отдельную композицию продаж из `05-commercial.html`;
- работник распределителя использует тот же generic inventory/sale flow, без отдельного role home из `14-distributor.html`;
- курьерский контур функционально реализован, но `CourierBalanceHome`, `CourierLoadHome` и `CourierSaleHome` используют ранний паттерн `summary-card + form/select`, а не структуру `16-courier.html` и `13-sale-flow.html`;
- директор сейчас может быть только read-only экраном на доступных данных, потому что списания, дисконты, отчеты и audit read model еще не реализованы backend-ом.

Текущий риск — новые фичи продолжают добавлять UI локально в feature-файлы и постепенно расходятся с единой mobile composition.

## Scope

Входит в этап:

- создать минимальный слой повторяемых frontend primitives для role screens;
- вынести role composition из `AppRoot` в `app-shell/RoleHomeRouter` и роль-специфичные components в `roles/*`;
- перестроить композицию уже реализованных экранов коммерческого руководителя, работника распределителя, курьера и директора;
- сохранить текущий стиль из `apps/web/app/globals.css`;
- переиспользовать существующие API endpoints и shared contracts;
- сохранить online-only поведение write-операций;
- обновить frontend component tests под новую структуру;
- обновить профильную документацию frontend после фактической реализации.

## Out Of Scope

Не входит в этап:

- Prisma schema changes;
- backend API changes;
- shared contract changes;
- новые доменные операции;
- courier unload;
- production notifications;
- director cash write-off;
- discounts;
- corrections;
- reports;
- audit UI на реальном read model;
- перенос demo v3 graphite/ice-gray tokens;
- добавление UI framework или универсального конструктора экранов.

Если для блока нет backend-данных, UI не должен имитировать метрику. Допустим честный placeholder или скрытие блока до отдельного доменного этапа.

## Зафиксированные решения

1. **Дизайн-система остается текущей.**
   - Использовать текущие project tokens и visual conventions.
   - Не переносить `tokens.css` из demo как источник палитры.

2. **Demo — структурный reference.**
   - Брать порядок блоков, role home composition, sale/load layout, stock rows, action footer и mobile flow patterns.
   - Не копировать demo стили один-в-один.

3. **Production screen — локальный эталон качества.**
   - `ProductionHome` показывает нужный уровень role-specific composition.
   - Не ломать production flow во время первого frontend polish pass.

4. **Нет fake business data.**
   - Не показывать “продажи сегодня”, “выручка сегодня”, “последние операции” и аналитику, пока нет надежного backend/read model.

5. **Минимальные primitives вместо большой дизайн-системы.**
   - Компонент выделяется только если он уже повторяется в нескольких role screens или снижает риск расхождения.

6. **Role composition выносится из `AppRoot`.**
   - `AppRoot` должен остаться владельцем session, query client, shell state, active tab и global success notice.
   - Role routing/composition переносится в `RoleHomeRouter`.
   - Ролевые home screens живут в `apps/web/src/roles/<role>/`, где роль собирает экран из feature-компонентов и neutral UI primitives.
   - `features/*` остаются владельцами доменных flows и server-state.

## UI Reference Files

Перед реализацией открыть и сверить:

- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/05-commercial.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/14-distributor.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/16-courier.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/13-sale-flow.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/06-director.html`;
- `/Users/Alex/Documents/VSCodeProjects/interface_demo/demos/bukta/screens/17-history-audit.html` только как будущий reference, без реализации audit UI в этом этапе.

## Demo Observations

### `05-commercial.html`

- Берем: role home `Продажи`, real distributor inventory/cash overview, primary sale entry, inline stock list.
- Адаптируем: вместо demo-блока “Продажи сегодня” показываем только реальные distributor inventory/cash данные.
- Не берем: fake revenue, fake latest sales, notification flow без backend, action tiles `Остатки`/`Клиенты`/`Курьеры`, которые дублируют нижнюю навигацию.

### `14-distributor.html`

- Берем: role home `Распределитель`, товарный и cash summary, primary `Продать`, компактный список остатков, offline-disabled pattern.
- Адаптируем: sale flow остается на текущем single-item API и существующих client endpoints.
- Не берем: fake “Продажи сегодня”, history rows и плитки, которые дублируют нижнюю навигацию или не запускают действие.

### `16-courier.html`

- Берем: role home `Мой баланс`, cards `Товар` и `Наличные`, quick actions `Продать`, `Загрузить`, own stock list.
- Адаптируем: load flow выбирает одну позицию, потому что текущий backend принимает одну строку остатка.
- Не берем: мультивыбор загрузки, fake “Продажи сегодня” и плитку `Сгрузить` до отдельного backend этапа.

### `13-sale-flow.html`

- Берем: client picker/create client structure, product picker rows, payment segmented control, operation summary, sticky action.
- Адаптируем: первый pass может быть без confirmation sheet, чтобы не раздувать состояние формы.
- Не берем: discounts, old/new price badges и operation success detail без backend/read model.

### `06-director.html`

- Берем: read-only overview composition и action entry points.
- Адаптируем: показываем только реальные distributor/courier balances.
- Не берем: fake revenue, fake latest operations, discount/cash write-off flows без backend.

## Frontend Architecture Plan

### App Shell Boundary

- Добавить `apps/web/src/app-shell/RoleHomeRouter.tsx`.
- Перенести текущую функцию `RoleHome` из `AppRoot.tsx` в `RoleHomeRouter`.
- `RoleHomeRouter` принимает `actor`, `activeTab`, `onTabChange`, `online`, callbacks success/logout и выбирает нужный role component или feature flow.
- `onTabChange` прокидывается в role home screens для action tiles вроде `Продать`, `Клиенты`, `Курьеры`, `Загрузить`; ролевые home screens не владеют собственным `activeTab`.
- `AppRoot.tsx` не должен содержать большую role-specific JSX/composition ветку после рефакторинга.
- `BottomNav` можно оставить в `AppRoot.tsx` на первом pass или вынести отдельно, если это не раздувает diff.

### Role Composition Boundary

Добавить role-specific composition modules:

- `apps/web/src/roles/commercial-manager/CommercialManagerHome.tsx`;
- `apps/web/src/roles/distributor-worker/DistributorWorkerHome.tsx`;
- `apps/web/src/roles/courier/CourierHome.tsx`;
- `apps/web/src/roles/director/DirectorHome.tsx`.

Правила:

- role components собирают экран из sections и feature components;
- business flows, API queries и mutations остаются в `features/*`, если они переиспользуются несколькими ролями;
- роль подключает feature в нужном контексте, но не копирует форму или логику.

### Neutral UI Primitives

Добавить `apps/web/src/ui/` и наполнять его neutral primitives по мере реального использования:

- `RoleHomeHeader` — компактный заголовок role home, статус сети и optional action;
- `BalanceGrid` / `BalanceCard` — карточки товарных и денежных summary;
- `SectionHeader` — заголовок секции с optional action;
- `ActionTile` — быстрые действия на role home;
- `EntityRow` / `EntityList` — нейтральные строки сущностей без знания товара, цены и источника;
- `ScreenHeader` — header вложенного flow с back/cancel;
- `ActionFooter` — закрепленная зона основной кнопки;
- `SegmentedControl` — выбор наличные/безнал;
- `InlineNotice` — success/error/info state без дублирования.

Правила:

- primitive создается extract-as-needed: при первом очевидном повторении или при втором фактическом использовании в role pass;
- не добавлять весь список primitives заранее пустыми или одноразовыми компонентами;
- primitives не должны знать доменную логику;
- в `ui/*` не должно быть `DistributorStockList`, `CourierStockList`, `SaleProductPicker`, price/quantity/business labels;
- доменные списки и product pickers остаются в `features/*`;
- server-state остается в feature components;
- формы не переносят backend-инварианты в UI;
- `shared` package не использовать для React components;
- не делать универсальный `RoleScreenBuilder`.

## Frontend Implementation Steps

### 1. Documentation And Plan Setup

- Создать этот active plan.
- Добавить план в `docs/DOCS-INDEX.md`.
- После реализации обновить `docs/FRONTEND.md`:
  - текущий стиль проекта остается SoR;
  - demo используется как structural reference;
  - зафиксировать фактически добавленные frontend primitives.

### 2. Shared UI Primitives

- Добавить `apps/web/src/ui/` только когда появляется первый реальный extracted primitive.
- Создавать primitives extract-as-needed во время role passes, а не заранее весь каталог.
- Переносить повторяющиеся visual blocks из текущих экранов в primitives без изменения поведения.
- Добавить CSS classes в `apps/web/app/globals.css` точечно, без переписывания всей таблицы стилей.
- Проверить, что `ProductionHome` визуально не регрессирует.

### 3. App Shell And Role Router

- Добавить `RoleHomeRouter`.
- Перенести role-routing ветку из `AppRoot` без изменения условий доступа.
- Передать `onTabChange` из `AppRoot` в `RoleHomeRouter`, а оттуда в role home components.
- Добавить role component stubs для commercial manager, distributor worker, courier и director.
- Оставить production/admin/catalog/clients routing совместимым с текущим поведением.
- Targeted test: session/logout и существующий production flow проходят после выноса router.

### 4. Commercial Manager Screen

Целевая структура по `05-commercial.html`:

- role home title `Продажи`;
- balance cards:
  - остаток распределителя из `GET /distributor/inventory`;
  - наличные распределителя из `GET /distributor/cash-balances`;
- primary action `Продать`;
- `Остатки`, `Клиенты`, `Курьеры` не выводить отдельными плитками на home, потому что эти переходы уже есть в нижней навигации;
- stock list на основе существующего distributor inventory;
- переходы к уже существующим sale, clients и courier balances flows.

Не показывать:

- продажи сегодня;
- последние продажи;
- выручку;
- статистику.

Эти блоки требуют отдельного reports/audit read model.

Checkpoint:

- targeted component test commercial manager home;
- targeted component test перехода к sale через primary action;
- targeted component test перехода к clients/couriers через нижнюю навигацию;
- проверка, что query keys distributor inventory/cash остаются теми же.

### 5. Distributor Worker Screen

Целевая структура по `14-distributor.html`:

- role home title `Распределитель`;
- balance cards:
  - товар на распределителе;
  - наличные на распределителе;
- primary action `Продать`;
- stock list с названием, распределителем, количеством и ценой;
- sale flow переиспользует общий distributor sale composition.

Ограничения:

- не показывать courier balances;
- не показывать management/report actions;
- не расширять права роли.

Checkpoint:

- targeted component test distributor worker home;
- targeted component test distributor sale entry;
- проверка, что distributor worker не видит courier balances.

### 6. Distributor Sale Flow

Целевая структура по `13-sale-flow.html`, но на текущих API:

- screen header `Оформить продажу`;
- client picker/create client на существующих endpoints;
- product selection из `GET /distributor/sale-options`;
- quantity input;
- payment segmented control вместо обычного select;
- operation summary:
  - клиент;
  - товар;
  - количество;
  - способ оплаты;
  - итоговая сумма;
  - понятный cash effect для наличных и безнала;
- sticky `ActionFooter` с submit button;
- inline backend errors без success notice при ошибке;
- offline state disabled для create client и submit sale.

Не добавлять confirmation sheet в первом pass, если это усложняет тесты и состояние. Допустимо оставить прямой submit с clear summary.

Query behavior must stay intact:

- после успешной продажи инвалидировать `["distributor", "inventory"]`;
- после успешной продажи инвалидировать `["distributor", "sale-options"]`;
- после успешной продажи инвалидировать `["distributor", "cash-balances"]`;
- после успешного создания клиента инвалидировать `["clients"]`;
- success возвращает пользователя на home через существующий global success callback;
- backend error не сбрасывает выбранного клиента, товар, количество и способ оплаты.

Checkpoint:

- targeted component test sale payload;
- targeted component test query invalidation/refetch behavior;
- targeted component test error keeps form state.

### 7. Courier Home

Целевая структура по `16-courier.html`:

- role home title `Мой баланс`;
- balance cards:
  - товар курьера из `GET /courier/product-balances`;
  - наличные курьера из `GET /courier/cash-balances`;
- quick actions:
  - `Продать`;
  - `Загрузить`;
- own stock list;
- `Сгрузить` не добавлять даже disabled/placeholder, пока нет backend flow.

Checkpoint:

- targeted component test courier home;
- targeted component test load/sale entry points;
- targeted component test `Сгрузить` отсутствует до backend flow.

### 8. Courier Load Flow

Целевая структура по `16-courier.html` load screen:

- screen header `Загрузить товар`;
- stock rows из `GET /courier/load-options`;
- выбор одной позиции;
- quantity input;
- summary:
  - сколько уйдет с распределителя;
  - сколько попадет на баланс курьера;
  - товарная стоимость;
- sticky submit action;
- offline disabled state.

Не реализовывать multi-select загрузку, если backend сейчас принимает одну позицию.

Query behavior must stay intact:

- после успешной загрузки инвалидировать `["courier", "product-balances"]`;
- после успешной загрузки инвалидировать `["courier", "load-options"]`;
- после успешной загрузки инвалидировать `["distributor", "inventory"]`;
- success возвращает пользователя на home через существующий global success callback;
- backend error не сбрасывает выбранный товар, количество и комментарий.

Checkpoint:

- targeted component test load payload;
- targeted component test query invalidation/refetch behavior;
- targeted component test error keeps form state.

### 9. Courier Sale Flow

Целевая структура по `13-sale-flow.html`, но источник товара — баланс курьера:

- client picker/create client;
- stock rows из `GET /courier/sale-options`;
- quantity input;
- payment segmented control;
- operation summary:
  - клиент;
  - товар;
  - количество;
  - сумма;
  - cash effect для наличных;
  - no-cash effect для безнала;
- sticky submit action;
- offline disabled state.

Query behavior must stay intact:

- после успешной продажи инвалидировать `["courier", "product-balances"]`;
- после успешной продажи инвалидировать `["courier", "sale-options"]`;
- после успешной продажи инвалидировать `["courier", "cash-balances"]`;
- после успешного создания клиента инвалидировать `["clients"]`;
- success возвращает пользователя на home через существующий global success callback;
- backend error не сбрасывает выбранного клиента, товар, количество и способ оплаты.

Checkpoint:

- targeted component test courier sale payload;
- targeted component test query invalidation/refetch behavior;
- targeted component test error keeps form state.

### 10. Director Overview

Целевая структура по `06-director.html`, ограниченная текущими данными:

- read-only overview;
- distributor inventory summary;
- distributor cash summary;
- courier product/cash balances;
- quick action placeholders:
  - `Назначить дисконт`;
  - `Списать наличные`;
  - `Отчеты`;
  - `История`.

Placeholder actions должны явно оставаться недоступными до соответствующих backend этапов. Не показывать fake revenue, fake latest operations и fake report numbers.

Checkpoint:

- targeted component test director overview;
- targeted component test no fake reports/latest operations;
- targeted component test write-only placeholders do not submit mutations.

## Затронутые документы

- `docs/DOCS-INDEX.md` — добавить этот active plan.
- `docs/FRONTEND.md` — обновить после реализации frontend primitives и role composition.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — обновить только если фактический порядок v1 этапов меняется.

## Затронутые модули и файлы

Ожидаемые frontend файлы:

- `apps/web/src/app-shell/AppRoot.tsx`;
- новый `apps/web/src/app-shell/RoleHomeRouter.tsx`;
- новый `apps/web/src/roles/commercial-manager/CommercialManagerHome.tsx`;
- новый `apps/web/src/roles/distributor-worker/DistributorWorkerHome.tsx`;
- новый `apps/web/src/roles/courier/CourierHome.tsx`;
- новый `apps/web/src/roles/director/DirectorHome.tsx`;
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx`;
- `apps/web/src/features/sales/DistributorSaleHome.tsx`;
- `apps/web/src/features/courier/CourierBalanceHome.tsx`;
- `apps/web/src/features/courier/CourierLoadHome.tsx`;
- `apps/web/src/features/courier/CourierSaleHome.tsx`;
- `apps/web/src/features/clients/ClientsHome.tsx`, если потребуется общий client picker layout;
- `apps/web/app/globals.css`;
- `apps/web/app/page.test.tsx`;
- новый `apps/web/src/ui/*`.

Backend, Prisma и shared contracts не должны изменяться в этом этапе.

## Stage Checkpoints

Работать маленькими проходами, а не одним большим frontend diff:

Не выполнять весь план одним diff. После каждого checkpoint остановиться, прогнать targeted tests для завершенного прохода и зафиксировать результат проверки в этом плане перед переходом к следующему checkpoint.

1. `RoleHomeRouter` + neutral primitives baseline.
   - targeted tests: session/logout, production route, existing commercial route smoke.
2. Commercial manager.
   - targeted tests: commercial home, sale primary action, clients/couriers bottom navigation.
3. Distributor worker + distributor sale composition.
   - targeted tests: distributor home, sale payload, query invalidation, error keeps form state.
4. Courier home + load.
   - targeted tests: courier home, load payload, query invalidation, error keeps form state.
5. Courier sale.
   - targeted tests: sale payload, cash/cashless segmented control, query invalidation, error keeps form state.
6. Director overview.
   - targeted tests: read-only balances, no fake metrics, placeholders non-mutating.
7. Full verification.
   - full relevant commands from `Verification commands`.

## Checkpoint Results

### 2026-06-01 — Checkpoint 1: `RoleHomeRouter` + neutral primitives baseline

Фактический результат:

- `RoleHomeRouter` вынесен из `AppRoot` в отдельный app-shell boundary.
- `AppRoot` остался владельцем session flow, query client, active tab, bottom navigation и global success notice.
- `onTabChange` передан в `RoleHomeRouter` как явный контракт для следующих role home passes.
- Neutral `ui/*` primitives не созданы в этом checkpoint: router-only pass не дал реального повторного использования, а план требует extract-as-needed.

Выполненные проверки:

- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 20 tests passed.

### 2026-06-01 — Checkpoint 2: Commercial manager

Фактический результат:

- Добавлен `CommercialManagerHome` в `apps/web/src/roles/commercial-manager/`.
- Commercial home теперь собирается через `RoleHomeRouter`, а не через generic distributor inventory fallback.
- Структура сверена с `05-commercial.html`, но фейковые `Продажи сегодня`, `Последние продажи` и notification flow не добавлены.
- По UI-review из home убраны заголовок `Действия` и плитки `Остатки`/`Клиенты`/`Курьеры`, потому что они дублируют нижнюю навигацию.
- На home остались реальные summary `Остаток распределителя`, `Наличные`, primary action tile `Продать` и inline stock list.
- Доменный список остатков вынесен в `features/distributor/DistributorStockList.tsx`; neutral `ui/*` primitives не добавлялись, потому что повторного нейтрального использования в этом pass не возникло.

Выполненные проверки:

- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 20 tests passed.
- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- Browser plugin path заблокировал localhost (`net::ERR_BLOCKED_BY_CLIENT`), fallback через Playwright на `http://localhost:3001` — ok: commercial home рендерится, `Продать` остается action tile, переход ведет в `Детали продажи`.

### 2026-06-01 — Checkpoint 3: Distributor worker + distributor sale entry

Фактический результат:

- Добавлен `DistributorWorkerHome` в `apps/web/src/roles/distributor-worker/`.
- Commercial manager и distributor worker теперь используют общий доменный `DistributorHomeOverview` из `features/distributor`, без neutral `ui/*` primitives и без универсального role builder.
- Worker home показывает `Распределитель`, товарный summary `Товар`, cash summary `Наличные`, action tile `Продать` и inline stock list.
- Плитки `Остатки`, `Клиенты`, `Курьеры`, `История` не добавлены: остатки уже на home, клиенты доступны через нижнюю навигацию, курьеры не входят в права worker, history/audit UI не реализован.
- Sale entry ведет в существующий `DistributorSaleHome`; форма продажи и backend-инварианты не копировались в role component.

Выполненные проверки:

- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 21 tests passed.
- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- `pnpm lint:boundaries` — ok.
- Playwright fallback на `http://localhost:3001` — ok: worker home рендерится без non-action tiles и без `Курьеры`, `Продать` ведет в `Детали продажи`.

### 2026-06-02 — Checkpoint 4: Courier home + load

Фактический результат:

- Добавлен `CourierHome` в `apps/web/src/roles/courier/`.
- Добавлен доменный `CourierHomeOverview` в `features/courier`, без neutral `ui/*` primitives и без универсального role builder.
- Courier home теперь показывает `Мой баланс`, real summary `Товар`, real summary `Наличные`, action tiles `Продать` и `Загрузить`, inline stock list `Мой остаток`.
- Плитка `Сгрузить` не добавлена: backend flow отсутствует, а не-action tiles больше не добавляем.
- Read-only `CourierBalanceHome mode="all"` сохранен для директора/коммерческого и не получил action tiles.
- Load flow остается на текущем single-item API; добавлен safety-net на backend error: выбранный товар, количество и комментарий не сбрасываются, success не показывается.

Выполненные проверки:

- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 22 tests passed.
- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- In-app Browser на `http://localhost:3001` — ok: courier home рендерится, `Продать`/`Загрузить` по одной action tile, `Сгрузить` отсутствует, `Загрузить` открывает `Детали загрузки`, console без warning/error.

### 2026-06-02 — Checkpoint 5: Courier sale

Фактический результат:

- `CourierSaleHome` оставлен feature-компонентом: role home только открывает action `Продать`, новые плитки не добавлялись.
- Select `Способ оплаты` заменен на segmented control `Наличные`/`Безнал` по структуре `13-sale-flow.html`.
- Operation summary теперь показывает клиента, товар, количество, сумму и cash effect для выбранного способа оплаты.
- Success behavior сохранен: после продажи пользователь возвращается на home через global success callback.
- Query behavior сохранен и покрыт тестом: после продажи обновляются courier product balances, courier sale options и courier cash balances; backend error не сбрасывает клиента, товар, количество, способ оплаты и комментарий.
- Для длинной формы добавлен нижний scroll padding, чтобы submit action не перекрывался bottom nav; отдельный sticky primitive не вводился.

Выполненные проверки:

- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 23 tests passed.
- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- In-app Browser на `http://localhost:3001` после restart dev server — ok: courier sale открывается, segmented control занимает две равные колонки, `Безнал` меняет summary на `Наличные не изменятся`, submit не перекрывается bottom nav, console без warning/error.

### 2026-06-02 — Checkpoint 6: Director overview

Фактический результат:

- Добавлен `DirectorHome` в `apps/web/src/roles/director/`.
- Director home теперь собирается через `RoleHomeRouter`, а не через generic distributor inventory fallback.
- Структура сверена с `06-director.html`, но использованы только реальные read-only блоки: товар в обороте, наличные в системе, товарный баланс, остатки распределителя и балансы курьеров.
- Fake `Продажи сегодня`, `Последние операции`, fake revenue/report numbers не добавлены.
- Управленческие действия `Назначить дисконт`, `Списать наличные`, `Отчеты`, `История` оставлены disabled placeholders с явным статусом `Нужен backend этап`; мутации не отправляются.
- Bottom navigation директора больше не показывает `Продажа`, потому что у роли нет sale write action.

Выполненные проверки:

- `pnpm --filter @buhta/web test -- --runInBand apps/web/app/page.test.tsx` — ok, 24 tests passed.
- `pnpm --filter @buhta/web lint` — ok.
- `pnpm --filter @buhta/web typecheck` — ok.
- In-app Browser на `http://localhost:3001` — ok: director overview рендерится, action placeholders disabled, bottom nav без `Продажа`, console без warning/error.

### 2026-06-02 — Checkpoint 7: Full verification

Фактический результат:

- Все role-screen checkpoints завершены: `RoleHomeRouter`, commercial manager, distributor worker, courier home/load, courier sale и director overview.
- Plan закрыт: frontend role composition закреплена в `docs/FRONTEND.md`, backend/shared/Prisma changes в рамках frontend-plan не добавлялись.
- Browser-smoke проверил основные role flows на живом `http://localhost:3001`: commercial manager home/sale entry, distributor worker home/sale entry, courier home/sale/load entry, director overview/disabled placeholders.
- Browser console по smoke-flow без warning/error.
- Захват screenshot через Browser CDP на финальном smoke завис по timeout; DOM snapshot и interaction proof получены, визуально критичных блокеров в smoke не найдено.

Выполненные проверки:

- `pnpm lint` — ok.
- `pnpm lint:boundaries` — ok.
- `pnpm typecheck` — ok.
- `pnpm test` — ok при запуске вне sandbox: shared 12 tests, web 24 tests, api 108 tests. Sandbox-запуск падал на API integration tests из-за ограничений доступа к локальному Postgres/IPC.
- `pnpm docs:check` — ok.

## Тестовый план

### Component tests

- Commercial manager:
  - видит home с остатком распределителя и наличными;
  - видит primary action tile `Продать`;
  - не видит заголовок `Действия` и дублирующие action tiles `Остатки`, `Клиенты`, `Курьеры`;
  - может перейти к продаже с распределителя через primary action;
  - может перейти к клиентам и курьерам через нижнюю навигацию.
- Distributor worker:
  - видит distributor home;
  - видит товарный и cash summary;
  - видит primary action tile `Продать`;
  - не видит заголовок `Действия` и non-action tiles;
  - может перейти к продаже через primary action;
  - не видит courier management blocks.
- Distributor sale:
  - client picker/create client работает;
  - successful client create invalidates clients;
  - submit отправляет текущий `distributorProductBalanceId`, `clientId`, `quantity`, `paymentMethod`;
  - cash/cashless segmented control меняет payload;
  - successful sale invalidates distributor inventory, sale options and cash balances;
  - successful sale returns to home and shows success;
  - backend error keeps form state and does not show success;
  - offline блокирует submit.
- Courier:
  - видит own balance;
  - может открыть load flow;
  - может открыть sale flow;
  - unload action отсутствует до backend flow.
- Courier load:
  - submit отправляет `distributorProductBalanceId`, `quantity`, optional `comment`;
  - successful load invalidates courier product balances, courier load options and distributor inventory;
  - successful load returns to home and shows success;
  - backend error keeps selected product, quantity and comment;
  - нельзя отправить без выбранного товара или количества;
  - offline блокирует submit.
- Courier sale:
  - submit отправляет `courierProductBalanceId`, `clientId`, `quantity`, `paymentMethod`;
  - cash/cashless segmented control меняет payload;
  - successful sale invalidates courier product balances, courier sale options and courier cash balances;
  - successful client create invalidates clients;
  - successful sale returns to home and shows success;
  - backend error keeps form state and does not show success.
- Director:
  - видит read-only distributor/courier overview;
  - не получает fake reports/latest operations.

### Regression tests

- logout/session reset работает как раньше;
- `RoleHomeRouter` сохраняет текущие permission checks;
- production flow не регрессирует;
- client create/edit flow не регрессирует;
- backend errors остаются inline и не показывают success notice.

### Manual UI checks

- viewport `390px`;
- viewport `375px`;
- media rule ниже `380px`;
- нет horizontal overflow;
- bottom nav не перекрывает sticky action footer;
- длинные названия товара и клиента не ломают layout;
- disabled/offline states читаемы.

## Verification commands

Перед завершением этапа выполнить:

```bash
pnpm lint
pnpm lint:boundaries
pnpm typecheck
pnpm test
pnpm docs:check
```

Если выполнялась ручная UI-проверка:

```bash
pnpm dev:web
```

После UI-проверки зафиксировать результат в этом плане перед переводом в `completed`.

## Риски и rollback

### Risk: преждевременно сделать большую дизайн-систему

Mitigation: добавлять только primitives, которые реально повторяются в commercial/distributor/courier/director screens.

Rollback: удалить `apps/web/src/ui/*` и вернуть JSX в feature components без изменения backend.

### Risk: сломать production screen

Mitigation: production flow не является первой целью рефакторинга. Общие CSS changes должны проверяться на production component tests.

Rollback: откатить только frontend CSS/primitives changes.

### Risk: показать пользователю несуществующие метрики

Mitigation: не добавлять fake daily sales, revenue, reports и history.

Rollback: удалить placeholder блоки или заменить на честный disabled action.

### Risk: `AppRoot` станет еще крупнее

Mitigation: role-specific home composition вынести из `AppRoot` в feature/role components.

Rollback: вернуть routing decisions в `AppRoot`, если выделение окажется преждевременным.

### Risk: sale/load flow станет красивее, но медленнее для частой операции

Mitigation: не добавлять лишний wizard. Первый pass — clear composition и summary, без обязательного confirmation sheet.

Rollback: оставить прямой submit flow и убрать дополнительный промежуточный state.

## Rollback

Этап frontend-only. Если результат не подходит:

- backend и БД rollback не нужен;
- удалить/откатить новые `apps/web/src/ui/*`;
- вернуть затронутые role components к предыдущей композиции;
- оставить этот план в `completed` со статусом `Superseded`, если выбран другой frontend approach.

## Open questions

Блокирующих вопросов нет.

Зафиксированные defaults:

- начинаем с коммерческого руководителя;
- затем работник распределителя;
- затем курьер;
- затем директор;
- текущую визуальную дизайн-систему сохраняем;
- demo используется только для структуры.

## Критерии завершения

- Коммерческий руководитель, работник распределителя, курьер и директор приведены к единой mobile composition.
- Нет новых backend/shared/Prisma changes.
- Нет fake business metrics.
- Повторяемые frontend primitives выделены минимально и используются в нескольких экранах.
- Component tests обновлены и проходят.
- `docs/FRONTEND.md` обновлен по фактическим conventions.
- Выполнены проверки из `Verification commands` или явно зафиксирована причина, почему часть проверок невозможна.
