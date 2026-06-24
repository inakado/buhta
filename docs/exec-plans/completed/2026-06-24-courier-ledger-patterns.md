# Courier Ledger Patterns And Courier Balance Redesign

Статус: `Completed`
Дата: 2026-06-24
Завершен: 2026-06-25

## Итог

План завершен. Курьерские summary/table паттерны унифицированы с общими паттернами продукции, а `CourierBalanceHome` для Директора и коммерческого руководителя переведен на раскрывающийся courier ledger:

- `CourierHomeOverview` использует общий `ProductQuantityDisplay variant="summary-inline"` для summary количества;
- собственный список продукции курьера переведен с `courier-home-stock-surface` на общий `inventory-stock-table-surface`;
- `CourierBalanceHome` использует один markup path для директора и коммерческого руководителя;
- верхняя сводка courier balances остается трехчастной: `Количество`, `Продукция`, `Наличные`;
- список курьеров стал раскрывающимся ledger через `<details>`: courier owner row плюс subordinate product rows;
- статус `N позиций` и `нет товара` отображается muted-текстом, без фоновой плашки и без акцентного цвета;
- обычная цена `₽/шт` убрана из товарных строк courier balance, цена показывается только как объяснение скидки;
- `DESIGN.md` зафиксировал `courier-balance-ledger` как стабильный frontend pattern.

## Ход работы

2026-06-25 начата первая часть без craft/mock:

- `CourierHomeOverview` переведен на общий `ProductQuantityDisplay variant="summary-inline"` для summary количества;
- собственный список продукции курьера переведен с `courier-home-stock-surface` на общий `inventory-stock-table-surface`;
- переработка `CourierBalanceHome` для Директора и коммерческого руководителя отложена до отдельного mock/craft этапа.

2026-06-25 начат craft этап `CourierBalanceHome`:

- сгенерирован visual direction с раскрывающимися карточками курьеров;
- выбран паттерн: верхняя сводка остается трехчастной (`Количество`, `Продукция`, `Наличные`), а список курьеров становится раскрывающимся ledger;
- статус `N позиций` и `нет товара` отображается muted-текстом, без фоновой плашки и без акцентного цвета;
- `CourierBalanceHome` переведен на единый markup path для директора и коммерческого руководителя;
- обычная цена `₽/шт` убрана из товарных строк courier balance, цена показывается только как объяснение скидки;
- проверки: `git diff --check`, `pnpm --filter @buhta/web lint`, `pnpm --filter @buhta/web typecheck`, `pnpm --filter @buhta/web test`.

2026-06-25 polish/typeset pass:

- статус позиций переведен с акцентного зеленого на muted-текст;
- owner-row quantity переведен с inline-разделителя на спокойный summary-inline паттерн;
- типографика количества в раскрытых товарных строках согласована с compact ledger: масса 13px, штуки 10px;
- проверки: `git diff --check`, `pnpm --filter @buhta/web lint`, `pnpm --filter @buhta/web typecheck`, `pnpm --filter @buhta/web test`, `pnpm docs:check`, `pnpm --filter @buhta/web build`.

## Цель

Привести роль `courier` и экраны остатков курьеров у Директора и коммерческого руководителя к тем же переиспользуемым UI-паттернам, которые были введены для экранов продукции, распределителя и цеха после перехода на `кг` + `шт`.

Основной результат:

- у курьера нет отдельной локальной визуальной системы для сводки и таблицы продукции;
- `кг` остается primary, `шт` secondary, цена остается `₽/шт`;
- summary strips используют единый `ProductQuantityDisplay variant="summary-inline"`;
- read-only таблицы товарных остатков используют общий ledger/table pattern вместо набора разрозненных `courier-*` селекторов;
- таблицы остатков курьеров у Директора и коммерческого руководителя переработаны с нуля по `$impeccable` craft/layout/typeset подходу, а не чинятся точечными CSS-подгонками.

## Scope

### Courier role

- Экран `Мой баланс`:
  - заменить `Продукция: N шт` на общий паттерн `кг` primary + `шт` secondary;
  - использовать единый summary-value компонентный путь, без локального `CourierSummaryCell` для товарного количества, если он дублирует `CommercialSummaryRow`/общий summary pattern;
  - привести список продукции курьера к `inventory-stock-table-surface` или выделенному общему компоненту на его основе;
  - убрать или сузить `courier-home-stock-surface`, если он остается только как контейнер без визуального поведения.

