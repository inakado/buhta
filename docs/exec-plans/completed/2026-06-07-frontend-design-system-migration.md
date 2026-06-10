# Frontend Design System Migration

Статус: `Completed`
Дата: `2026-06-07`
Дата завершения: `2026-06-10`

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
- `docs/UX-HARDENING.md` - текущий UX backlog для hardening-задач, которые остались за scope visual migration.
- `apps/web/src/app-shell/RoleHomeRouter.tsx` и `apps/web/src/app-shell/AppRoot.tsx` - фактическая карта ролей, табов и условных экранов.

## 5. Карта Экранов И Вариантов

### 5.1 Shell, Auth, Shared System

| Зона | Компоненты | Варианты | Что мигрировать |
| --- | --- | --- | --- |
| App shell | `AppRoot`, `BottomNav`, `LoadingScreen` | auth/loading/authenticated, offline status, success notice | Навигационный стиль не трогать. Проверить только safe bottom spacing, loading, toast и offline surfaces на совместимость с новой плотностью. |
| Login | `LoginForm` | password visible/hidden, pending/error | Привести форму к будущему стандарту form panel/buttons, без изменения auth flow. |
| More / account | role-specific `*MoreHome` components | logout pending, future change-password entry | Profile/logout moved into role-specific `Еще` ledger surfaces. Old generic `SettingsScreen` removed after admin migration. |
| Placeholder | `PlaceholderScreen` | недоступный раздел, будущий раздел | Убрать ощущение декоративной карточки, оставить спокойное пустое состояние. |
| Shared controls | `SegmentedControl`, `PaymentMethodSegmentedControl`, combobox/search components | tabs, payment, client/product search, filters | Унифицировать tabs/segmented vocabulary с директорской главной: active fill, inactive muted surface, компактный шрифт, стабильная высота. |

### 5.2 Директор

| Приоритет | Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- | --- |
| Done | Главная | `home` | `DirectorAnalyticsHome` | Эталон новой системы. Деньги, выпуск, период, вкладки обзор/деньги/производство уже отполированы. |
| Done | Остатки | `stock` | `DirectorStockHome`, `DistributorInventoryHome`, `CourierBalanceHome` | Второй эталон директорского control contour. Внутренние табы, распределитель, курьеры, списание наличных и снижение цены приведены к compact table/panel rhythm без повторов и декоративных карточек. |
| Done | История | `operation-history` | `OperationHistoryHome` | Фильтры вынесены в модалку, верхняя область закреплена, список и details dialog приведены к директорскому compact list/dialog rhythm; технический шум скрыт через presenter, date inputs оставлены платформенными. |
| Done | Еще | `more` | `DirectorMoreHome` | Согласованное меню из двух ledger-блоков: навигация (`Клиенты`, `Справочники`, `Экспорт`) и аккаунт (`Сменить пароль`, `Выйти`). Inline styles убраны, future flows показаны честным non-clickable состоянием. |
| Done | Каталог | `catalog` из more | `CatalogHome` | Директор/admin shared management surface приведен к текущему management rhythm: tabs, compact toolbar, list rows, create/edit/archive dialogs. Дальнейшие refinements считаются shared catalog/admin задачами. |
| Done | Клиенты | `clients` из more | `ClientsHome` | Shared client surface приведен к compact heading/search/list rhythm: счетчик в heading row справа, поиск без отдельной action row, строки с ledger-разделителями и стабильными copy/edit actions. |
| Deferred | Смена пароля / экспорт | `more` future entries | `DirectorMoreHome`, future auth/reports flows | Не блокирует директорский contour: self password change и export/print являются общими cross-role hardening задачами и остаются в `UX-HARDENING`. |

### 5.3 Администратор

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Пользователи | `people` | `AdminHome`, `AdminUsersHome` | Единственный уникальный admin screen. Смысл: увидеть сотрудников, создать сотрудника, сменить роль, сбросить пароль. Нужна миграция к management ledger/dialog standard: create user в modal dialog, reset password в confirm dialog, compact rows, mobile 390+ без сжатия role select/actions. |
| Каталог | `catalog` при `catalog.manage` | `CatalogHome` | Shared with director. Уже мигрирован как compact management surface; admin stage должен только проверить роль/permission context и не делать отдельный дизайн. |
| Клиенты | `clients` при `client.read` | `ClientsHome` | Shared with director/commercial/distributor contexts. Уже мигрирован к clients management standard; admin stage должен оставить общий экран без fork. |
| История операций | `operation-history` | `OperationHistoryHome` | Shared with director. Уже мигрирован: filters dialog, readable details, no raw JSON/technical ids. Для admin нужен только smoke/тестовый контроль входа через nav. |
| Еще / аккаунт | `more` | `AdminMoreHome`, shared account/logout vocabulary | Заменяет старую нижнюю вкладку `Настройки` и `SettingsScreen`: account block, logout row, future `Сменить пароль` как cross-role hardening. |

Impeccable audit 2026-06-10:

| Dimension | Score | Finding |
| --- | --- | --- |
| Accessibility | 3/4 | Form labels and button names mostly present, but inline reset confirmation and settings/logout pattern are weaker than the migrated dialog/account vocabulary. |
| Performance | 4/4 | Users screen is query/form based, no heavy assets or layout effects. |
| Theming | 3/4 | Pre-stage finding: mostly tokenized, but `settings-panel`, old inline create panel and admin-only row classes carried local surface decisions. |
| Responsive Design | 2/4 | Current two-column access rows, role select and inline reset confirmation are vulnerable on 390px widths and long names/logins. |
| Anti-Patterns | 2/4 | No decorative hero/cards, but inline form reveal, inline confirm panel and old settings card break the new management/dialog rhythm. |
| Total | 14/20 | Good enough functionally, but admin remains the last visible role not fully migrated to the new design system. |

Impeccable shape:

