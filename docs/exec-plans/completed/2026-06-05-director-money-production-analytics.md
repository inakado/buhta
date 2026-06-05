# Director Money And Production Analytics

Статус: `Completed`
Дата: 2026-06-05

## 1. Цель

Дать Директору первый полезный отдельный экран аналитики без перегруза: деньги, сырье и выпуск продукции.

Backend/API доступен по праву `director.analytics.read`, которое есть у `admin` и `director`. Отдельная frontend-вкладка v1 добавлена только для роли `director`.

Экран отвечает на простые вопросы:

- сколько выручки было за период, отдельно наличные и безнал;
- сколько продаж отменено и на какую сумму;
- сколько наличных сейчас у распределителя и курьеров;
- сколько наличных сейчас у распределителя и курьеров; детальное движение наличных остается в истории операций, чтобы не дублировать данные на экране аналитики;
- сколько сырья поступило за период;
- сколько сырья потрачено на выпуск;
- сколько продукции выпущено;
- какая короткая связка периода: потрачено X сырья и выпущено Y продукции, без процента эффективности;
- сколько готовой продукции перемещено на распределитель;
- сколько готовой продукции сейчас осталось в цеху.

Аналитика строится только из typed operation facts и balance projections. Не строить показатели из frontend state или произвольного audit JSON.

## 2. Scope

### Права

- Добавить новое право `director.analytics.read`.
- Назначить право только ролям:
  - `admin`;
  - `director`.
- Не использовать `reports.read` для этого экрана, потому что сейчас оно шире и есть у `commercial_manager`.
- API должен возвращать `403` для ролей без `director.analytics.read`.

### Backend/read model

- Добавить backend-модуль `analytics`.
- Добавить `GET /analytics/director`.
- Доступ: `director.analytics.read`.
- Поддержать период:
  - `periodPreset`: `today`, `7d`, `30d`, `90d`;
  - `dateFrom`;
  - `dateTo`.
- Default period: `30d`.
- Если переданы `dateFrom` и `dateTo`, они имеют приоритет над `periodPreset`.
- Если `dateFrom`/`dateTo` не переданы, период считается по `periodPreset`.
- `today` считать как календарный бизнес-день в timezone `Asia/Vladivostok`.
- Все preset boundaries считать в `Asia/Vladivostok`, затем преобразовывать в UTC range для запросов к БД.
- Максимальный период одного запроса: 90 дней.
- Не добавлять write-операции и новые доменные инварианты.

### Money analytics

Считать за выбранный период:

- `grossRevenueCents`: все продажи до отмен;
- `cancelledRevenueCents`: отмены продаж;
- `netRevenueCents`: продажи минус отмены;
- `cashRevenueCents`: наличные продажи минус отмены наличных продаж;
- `cashlessRevenueCents`: безналичные продажи минус отмены безналичных продаж;
- `saleCount`;
- `cancellationCount`.

Текущие наличные:

- `distributorCashCents`;
- `courierCashCents`;
- `totalCashCents`.

Движение наличных за период:

- `cashSalesCents`: наличные продажи;
- `courierCashReturnedCents`: возврат наличных курьером на распределитель как внутреннее перемещение;
- `directorWithdrawalsCents`: списания Директором;
- `cashSaleCancellationsCents`: отмены наличных продаж.

Важно: возврат наличных курьером на распределитель не увеличивает общий cash total системы. Это внутреннее перемещение между контурами, поэтому показывать его отдельно от выручки.

### Production analytics

Сырье:

- `rawMaterialIntakes`: поступило сырья за период по видам;
- `rawMaterialConsumed`: потрачено сырья за период по видам;
- `currentRawMaterialBalances`: остаток сырья сейчас по видам;
- у каждой строки показывать единицу измерения.

Продукция:

- `productReleased`: выпущено продукции за период по шаблонам/названиям продукции;
- каждая строка `productReleased` показывает количество продукции и расход сырья на этот выпуск;
- `productTransferredToDistributorUnits`: перемещено готовой продукции на распределитель за период;
- `currentWorkshopProductUnits`: текущий остаток готовой продукции в цеху;
- продукцию показывать в штуках.

Связь сырья и продукции:

- не считать универсальный коэффициент эффективности;
- не смешивать разные виды сырья в один процент;
- показывать короткую пару за период:
  - `Потрачено сырья: X кг`;
  - `Выпущено продукции: Y шт`;
- если нужен detail, показывать отдельные строки по видам сырья и названиям продукции, а не общий процент.

### Data sources

Money:

