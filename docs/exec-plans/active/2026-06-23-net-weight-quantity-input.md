# Product Net Weight Quantity Input

Статус: `Draft`
Дата: 2026-06-23

## Цель

Добавить в CRM рабочий язык массы для готовой продукции, не ломая текущий штучный складской учет и цену за единицу. Продукция остается физической единицей в таре, цена остается `₽/шт`, а пользователь в производстве, продажах и курьерских операциях по умолчанию вводит массу нетто в кг. Система автоматически пересчитывает массу в целое количество единиц по массе нетто одной единицы.

Пример целевого поведения:

- шаблон продукции: `Икра кеты 250 мл`, `Масса нетто в единице: 200 г`, `Цена: 1200 ₽/шт`;
- пользователь вводит `20 кг`;
- система рассчитывает `100 шт`;
- операция проводится по `quantity = 100`;
- UI, история и аналитика показывают оба измерения: `100 шт · 20 кг`.

## Scope

- Добавить обязательное поле шаблона продукции `Масса нетто в единице, г`.
- Сохранить техническое имя поля как `netWeightGrams`.
- Снапшотить `netWeightGrams` в партии продукции, чтобы старая история не меняла смысл после изменения шаблона.
- Оставить канонический товарный учет готовой продукции в целых штуках:
  - `ProductBatch.quantity`;
  - `WorkshopProductBalance.quantity`;
  - `DistributorProductBalance.quantity`;
  - `CourierProductBalance.quantity`;
  - transfer/sale/load/unload/discount operation quantity.
- Оставить `priceCents` и `unitPriceCents` как цену за единицу продукции в таре, не за кг.
- Добавить единый пересчет массы в количество:
  - `quantity = totalNetWeightGrams / netWeightGramsPerUnit`;
  - масса должна быть кратна массе нетто единицы;
  - автоматическое округление вверх или вниз запрещено.
- Добавить input mode для товарных операций:
  - режим `Масса, кг` по умолчанию;
  - режим `Количество, шт` как альтернативный;
  - при смене режима сохранять понятный рассчитанный counterpart, не терять ввод молча.
- Протянуть массу нетто и общий вес в read models, operation details, audit details и frontend summaries.
- Обновить UI по правилам `$impeccable`: product register, рабочая плотность, familiar segmented controls, хороший mobile-first переключатель без декоративных карточек.
- Обновить SoR-документы, API contracts, frontend docs, handler map, domain events.
- Добавить тесты на пересчет, кратность, API-инварианты, UI flow и историю.

## Out Of Scope

- Переход цены на `₽/кг`.
- Перевод товарных остатков готовой продукции на дробные `Decimal` кг.
- Продажа произвольного некратного веса, например `1.9 кг` при `200 г` в единице.
- Автоматическое округление количества единиц из некратной массы.
- Полноценный учет фасовок как отдельного inventory layer.
- Маркировка, сроки годности, себестоимость, партии по срокам и возвратная тара.
- Изменение прав доступа ролей.
- Новая дизайн-система или отдельный UI-framework.

## Принятые продуктовые решения

- Название поля в UI: `Масса нетто в единице, г`.
- Техническое поле: `netWeightGrams`.
- Поле хранится в граммах как положительное целое число.
- Цена остается за единицу: `priceCents` / `unitPriceCents` = `копейки за шт`.
- Складской факт остается целым количеством единиц.
- Масса в кг является основным языком ввода для пользователя, поэтому режим `Масса, кг` открыт по умолчанию.
- Режим `Количество, шт` нужен для случаев, когда сотрудник считает физические единицы.
- Некратная масса блокирует submit с понятной ошибкой, например: `Масса должна быть кратна 200 г. Для 1,9 кг получается 9,5 шт.`
- В истории и итоговых результатах показывать оба измерения: сначала рабочее значение операции, затем учетное количество, например `20 кг · 100 шт`.
- Backend остается источником истины: он должен пересчитывать или валидировать ввод массы, а не полагаться только на frontend.

## Затронутые документы

- `docs/crm-requirements.md` — бизнес-правило массы нетто, цена за единицу, input modes, кратность массы.
- `docs/ARCHITECTURE-PRINCIPLES.md` — если понадобится зафиксировать общий принцип canonical quantity + derived display quantity для товарных операций.
- `docs/HANDLER-MAP.md` — новые поля request/response для catalog, production, distributor, courier.
- `docs/FRONTEND.md` — UX правила переключателя `Масса, кг` / `Количество, шт`, default kg, mobile behavior.
- `docs/DOMAIN-EVENTS.md` — новые audit details: `netWeightGramsPerUnit`, `totalNetWeightGrams`, input mode.
- `docs/SECURITY.md` — если появятся новые guard-relevant validation rules для write commands.
- `docs/DOCS-INDEX.md` — регистрация active plan.