- Админский contour is management UI, not operational dashboard. It should feel closer to `Каталог` and `Клиенты`: white ledger panels, compact headings, thin dividers, restrained radii, no summary cards and no fake metrics.
- Unique admin work is `Пользователи`. The user must quickly answer: who has access, what role they have, and what account action is needed.
- Create user should not consume the list surface. Use the already established modal dialog pattern from catalog/client/new-client flows. Keep only existing data: name, optional login, role, temporary password.
- Reset password is a destructive/account action, so use a confirm dialog rather than expanding a second panel inside the row. The temporary password notice stays short, copyable and dismissible.
- Role changes stay visible in the row, but the implementation must handle long role names and narrow width. If a confirmation is added later, it must be a behavior change backed by tests, not just visual polish.
- `Каталог`, `Клиенты` and `История` are already redesigned shared surfaces. Admin must reuse them instead of introducing admin-specific copies.
- Image mock: not required by default. The visual lane is already fixed by existing management surfaces. Optional mock only if the owner wants to choose between row/action layouts for `Пользователи` before implementation.

Admin implementation order:

1. **Пользователи.**
   - Migrate `AdminUsersHome` to the management ledger/dialog standard.
   - Move create user into `operation-dialog` style modal over the users list.
   - Move reset password confirmation into modal dialog; preserve temporary password notice and copy action.
   - Preserve existing backend contracts and user data; do not invent permissions matrix or extra admin analytics.
   - Rewrite targeted admin users tests and remove stale admin-only CSS/classes after usages are gone.
   - Commit after this stage.
   - Status 2026-06-10: complete. `AdminUsersHome` now uses modal create/reset flows, white management access list, temporary password notice and offline blocks for create, role change and reset password. Removed stale inline create/reset CSS hooks.
2. **Shared screens, navigation and account.**
   - Keep `CatalogHome`, `ClientsHome` and `OperationHistoryHome` shared; only update tests/docs if admin navigation or labels change.
   - Replace admin bottom nav `Настройки` with `Еще`.
   - Add admin account surface using the same More/account vocabulary as Director, Production, Commercial, Distributor Worker and Courier.
   - Remove or shrink `SettingsScreen`/settings CSS only after no role route still uses it.
   - Run focused tests plus docs check, update documentation, then commit.
   - Status 2026-06-10: complete. Admin bottom nav now uses `Еще`, `AdminMoreHome` owns the account/logout surface, shared `Каталог` / `Клиенты` / `История` routes stay reused, and old `SettingsScreen` plus settings CSS are removed.

### 5.4 Заведующий Производством

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная производства | `home` | `ProductionHome`, `ProductionHomeOverview` | Следующий stage после директорского contour. Новая IA: только сводка `Продукция / Сырье / Тара` и 4 действия. Сводочные строки открывают полноэкранные списки, а не модалки. Старую lime hero-card, oversized metric и декоративные action tiles убрать. |
| Приход сырья | internal `raw-intake` | `IntakeForm` | Write action screen, не modal. Должен перейти к production form standard: compact form panel, explicit offline/empty/block reasons, no decorative card language. |
| Приход тары | internal `packaging-intake` | `IntakeForm` | Shared intake form variant with the same production form standard. |
| Выпуск партии | internal `batch-release` | `ProductBatchForm` | Write action screen, не modal. Критичная форма для нового production form standard: шаблон, проверяемый блок сырья/тары, quantity, warning, submit block reason. |
| Передача на распределитель | internal `transfer` | `ProductTransferForm` | Write action screen, не modal. Выбор партии в цеху, распределителя, количества и комментария; source row выбранной партии должен быть читаемым ledger-блоком. |
| Остатки сырья | internal `raw-stock` from summary click | `StockListScreen` | Полноэкранный read-only detail screen с `Назад`, не modal. Перейти к table/list rhythm без иконок в каждой строке и без row-cards. |
| Остатки тары | internal `packaging-stock` from summary click | `StockListScreen` | Полноэкранный read-only detail screen с `Назад`, не modal. |
| Продукция в цеху | internal `products` from summary click | `ProductStockScreen`, `WorkshopProductBalanceList` | Полноэкранный read-only detail screen с `Назад`: список выпущенной продукции, которая еще в цеху. На home список не показывать. |
| История выпусков | `more` -> `history` | `ProductionHistory`, `ProductBatchList` | Переехала в `Еще` по аналогии с Директором. Сам экран мигрирован как compact ledger последних выпусков без новых фильтров, если API их не дает. |
| На распределителе | `distributor` | `DistributorInventoryHome` | Read-only inventory variant со сводкой, по аналогии с директорскими остатками, но без cash/discount controls для заведующего при отсутствии прав. |
| Уведомления | `notifications` | `NotificationsHome` | Задачи от коммерческого руководителя: видимый заголовок, default queue `Новые`, вкладка `Выполненные`, task ledger, checkbox completion control; create-form скрыт для заведующего без `notification.create`. |
| Еще | `more` | `ProductionMoreHome`, `ProductionHistory` | Добавлен по аналогии с Director More: блок `Навигация` с `История`, блок `Аккаунт`, logout, future entry `Сменить пароль` как cross-role hardening до реализации auth flow. |
| Профиль / аккаунт | `more` account block | `ProductionMoreHome` | Профильная зона заведующего теперь находится в `Еще`; отдельная нижняя вкладка `Профиль` снята. Self password change остается cross-role hardening, если отдельный auth stage не открыт. |

Status 2026-06-09: role contour complete. Финальный static cleanup не нашел legacy production home/list hooks (`production-workshop-card`, `production-balance-row`, `production-balance-list`, `detail-list-panel`) in app code. Удалены невостребованные local class hooks from migrated screens: `production-notification-screen`, `notification-summary-line`, `notification-row`, `notification-heading`, `production-more-home`, `production-history-home`, `production-inventory-table`. Product marker icon standardized to `BadgeCheck`; remaining `PackageCheck` usage is only courier unload submit icon, not a product marker.