- `CourierStockList`:
  - сохранить три смысловые колонки: `Наименование`, `Количество`, `Итого`;
  - цена за штуку должна быть вторичной строкой у наименования, если это собственный баланс курьера;
  - при `showCourier` не смешивать курьера, цену, количество и сумму в одну meta-цепочку;
  - использовать `ProductQuantityDisplay variant="table"` как общий table quantity pattern.

### Director/commercial courier balances

- Экран остатков курьеров у Директора (`variant="director-stock"`).
- Экран остатков курьеров у коммерческого руководителя (`variant="default"` в `CourierBalanceHome`).
- Перепроектировать `CourierPeopleList` и вложенную таблицу товаров:
  - не сохранять текущую структуру “карточка курьера + вложенная таблица” как обязательную;
  - сначала сделать новый low-fidelity mock/shape;
  - затем выбрать один reusable ledger pattern;
  - после утверждения применить один общий CSS/markup path для обеих ролей с минимальными role-specific отличиями.

## Out Of Scope

- Изменение backend contract, прав доступа или API endpoint names.
- Изменение денежных инвариантов и цены `₽/шт`.
- Новые аналитические метрики для курьеров.
- Изменение логики загрузки, продажи или возврата курьера.
- Перевод курьерских остатков на дробные кг как canonical storage.

## Текущие проблемы

- `CourierHomeOverview` показывает в summary только `шт`, хотя после перехода на массу нужно показывать `кг` + `шт`.
- `CourierStockList` визуально похож на общий inventory table, но CSS обслуживается отдельными селекторами `courier-home-stock-surface` и `courier-product-row`.
- `CourierBalanceHome` смешивает два разных представления:
  - коммерческий вид: карточка курьера с cash summary и вложенной таблицей;
  - директорский вид: похожий блок, но с отдельной шапкой и другими селекторами.
- В `globals.css` накоплены параллельные правила:
  - `courier-balance-*`;
  - `courier-product-*`;
  - `courier-home-stock-surface`;
  - `courier-ledger-surface`;
  - legacy overrides для mobile/table layouts.
- Из-за этих локальных правил дальнейшие правки `кг`/`шт`, отступов, размеров и колонок приходится повторять отдельно.

## Design Direction

Работа идет в product register `$impeccable`: плотная рабочая CRM-поверхность, не маркетинговые карточки.

### Quantity hierarchy

- В summary:
  - `кг` primary;
  - `шт` secondary inline suffix;
  - одна строка, чтобы не ломать симметрию KPI strip.
- В таблицах:
  - `кг` primary;
  - `шт` secondary отдельной muted-строкой;
  - цена `₽/шт` отдельно от физического количества.

### Courier balance ledger result

Перед кодом был сделан visual direction через `$impeccable craft`. Из вариантов выбран раскрывающийся courier-section ledger:

- Верхняя строка курьера: имя, muted-статус позиций, общая масса/штуки, стоимость продукции, наличные.
- Ниже раскрываются compact product rows с колонками `Наименование`, `Количество`, `Итого`.
- Видимая табличная шапка внутри каждого курьера не повторяется, но семантическая table head сохранена для доступности.
- Summary экрана остается трехчастным, чтобы не ломать уже согласованный role summary pattern.

Выбранный вариант:

- сохранять быстрый scan по курьерам;
- давать легко сравнить наличные и стоимость товара;
- не заставлять искать цену, количество и итог в разных визуальных слоях;
- не ломаться на 375px, 425px, 768px+;
- не вводить отдельную дизайн-систему для курьеров.

## Затронутые документы

- `DESIGN.md` — зафиксировать courier ledger pattern после утверждения mock.
- `docs/DOCS-INDEX.md` — зарегистрировать active/completed план.
- `docs/FRONTEND.md` — обновить только если появится стабильное frontend convention beyond текущего `DESIGN.md`.

## Затронутые модули

- `apps/web/src/features/courier/CourierHomeOverview.tsx`
- `apps/web/src/features/courier/CourierStockList.tsx`
- `apps/web/src/features/courier/CourierBalanceHome.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.test.tsx`
- возможно shared frontend helper/component рядом с:
  - `apps/web/src/features/operations/product-quantity-input.tsx`;
  - `apps/web/src/features/distributor/DistributorStockList.tsx`.

## Implementation Plan

### Этап 1. Audit and shape

- Прочитать текущие courier screens и CSS selectors.
- Зафиксировать, какие selectors можно удалить, а какие временно оставить.
- Составить `$impeccable shape` brief для:
  - роли курьера;
  - `Остатки курьеров` у Директора;
  - `Остатки курьеров` у коммерческого руководителя.

