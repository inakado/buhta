# UX Hardening

Статус: `Draft`
Дата первого прохода: 2026-06-04

Документ фиксирует найденные UX-пробелы v1 и служит рабочим backlog для полировки интерфейса. Это не source of truth для бизнес-правил: постоянные бизнес-решения остаются в `docs/crm-requirements.md`, frontend conventions — в `docs/FRONTEND.md`, execution plans — в `docs/exec-plans/active/`.

## 1. Методика

Первый проход выполнен по:

- требованиям из `docs/crm-requirements.md`;
- frontend conventions из `docs/FRONTEND.md`;
- текущей v1 roadmap из `docs/exec-plans/active/2026-05-27-v1-roadmap.md`;
- исходникам `apps/web/src/**`, `apps/web/app/globals.css`, `apps/api/src/**`, `packages/shared/src/**`;
- ручной проверке в браузере на `http://localhost:3001` для ролей Директор и Администратор, включая desktop viewport и mobile viewport `390x844`.

Приоритеты:

- `P0` — мешает завершить v1 или ломает критичный учетный сценарий.
- `P1` — ожидаемая v1-вещь для ежедневной работы или контроля, отсутствие приведет к ручной поддержке.
- `P2` — заметное трение, несогласованность или риск ошибки опытного пользователя.
- `P3` — polish, удобство и визуальная доводка.

## 2. Этапы дальнейшего наполнения

1. Роли и навигация: пройти home, нижнюю навигацию, настройки и пустые состояния каждой роли.
2. Частые операции: производство, перемещение, продажа, загрузка курьера, возврат курьера, списание наличных, дисконт, уведомления.
3. Справочники и администрирование: пользователи, роли, клиенты, каталог, архивы, reset password.
4. Контроль и аудит: история операций, отмены/корректировки, отчеты, фильтры, сверка денег и товара.
5. PWA/mobile hardening: installability, offline behavior, scroll/focus, touch targets, long lists, form keyboard behavior.
6. Desktop/tablet hardening: плотные списки, таблицы, отчеты, audit screens, расширенная рабочая область.

## 3. Уже закрытые сильные решения

- Combobox выбора клиента и продукции в продаже открывается по focus и до ввода показывает первые 3 варианта: это снижает пустоту первого жеста.
- Курьерский возврат подставляет весь доступный товар и всю сумму наличных по умолчанию.
- Основные write-действия блокируются offline, а формы показывают inline ошибки.
- Success notices короткие и возвращают пользователя в понятный контекст после частых операций.
- Read-only товарные строки не выглядят как карточки с ложным drill-down.
- Дисконтированный priced stock заметен в остатках и sale product select через иконку и вторичную базовую цену.

## 4. Не считаем проблемами первого прохода

- Вкладка `Аудит` и экран журнала действий уже находятся в разработке, поэтому не учитываются как UX gap этого документа.
- Отмена/корректировка продаж уже ведется отдельным активным планом, поэтому не учитывается как отдельная UX-проблема до завершения текущей реализации.

## 5. Находки