### 5.5 Коммерческий Руководитель

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная продаж | `home` | `CommercialManagerHome`, `DistributorHomeOverview` | Owner-confirmed direction: сводка и действия повторяют production manager home rhythm. Summary shows distributor product total as clickable drilldown; actions include `Продать` and production notify with the same spatial grouping as production actions. |
| Продукция на распределителе | internal drilldown from home summary | `DistributorInventoryHome` / commercial product detail variant | Replaces standalone bottom-nav `Остатки` for commercial manager. Full-screen detail with back navigation, ledger/table rhythm from director and production stock screens, discount affordance by permission, no separate bottom nav item. |
| Продажа | action sets `sale` | `DistributorSaleHome` | Shared distributor sale flow. Не показывается в bottom nav, открывается с home action. Bring to the existing operational form standard after home. |
| Курьеры | `couriers` | `CourierBalanceHome` | Остается в bottom nav by owner decision. Uses director/stock ledger language and commercial permissions. |
| История продаж | `more` -> `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Recent sales, cancellation affordance by permissions. Commercial entry moved into `Еще`; list migrated to compact ledger rhythm. |
| Задачи производству | action/internal entry from home or `more` if needed | `NotificationsHome` | Commercial keeps create form by permission and uses the migrated task ledger standard from production notifications. |
| Клиенты | `clients` | `ClientsHome` | Uses the already established clients management standard, without a fresh redesign. |
| Каталог | `catalog` if allowed | `CatalogHome` | Permission-dependent management surface. |
| Еще / аккаунт | `more` | `CommercialMoreHome` | Same Director/Production More model: navigation (`История`), account block, logout, future `Сменить пароль` as cross-role hardening. |

### 5.6 Работник Распределителя

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Главная распределителя | `home` | `DistributorWorkerHome`, `DistributorHomeOverview` | Migrated to the compact white ledger summary with one primary `Продать` command and visible product list on home. |
| Продукция на главной | lower section on `home` | `DistributorHomeOverview`, `DistributorStockList` | Worker-specific stock list remains visible on home and uses the new ledger/table language. |
| Продажа | action sets `sale` | `DistributorSaleHome` | Shared migrated distributor sale flow with role-specific permissions and tests. |
| История продаж | `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Shared compact sales history with modal cancellation; kept as a bottom-nav item for operational access. |
| Клиенты | `clients` if allowed | `ClientsHome` | Shared migrated clients surface with permission-driven manage actions. |
| Каталог | `catalog` if allowed | `CatalogHome` | Permission-dependent; do not introduce a worker-specific redesign unless permissions expose it. |
| Еще / аккаунт | `more` | `DistributorWorkerMoreHome` | Replaces bottom-nav `Профиль` / `SettingsScreen` with the Director/Production/Commercial `Еще` account pattern; no duplicate `История` entry because history stays in bottom nav. |

### 5.7 Курьер

| Экран | Entry point | Компоненты | Варианты и особенности |
| --- | --- | --- | --- |
| Баланс курьера | `home` | `CourierHome`, `CourierHomeOverview`, `CourierStockList` | Migrated to compact white ledger summary and command actions. Own product list stays visible on the home screen. |
| Продажа | action sets `sale` | `CourierSaleHome` | Same sale form standard as distributor/commercial: client combobox, product select from courier balance, payment segmented, operation total, new client in modal instead of inline nested form. |
| Загрузка | action sets `load` | `CourierLoadHome` | Load from distributor to courier. Align product selection and selected-stock details with the operational form standard. |
| Возврат | action sets `unload` | `CourierUnloadHome` | Return products/cash to distributor. Dense form requiring a cleaner ledger grouping for destination, products, cash and operation total. |
| История продаж | `more` -> `sales-history` | `SalesHistoryHome`, `RecentSalesPanel` | Already migrated shared sales history with courier cancel variant; entry moves into `Еще` like commercial manager. |
| Еще / аккаунт | `more` | `CourierMoreHome`, shared account/logout vocabulary | Replace bottom-nav `Профиль` / `SettingsScreen` with the established More/account pattern and provide the `История` entry. |

## 6. Общие Компонентные Кластеры

Эти компоненты повторяются между ролями и должны мигрировать осторожно, через variant matrix, чтобы не сломать чужой контекст:

- `DistributorInventoryHome`: standalone vs embedded, heading vs hideHeading, cash balance, cash withdrawal, discount assignment, director/commercial/production contexts.
- `CourierBalanceHome`: read-only all-couriers ledger for Director and Commercial; own courier stock is owned by `CourierHomeOverview` / `CourierStockList`.
- `DistributorHomeOverview`: distributor worker home and commercial manager home, shared ledger/command rendering path, optional cash, optional production notify, optional stock list.
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
- `Распределитель` использует white ledger panel: верхняя strip-сводка, full-width `Списать наличные`, таблица с материнской строкой распределителя, отдельными колонками `Наименование / Количество / Итого` и inline action `Снизить`.
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

- 2026-06-08 Director More craft pass: `DirectorMoreHome` переведен на два системных ledger-блока `Навигация` и `Аккаунт`; `Клиенты` и `Справочники` ведут в реальные экраны, `Экспорт` и `Сменить пароль` оставлены как non-clickable будущие entry points до соответствующих flows.
- Rows/account/logout вынесены из inline styles в системные CSS classes будущего settings/menu standard.
- 2026-06-08 Clients polish pass: `ClientsHome` мигрирован как shared management surface для director read-only и manage-ролей.
- 2026-06-08 Catalog interaction pass: `CatalogHome` получил modal create/edit/archive flow на shared `operation-dialog` vocabulary; экран не закрыт до owner visual review и следующих точечных правок.
- 2026-06-08 Catalog polish pass: tabs приведены к текстовому director segmented rhythm, toolbar/list/dialog buttons нормализованы под `management-surface` control tokens; экран закрыт для директорского contour, дальнейшие правки относятся к shared catalog/admin cleanup.
- 2026-06-08 App shell polish pass: постоянная верхняя role label удалена для всех ролей; роль остается в профильных/account местах и истории, а не дублируется над каждым экраном.
- Директорский contour закрыт: `Главная`, `Остатки`, `История`, `Еще`, `Клиенты`, `Справочники`.
- Оставшиеся future entries `Экспорт` и `Сменить пароль` вынесены в cross-role reports/auth hardening и не блокируют закрытие директорских экранов.