## Затронутые модули и файлы

### Prisma / DB

- `apps/api/prisma/schema.prisma`
- новая Prisma migration:
  - `ProductTemplate.netWeightGrams Int`;
  - `ProductBatch.netWeightGrams Int`;
  - backfill для существующих данных.

### Shared contracts

- `packages/shared/src/catalog.ts`
- `packages/shared/src/production.ts`
- `packages/shared/src/distributor.ts`
- `packages/shared/src/courier.ts`
- `packages/shared/src/analytics.ts`
- `packages/shared/src/operations.ts`
- `packages/shared/src/index.test.ts`

### Backend

- `apps/api/src/catalog/catalog.service.ts`
- `apps/api/src/catalog/catalog.mapper.ts`
- `apps/api/src/production/production.service.ts`
- `apps/api/src/production/production.mapper.ts`
- `apps/api/src/distributor/distributor.service.ts`
- `apps/api/src/distributor/distributor.mapper.ts`
- `apps/api/src/courier/courier.service.ts`
- `apps/api/src/courier/courier.mapper.ts`
- `apps/api/src/analytics/analytics.service.ts`
- `apps/api/src/analytics/analytics.mapper.ts`
- `apps/api/src/operations/operation-history.mapper.ts`
- `apps/api/src/operations/operation-history-redaction.ts`, если новые details требуют redaction/allowlist.

### Frontend

- `apps/web/src/features/catalog/CatalogHome.tsx`
- `apps/web/src/features/production/ProductionHome.tsx`
- `apps/web/src/features/sales/DistributorSaleHome.tsx`
- `apps/web/src/features/courier/CourierLoadHome.tsx`
- `apps/web/src/features/courier/CourierSaleHome.tsx`
- `apps/web/src/features/courier/CourierUnloadHome.tsx`
- `apps/web/src/features/distributor/DistributorInventoryHome.tsx`
- `apps/web/src/features/distributor/DistributorStockList.tsx`
- `apps/web/src/features/courier/CourierStockList.tsx`
- `apps/web/src/features/courier/CourierBalanceHome.tsx`
- `apps/web/src/features/operations/OperationProductSelect.tsx`
- `apps/web/src/features/operations/OperationHistoryHome.tsx`
- `apps/web/src/features/operations/operation-detail-presenter.ts`
- `apps/web/src/features/operations/PostSubmitResultLayer.tsx`
- `apps/web/src/features/analytics/DirectorAnalyticsHome.tsx`
- CSS/selectors рядом с текущими `production-action-form`, `segmented-control`, `inventory-table-*`, `operation-product-*`.

### Tests

- `apps/api/test/catalog-db.integration.test.ts`
- `apps/api/test/production-db.integration.test.ts`
- `apps/api/test/distributor-db.integration.test.ts`
- `apps/api/test/courier-db.integration.test.ts`
- `apps/api/test/analytics-db.integration.test.ts`
- `apps/api/test/operation-history*.test.ts`, если есть профильные history tests.
- `apps/web/app/page.test.tsx`
- `apps/web/src/features/operations/operation-detail-presenter.test.ts`
- профильные frontend component tests для analytics/sales/courier, если текущая структура уже покрывает эти экраны.

## API / Contract Design

### Product template

Добавить в create/update/list contracts:

- `netWeightGrams: number`.

Validation:

- integer;
- `> 0`;
- верхний предел определить консервативно, например `<= 100000`, если нет бизнес-требования на большую единицу.

### Product batch snapshot

Добавить в batch/read models:

- `netWeightGrams: number`;
- derived `totalNetWeightGrams = quantity * netWeightGrams`.

### Product operation quantity input

Для write commands, где пользователь может вводить массу или штуки, ввести общий контрактный паттерн:

- canonical `quantity` в штуках остается в response и persisted facts;
- request принимает один из режимов:
  - `quantityInput: { mode: "net_weight"; netWeightGrams: number }`;
  - `quantityInput: { mode: "units"; quantity: number }`.

Backend canonicalization:

- для `units`: проверить положительное целое `quantity`;
- для `net_weight`: найти выбранный product/balance/batch, взять snapshot `netWeightGrams`, проверить кратность и получить целое `quantity`;
- если endpoint временно сохраняет старое поле `quantity` для совместимости, нельзя принимать конфликтующие `quantity` и `quantityInput` без проверки равенства.

