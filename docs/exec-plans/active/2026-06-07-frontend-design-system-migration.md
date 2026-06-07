# Frontend Design System Migration

Статус: `Active`
Дата: `2026-06-07`

## 1. Цель

Перевести весь frontend «Бухты» на новую визуальную систему, зафиксированную после extraction главной страницы Директора.

Главная Директора считается эталоном для контрольных и отчетных экранов: плотная мобильная поверхность, белые панели, тонкие ledger-разделители, компактная типографика, restrained radii, табличные данные, фирменный зеленый только как акцент состояния или активного выбора. Старые декоративные карточки, oversized metrics, случайные radius/spacing values, fake statuses и данные ради данных должны быть постепенно удалены.

Инициатива также должна сформировать общие стандарты для экранов, которые еще не доведены: action blocks, компактные кнопки, формы, списки, фильтры, селекторы и role-specific command areas. Навигационный стиль нижней навигации не является целью переработки.

## 2. Scope

- Полный frontend inventory по ролям, экранам и вариантам использования общих компонентов.
- Порядок миграции экранов от директорского контура к остальным ролям.
- Правила, как переносить новые стили в общую систему без перемешивания со старым UI.
- План документационной фиксации: `DESIGN.md`, `docs/FRONTEND.md`, `docs/UX-HARDENING.md` и завершенные stage plans.
- Targeted frontend verification per stage: typecheck, lint, component tests, docs check. Визуальные проверки через браузер выполнять только по отдельному запросу владельца продукта.

## 3. Out Of Scope

- Изменение доменной логики, денег, остатков, прав и API-контрактов.
- Редизайн нижней навигации и app shell navigation style.
- Desktop/tablet re-layout как отдельная широкая версия. Этот план может подготовить плотные контрольные поверхности, но полноценный desktop contour остается отдельной инициативой.
- Новые отчеты, новые read models и новые бизнес-метрики, если они нужны только для заполнения экрана.
- Подключение чужого visual kit или theme library. Radix используется только как поведенческий primitive, визуальная оболочка остается нашей.

## 4. Источники И Решения

- `apps/web/src/features/analytics/DirectorAnalyticsHome.tsx` - эталонный директорский control surface.
- `apps/web/app/globals.css` - текущая CSS-система и место будущей очистки старых selectors.
- `DESIGN.md` - visual source of truth для Impeccable design system.
- `docs/FRONTEND.md` - frontend conventions и правила PWA/mobile flows.
- `docs/UX-HARDENING.md` - текущий UX backlog, включая `UX-007 Visual system cleanup`.
- `apps/web/src/app-shell/RoleHomeRouter.tsx` и `apps/web/src/app-shell/AppRoot.tsx` - фактическая карта ролей, табов и условных экранов.

## 5. Карта Экранов И Вариантов

### 5.1 Shell, Auth, Shared System

| Зона | Компоненты | Варианты | Что мигрировать |
| --- | --- | --- | --- |
| App shell | `AppRoot`, `BottomNav`, `LoadingScreen` | auth/loading/authenticated, offline status, success notice | Навигационный стиль не трогать. Проверить только safe bottom spacing, loading, toast и offline surfaces на совместимость с новой плотностью. |
| Login | `LoginForm` | password visible/hidden, pending/error | Привести форму к будущему стандарту form panel/buttons, без изменения auth flow. |
| Settings | `SettingsScreen` в `RoleHomeRouter` | все роли, logout pending | Сделать профильный блок частью будущего стандарта settings/action rows. |
| Placeholder | `PlaceholderScreen` | недоступный раздел, будущий раздел | Убрать ощущение декоративной карточки, оставить спокойное пустое состояние. |
| Shared controls | `SegmentedControl`, `PaymentMethodSegmentedControl`, combobox/search components | tabs, payment, client/product search, filters | Унифицировать tabs/segmented vocabulary с директорской главной: active fill, inactive muted surface, компактный шрифт, стабильная высота. |

### 5.2 Директор