### Stage 4. Production Manager Contour

Следующий активный stage после закрытия директорского contour. Цель - пройти экраны заведующего производством целым role contour, не точечно красить отдельные элементы.

Порядок изменений:

1. **Главная производства.**
   - `ProductionHomeOverview` переводится на директорский control language: белая сводка `Продукция / Сырье / Тара`, тонкие ledger-разделители, compact typography, restrained radii.
   - На home остаются только сводка и 4 действия: `Выпустить`, `Передать`, `Добавить сырье`, `Добавить тару`.
   - Сводочные строки кликабельные и открывают внутренние полноэкранные списки. На home не показывать список продукции ниже сводки.
   - Убрать старые `production-workshop-card`, lime hero-card, oversized 42px metric and large decorative action tiles from this screen.
   - Решение после owner review: действия не делать вложенной карточкой и не выделять черной заливкой. Все 4 команды остаются одинаковыми по форме; `Выпустить` / `Передать` отделяются от `Добавить сырье` / `Добавить тару` только пространством и тонким разделителем.
   - Status: implemented. Static legacy scan found no remaining old production home selectors in app code.

2. **Списки из сводки.**
   - `Продукция в цеху`, `Сырье`, `Тара` остаются internal `activeScreen` detail screens с `Назад`, а не modal dialogs.
   - `Продукция в цеху` показывает выпущенную продукцию, которая еще находится в цеху; это отдельный список от экрана `На распределителе`.
   - `Сырье` и `Тара` показывают read-only ledger rows по фактическим остаткам.
   - Убрать row-card treatment and per-row decorative icons; использовать table/list rhythm with thin dividers, tabular numbers and compact empty/loading states.
   - Реализационный стандарт: списки оформляются как директорские stock panels, с заголовком внутри белой панели, тонкими divider rows, без иконок в каждой строке. Повторяющие `Остатки` / `Остаток` убирать; оставлять `Остаток` только там, где это название числового столбца.
   - Status: implemented. Static legacy scan found no remaining `production-balance-row`, `production-balance-list`, or `detail-list-panel` usage in app code.

3. **Action screens производства.**
   - `Выпустить`, `Передать`, `Добавить сырье`, `Добавить тару` остаются полноэкранными internal action screens, не модалками.
   - Перевести `IntakeForm`, `ProductBatchForm`, `ProductTransferForm` на единый production form standard: compact white form panel, readable source/availability blocks, explicit offline/loading/empty/block reasons, stable submit area.
   - Не менять backend contracts and domain invariants; визуальная миграция не должна изменить validation semantics.
   - Терминология action flow: entry, heading and submit label use `Передать`; старые `На распределитель` / `Переместить` не использовать в production action form.
   - Status: implemented. Static legacy scan found no remaining old transfer copy in production form flow.

4. **На распределителе.**
   - `DistributorInventoryHome` для заведующего мигрировать как read-only stock surface со сводкой по директорскому stock ledger standard.
   - Проверить production props/permissions: no cash/discount actions unless role permissions explicitly allow them.
   - Реализационный стандарт: production-вариант использует `stock-ledger` surface, белую сводку `Количество / Продукция`, таблицу `Наименование / Количество / Итого` и grouping rows вместо отдельных aggregate cards. Количество позиций показывается в meta шапки таблицы, но не дублируется в верхнем heading.
   - Status: implemented for production manager. Cash/discount controls are not passed into the production route; distributor aggregate cards are hidden in the `stock-ledger` variant.

5. **Уведомления.**
   - `NotificationsHome` для заведующего оформить как task ledger от коммерческого руководителя: visible heading, summary `Новые / Выполнено`, rows with completion action.
   - Create form не показывать для заведующего без `notification.create`; не оставлять пустой верхний form gap.
   - Проверить badge count in bottom nav and polling state text.
   - Реализационный стандарт: видимый heading `Задачи производству`, default filter `Новые`, completed tasks hidden from the main queue and available through `Выполненные`, white task ledger rows with thin dividers, status badge in meta and checkbox completion control. Старый плоский balance-row treatment для задач не использовать.
   - Status: implemented. Production manager sees read/complete task ledger only; commercial manager keeps create form by permission.

6. **Еще, история, аккаунт.**
	- Добавить production `Еще` по аналогии с Director More: блок `Навигация` с переходом в `История`, блок `Аккаунт`, logout, future `Сменить пароль`.
	- `История выпусков` переезжает из нижней навигации в `Еще` and migrates to compact ledger list. Не добавлять фильтры или отчеты без API/read model.
	- `Сменить пароль` остается cross-role auth hardening entry until that stage is opened.
	- Status: implemented. Production `Еще` uses Director More menu vocabulary with `Навигация` -> `История`, `Аккаунт`, disabled `Сменить пароль`, and logout. `История выпусков` removed from bottom navigation, stays reachable through `Еще`, and keeps director `OperationHistoryHome` visual rhythm: compact topbar, `operation-history-body`, ledger rows, no filters and no details modal.

Stage checks:

- Done: targeted tests cover new production IA: summary clicks, detail screens, action screen entry points, updated bottom nav / `Еще`, hidden notification create form for production manager, completed notification queue and production history via `Еще`.
- Done: production CSS/code cleanup after migration; static `rg` confirms no remaining old production hero/list hooks in app code and no stale notification hooks.
- Done: `docs/FRONTEND.md` updated with the completed production contour, notification checkbox flow, `Еще` account/history model, `BadgeCheck` product marker and production `stock-ledger` distributor variant.

### Stage 5. Commercial Manager Contour

Owner-confirmed direction for commercial manager:

1. **Главная `Продажи`.**
   - Use the production manager home pattern as the reference: white summary surface, thin ledger separators, compact screen heading, restrained radii, same action spacing.
   - Summary keeps only data the current screen already owns. Distributor product total is the primary drilldown to the product list.
   - Action block follows production action layout. `Продать` is the main frequent action, production notify is secondary but still visible and easy to find.
   - Status: implemented. Commercial home now uses a white `Распределитель` ledger summary, production-style command buttons, no lime commercial hero card, and no `Остатки` bottom-nav item.

2. **Продукция на распределителе from summary click.**
   - Remove `Остатки` as a standalone bottom nav screen for commercial manager.
   - Clicking the product summary on home opens a full-screen product list, not a modal. This follows the production manager inventory detail pattern and keeps long stock tables readable on 390px+ widths.
   - Use director/production stock ledger rules: visible column headers, product name remains primary, price and quantity do not collapse into ambiguous text.
   - No separate image mock needed if the implementation reuses the established stock/list rhythm.
   - Status: implemented. Route opens from home summary with `Назад`, `stock-ledger` table, no duplicated overview strip, and the same narrow-width table rules as production detail screens.

3. **Продажа.**
   - Migrate `DistributorSaleHome` to the standard operational form language already set by production action forms.
   - Preserve existing business fields and validation. Do not invent new sale data or reporting.
   - Payment controls, product select, client combobox and submit action must match the shared selector/form standard.
   - Status: implemented. Distributor sale now uses production-style detail screen, white action form panels, ledger rows for selected stock and sale summary, scoped form spacing for client combobox/payment/nested client creation, and keeps the same validation/API contract.

4. **Клиенты.**
   - Keep the existing clients workflow and permissions.
   - Apply the established management/list visual standard only where current UI still uses old cards, weak buttons or inconsistent spacing.
   - Status: implemented. Commercial and director now share the compact clients list/search surface; commercial-only create/edit actions open `operation-dialog` over the list, preserve search context, keep copy/edit row actions, and retain inline backend errors.

5. **Курьеры.**
   - Keep `Курьеры` in bottom navigation.
   - Align list and balance rows to the director stock/courier ledger language.
   - Preserve current data model and avoid decorative summaries that duplicate table data.
   - Status: implemented. Commercial `Курьеры` now uses the shared `courier-ledger-surface`/`director-stock` owner-detail ledger variant: white summary, global `Курьер / Остаток / Наличные` head, no per-courier `Всего продукции` footer, and the same narrow-screen column rules as Director stock couriers.

6. **История продаж.**
   - Use the director history visual rhythm: compact heading, ledger rows, quiet meta, no decorative cards.
   - Commercial has less detail than director history, so do not add filters, drilldowns or analytics without existing data/API support.
   - Status: implemented. `SalesHistoryHome` now uses a `sales-history-home` compact ledger surface, `RecentSalesPanel` renders rows with thin ledger separators instead of decorative cards, cancellation opens in the shared `operation-dialog` modal pattern, and commercial opens history from `Еще → История`.

7. **Задачи производству.**
   - Reuse the production notification task ledger standard.
   - Commercial keeps the create form where permission allows it; completed/new states should remain consistent with the production screen.
   - Status: implemented. Commercial create form now uses the operational form standard with visible `Новая задача`, explicit `Что передать производству`, character count, `Отправить задачу`, and a segmented `Новые / Выполненные` queue switch shared with the production task ledger.

8. **Еще / аккаунт.**
   - Replace the old profile/settings entry with `Еще`, following Director/Production More.
   - Account block, logout and future `Сменить пароль` stay cross-role consistent.
   - Secondary links should not duplicate bottom nav items. Since `Курьеры` stays in nav, `Еще` is account-focused unless a non-primary commercial entry needs a home.
   - Status: implemented. Commercial bottom nav now uses `Главная`, `Клиенты`, `Курьеры`, `Еще`; `CommercialMoreHome` follows the shared Director/Production menu pattern with `Навигация → История`, account identity, disabled `Сменить пароль`, and logout.

Stage checks:

- Done: bottom nav tests cover the commercial contour with `Остатки` removed, `Курьеры` retained and `Еще` present.
- Done: home summary drilldown, sale flow, clients, courier balances, production tasks and sales history via `Еще` stay covered in targeted web tests.
- Done: commercial CSS/code cleanup after migration; static scan found no remaining old commercial hero/card hooks (`commercial-hero*`, `commercial-card*`, `summary-card`, `unavailable-action`, `notice-card`, `edit-card`, `catalog-form-group`, `form-warning`) in app code. Remaining apparent unused `rdp-*` selectors are DayPicker runtime classes and are intentionally kept.
- Done: `docs/FRONTEND.md` updated with the current commercial sales-history/More IA and the management form pattern after removing stale `edit-card` wording.

Status 2026-06-09: commercial manager contour complete. The active commercial surface is `Главная`, `Продукция` drilldown, `Продажа`, `Клиенты`, `Курьеры`, `Задачи производству`, `История продаж` through `Еще`, and account/logout through `Еще`; no separate commercial `Остатки`, bottom-nav `История`, or bottom-nav `Профиль` remains.

### Stage 6. Работник Распределителя

Owner-confirmed shape:

- Migrate by analogy with the completed commercial and production-manager standards.
- Keep `История` as a direct bottom-nav item for operational access.
- Move account/logout from bottom-nav `Профиль` to `Еще`.
- Keep product stock visible on the worker home; do not hide it behind the commercial drilldown pattern.
- Do not add fake sales metrics, decorative statistics or data without an existing read model.
- Commit after every stage below.

1. **Главная распределителя.**
   - Replace the old compact balance/action card home with a white ledger summary matching commercial/production surfaces.
   - Show compact centered horizontal `Продукция`, `Стоимость` and optional `Наличные`, without a repeated inner summary heading or helper meta labels.
   - Keep one clear primary command action: `Продать`.
   - Keep the product list visible below the action block, because this role needs stock visibility on the first screen.
   - Rewrite targeted tests that currently assert the old action-card behavior.
   - Commit after implementation, tests, cleanup and docs update.
   - Status: implemented. Worker home now uses the compact centered horizontal white ledger summary and primary `production-command-button` sale action while keeping the product list visible on the main screen.

