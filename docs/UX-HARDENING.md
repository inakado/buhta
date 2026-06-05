# UX Hardening

Статус: `Draft`
Дата первого прохода: 2026-06-04
Дата актуализации: 2026-06-06

Документ фиксирует найденные UX-пробелы v1 и служит рабочим backlog для полировки интерфейса. Это не source of truth для бизнес-правил: постоянные бизнес-решения остаются в `docs/crm-requirements.md`, frontend conventions — в `docs/FRONTEND.md`, execution plans — в `docs/exec-plans/active/`.

## 1. Методика

Первый проход выполнен по:

- требованиям из `docs/crm-requirements.md`;
- frontend conventions из `docs/FRONTEND.md`;
- текущей v1 roadmap из `docs/exec-plans/active/2026-05-27-v1-roadmap.md`;
- исходникам `apps/web/src/**`, `apps/web/app/globals.css`, `apps/api/src/**`, `packages/shared/src/**`;
- ручной проверке в браузере на `http://localhost:3001` для ролей Директор и Администратор, включая desktop viewport и mobile viewport `390x844`.

Актуализация 2026-06-06 выполнена после завершения этапов `Sale Cancellations`, `Operation History`, `Operation History Details` и `Director Money And Production Analytics`. Проверка была документационно-кодовой: roadmap, completed plans, `docs/FRONTEND.md` и релевантные frontend/backend/shared модули. Новый browser smoke в этот проход не выполнялся.

Приоритеты:

- `P0` — мешает завершить v1 или ломает критичный учетный сценарий.
- `P1` — ожидаемая v1-вещь для ежедневной работы или контроля, отсутствие приведет к ручной поддержке.
- `P2` — заметное трение, несогласованность или риск ошибки опытного пользователя.
- `P3` — polish, удобство и визуальная доводка.

## 2. Этапы дальнейшего наполнения

1. Роли и навигация: пройти home, нижнюю навигацию, настройки и пустые состояния каждой роли.
2. Частые операции: производство, перемещение, продажа, загрузка курьера, возврат курьера, списание наличных, дисконт, уведомления.
3. Справочники и администрирование: пользователи, роли, клиенты, каталог, архивы, reset password.
4. Контроль и история: история операций, отмены/корректировки, отчеты, фильтры, сверка денег и товара.
5. PWA/mobile hardening: installability, offline behavior, scroll/focus, touch targets, long lists, form keyboard behavior.
6. Desktop/tablet hardening: плотные списки, таблицы, отчеты, history/control screens, расширенная рабочая область.

## 3. Уже закрытые сильные решения

- Combobox выбора клиента и продукции в продаже открывается по focus и до ввода показывает первые 3 варианта: это снижает пустоту первого жеста.
- Курьерский возврат подставляет весь доступный товар и всю сумму наличных по умолчанию.
- Основные write-действия блокируются offline, а формы показывают inline ошибки.
- Success notices короткие и возвращают пользователя в понятный контекст после частых операций.
- Read-only товарные строки не выглядят как карточки с ложным drill-down.
- Дисконтированный priced stock заметен в остатках и sale product select через иконку и вторичную базовую цену.
- Клиентский combobox и product select используют общий search-combobox каркас: focus открывает первые 3 варианта, выбранное значение очищается одинаково, варианты рендерятся как `listbox/option`.
- Выбранный клиент в sale combobox показывает имя и телефон, чтобы снизить риск ошибки при однофамильцах.
- Продажи с распределителя и курьера используют общий `PaymentMethodSegmentedControl`, без расхождения select vs segmented.
- Product select в продаже и загрузке курьера одинаково показывает маркер сниженной цены.
- Отмена продажи реализована отдельной append-only операцией с обязательной причиной; исходная продажа не редактируется и не удаляется.
- `История операций` для Директора и администратора уже есть: фильтры, backend cursor для следующей страницы, readable summary и details modal без technical ids.
- Details истории операций уже показываются управленческими секциями, а не raw JSON.
- Директорская аналитика уже покрывает первый полезный срез: выручка, отмены, текущие наличные, сырье и выпуск продукции без перегруженных графиков.

## 4. Не считаем проблемами первого прохода

- Сам факт отсутствия вкладки `Аудит` больше не является gap: вместо технического слова `Аудит` реализована управленческая вкладка `История`.
- Сам факт отсутствия отмены продаж больше не является gap: базовая полная отмена продаж завершена. В находках ниже остаются только hardening-вопросы вокруг поиска, глубины истории и discoverability отмен.
- Отдельные ручные корректировки балансов, частичные отмены и исправления исходной продажи не считаем дефектом v1: они явно вынесены за scope завершенного этапа отмен продаж.

## 5. Находки