Endpoints, которые должны получить этот паттерн:

- `POST /production/product-batches`;
- `POST /production/product-transfers`;
- `POST /distributor/sales`;
- `POST /distributor/discounts`;
- `POST /courier/loads`;
- `POST /courier/sales`;
- `POST /courier/unloads`.

## Prisma / Migration Changes

Нужна миграция.

Поля:

- `ProductTemplate.netWeightGrams Int`;
- `ProductBatch.netWeightGrams Int`.

Backfill strategy:

- если production data еще тестовая: можно задать временный default `1` и затем поправить seed/templates;
- если есть реальные данные: перед миграцией нужен explicit mapping текущих шаблонов к массе нетто, иначе старые партии получат бессмысленный вес.

Предпочтительный безопасный путь:

1. Добавить nullable поле или default-safe поле миграцией.
2. Backfill через seed/ручной mapping для существующих шаблонов.
3. Сделать поле обязательным на уровне приложения.
4. При следующей cleanup-миграции сделать DB-level required без временного default, если Prisma/Postgres contour это допускает.

Для текущей v1, если нет real production data, допускается более простой путь с обязательным `Int` и обновлением seed/test fixtures в той же задаче.

## Frontend / UX Plan

UI работает в product register `$impeccable`: плотная рабочая форма, familiar controls, без декоративных карточек, без тяжелой анимации.

### Quantity input component

Создать или выделить reusable компонент для операций с продукцией:

- условное имя: `ProductQuantityInput`;
- режимы: `Масса, кг` и `Количество, шт`;
- default mode: `Масса, кг`;
- использовать существующий segmented-control vocabulary;
- не делать modal;
- показывать рядом вычисленное значение:
  - при вводе кг: `Будет списано: 100 шт`;
  - при вводе шт: `Масса нетто: 20 кг`;
- показывать доступный остаток в обоих измерениях:
  - `Доступно: 500 шт · 100 кг`;
- disabled/loading/error states встроить в форму рядом с submit;
- focus states и keyboard flow обязательны;
- mobile 320px не должен давать горизонтальный overflow.

### UX copy

- Label режима по умолчанию: `Масса, кг`.
- Второй режим: `Количество, шт`.
- Field label в режиме массы: `Масса нетто`.
- Field label в режиме штук: `Количество`.
- Helper text в режиме массы: `CRM рассчитает количество единиц по массе нетто шаблона.`
- Error copy для некратности: `Масса должна быть кратна 200 г. Сейчас получается 9,5 шт.`
- Error copy для превышения остатка: `Доступно 20 кг · 100 шт.`

### Screens

- Product template form:
  - добавить поле `Масса нетто в единице, г`;
  - показывать в строках шаблонов рядом с тарой и ценой.
- Production batch release:
  - default `Масса, кг`;
  - по выбранному шаблону рассчитывать `quantity`;
  - расход тары остается `quantity`.
- Production transfer:
  - default `Масса, кг`;
  - показывать остаток цеха в `шт · кг`.
- Distributor sale:
  - default `Масса, кг`;
  - итоговая сумма считается по штукам и `unitPriceCents`.
- Courier load / sale / unload:
  - default `Масса, кг`;
  - для unload с несколькими строками у каждой строки свой input mode или общий компактный row-control.
- Distributor discount:
  - default `Масса, кг`;
  - новая цена остается `₽/шт`.
- Stock/read-only screens:
  - показывать `шт · кг`, не заменять одно другим.
- Operation history/details:
  - показывать `Масса нетто`, `Количество`, `Масса в единице`, `Цена за единицу`.

## Шаги реализации

### Этап 0. Подготовка и фиксация решения

- Уточнить, есть ли реальные production-данные в текущей БД.
- Зафиксировать решение в `docs/crm-requirements.md`: учет в штуках, рабочий ввод в кг, цена за единицу.
- Обновить этот plan, если обнаружится требование продавать некратный вес.

### Этап 1. DB и shared contracts

- Добавить Prisma migration для `netWeightGrams`.
- Обновить catalog schemas и product template request/response.
- Обновить production/distributor/courier schemas:
  - read models получают `netWeightGrams` и `totalNetWeightGrams`;
  - write commands получают `quantityInput`.
- Добавить shared helpers/types для пересчета массы в штуки.

### Этап 2. Backend catalog + production

- Поддержать `netWeightGrams` в product templates.
- Снапшотить `netWeightGrams` при выпуске партии.
- Реализовать canonicalization `quantityInput -> quantity` для выпуска и transfer.
- Обновить audit details выпуска и transfer.
- Обновить production summaries и mapper outputs.