2. **Продукция на главной.**
   - Polish the inline product list that remains on the worker home.
   - Reuse the existing distributor stock ledger/table language: clear heading, table meta and visible columns on narrow screens.
   - Reduce repeated words where possible without removing necessary table headers.
   - Commit after implementation, tests, cleanup and docs update.
   - Status: implemented. The inline product list now uses a worker-home white ledger surface, keeps table columns visible on narrow screens and hides repeated distributor names inside rows.

3. **Продажа.**
   - Audit the worker entry into shared `DistributorSaleHome`.
   - Keep the commercial sale form standard and only adjust worker-specific navigation or permission expectations if needed.
   - Do not redesign the form unless the audit finds worker-only regressions.
   - Commit after targeted tests and any necessary cleanup/docs update.
   - Status: audited. Worker enters the already migrated shared `DistributorSaleHome` through the home `Продать` action; no worker-only visual, navigation or permission regressions found. Existing targeted web coverage verifies the worker sale entry and the shared distributor sale flow with client modal, product select, payment and submit behavior.

4. **История продаж.**
   - Confirm the worker uses the already migrated `SalesHistoryHome` / `RecentSalesPanel` compact ledger.
   - Keep it in bottom nav rather than moving it into `Еще`.
   - Fix only worker-specific copy, navigation state or tests if needed.
   - Commit after targeted tests and any necessary cleanup/docs update.
   - Status: implemented. Worker keeps direct bottom-nav `История` and routes to the already migrated shared `SalesHistoryHome` / `RecentSalesPanel` compact ledger with modal cancellation; targeted coverage now verifies the worker-specific navigation state and return path back to the home sale action.

5. **Клиенты.**
   - Confirm the worker uses the already migrated `ClientsHome` standard.
   - Keep additional client actions permission-driven; do not add a worker-specific variant without a permission/API reason.
   - Commit after targeted tests and any necessary cleanup/docs update.
   - Status: implemented. Worker opens the shared migrated `ClientsHome` from the bottom nav; the surface keeps the same compact heading, live search, ledger list and `operation-dialog` create/edit flow, with manage actions shown only through existing `client.manage` permission.

6. **Еще / аккаунт.**
   - Replace bottom-nav `Профиль` and generic `SettingsScreen` for this role with `Еще`.
   - Follow Director/Production/Commercial More: account identity, disabled `Сменить пароль` as cross-role hardening, quiet logout row.
   - Do not duplicate `История` inside `Еще` while it remains a direct bottom-nav item.
   - Commit after implementation, tests, cleanup and docs update.
   - Status: implemented. Distributor worker bottom nav now uses `Главная`, `Клиенты`, `История`, `Еще`; `DistributorWorkerMoreHome` keeps an account-only More screen with identity, disabled `Сменить пароль` and quiet logout, while `История` and `Клиенты` remain direct bottom-nav entries.

7. **Final worker cleanup.**
   - Search for stale distributor-worker uses of old card/action/settings classes after the staged work.
   - Remove unused CSS/code that becomes unreachable.
   - Update `docs/FRONTEND.md` and this plan with the final worker contour.
   - Commit the final cleanup separately.
   - Status: complete. Search confirmed worker no longer routes to bottom-nav `Профиль` / `SettingsScreen` and no worker-specific old card/action code remains reachable. Later main-role cleanup removed the remaining old action-card and compact-balance code/CSS; admin migration removed the final generic `SettingsScreen` route. `docs/FRONTEND.md` and this plan now describe the final worker contour.

### Stage 7. Курьер

Impeccable audit summary:

- Score: 13/20. The courier contour is functionally complete and mostly uses shared data/form primitives, but the home and return flow still carry old visual language.
- Accessibility: 3/4. Forms have explicit labels and actions are buttons, but old action tiles and dense return rows make hierarchy and state reading weaker than the migrated screens.
- Performance: 4/4. No heavy assets or unnecessary visual effects were found; the role uses existing query hooks and shared read models.
- Theming: 2/4. The old compact balance overview, old action tiles and muted sentence-style stock details do not match the new white ledger system.
- Responsive: 2/4. The shared stock list is already close to the new standard, but the home action group and `CourierUnloadHome` need a 390px-first layout pass.
- Anti-patterns: 2/4. Remaining issues are old card-like action surfaces, inline new-client expansion inside the sale form and overly dense return form composition.

Impeccable shape:

- Courier home is an operational balance screen, not an analytics dashboard. The user must immediately see what is physically with them, how much cash they have, and which action to take.
- Unlike commercial/production drilldowns, courier product stock must remain visible on the home screen because it is the courier's current working inventory.
- The visual language should follow the completed distributor worker/commercial/production standards: white panels, thin ledger separators, compact typography, restrained radii, no decorative metrics and no data invented for symmetry.
- Actions should use the established command-button vocabulary. `Продать` is the primary action; `Загрузить` and `Вернуть` are secondary operational actions separated by spacing and order, not by aggressive color.
- Operational forms should converge on one standard: sectioned form panel, combobox/select primitives, segmented payment where relevant, quiet selected-stock rows and one clear submit area.
- Do not start code implementation until the owner confirms the shape and requested mocks.

Screens, variations and meaning:

| Screen | Meaning | Main variations |
| --- | --- | --- |
| Баланс курьера | Understand current courier stock and cash; start sale, load or return. | Loading, empty stock, non-empty stock, disabled actions while offline, long product names, large money values. |
| Продажа | Record a courier sale from own stock. | Existing/new client, no client, product selected/not selected, cash/cashless, insufficient quantity, offline/backend error, success. |
| Загрузка | Accept products from distributor into courier balance. | Product selected/not selected, discounted product marker, unavailable quantity, offline/backend error, success. |
| Возврат | Return products and/or cash to distributor. | One/multiple distributor options, default full return, product-only return, cash-only return, invalid quantity/cash, no active distributor, no payload, success/error. |
| История продаж | Review courier sales and cancel permitted sales. | Empty/list, cancelled sale, cancel modal, disabled cancel reason, shared courier variant; opened from `Еще`. |
| Еще / аккаунт | Navigate to sales history, see account identity, logout and future password change entry. | Navigation block with `История`, account identity, disabled password entry, logout. |

Problems to remove:

- Old home shell: compact balance overview, old rounded action tiles and card-like action grid are inconsistent with completed role screens.
- Product summary wording can be confusing because the home currently mixes product value, cash and product list without the same ledger hierarchy as newer screens.
- `CourierSaleHome` still opens the new-client form inline; it should use the existing `operation-dialog` modal pattern from distributor sale and clients.
- `CourierLoadHome` and `CourierSaleHome` use muted helper sentences for selected stock; migrated forms should show selected facts as compact ledger rows.
- `CourierUnloadHome` is the densest old surface: destination, product quantities, cash return and submit reason need clearer grouping and spacing.
- Bottom-nav `Профиль` / generic `SettingsScreen` was legacy for migrated roles; courier should move to `Еще`.

Already migrated overlaps:

- `CourierStockList` already uses the shared stock-table direction with `Наименование`, `Количество`, `Итого`.
- `SalesHistoryHome` and `RecentSalesPanel` already carry the new compact history/cancel-modal standard.
- `ClientCombobox`, `OperationProductSelect` and `PaymentMethodSegmentedControl` are shared with migrated sale flows.
- Read-only `CourierBalanceHome` variants for director/commercial are already migrated; use them as a reference, not as the courier home replacement because courier needs own stock visible on the first screen.
- `ClientsHome` and More/account vocabulary are already established by director, production, commercial and distributor-worker contours.

Image mock requirements:

- Required before implementation unless owner confirms direct reuse of the established worker/commercial pattern: **Баланс курьера**. The home needs confirmation for the action hierarchy (`Продать`, `Загрузить`, `Вернуть`) while keeping the product list visible.
- Required before implementation: **Возврат**. The return form has the most layout risk because it combines destination, product quantities and cash in one operation.
- Not required by default: **Продажа**, **Загрузка**, **История продаж**, **Еще**. These should copy already approved patterns unless owner feedback changes the composition.

Implementation stages:

1. **Баланс курьера.**
   - Replace old summary/actions with a compact white ledger home.
   - Keep the product list visible below the command actions.
   - Make `Продать` primary and keep `Загрузить` / `Вернуть` visually discoverable without colored cards.
   - Update targeted tests, cleanup stale home CSS and docs.
   - Commit after implementation.
   - Status: implemented. Courier home now uses the same compact white ledger and command-button vocabulary as the migrated worker/commercial screens: `Продукция`, `Стоимость`, `Наличные`, primary `Продать`, secondary `Загрузить` / `Вернуть`, and a visible product ledger surface on the first screen.

2. **Продажа.**
   - Align `CourierSaleHome` with the migrated distributor/commercial sale form.
   - Move new-client creation into `operation-dialog` with backdrop.
   - Keep existing data, validations and invalidation behavior.
   - Update targeted tests, cleanup stale inline nested form code and docs.
   - Commit after implementation.
   - Status: implemented. Courier sale now uses `production-detail-screen` / `production-action-form`, opens `Новый клиент` in `operation-dialog`, shows selected stock facts as ledger rows and keeps courier sale API, validations and query invalidation unchanged.

3. **Загрузка.**
   - Align `CourierLoadHome` with the operational form standard.
   - Replace sentence-style selected-stock details with compact ledger facts.
   - Preserve product options, quantity rules and success behavior.
   - Update targeted tests, cleanup stale form styles and docs.
   - Commit after implementation.
   - Status: implemented. Courier load now uses `production-detail-screen` / `production-action-form`, selected-stock facts and operation totals are compact ledger rows, and the existing load API, validation and query invalidation behavior is unchanged.

4. **Возврат.**
   - Use the approved mock to rebuild `CourierUnloadHome` around destination, products, cash and operation total.
   - Keep default full quantities/cash behavior and validation rules.
   - Make disabled submit reasons readable without adding extra data.
   - Update targeted tests, cleanup stale unload row styles and docs.
   - Commit after implementation.
   - Status: implemented. Courier unload now uses separate `production-action-form` panels for destination, products, cash and totals while default full return, product/cash-only payloads, validation and query invalidation stay unchanged.

5. **История продаж.**
   - Confirm courier still uses the migrated shared history and cancel modal.
   - Move the courier history entry from bottom nav into `Еще`, keeping `Еще` active while history is open.
   - Fix only courier-specific copy, nav state or tests if audit finds drift.
   - Commit after targeted verification and docs update if anything changes.
   - Status: implemented. Courier sales history still uses shared `SalesHistoryHome` / `RecentSalesPanel` and the cancel modal, but the entry now lives under `Еще → История`; bottom-nav `История` is removed for the courier.

6. **Еще / аккаунт.**
   - Replace bottom-nav `Профиль` with `Еще`.
   - Follow the shared account screen: identity, disabled `Сменить пароль`, quiet logout.
   - Include `История` as the navigation row because it no longer stays direct in bottom nav.
   - Update navigation tests, cleanup settings usage and docs.
   - Commit after implementation.
   - Status: implemented. Courier bottom nav now uses `Баланс` and `Еще`; `CourierMoreHome` follows the shared Director/Production/Commercial account pattern with `Навигация → История`, identity, disabled `Сменить пароль` and quiet logout.