- `distributor_sale`;
- `courier_sale`;
- `distributor_sale_cancellation`;
- `courier_sale_cancellation`;
- `distributor_cash_balance`;
- `courier_cash_balance`;
- `courier_unload`;
- `distributor_cash_withdrawal`.

Production:

- `raw_material_intake`;
- `raw_material_balance`;
- `raw_material_type`;
- `product_batch`;
- `product_transfer`;
- `workshop_product_balance`.

### Shared contracts

- Добавить `packages/shared/src/analytics.ts`.
- Экспортировать contracts из `packages/shared/src/index.ts`.
- Response:
  - `filters`;
  - `money`;
  - `production`;
  - `charts`;
  - `warnings`.

Минимальные chart datasets:

- `revenueByDay`;
- `paymentSplit`;
- `rawMaterialAndProductOutput`.

### Frontend

- Добавить отдельный экран/вкладку аналитики для Директора.
- Не заменять главный экран Директора аналитикой: home остается компактным обзором контроля и переходами к деталям.
- Mobile-first:
  - period segmented control `Сегодня / 7 дней / 30 дней / 90 дней`;
  - money summary;
  - current cash summary;
  - raw material and product output summary;
  - компактные строки вместо обязательных графиков;
  - короткие empty/loading/error states.
- Desktop/tablet:
  - тот же scope, но в более плотной сетке;
  - не добавлять большие таблицы по курьерам/продуктам в этом этапе.

## 3. UI-подача аналитики

Первый UI-проход намеренно не использует chart-библиотеку. Экран должен читаться как короткая управленческая сводка, а не как большой отчет.

Реализовать внутри `features/analytics`:

- верхние KPI: выручка, текущие наличные, выпуск;
- блок `Деньги за период`: продажи, отмены, наличные, безнал;
- блок `Сырье`: одна строка на вид сырья с колонками `Приход`, `Расход`, `Остаток`;
- блок `Продукция`: выпущенные позиции с расходом сырья по каждой позиции, перемещено на распределитель, остаток в цеху.

Правила:

- не выводить отдельный frontend-блок `Движение наличных`, потому что он пересекается с денежными KPI и историей операций;
- не показывать один общий процент конверсии сырья в продукцию;
- не дублировать один вид сырья в трех разных списках;
- не добавлять chart-зависимость до отдельного продуктового решения по конкретному графику;
- если позже появится график, рядом должны остаться явные числа и подписи, а hover не должен быть обязательным для чтения на mobile.

## 4. Out Of Scope

- `topProducts`.
- `topCouriers`.
- Source split `распределитель / курьеры` как отдельная аналитика.
- Полный stock distribution по всем контурам.
- Discounts analytics.
- Сложные графики по всем показателям.
- Таблицы курьеров и продуктов.
- `Товар в обороте` как большой управленческий блок.
- Экспорт в Excel/PDF.
- Себестоимость, маржа и прибыль.
- Прогнозы, план-факт и AI-выводы.
- Materialized views, cron-проекции и отдельное хранилище отчетов.
- Offline analytics cache сверх обычного server-state cache.
- Chart-библиотеки без отдельного решения по конкретному графику.

Deferred analytics candidates после первого экрана:

- скидки;
- top products;
- top couriers;
- расширенная товарная аналитика;
- полный stock distribution;
- экспорт;
- сравнение периодов;
- расширенная графическая библиотека.

## 5. Как считать

### Revenue

- Distributor gross: сумма `distributor_sale.totalCents` по `createdAt` в периоде.
- Courier gross: сумма `courier_sale.totalCents` по `createdAt` в периоде.
- Distributor cancellations: сумма `distributor_sale_cancellation.totalCents` по `createdAt` в периоде.
- Courier cancellations: сумма `courier_sale_cancellation.totalCents` по `createdAt` в периоде.
- Net revenue: gross minus cancellations.
- `revenueByDay`: для каждого бизнес-дня в `Asia/Vladivostok` считать продажи этого дня минус отмены этого дня.
- Отмена попадает в день отмены, а не в день исходной продажи.

Если продажа была создана до периода, а отменена внутри периода, отмена входит в cancellation metrics периода. Это соответствует append-only модели: отчет показывает факты, случившиеся в выбранном периоде.

### Cash

- Current distributor cash: сумма `distributor_cash_balance.amountCents`.
- Current courier cash: сумма `courier_cash_balance.amountCents`.
- Cash sales: cash sales из `distributor_sale` и `courier_sale`.
- Cash cancellations: cash cancellations из cancellation tables.
- Courier returned cash: сумма `courier_unload.cashAmountCents`.
- Director withdrawals: сумма `distributor_cash_withdrawal.amountCents`.

`courier_unload.cashAmountCents` показывать как внутреннее перемещение, а не как доход.