| Приоритет | Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- | --- |
| Done | Главная | `home` | `DirectorAnalyticsHome` | Эталон новой системы. Деньги, выпуск, период, вкладки обзор/деньги/производство уже отполированы. |
| Done | Остатки | `stock` | `DirectorStockHome`, `DistributorInventoryHome`, `CourierBalanceHome` | Второй эталон директорского control contour. Внутренние табы, распределитель, курьеры, списание наличных и снижение цены приведены к compact table/panel rhythm без повторов и декоративных карточек. |
| Done | История | `operation-history` | `OperationHistoryHome` | Фильтры вынесены в модалку, верхняя область закреплена, список и details dialog приведены к директорскому compact list/dialog rhythm; технический шум скрыт через presenter, date inputs оставлены платформенными. |
| 2 | Еще | `more` | `DirectorMoreHome` | Меню `Каталог`, `Клиенты`, `Настройки`, account/logout panel. Сейчас есть inline styles, их надо убрать в системные classes. |
| In progress | Каталог | `catalog` из more | `CatalogHome` | Директор/admin shared management surface. Create/edit/archive переведены в modal rhythm; экран остается активным до owner visual pass и следующих правок. |
| Done | Клиенты | `clients` из more | `ClientsHome` | Shared client surface приведен к compact heading/search/list rhythm: счетчик в heading row справа, поиск без отдельной action row, строки с ledger-разделителями и стабильными copy/edit actions. |
| 4 | Настройки | `settings` из more | `SettingsScreen` | Не должен спорить с директорским `Еще` и общим profile standard. |

### 5.3 Администратор

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Пользователи | `people` | `AdminHome`, `AdminUsersHome` | User list, create user, role select, reset password confirm, access list. Требует management surface cleanup и будущего стандарта admin rows. |
| Каталог | `catalog` при `catalog.manage` | `CatalogHome` | Shared with director. Мигрировать один раз как общий справочник. |
| Клиенты | `clients` при `client.read` | `ClientsHome` | Shared with director/commercial contexts. |
| История операций | `operation-history` | `OperationHistoryHome` | Shared with director, но role context admin. |
| Настройки | `settings` | `SettingsScreen` | Общий profile/settings pattern. |

### 5.4 Заведующий Производством

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная производства | `home` | `ProductionHome`, `ProductionHomeOverview` | Summary цеха, сырье, тара, action tiles. Сейчас отдельный visual language, его нужно привести к новой системе без потери operational speed. |
| Приход сырья | internal `raw-intake` | `IntakeForm` | Write form, offline disabled, empty active types. |
| Приход тары | internal `packaging-intake` | `IntakeForm` | Shared form variant. |
| Выпуск партии | internal `batch-release` | `ProductBatchForm` | Сырье, тара, количество, optional writeoff, warning. Критичная форма для новой form standard. |
| Передача на распределитель | internal `transfer` | `ProductTransferForm` | Выбор распределителя, продукции, количество, комментарий. |
| Остатки сырья | internal `raw-stock` | `StockListScreen` | Read-only detail list. Должен перейти к table/list rhythm. |
| Остатки тары | internal `packaging-stock` | `StockListScreen` | Read-only detail list. |
| Продукция в цеху | internal `products` | `ProductStockScreen`, `WorkshopProductBalanceList` | Read-only product table. |
| История выпусков | `history` | `ProductionHistory`, `ProductBatchList` | Production bottom nav tab. Сейчас `history` проходит через `ProductionHome`. |
| На распределителе | `distributor` | `DistributorInventoryHome` | Read-only inventory variant, optional cash balance by permission. Shared stock surface. |
| Уведомления | `notifications` | `NotificationsHome` | Notification list and actions. |
| Профиль | `settings` | `SettingsScreen` | Общий settings pattern. |

### 5.5 Коммерческий Руководитель

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная продаж | `home` | `CommercialManagerHome`, `DistributorHomeOverview` | `summaryLayout="commercial"`, action `Продать`, optional production notify, cash balance by permission. |
| Продажа | action sets `sale` | `DistributorSaleHome` | Shared distributor sale flow. Не показывается в bottom nav, открывается с home action. |
| Остатки распределителя | `distributor` | `DistributorInventoryHome` | Can assign discount by permission, optional cash balance. Shared with director stock but standalone heading. |
| Курьеры | `couriers` | `CourierBalanceHome mode="all"` | Shared with director stock/couriers. |
| История продаж | `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Recent sales, cancellation affordance by permissions. Требует history/list cleanup separately from operation history. |
| Задачи производству | `notifications` when available | `NotificationsHome` | Notify production and list states. |
| Клиенты | `clients` | `ClientsHome` | Likely manage/read variant by permissions. |
| Каталог | `catalog` if allowed | `CatalogHome` | Permission-dependent management surface. |
| Профиль | `settings` | `SettingsScreen` | Общий settings pattern. |

### 5.6 Работник Распределителя

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная распределителя | `home` | `DistributorWorkerHome`, `DistributorHomeOverview` | Default summary, product/cash overview, action `Продать`, optional product list. |
| Продажа | action sets `sale` | `DistributorSaleHome` | Same sale flow as commercial manager, but role permissions differ. |
| История продаж | `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Shared sales history. |
| Клиенты | `clients` if allowed | `ClientsHome` | Permission-dependent. |
| Каталог | `catalog` if allowed | `CatalogHome` | Permission-dependent. |
| Профиль | `settings` | `SettingsScreen` | Общий settings pattern. |