### Этап 3. Backend distributor + courier + discounts

- Протянуть `netWeightGrams` в distributor/courier balance options.
- Реализовать canonicalization для:
  - distributor sale;
  - distributor discount;
  - courier load;
  - courier sale;
  - courier unload.
- Обновить operation facts и audit details:
  - `quantity`;
  - `quantityInputMode`;
  - `netWeightGramsPerUnit`;
  - `totalNetWeightGrams`.
- Убедиться, что cancellation использует snapshot исходной продажи, а не текущий шаблон.

### Этап 4. Frontend data display

- Обновить product template UI.
- Обновить product selects/options meta:
  - `100 шт · 20 кг · 1200 ₽/шт`;
  - не скрывать цену за единицу.
- Обновить stock lists, recent sales, post-submit result, operation history.
- Добавить форматтеры:
  - grams -> kg display;
  - `quantity + totalNetWeight` pair;
  - кратность и локализованные decimal separators.

### Этап 5. Frontend input mode UX

- По `$impeccable` спроектировать и реализовать reusable `ProductQuantityInput`.
- Default mode: `Масса, кг`.
- Встроить в:
  - выпуск продукции;
  - перемещение на распределитель;
  - продажу с распределителя;
  - дисконт;
  - загрузку курьера;
  - продажу курьером;
  - сгрузку курьера.
- Проверить 320px, 390px, 430px, desktop shell.
- Проверить focus order, screen reader labels, disabled/offline states.

### Этап 6. Analytics and history

- Обновить director analytics:
  - не только `шт`, но и суммарная масса по продукции;
  - коэффициент сырья пересмотреть с `кг/шт` на `кг сырья / кг нетто` либо показывать оба, если это полезно.
- Обновить operation detail presenter:
  - понятные labels;
  - без technical ids;
  - old operations без net weight fallback показывают только `шт`.

### Этап 7. Documentation finalization

- Обновить `HANDLER-MAP`, `FRONTEND`, `DOMAIN-EVENTS`, при необходимости `SECURITY`.
- Обновить `DOCS-INDEX`, если добавятся новые документы.
- Убедиться, что постоянные бизнес-правила живут в `crm-requirements.md`, а не только в плане.

### Этап 8. Verification and final audit

- Targeted unit/API/frontend tests.
- Full relevant verification contour.
- UI/UX audit по `$impeccable` перед закрытием.
- Перенести plan в `docs/exec-plans/completed/` только после зеленой проверки и фактического списка команд.

## Subagent Work Packages

План специально разбит так, чтобы задачи можно было отдавать независимым исполнителям и аудиторам.

### Agent A. Domain and DB worker

Ownership:

- `apps/api/prisma/schema.prisma`;
- Prisma migration;
- seed/test fixtures;
- shared quantity helper contracts.

Deliverable:

- migration + shared schemas;
- тесты на `netWeightGrams` и пересчет `kg -> units`;
- список backward compatibility assumptions.

### Agent B. Production/catalog backend worker

Ownership:

- catalog service/mapper/controller tests;
- production service/mapper/controller tests;
- production audit details.

Deliverable:

- шаблоны с `netWeightGrams`;
- batch snapshot;
- release/transfer canonicalization;
- API integration tests.

### Agent C. Distributor/courier backend worker

Ownership:

- distributor service/mapper/tests;
- courier service/mapper/tests;
- discount/load/sale/unload quantity canonicalization.

Deliverable:

- все товарные движения принимают `quantityInput`;
- invariant tests: кратность, сверх остатка, cancellation snapshot.

### Agent D. Frontend UX worker

Ownership:

- `ProductQuantityInput`;
- production/sales/courier/distributor forms;
- display formatters.

Required skill:

- `$impeccable` product register and existing design system.

Deliverable:

- kg default mode;
- compact accessible segmented switch;
- no overflow on mobile;
- component/page tests.

### Agent E. Docs worker

Ownership:

- `crm-requirements.md`;
- `HANDLER-MAP.md`;
- `FRONTEND.md`;
- `DOMAIN-EVENTS.md`;
- `SECURITY.md`, если требуется.

Deliverable:

- SoR docs updated without duplicating implementation backlog;
- active plan updated with any decision changes.

### Auditor 1. Domain invariants auditor

Focus:

- no accidental `₽/кг`;
- no fractional stock;
- no automatic rounding;
- cancellation uses original snapshot;
- old operations remain readable.

### Auditor 2. UI/UX auditor

Focus:

- `$impeccable` compliance;
- default kg mode;
- mobile density;
- accessibility/focus;
- error copy for non-multiple mass;
- no nested cards or decorative controls.