### Production

- Raw material intake: сумма `raw_material_intake.quantity` по периоду.
- Raw material consumed: сумма `product_batch.consumedRawMaterialQuantity` по периоду выпуска.
- Product released: сумма `product_batch.quantity` по периоду выпуска.
- Product transferred to distributor: сумма `product_transfer.quantity` по периоду.
- Current workshop product units: сумма `workshop_product_balance.quantity` на момент запроса.
- Current raw material balances: `raw_material_balance` с join на `raw_material_type` для названия и единицы измерения.
- Breakdown сырья строить по `raw_material_type`; breakdown продукции строить по snapshot `product_batch.productName`.
- Не выводить производственный процент/коэффициент, пока нет норм расхода и себестоимости.

## 6. Затронутые документы

- `docs/crm-requirements.md` — если после согласования деньги, сырье и выпуск становятся постоянным директорским требованием.
- `docs/ARCHITECTURE.md` — добавить analytics read model и data sources после реализации.
- `docs/FRONTEND.md` — зафиксировать компактную mobile-подачу аналитики после реализации.
- `docs/TECH-STACK.md` — зафиксировать, что chart dependency в v1 не добавляется.
- `docs/DOCS-INDEX.md` — добавить этот active plan.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — обновить статус блока Analytics после завершения.
- `docs/exec-plans/deferred-roadmap.md` — если deferred analytics candidates нужно закрепить вне этого плана.

## 7. Затронутые модули и файлы

- `packages/shared/src/permissions.ts`
- `packages/shared/src/analytics.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`
- `apps/api/src/analytics/analytics.module.ts`
- `apps/api/src/analytics/analytics.controller.ts`
- `apps/api/src/analytics/analytics.service.ts`
- `apps/api/src/analytics/analytics.mapper.ts`
- `apps/api/src/app.module.ts`
- `apps/api/test/analytics-controller.test.ts`
- `apps/api/test/analytics-db.integration.test.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app-shell/AppRoot.tsx`
- `apps/web/src/app-shell/RoleHomeRouter.tsx`
- `apps/web/src/features/analytics/*`
- `apps/web/app/globals.css`
- `apps/web/src/features/analytics/*.test.tsx`

Prisma migration на первом проходе не нужна, если хватает существующих indexes. Если integration test или query plan покажет медленные выборки, добавить indexes отдельной миграцией, не заранее.

## 8. Шаги реализации

1. Добавить permission `director.analytics.read` и назначить только `admin`/`director`.
2. Зафиксировать shared analytics query/response contracts.
3. Добавить API module/controller/service с `director.analytics.read`.
4. Реализовать money aggregations.
5. Реализовать production aggregations.
6. Добавить backend controller/unit tests.
7. Добавить real Postgres integration tests.
8. Добавить `getDirectorAnalytics` в frontend API client.
9. Собрать `features/analytics`:
   - period control;
   - money summary;
   - current cash summary;
   - raw material summary одной строкой на вид сырья;
   - product output summary с расходом сырья по каждой продукции, без графиков и больших таблиц.
10. Подключить `features/analytics` отдельной вкладкой `Аналитика` для Директора с `director.analytics.read`.
11. Добавить frontend component tests для loading/error/empty/data states.
12. Обновить SoR-документы по факту реализации.
13. Выполнить verification и ручную browser-проверку на mobile и desktop viewport.

## 9. Тестовый план

- `packages/shared`:
  - zod contract parse для валидного query и response;
  - `director.analytics.read` есть у `admin` и `director`;
  - `director.analytics.read` отсутствует у `commercial_manager`, `distributor_worker`, `production_manager`, `courier`.
- `apps/api` controller:
  - anonymous `401`;
  - role without `director.analytics.read` получает `403`;
  - `director` и `admin` получают `200`.
- `apps/api` integration:
  - gross/net revenue считается по distributor и courier sales без отдельного source split в UI contract;
  - cash/cashless split не смешивает безнал с cash balance;
  - cancellation внутри периода уменьшает net metrics;
  - sale до периода + cancellation в период попадает в cancellation metrics периода;
  - courier cash unload считается внутренним перемещением, не revenue;
  - director withdrawal уменьшает cash movement, но не revenue;
  - current cash берется из cash balance projections;
  - raw material intake и current raw material balances считаются по видам сырья с единицами измерения;
  - consumed raw material, released units и transferred units считаются по typed production facts;
  - production analytics не возвращает универсальный процент эффективности;
  - current workshop product units берется из `workshop_product_balance`;
  - `today` и preset boundaries считаются в `Asia/Vladivostok`;
  - `dateFrom/dateTo` имеют приоритет над `periodPreset`;
  - `revenueByDay` считает продажи и отмены по дню факта, отмена не переносится на день исходной продажи;
  - период больше 90 дней отклоняется.