### 5.7 Курьер

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Баланс курьера | `home` | `CourierHome`, `CourierHomeOverview` | Product/cash overview, action tiles `Продать`, `Загрузить`, `Вернуть`, own product list. |
| Продажа | action sets `sale` | `CourierSaleHome` | Client combobox, product select from courier balance, payment segmented, operation total. |
| Загрузка | action sets `load` | `CourierLoadHome` | Load from distributor to courier. Shared product select/list patterns. |
| Возврат | action sets `unload` | `CourierUnloadHome` | Return products/cash to distributor, default full quantities, submit block reason. |
| История продаж | `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Shared sales history, courier variant. |
| Профиль | `settings` | `SettingsScreen` | Общий settings pattern. |

## 6. Общие Компонентные Кластеры

Эти компоненты повторяются между ролями и должны мигрировать осторожно, через variant matrix, чтобы не сломать чужой контекст:

- `DistributorInventoryHome`: standalone vs embedded, heading vs hideHeading, cash balance, cash withdrawal, discount assignment, director/commercial/production contexts.
- `CourierBalanceHome`: own vs all couriers, standalone vs embedded, cash panel, grouped courier cards, product tables.
- `DistributorHomeOverview`: distributor worker home and commercial manager home, different summary layout, optional cash, optional production notify, optional stock list.
- `SalesHistoryHome` and `RecentSalesPanel`: shared sales history and cancellation flow for distributor/courier/commercial contexts.
- `OperationHistoryHome`: director/admin history, filters, pagination, modal details.
- `CatalogHome`, `ClientsHome`, `AdminUsersHome`: management surfaces with lists, forms, actions, dialogs and confirmations.
- Operational forms: distributor sale, courier sale, courier load, courier unload, production intake, production release, production transfer.
- Search and segmented primitives: `ClientCombobox`, `OperationProductSelect`, `SearchCombobox`, `PaymentMethodSegmentedControl`, `SegmentedControl`.

## 7. Impeccable Pipeline Для Миграции Экрана

Этот pipeline нужен, чтобы каждый следующий экран переделывался одинаково дисциплинированно: анализ, смысловое упрощение, композиция, слова, реализация, проверка соответствия эталону и извлечение стандартов. Цель - не перебирать варианты, а быстро приводить экран к новой системе через gates.

### 7.1 Базовый Screen Pass

Для каждого экрана или кластера экранов выполняется короткий screen pass:

1. **Цель и вход.** Зафиксировать route/tab, component files, role variants, permissions и shared props. Источник истины - `RoleHomeRouter`, затем сами feature-компоненты.
2. **Доменный смысл.** Выписать, что пользователь реально должен понять или сделать на этом экране. Деньги, остатки, выпуск, история и write-действия не смешивать ради заполнения поверхности.
3. **Матрица состояний.** Loading, empty, error, offline, permission denied/read-only, long names, large money values, large quantities, narrow width.
4. **Сопоставление с эталоном.** Назвать ближайший уже принятый pattern: главная Директора, director table panel, money split card, production strip, segmented tabs, management rows, form panel или action block.
5. **Решение по миграции.** Решить: это перенос в уже существующий pattern, новый local pattern или candidate for extraction.

### 7.2 Команды `$impeccable` По Ролям В Pipeline

| Шаг | Команда | Когда применять | Выход |
| --- | --- | --- | --- |
| 1 | `$impeccable shape <screen>` | Новый или неоднозначный экран, либо когда меняется IA/topology, а не только стили. | Confirmed screen brief: назначение, главное действие, что показываем, что не показываем, states, constraints. |
| 2 | `$impeccable distill <screen>` | Почти всегда перед кодом, особенно если экран повторяет данные, содержит лишние карточки, статусы, планы или decorative metrics. | Список того, что удалить, объединить, спрятать, оставить главным. |
| 3 | `$impeccable clarify <screen>` | Когда есть labels, tabs, кнопки, ошибки, empty states, финансовые/складские термины. | Словарь экрана: точные названия, button labels, error/success text, единые nouns. |
| 4 | `$impeccable craft <screen>` | Только для крупного rebuild/new flow после confirmed brief and direction. Не использовать для мелких polish-правок. | Production implementation через gated flow. |
| 5 | `$impeccable polish <screen>` | Основной рабочий режим для миграции существующего экрана к эталону. | Scoped UI/code changes, alignment with `DESIGN.md`, no new arbitrary tokens. |
| 6 | `$impeccable harden <screen>` | После визуального приведения, когда нужно проверить реальные данные: длинные названия, большие суммы, пустые списки, ошибки, offline. | Edge-case fixes without changing domain behavior. |
| 7 | `$impeccable audit <screen>` | Для технической проверки a11y/performance/responsive/anti-patterns. Не заменяет дизайн-оценку. | Audit report and targeted fixes. |
| 8 | `$impeccable critique <screen>` | Только для спорных, крупных или деградировавших экранов, где нужен отдельный critique artifact. | Design report с приоритетами. Browser/detector steps запускать только если это явно разрешено для данного прохода. |
| 9 | `$impeccable extract <pattern>` | После того как pattern повторился на 2-3 экранах с тем же intent. | Обновленные tokens/components/docs и migration path. |

Дополнительные команды (`layout`, `typeset`, `adapt`, `colorize`, `quieter`) использовать не как обязательные этапы, а как точечные инструменты, если проблема явно названа: spacing, typography, narrow widths, цветовая перегрузка, aggressive style.

### 7.3 Mock Strategy Без Перебора

Моки нужны не для каждого экрана. Они применяются как инструмент решения, когда меняется структура или экран визуально неочевиден.

- **Перенос в директорский стандарт:** мок не нужен. Достаточно screen pass, distill/clarify и polish.
- **Новая topology или тяжелый shared component:** один compact code-native mock или один structural sketch в плане/чате. Цель - утвердить composition, not pixels.
- **Неоднозначный flagship screen:** `$impeccable shape` может дать 2-3 direction probes, но только после discovery и только если существующий director standard не отвечает на вопрос.
- **Без variant shopping:** если экран уже имеет очевидный эталон, не генерировать варианты ради выбора. Сравнивать с принятым эталоном и править расхождения.
- **Approved mock contract:** мок фиксирует composition, hierarchy, density and signature moves. Копировать fake data, декоративные детали и accidental text из мока нельзя.

### 7.4 Gates

Каждый stage проходит gates. Для мелких polish-задач часть gates может быть compact, но порядок сохраняется.

1. **Analysis Gate:** экран, роли, состояния, данные и проблемы понятны.
2. **Distill Gate:** решено, что убрать, что объединить, что не повторять.
3. **Words Gate:** названия вкладок, блоков, кнопок, ошибок и empty states соответствуют домену.
4. **Composition Gate:** выбран эталон или утвержден mock/structural sketch.
5. **Implementation Gate:** scoped code/CSS changes, no unrelated refactor.
6. **Consistency Gate:** сравнение с уже завершенными экранами и `DESIGN.md`.
7. **Extraction Gate:** если pattern повторился, обновить `DESIGN.md`/`docs/FRONTEND.md` или отложить с явной причиной.
8. **Owner Review Gate:** владелец продукта проверяет визуально. Автоматические screenshot/browser checks не запускать без отдельного запроса.

### 7.5 Browser Policy

Браузер не является постоянным gate для каждой правки интерфейса. Владелец продукта сам делает основной визуальный контроль и дает точечные замечания.

Разрешенные browser checks:

- **Первичная оценка текущего состояния:** перед крупной переработкой экрана можно один раз открыть экран в браузере, чтобы понять реальную структуру, плотность, явные переполнения и расхождение с эталоном. Это не постоянная проверка после каждой мелкой правки.
- **Постройка или сверка нового мока:** если stage требует mock/structural sketch, можно использовать браузер для первичной оценки текущей версии и для подготовки нового варианта.
- **Отдельный запрос владельца продукта:** если пользователь явно попросил визуальную проверку, screenshot, browser QA или сравнение viewport, тогда браузерный проход выполняется в рамках этого запроса.

Запрещено по умолчанию:

- запускать browser screenshot/QA после каждой polish-правки;
- считать browser check обязательным для style port из уже принятого директорского стандарта;
- заменять owner visual review автоматической проверкой;
- запускать `$impeccable critique` с browser/detector частью без явного разрешения для конкретного прохода.

Обычный цикл после кодовой правки: code/CSS review, typecheck/lint/tests/docs check, затем owner visual review.

### 7.6 Screen Migration Note

Для каждого крупного экрана в stage plan, commit summary or docs update фиксировать короткую note:

- Target: route/tab and component files.
- Role variants: roles, permissions, props.
- Purpose: что экран должен дать пользователю.
- Removed: какие повторы, карточки, статусы, labels, fake metrics or decorative constructs убраны.
- Kept: какие business facts and actions остались.
- Pattern used: director table panel, segmented tabs, action block, form panel, management list, etc.
- Words changed: ключевые labels/buttons/errors.
- Extracted or deferred: что стало стандартом, что оставлено local.
- Checks: typecheck, lint, tests, docs check, owner visual review status.

## 8. Миграционная Стратегия

### Stage 0. Foundation And Inventory

- Зафиксировать этот plan как активный coordination document.
- Не менять navigation style.
- Перед каждым stage читать только затронутые компоненты, selectors и документы.
- Для каждого экрана заводить короткий локальный checklist: role, entry point, props/permissions, empty/loading/error/offline states, long data values.
- Все новые или обновленные styles мапить на `DESIGN.md`: font scale, line color, radii, tabs, buttons, spacing, table/list rhythm.

### Stage 1. Director Stock, completed 2026-06-07

- `DirectorStockHome` переведен на тот же fixed topbar + embedded segmented treatment, что и главная Директора: заголовок и внутренние табы не исчезают при прокрутке body.
- `Распределитель` использует white ledger panel: верхняя strip-сводка, full-width `Списать наличные`, таблица с материнской строкой распределителя, отдельными колонками `Продукция / Количество / Итого` и inline action `Снизить`.
- Снижение цены открывается в modal dialog с overlay, click outside отменяет действие; форма и кнопки приведены к compact director style.
- `Курьеры` использует один read-only courier ledger: глобальная шапка `Курьер / Остаток / Наличные`, материнские строки курьеров и облегченные товарные detail rows без повторных labels.
- Убраны визуальные повторы, декоративные summary cards, лишние local class hooks и director-only table-head selectors, которые больше не используются.
- Browser QA не запускался по policy этого плана; owner visual review выполняется вручную владельцем продукта.

### Stage 2. Director Operation History, completed 2026-06-08

- 2026-06-08 polish pass: кнопка `Фильтры` открывает Radix Dialog поверх экрана, верхняя область `Истории` закреплена как на директорских экранах с табами, а details dialog переведен на общий `operation-dialog` vocabulary с compact summary/details sections.
- Список, pagination button и details rows приведены к dense list/control rhythm без декоративных карточек.
- Управленческая читаемость details сохранена: raw JSON, technical ids и внутренние ключи не возвращаются в UI.
- Период в фильтрах оставлен на платформенных date inputs после owner review: отдельный календарный компонент для этого места не вводится.

### Stage 3. Director More And Secondary Director Screens

- Убрать inline styles из `DirectorMoreHome`.
- Сделать rows/account/logout частью будущего settings/menu standard.
- 2026-06-08 Clients polish pass: `ClientsHome` мигрирован как shared management surface для director read-only и manage-ролей.
- 2026-06-08 Catalog interaction pass: `CatalogHome` получил modal create/edit/archive flow на shared `operation-dialog` vocabulary; экран не закрыт до owner visual review и следующих точечных правок.
- 2026-06-08 Catalog polish pass: tabs приведены к текстовому director segmented rhythm, toolbar/list/dialog buttons нормализованы под `management-surface` control tokens; экран остается активным.
- Оставшиеся задачи stage: `DirectorMoreHome` и продолжение polish `CatalogHome`.

### Stage 4. Shared Stock Surfaces Across Roles

- После директорских остатков аккуратно распространить тот же stock/list/table standard на:
  - коммерческий `Остатки`;
  - production `На распределителе`;
  - курьерские `Балансы курьеров`;
  - own courier balance.
- Проверить все prop variants: `embedded`, `hideHeading`, `mode`, `showCashBalance`, `canAssignDiscount`, `canWithdrawCash`.

### Stage 5. Role Home Overview Screens

- Пересобрать `DistributorHomeOverview`, `CourierHomeOverview`, `ProductionHomeOverview`.
- Убрать старый декоративный card language там, где экран должен быть рабочим control surface.
- Стандартизировать action blocks: иконка, label, disabled/offline reason, compact spacing.
- Не дублировать данные из нижней навигации или соседних экранов.

### Stage 6. Operational Forms

- Привести к одному form standard:
  - `DistributorSaleHome`;
  - `CourierSaleHome`;
  - `CourierLoadHome`;
  - `CourierUnloadHome`;
  - production intake/release/transfer forms.
- Сохранить быстрый ввод, block reasons и online-only behavior.
- Payment segmented, product select and client combobox должны визуально совпадать с новым selector standard.

### Stage 7. Histories, Lists And Management Surfaces

- Мигрировать `SalesHistoryHome`, `RecentSalesPanel`, `OperationHistoryHome` shared states.
- Мигрировать `AdminUsersHome`, `CatalogHome`, `ClientsHome`, `NotificationsHome`.
- Для long lists проверить bottom spacing and row density.
- Не делать строки карточками, если они read-only and non-drilldown.

### Stage 8. Documentation And CSS Cleanup

- После каждого устойчивого pattern обновлять `DESIGN.md` или `docs/FRONTEND.md`.
- Удалять старые selectors только после того, как не осталось usages.
- Запретить новые локальные tokens без причины: radius, font size, shadow, gradient, card treatment.
- Финально пройти `globals.css` на legacy classes, duplicates and dead design rules.

## 9. Implementation Protocol Для Каждого Stage

1. Считать фактический экран из `RoleHomeRouter`/component props, не по названию в навигации.
2. Выписать варианты состояния: loading, empty, error, offline, permission, long text, long money, narrow width.
3. Пройти Impeccable pipeline из раздела 7 в compact/full форме по масштабу задачи.
4. Обновить компонент и CSS минимально нужным scope.
5. Если pattern повторяется второй раз, вынести или документировать стандарт.
6. Обновить docs вместе с кодом, если stage меняет visual/system rule.
7. Запустить релевантные проверки.
8. Передать владельцу продукта на ручную визуальную проверку. Browser screenshot/QA не запускать без отдельного запроса, кроме случаев из Browser Policy.

## 10. Тестовый План

Минимум для каждого кодового stage:

- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/web lint`
- targeted component tests for changed screen, если они есть или добавляются
- `pnpm docs:check`