7. **Final courier cleanup.**
   - Search for stale courier uses of old card/action/settings classes.
   - Remove unreachable CSS/code only after usages are gone.
   - Update `docs/FRONTEND.md` and this plan with the final courier contour.
   - Commit final cleanup separately.
   - Status: complete. Courier no longer routes to bottom-nav `Профиль` / `SettingsScreen`; own courier balance uses `CourierHomeOverview`, while read-only all-couriers balances use the simplified `CourierBalanceHome`. Main-role cleanup removed old balance row, action-card, compact-balance and inline nested form CSS/code.

### Stage 8. Shared Stock Surfaces Across Roles

- После production `На распределителе` аккуратно распространить тот же stock/list/table standard на:
  - коммерческий product drilldown from home summary;
  - курьерские `Балансы курьеров`;
  - own courier balance.
- Проверить все prop variants: `embedded`, `hideHeading`, `mode`, `showCashBalance`, `canAssignDiscount`, `canWithdrawCash`.
- Status 2026-06-10: complete. Commercial drilldown, director/commercial courier balances, own courier home and admin shared read-only routes use the migrated stock/list/table standards. `CourierBalanceHome` is intentionally read-only all-couriers only; own courier stock is owned by `CourierHomeOverview` / `CourierStockList`.

### Stage 9. Remaining Role Home Overview Screens

- После `ProductionHomeOverview` пересобрать `DistributorHomeOverview` and `CourierHomeOverview`.
- Убрать старый декоративный card language там, где экран должен быть рабочим control surface.
- Стандартизировать action blocks: иконка, label, disabled/offline reason, compact spacing.
- Не дублировать данные из нижней навигации или соседних экранов.
- Status 2026-06-10: complete. `DistributorHomeOverview` now has only the migrated ledger/command rendering path, and `CourierHomeOverview` owns the courier's first-screen balance/product list.

### Stage 10. Remaining Operational Forms

- После production form standard привести к нему оставшиеся operational forms:
  - `DistributorSaleHome`;
  - `CourierSaleHome`;
  - `CourierLoadHome`;
  - `CourierUnloadHome`.
- Сохранить быстрый ввод, block reasons и online-only behavior.
- Payment segmented, product select and client combobox должны визуально совпадать с новым selector standard.
- Status 2026-06-10: complete for main roles. Distributor sale, courier sale, courier load and courier unload use the operational form standard; removed stale inline nested form and old operation total CSS.

### Stage 11. Histories, Lists And Management Surfaces

- Мигрировать `SalesHistoryHome`, `RecentSalesPanel`, `OperationHistoryHome` shared states not already covered by director/production passes.
- Мигрировать `AdminUsersHome`, remaining shared `CatalogHome`, `ClientsHome`, `NotificationsHome` states.
- Для long lists проверить bottom spacing and row density.
- Не делать строки карточками, если они read-only and non-drilldown.
- Status 2026-06-10: complete for Director, Production, Commercial, Distributor Worker, Courier and Admin surfaces. Admin users and admin `Еще`/account are migrated; shared `CatalogHome`, `ClientsHome`, `NotificationsHome`, `OperationHistoryHome` and sales history surfaces keep the completed compact management/ledger standards.

### Stage 12. Documentation And CSS Cleanup

- После каждого устойчивого pattern обновлять `DESIGN.md` или `docs/FRONTEND.md`.
- Удалять старые selectors только после того, как не осталось usages.
- Запретить новые локальные tokens без причины: radius, font size, shadow, gradient, card treatment.
- Финально пройти `globals.css` на legacy classes, duplicates and dead design rules.
- Status 2026-06-10: complete. Removed unreachable compact-balance, action grid, action-card, flat balance row, inline nested form, settings screen and old settings CSS/code paths. Final static scan found no active usages of old `SettingsScreen`, action-card/compact-balance or production legacy selectors in app code, and `globals.css` has no obvious dead project selectors beyond runtime library classes.

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

- Когда именно выделять shared `ActionBlock`/`CommandStrip`: после production home and production action screens, если pattern подтвердится на 2-3 экранах.
- Нужна ли отдельная tablet/desktop initiative сразу после history/control cleanup, или сначала завершить mobile visual migration.
- Нужен ли production-specific `More` component или достаточно расширить общий settings/menu vocabulary после Director More.

## 13. Definition Of Done Для Инициативы

- Все экраны из раздела 5 прошли migration или имеют явный deferred reason.
- `DESIGN.md` и `docs/FRONTEND.md` описывают новую систему без старых placeholder-правил.
- В `globals.css` не осталось очевидных legacy декоративных tokens/classes без usages or documented exception.
- Shared controls имеют единый visual language: tabs, segmented controls, buttons, action blocks, form panels, tables/lists.
- Director home, stock and history form a coherent director control contour.
- Остальные роли используют ту же систему, но сохраняют свои операционные особенности.
- Финальные проверки пройдены and documented before moving this plan to `completed`.

## 14. Completion Notes

Инициатива завершена 2026-06-10. Миграция охватила Директора, заведующего производством, коммерческого руководителя, работника распределителя, курьера и администратора. Активный frontend теперь строится вокруг белых панелей, тонких ledger-разделителей, compact typography, restrained radii, rows over decorative cards, shared operational forms, modal create/confirm flows and role-specific `Еще` account surfaces.

Не вошли в эту инициативу и остаются в `docs/UX-HARDENING.md`: self password change, export/print/report hardening, desktop/tablet expansion, deeper admin user search/filtering and history/sales pagination improvements.

Final cleanup:

- Static scan found no active app-code usages of `SettingsScreen`, `settings-panel`, `settings-row`, `danger-button`, `action-card`, `action-grid`, `compact-balance`, old production balance/detail list hooks or old commercial card hooks.
- CSS selector scan found no obvious dead project selectors in `apps/web/app/globals.css`; apparent external/runtime selectors such as DayPicker classes remain intentional.
- Untracked `.impeccable/critique/...` and `.playwright-cli/` artifacts were left untouched.

Final verification:

- `pnpm --filter @buhta/web test -- page.test.tsx`
- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/web lint`
- `pnpm docs:check`