### Final audit

Main agent performs final integration audit after all worker/auditor outputs:

- diff review across contracts, DB, backend, frontend, docs;
- verification contour;
- unresolved risks summary;
- plan completion or remaining blockers.

## Тестовый план

### Shared unit

- `netWeightGrams` validates positive integer.
- `quantityInput.mode = "net_weight"` converts `20000 г / 200 г = 100 шт`.
- Некратная масса fails.
- `quantityInput.mode = "units"` accepts positive integer units.
- Formatters display `20 кг · 100 шт`.

### API integration

- Product template create/update requires `netWeightGrams`.
- Product batch snapshots `netWeightGrams`.
- Release by mass creates expected `quantity` and consumes same number of packaging units.
- Transfer by mass decrements workshop balance and increments distributor balance.
- Distributor sale by mass calculates money as `quantity * unitPriceCents`.
- Distributor discount by mass splits priced stock row by units.
- Courier load by mass moves units and preserves weight metadata.
- Courier sale by mass supports cash/cashless and cancellation.
- Courier unload by mass returns units to distributor row.
- Некратная масса returns validation error and does not write operation/audit.
- Old quantity-based requests remain supported only if backward compatibility is intentionally kept.

### Frontend tests

- Product template form requires `Масса нетто в единице, г`.
- Product operation forms open in `Масса, кг`.
- Switching to `Количество, шт` updates computed mass.
- Switching back to `Масса, кг` does not submit stale invalid quantity.
- Некратная масса shows clear inline error.
- Submit by mass sends correct `quantityInput`.
- Result layer shows `кг` and `шт`.
- Stock lists and product selects show `шт · кг · ₽/шт`.
- Offline state blocks write actions without hiding read-only mass info.

### Regression

- Price remains `₽/шт` everywhere.
- Product balances remain integer units.
- Cash balances and sale totals unchanged for equivalent unit quantities.
- Discounts still create separate priced stock rows.
- Operation history remains readable for old facts without net weight.

## Ручная UI-проверка

- Mobile 320px:
  - product template form;
  - production release by kg;
  - transfer by kg;
  - distributor sale by kg;
  - courier load/sale/unload by kg;
  - discount by kg;
  - error for некратная масса.
- Mobile 390-430px:
  - no text overlap;
  - bottom nav does not cover submit/result;
  - segmented switch remains tappable.
- Desktop shell:
  - forms remain compact, not stretched into sparse layouts.
- Accessibility:
  - keyboard focus order;
  - labels for segmented switch and computed result;
  - error announced near field;
  - contrast AA for helper/error/muted text.

## Verification Contour

Минимум перед завершением:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test:ci`;
- `pnpm docs:check`;
- `pnpm audit`;
- Prisma migration status against local Postgres;
- targeted browser/UI smoke for mobile viewport after frontend implementation.

Если plain `pnpm test` остается нестабильным из-за parallel DB integration окружения, закрывающим DB contour остается `pnpm test:ci`.

## Риски и Rollback

- Риск: пользователи подумают, что цена стала `₽/кг`. Контроль: UI copy `Цена за единицу`, docs, tests на labels.
- Риск: некратную массу начнут округлять и создавать расхождение. Контроль: shared/backend validation, no rounding policy, tests.
- Риск: текущие операции останутся только в `шт`, а новые показывают `кг`, история станет неоднородной. Контроль: fallback presenter для old facts.
- Риск: frontend посчитает одно, backend проведет другое. Контроль: backend canonicalization from `quantityInput`.
- Риск: масса в шаблоне изменится, старые партии переинтерпретируются. Контроль: `ProductBatch.netWeightGrams` snapshot.
- Риск: courier unload с несколькими строками станет перегруженным. Контроль: отдельная UI проработка и `$impeccable` audit.
- Rollback:
  - скрыть weight input mode feature flag / UI path;
  - оставить новые поля read-only;
  - продолжить принимать `quantity` старым путем;
  - не удалять snapshot fields после миграции, если уже есть данные.

## Открытые вопросы

- Есть ли реальные production-данные, которым нужен точный backfill `netWeightGrams` по шаблонам?
- Нужен ли верхний предел для `netWeightGrams` на уровне бизнес-валидации?
- Для release by mass заведующий вводит только массу готовой продукции или все равно чаще знает точное количество банок?
- В courier unload с несколькими товарными строками режим ввода должен быть независимым на каждую строку или общий default kg с возможностью переключения строки?
- Нужно ли в директорской аналитике считать `кг сырья / кг нетто продукции` как новый основной коэффициент вместо `кг/шт`?