Дополнительно по необходимости:

- `pnpm --filter @buhta/web test -- <screen-or-feature>`
- API tests only when stage touches contracts or behavior.
- Manual owner visual review on target viewport set.
- Browser check only for initial assessment/mock work or when explicitly requested.

## 11. Риски И Rollback

- Shared component leakage: один компонент обслуживает несколько ролей. Митигация: перед правкой фиксировать variant matrix and props.
- Style mixing: старые cards и новые director panels могут жить рядом. Митигация: мигрировать экраны целыми смысловыми кластерами, не точечно красить отдельные элементы.
- Over-abstraction: premature shared primitive может законсервировать плохой pattern. Митигация: extract after repetition, as documented in `DESIGN.md`.
- Behavioral regression during visual cleanup. Митигация: не менять API/domain logic в visual stages, запускать targeted tests.
- Long numeric values and narrow widths. Митигация: проектировать под сотни тысяч рублей, длинные названия продукции, 320-390px widths, tabular numbers and nowrap only where safe.

Rollback:

- Каждый stage должен быть отдельным commit or tightly scoped diff.
- Если общий selector ломает другую роль, откатить shared selector and restore local scoped styles before reattempt.
- Если новый primitive плохо подходит второму экрану, оставить local variant and document why extraction postponed.

## 12. Открытые Вопросы

- Когда именно выделять shared `ActionBlock`/`CommandStrip`: после директорских остатков или после первых operational forms.
- Нужна ли отдельная tablet/desktop initiative сразу после history/control cleanup, или сначала завершить mobile visual migration.
- Какие management screens владелец продукта считает приоритетными после директорского контура: admin users, catalog, clients or production operations.

## 13. Definition Of Done Для Инициативы

- Все экраны из раздела 5 прошли migration или имеют явный deferred reason.
- `DESIGN.md` и `docs/FRONTEND.md` описывают новую систему без старых placeholder-правил.
- В `globals.css` не осталось очевидных legacy декоративных tokens/classes без usages or documented exception.
- Shared controls имеют единый visual language: tabs, segmented controls, buttons, action blocks, form panels, tables/lists.
- Director home, stock and history form a coherent director control contour.
- Остальные роли используют ту же систему, но сохраняют свои операционные особенности.
- Финальные проверки пройдены and documented before moving this plan to `completed`.