| ID | Приоритет | Зона | Проблема | Ожидаемое поведение | Источник |
| --- | --- | --- | --- | --- | --- |
| UX-001 | P1 | Профиль / auth | Пользователь не может сменить собственный пароль. Сейчас есть только admin reset password и выход. | В `Настройки` добавить смену собственного пароля: текущий пароль, новый пароль, повтор, понятные ошибки, сброс локальной сессии при необходимости. | `apps/web/src/app-shell/RoleHomeRouter.tsx`, `apps/api/src/users/users.service.ts` |
| UX-004 | P1 | Reports / control | Первый слой контроля закрыт историей операций и директорской аналитикой, но это еще не полноценный отчетный contour для сверки: нет экспорта/печати, discount analytics, сохраненных фильтров, коммерческого среза и быстрого объяснения движения по конкретному товару или клиенту. | Сформировать следующий reports/control pack поверх уже реализованных read models: export/print, скидки, товары/клиенты, cash movement, сохранение периода/фильтров, отдельный коммерческий срез без доступа к директорским данным. | `docs/exec-plans/completed/2026-06-05-operation-history.md`, `docs/exec-plans/completed/2026-06-05-director-money-production-analytics.md`, `docs/crm-requirements.md` |
| UX-005 | P2 | Desktop/tablet | На desktop приложение остается в mobile shell шириной около 430px. Для операционных mobile-flow это нормально, но история, аналитика и админские списки на большом экране будут искусственно зажаты. | Оставить mobile shell для ежедневных операций, но для history/control/admin списков добавить tablet/desktop layout с широкой таблицей и фильтрами. | `apps/web/app/globals.css` |
| UX-006 | P2 | Админка пользователей | Список пользователей уже длинный, но нет поиска, фильтра по роли, архива/деактивации, копирования логина. Смена роли происходит сразу через select. Admin write-действия не получают `online` и визуально доступны offline. | Добавить поиск по имени/login, фильтр роли, быстрый copy login, явное подтверждение смены критичной роли или undo/success notice, offline block reason для создания пользователя, смены роли и сброса пароля. | `apps/web/src/features/users/AdminUsersHome.tsx`, `apps/web/src/app-shell/RoleHomeRouter.tsx` |
| UX-007 | P2 | Клиенты | Экран клиентов использует ручной submit `Найти`, без live/debounced поиска и без очистки активного поиска. В продаже поиск клиента уже работает как combobox. | Привести экран клиентов к быстрому паттерну: live/debounce, кнопка очистки, сохранение списка при пустом фокусе, возможно быстрый copy phone. | `apps/web/src/features/clients/ClientsHome.tsx`, `apps/web/src/features/clients/ClientCombobox.tsx` |
| UX-009 | P2 | Продажа / загрузка | В sale/load формах disabled submit часто не объясняет причину рядом с кнопкой. Возврат и списание наличных уже показывают block reason. | Вынести общий block reason pattern для write-форм: offline, loading options, не выбран клиент/товар, некорректное количество, нет остатков. | `apps/web/src/features/sales/DistributorSaleHome.tsx`, `apps/web/src/features/courier/CourierSaleHome.tsx`, `apps/web/src/features/courier/CourierLoadHome.tsx` |
| UX-011 | P2 | Производство / offline | На главной производства часть write action tiles остается активной offline и блокируется только внутри формы. | Offline-блокировку показывать на первом уровне для всех write action tiles: выпуск, приход сырья, приход тары, передача. | `apps/web/src/features/production/ProductionHomeOverview.tsx` |
| UX-012 | P2 | Директор / наличные | `Списать наличные` показывает понятную причину блокировки внутри формы, но при нулевом cash balance действие все еще можно раскрыть, если есть активный распределитель. | Если наличных нет, показывать неактивное действие с причиной или компактный read-only state без раскрытия формы. | `apps/web/src/features/distributor/DistributorInventoryHome.tsx` |
| UX-013 | P2 | Long lists / mobile | В `screen-stack` уже есть bottom padding, но после появления истории операций, истории продаж, аналитики и длинных админских списков нужен повторный mobile smoke: проверить последние строки, inline-формы отмены, модалки и success notices относительно bottom nav. | Зафиксировать единый safe bottom spacer и browser smoke checklist для всех длинных экранов и форм: пользователи, история операций, история продаж, клиенты, каталог, аналитика. | `apps/web/app/globals.css`, `apps/web/src/features/users/AdminUsersHome.tsx`, `apps/web/src/features/operations/OperationHistoryHome.tsx`, `apps/web/src/features/sales/SalesHistoryHome.tsx` |
| UX-014 | P2 | Director home | Строки `Распределитель` и `Курьеры` выглядят как контрольные контуры, но не ведут во вкладки. Переход доступен только через icon-only bottom nav. | Сделать строки кликабельными или добавить явный affordance перехода, сохранив read-only стиль. | `apps/web/src/roles/director/DirectorHome.tsx` |
| UX-015 | P3 | Login | На экране входа нет подсказки про формат логина и нет recovery path. Для dev это нормально, для v1 внутренней команды могут быть частые ошибки при первом входе. | Добавить аккуратную подсказку `Логин выдает администратор`; recovery не делать публичным, но показать контакт/инструкцию для обращения к администратору. | `apps/web/src/auth/LoginForm.tsx` |
| UX-016 | P3 | Каталог | Создание справочников всегда раскрыто сверху. Для редких admin/director действий это занимает место и отодвигает список. | Рассмотреть раскрытие формы по кнопке `Новый`, как уже сделано в пользователях и клиентах. | `apps/web/src/features/catalog/CatalogHome.tsx` |
| UX-017 | P1 | История операций | Кнопка `Показать еще` использует cursor, но текущий компонент хранит только один `cursor` и показывает `history.data.items` текущего запроса. Для пользователя это выглядит как "показать еще", а фактически может заменить первую страницу следующей. | Сделать append pagination: хранить накопленный список страниц или использовать `useInfiniteQuery`; кнопка должна добавлять операции ниже, а не менять контекст просмотра. | `apps/web/src/features/operations/OperationHistoryHome.tsx` |
| UX-018 | P2 | История операций / фильтры | Фильтры истории живут только в локальном state компонента и сбрасываются при уходе со вкладки. Нет quick presets кроме default 7 дней, нет видимого applied summary, нет deep link/share для расследования. | Сохранять фильтры в URL или local state shell, добавить quick presets `7/30/90`, applied summary и явный `Сбросить` только когда фильтры отличаются от default. | `apps/web/src/features/operations/OperationHistoryHome.tsx` |
| UX-019 | P1 | История продаж / отмена | Отмена продажи доступна только в списке последних 10 продаж. Если ошибочная продажа ушла ниже recent window, пользователь не сможет найти и отменить ее через UI. | Добавить поиск/период/пагинацию в историю продаж или отдельный screen для поиска продажи перед отменой. Минимум: `Показать еще` и фильтр по клиенту/товару. | `apps/web/src/features/sales/SalesHistoryHome.tsx`, `apps/web/src/features/sales/RecentSalesPanel.tsx` |
| UX-020 | P2 | Директор / аналитика | Backend аналитики поддерживает custom `dateFrom/dateTo`, но UI показывает только presets `Сегодня / 7 дней / 30 дней / 90 дней`. Директор не видит точные границы периода и не может собрать отчет за произвольные даты. | Добавить custom period picker, отображение фактических дат периода и retry action при ошибке загрузки. | `apps/web/src/features/analytics/DirectorAnalyticsHome.tsx`, `packages/shared/src/analytics.ts` |
| UX-021 | P2 | История операций / export | Управленческая история уже читаемая, но нет экспорта, печати или копирования операции. Для сверки с бухгалтерией/руководителем придется вручную переписывать строки и детали. | Добавить минимум copy operation summary/details; для v1 polish рассмотреть CSV/XLSX export текущего фильтра и print-friendly view. | `apps/web/src/features/operations/OperationHistoryHome.tsx` |