| ID | Приоритет | Зона | Проблема | Ожидаемое поведение | Источник |
| --- | --- | --- | --- | --- | --- |
| UX-001 | P1 | Профиль / auth | Пользователь не может сменить собственный пароль. Сейчас есть только admin reset password и выход. | В `Настройки` добавить смену собственного пароля: текущий пароль, новый пароль, повтор, понятные ошибки, сброс локальной сессии при необходимости. | `apps/web/src/app-shell/RoleHomeRouter.tsx`, `apps/api/src/users/users.service.ts` |
| UX-004 | P1 | Reports / control | Нет отчетов по выручке, движению денег, движению товара и дисконту. Директор и коммерческий руководитель видят балансы, но не видят объяснение изменения. | Добавить v1 reports/audit pack: продажи, cash/cashless, скидки, движения по товару, движения по наличным, фильтры по периоду и роли. | `docs/exec-plans/active/2026-05-27-v1-roadmap.md`, `docs/crm-requirements.md` |
| UX-005 | P2 | Desktop/tablet | На desktop приложение остается в mobile shell шириной около 430px. Для операционных mobile-flow это нормально, но audit/reports/admin на большом экране будут искусственно зажаты. | Оставить mobile shell для ежедневных операций, но для reports/audit/admin списков добавить tablet/desktop layout с широкой таблицей и фильтрами. | `apps/web/app/globals.css` |
| UX-006 | P2 | Админка пользователей | Список пользователей уже длинный, но нет поиска, фильтра по роли, архива/деактивации, копирования логина. Смена роли происходит сразу через select. | Добавить поиск по имени/login, фильтр роли, быстрый copy login, явное подтверждение смены критичной роли или undo/success notice. | `apps/web/src/features/users/AdminUsersHome.tsx` |
| UX-007 | P2 | Клиенты | Экран клиентов использует ручной submit `Найти`, без live/debounced поиска и без очистки активного поиска. В продаже поиск клиента уже работает как combobox. | Привести экран клиентов к быстрому паттерну: live/debounce, кнопка очистки, сохранение списка при пустом фокусе, возможно быстрый copy phone. | `apps/web/src/features/clients/ClientsHome.tsx`, `apps/web/src/features/clients/ClientCombobox.tsx` |
| UX-008 | P2 | Продажа с распределителя | Способ оплаты в продаже с распределителя — обычный select, а у курьера — segmented control с иконками. | Использовать один `PaymentMethodSegmentedControl` для всех sale flows. | `apps/web/src/features/sales/DistributorSaleHome.tsx`, `apps/web/src/features/courier/CourierSaleHome.tsx` |
| UX-009 | P2 | Продажа / загрузка | В sale/load формах disabled submit часто не объясняет причину рядом с кнопкой. Возврат и списание наличных уже показывают block reason. | Вынести общий block reason pattern для write-форм: offline, loading options, не выбран клиент/товар, некорректное количество, нет остатков. | `apps/web/src/features/sales/DistributorSaleHome.tsx`, `apps/web/src/features/courier/CourierSaleHome.tsx`, `apps/web/src/features/courier/CourierLoadHome.tsx` |
| UX-010 | P2 | Загрузка курьера | `CourierLoadOption` содержит `discounted`, но `CourierLoadHome` не передает этот флаг в `OperationProductSelect`, поэтому сниженная цена в загрузке не помечается как в продаже. | Показывать иконку снижения цены в load product select так же, как в sale product select. | `packages/shared/src/courier.ts`, `apps/web/src/features/courier/CourierLoadHome.tsx` |
| UX-011 | P2 | Производство / offline | На главной производства часть write action tiles остается активной offline и блокируется только внутри формы. | Offline-блокировку показывать на первом уровне для всех write action tiles: выпуск, приход сырья, приход тары, передача. | `apps/web/src/features/production/ProductionHomeOverview.tsx` |
| UX-012 | P2 | Директор / наличные | Кнопка `Списать наличные` открывает форму даже при нулевом cash balance; причина появляется только внутри формы. | Если наличных нет, показывать неактивное действие с причиной или компактный read-only state без раскрытия формы. | `apps/web/src/features/distributor/DistributorInventoryHome.tsx` |
| UX-013 | P2 | Long lists / mobile | На mobile viewport длинный список пользователей визуально уходит за нижнюю навигацию; нужно проверить нижний scroll padding для всех длинных экранов. | Единый safe bottom spacer для списков и форм, чтобы последние строки и действия не попадали под bottom nav. | `apps/web/app/globals.css`, `apps/web/src/features/users/AdminUsersHome.tsx` |
| UX-014 | P2 | Director home | Строки `Распределитель` и `Курьеры` выглядят как контрольные контуры, но не ведут во вкладки. Переход доступен только через icon-only bottom nav. | Сделать строки кликабельными или добавить явный affordance перехода, сохранив read-only стиль. | `apps/web/src/roles/director/DirectorHome.tsx` |
| UX-015 | P3 | Login | На экране входа нет подсказки про формат логина и нет recovery path. Для dev это нормально, для v1 внутренней команды могут быть частые ошибки при первом входе. | Добавить аккуратную подсказку `Логин выдает администратор`; recovery не делать публичным, но показать контакт/инструкцию для обращения к администратору. | `apps/web/src/auth/LoginForm.tsx` |
| UX-016 | P3 | Каталог | Создание справочников всегда раскрыто сверху. Для редких admin/director действий это занимает место и отодвигает список. | Рассмотреть раскрытие формы по кнопке `Новый`, как уже сделано в пользователях и клиентах. | `apps/web/src/features/catalog/CatalogHome.tsx` |

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

- общий payment segmented control для продаж;
- общий submit block reason;
- одинаковый discounted marker в sale/load/unload/product lists;
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

### 6.4 Audit, Reports And Corrections

Scope:

- журнал операций;
- отмена продажи отдельной операцией;
- движение товара и денег;
- отчеты по выручке, cash/cashless и дисконту;
- desktop/tablet layout для аналитических экранов.

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
5. Директор: распределитель, дисконт, списание наличных, клиенты, курьеры, отчеты-кандидаты.
6. Администратор: пользователи, каталог, аудит, настройки.

Каждый найденный пункт добавлять в раздел `5. Находки` с приоритетом, источником и ожидаемым поведением.