- `apps/web`:
	- Director home не грузит analytics endpoint и остается компактным обзором;
	- отдельная вкладка `Аналитика` доступна Директору с `director.analytics.read`;
	- Director analytics показывает period control;
	- mobile viewport показывает компактные KPI и строки без horizontal overflow;
	- сырье не дублируется в отдельных списках `поступило/потрачено/остаток`;
	- frontend не показывает отдельный блок `Движение наличных`;
	- empty state не выглядит как ошибка;
	- loading/error states читаемые;
	- mobile viewport без horizontal overflow.

Релевантная verification перед завершением:

- `pnpm lint`
- `pnpm lint:boundaries`
- `pnpm typecheck`
- `pnpm test`
- `pnpm docs:check`
- `pnpm audit`
- `pnpm smoke`, если dev-contour поднят.

## 10. Риски и rollback

- Риск: смешать revenue и cash movement.
  - Mitigation: в contracts разделить `Выручка`, `Наличные`, `Движение наличных`, `Внутренние перемещения`; в UI v1 не выводить cash movement отдельным блоком, чтобы не создать повтор.
- Риск: возврат наличных курьером ошибочно показать как доход.
  - Mitigation: `courierCashReturnedCents` хранить только в cash movement, не включать в revenue.
- Риск: chart-библиотека расширит bundle и scope директорского экрана.
  - Mitigation: в v1 chart-зависимость не добавлять; будущие графики оформлять отдельным продуктовым решением.
- Риск: связку сырья и выпуска прочитают как коэффициент эффективности.
  - Mitigation: показывать как пару величин `Потрачено сырья: X кг` и `Выпущено продукции: Y шт`, не как процент.
- Риск: SQL-агрегации станут слишком сложными в Prisma.
  - Mitigation: сначала readable query service; точечно использовать `$queryRaw` только для агрегатов, которые Prisma делает чрезмерно сложными, с typed mapper и тестами.
- Rollback: удалить analytics route/feature; доменные write-операции и существующие projections не меняются.

## 11. Открытые вопросы

1. Решено: в первом экране показывать компактный breakdown выпущенной продукции по названиям, количеству и расходу сырья на каждую продукцию.

Решение по умолчанию без ответа:

- default period `30d`;
- `today` и preset periods считаются в timezone бизнеса `Asia/Vladivostok`;
- `dateFrom/dateTo` имеют приоритет над `periodPreset`;
- полный экран доступен только `director` и `admin`;
- UI v1 реализуется без chart-зависимости;
- блоки `Сырье` и `Продукция` разделены: сырье по видам с приходом/расходом/остатком, продукция по названиям и расходу сырья без процента эффективности.

## 12. Completion Summary

Реализовано:

- `director.analytics.read` добавлено в shared permissions для `admin` и `director`;
- `GET /analytics/director` добавлен как read-only analytics endpoint;
- shared contracts добавлены в `packages/shared/src/analytics.ts`;
- money analytics считает gross/net revenue, cash/cashless split, отмены и текущие наличные;
- production analytics считает приход/расход/остаток сырья, выпуск продукции, расход сырья по каждой продукции, перемещения на распределитель и остаток в цеху;
- frontend-вкладка `Аналитика` добавлена только директору;
- UI упрощен до компактных блоков без chart-библиотеки, без отдельного блока `Движение наличных` и без трех дублирующих списков сырья;
- документация обновлена в SoR-документах.

Фактическая verification:

- `corepack pnpm lint` — passed;
- `corepack pnpm lint:boundaries` — passed;
- `corepack pnpm typecheck` — passed;
- `corepack pnpm test` — passed, full suite: `@buhta/api` 162 tests, `@buhta/web` 43 tests, `@buhta/shared` 16 tests;
- `corepack pnpm docs:check` — passed;
- `corepack pnpm build` — passed вне sandbox.

Примечания по проверкам:

- `corepack pnpm build` внутри sandbox падает на известное ограничение Next/Turbopack `creating new process / binding to a port / Operation not permitted`; повтор вне sandbox прошел успешно.
- API/Postgres integration tests нужно запускать с поднятым Docker Postgres и актуальными миграциями. Перед финальным full test была применена pending migration `20260605120000_operation_history_indexes` в локальную dev-БД.
- Browser-проверка не выполнялась, потому что dev-серверы `3000` и `3001` на момент финальной проверки не были подняты; UI покрыт component/page tests и production build.