## 6. Кандидаты на отдельные UX hardening этапы

### 6.1 Auth And Profile Hardening

Scope:

- self-service смена собственного пароля;
- copy login;
- единый профильный блок для всех ролей;
- понятное поведение после смены пароля.

Out of scope:

- публичный reset password;
- email recovery;
- внешние уведомления.

### 6.2 Operational Form Consistency

Scope:

- общий submit block reason;
- одинаковый discounted marker во всех будущих product picker/list расширениях;
- offline-blocking на action tiles до входа в форму.

Out of scope:

- изменение backend-инвариантов;
- новые операции учета.

### 6.3 Admin And Catalog Efficiency

Scope:

- поиск/фильтр пользователей;
- confirmation/undo для смены роли;
- copy login и временного пароля;
- раскрываемые формы создания в каталоге;
- проверка длинных списков на mobile.

Out of scope:

- сложная матрица прав в UI;
- multi-tenant настройки;
- импорт/экспорт пользователей.

### 6.4 History, Analytics And Control Polish

Scope:

- append pagination и сохранение фильтров истории операций;
- поиск старых продаж перед отменой;
- export/print/copy для управленческой истории;
- custom period picker в директорской аналитике;
- discount analytics, cash movement и товарные срезы поверх уже реализованных read models;
- desktop/tablet layout для истории, аналитики и админских списков.

Out of scope:

- себестоимость;
- кассовые интеграции;
- маркетинговые CRM-отчеты.

### 6.5 PWA And Mobile Completion

Scope:

- installability;
- app icon/splash/theme verification;
- offline read-only behavior;
- safe-area и bottom nav overlap;
- keyboard/focus behavior в длинных формах.

Out of scope:

- offline queue для write-операций;
- background sync;
- push notifications как обязательный канал.

## 7. Следующий рекомендуемый проход

Следующий проход лучше делать по ролям:

1. Курьер: home, продажа, загрузка, возврат, профиль, offline.
2. Работник распределителя: home, продажа, клиенты, профиль, offline.
3. Коммерческий руководитель: продажи, остатки, клиенты, задачи производству, курьеры.
4. Заведующий производством: выпуск, приход, передача, уведомления, история.
5. Директор: home, аналитика, распределитель, дисконт, списание наличных, клиенты, курьеры, история операций.
6. Администратор: пользователи, каталог, клиенты, история операций, настройки.

Каждый найденный пункт добавлять в раздел `5. Находки` с приоритетом, источником и ожидаемым поведением.