### Этап 2. Craft mock for courier balances

- Сделать low-fidelity mock для 375px и 768px+.
- Отдельно проверить:
  - пустой курьер без продукции;
  - курьер с 1 строкой;
  - курьер с 4-6 строками;
  - длинное имя курьера;
  - длинное название продукции;
  - дисконтная/обычная цена, если отображение цены затрагивается.
- Утвердить выбранный вариант перед реализацией.

### Этап 3. Extract reusable courier ledger pattern

- Если текущий `inventory-stock-table-surface` покрывает задачу, расширить его без courier-specific branch.
- Если он не покрывает owner-row курьера, выделить новый общий паттерн:
  - например `owner-stock-ledger-surface`;
  - owner row: entity name + summary metrics;
  - detail rows: product, quantity, total.
- Не создавать role-specific CSS, если отличие только в данных.

### Этап 4. Apply to courier role

- `CourierHomeOverview`:
  - получить `totalNetWeightGrams`;
  - заменить summary `N шт` на `ProductQuantityDisplay variant="summary-inline"`;
  - привести stock list surface к общему table pattern.
- `CourierStockList`:
  - убрать зависимость от локальных courier table overrides, если таблица соответствует `inventory-table-*`.

### Этап 5. Rebuild director/commercial courier balances

- Переписать `CourierPeopleList` под утвержденный mock.
- Директор и коммерческий руководитель должны использовать один markup path.
- Role-specific отличие допускается только для:
  - заголовка экрана;
  - доступных summary metrics;
  - наличия/скрытия cash column, если это обусловлено правами.
- Проверить, что `кг`, `шт`, `₽/шт`, `Итого`, `Наличные` не сливаются визуально.

### Этап 6. CSS cleanup

- Удалить или резко сократить:
  - `courier-home-stock-surface`;
  - `courier-product-table`;
  - `courier-product-row`;
  - `courier-balance-card`;
  - duplicated mobile overrides for courier ledgers.
- Оставить courier-specific selectors только там, где они выражают реальное отличие роли, а не визуальную копию общего table pattern.

### Этап 7. Verification

- Запустить targeted frontend tests.
- Запустить full relevant web verification.
- Обновить `DESIGN.md` и docs index.
- Перед закрытием плана перенести его в `docs/exec-plans/completed/` и записать фактические команды проверок.

## Тестовый план

- `CourierHomeOverview` показывает массу и штуки в summary.
- Summary value имеет доступное имя с `кг` и `шт`.
- `CourierStockList` сохраняет product, quantity, total semantics.
- `CourierBalanceHome` показывает courier rows для директора и коммерческого без перескоков колонок.
- Empty state курьера без продукции остается читаемым.
- Long product/courier names не ломают колонки.
- Price remains `₽/шт`, total remains rubles.
- Mobile 375px: нет горизонтального overflow.
- 425px-768px: не меняется неожиданно трехколоночная логика.
- 768px+: содержимое колонок остается под заголовками.

Минимальные команды:

- `git diff --check`;
- `pnpm --filter @buhta/web lint`;
- `pnpm --filter @buhta/web typecheck`;
- `pnpm --filter @buhta/web test`;
- `pnpm docs:check`.

## Риски и rollback

- Риск: при переписывании courier balances потерять scan по каждому курьеру. Контроль: mock stage и проверка на 4-6 строк.
- Риск: сделать таблицу слишком плотной и нечитаемой на 375px. Контроль: mobile-first mock и screenshot verification.
- Риск: повторить проблему локальных селекторов. Контроль: запрет role-specific CSS, если отличие не доменное.
- Риск: смешать cash и stock metrics в одну визуальную строку. Контроль: separate metric slots and tabular values.
- Rollback: оставить старый `CourierBalanceHome` markup под feature branch/diff, но не держать параллельные CSS systems после merge.

## Закрытые решения

- Директор и коммерческий руководитель используют одинаковый courier balance markup path; role-specific отличие осталось только в контейнере/заголовке.
- Сортировка курьеров не менялась, сохраняется порядок API.
- Owner row показывает одновременно `кг + шт`, стоимость продукции и наличные.
- Раскрытие курьера реализовано через `<details>`; первый курьер с продукцией раскрыт по умолчанию, остальные можно открыть вручную.

## Выполненные проверки

- `git diff --check`
- `pnpm --filter @buhta/web lint`
- `pnpm --filter @buhta/web typecheck`
- `pnpm --filter @buhta/web test`
- `pnpm docs:check`
- `pnpm --filter @buhta/web build`
