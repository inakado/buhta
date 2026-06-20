# Production Catalog Access

Статус: `Completed`
Дата: 2026-06-20

## Цель

Дать заведующему производством полный доступ к справочникам видов сырья и видов тары: просмотр, добавление, редактирование, архивация и восстановление. При этом не расширять его доступ до шаблонов продукции, цен и распределителей.

## Scope

- Разделить текущее широкое право `catalog.manage` на узкие права для справочников сырья и тары.
- Выдать заведующему производством права управления видами сырья и видами тары.
- Оставить шаблоны продукции, цены и распределители доступными только текущим ролям с `catalog.manage`.
- Добавить вход `Еще -> Справочники` для заведующего производством.
- Переиспользовать текущий `CatalogHome`, `SegmentedControl`, `management-surface`, dialog/list/action patterns.
- Для заведующего производства показывать в справочниках только вкладки `Сырье` и `Тара`.
- Обновить тесты прав, API guard behavior и frontend role flow.
- Обновить SoR-документы, которые описывают права, handlers, frontend-навигацию и audit events.

## Out Of Scope

- Новые сущности БД и миграции.
- Изменение схемы справочников сырья, тары, распределителей или шаблонов продукции.
- Новые права на шаблоны продукции, цены или распределители для заведующего производством.
- Отдельный read-only режим справочников.
- Новый UI-компонент справочников вместо переиспользования текущего `CatalogHome`.
- Изменение production intake/release/transfer бизнес-операций.

## Решения

- Не выдавать заведующему производством `catalog.manage`, потому что это право сейчас покрывает все `/catalog/*`.
- Ввести granular permissions:
  - `catalog.raw_material.manage`;
  - `catalog.packaging.manage`.
- `admin` получает новые права через общий список `PERMISSIONS`.
- `director` сохраняет `catalog.manage` и получает новые granular права для явной матрицы.
- `production_manager` получает только `catalog.raw_material.manage` и `catalog.packaging.manage`.
- Raw material и packaging handlers переходят на granular permissions.
- Distributor и product template handlers остаются под `catalog.manage`.
- Frontend-роутинг справочников должен проверять либо `catalog.manage`, либо хотя бы одно granular catalog permission.
- `CatalogHome` получает ограничение доступных вкладок по правам текущего actor.

## Затронутые документы

- `docs/crm-requirements.md`
- `docs/SECURITY.md`
- `docs/HANDLER-MAP.md`
- `docs/FRONTEND.md`
- `docs/DOMAIN-EVENTS.md`
- `docs/DOCS-INDEX.md`

`docs/ARCHITECTURE-PRINCIPLES.md` не меняется: существующие правила `Policy-as-code` и явных прав уже покрывают это решение.

## Затронутые модули и файлы

- `packages/shared/src/permissions.ts`
- `packages/shared/src/index.test.ts`
- `apps/api/src/catalog/catalog.controller.ts`
- `apps/api/test/policy.test.ts`
- `apps/api/test/catalog-controller.test.ts`
- `apps/api/test/catalog-db.integration.test.ts`, если потребуется дополнительная проверка audit actor для заведующего производством.
- `apps/web/src/app-shell/AppRoot.tsx`
- `apps/web/src/app-shell/RoleHomeRouter.tsx`
- `apps/web/src/roles/production-manager/ProductionMoreHome.tsx`
- `apps/web/src/features/catalog/CatalogHome.tsx`
- `apps/web/app/page.test.tsx`
- `apps/web/src/features/onboarding/RoleOnboardingHome.tsx`, если текущий текст ограничений роли противоречит новому праву.

## Prisma / Migration Changes

Не ожидаются.

## API / Contracts Changes

- Добавляются новые string-literal permissions в shared contracts.
- HTTP routes и payload schemas не меняются.
- Guard behavior меняется для `/catalog/raw-material-types*` и `/catalog/packaging-types*`.

## Frontend Flow

- Заведующий производством открывает вкладку `Еще`.
- В блоке навигации появляется пункт `Справочники`.
- Переход открывает существующий экран `Справочники`.
- Для заведующего видны только вкладки `Сырье` и `Тара`.
- В этих вкладках доступны текущие действия:
  - `Добавить`;
  - редактирование;
  - `В архив`;
  - просмотр архива;
  - `Вернуть`.
- Нижняя навигация сохраняет active state `Еще`, когда открыт `catalog`.
- Offline state продолжает блокировать write-действия справочников.

## Тестовый план

- Shared unit:
  - `production_manager` имеет `catalog.raw_material.manage` и `catalog.packaging.manage`;
  - `production_manager` не имеет `catalog.manage`;
  - `director` и `admin` имеют granular права.
- API policy/controller:
  - заведующий производства проходит guard на raw material create/update/archive;
  - заведующий производства проходит guard на packaging create/update/archive;
  - заведующий производства получает `403` на product template/distributor handlers;
  - роли без catalog прав не проходят raw/packaging handlers.
- API integration:
  - создание/редактирование/архивация сырья или тары заведующим пишет audit с actor role `production_manager`.
- Frontend component flow:
  - `production_manager -> Еще -> Справочники` открывает справочники;
  - видны вкладки `Сырье` и `Тара`;
  - не видны `Распределители` и `Шаблоны`;
  - можно добавить, отредактировать, архивировать и восстановить сырье/тару;
  - нижняя вкладка `Еще` остается активной.
- Regression:
  - директор и админ по-прежнему видят полный каталог;
  - production forms продолжают использовать production endpoints и активные справочники.

## Ручная UI-проверка

- Mobile viewport 320-430px:
  - `Еще` заведующего;
  - переход в `Справочники`;
  - вкладки `Сырье` и `Тара`;
  - create/edit/archive/restore dialog flows;
  - offline disabled state;
  - отсутствие горизонтального overflow и перекрытия нижней навигацией.

## Риски и Rollback

- Риск: случайно выдать заведующему широкое `catalog.manage`. Контроль: тесты permissions и `403` на product templates/distributors.
- Риск: frontend покажет вкладки, которые backend запрещает. Контроль: tabs строятся по actor permissions, backend остается источником прав.
- Риск: onboarding/docs останутся со старым утверждением, что виды сырья и тары добавляют только директор или админ. Контроль: обновить `FRONTEND.md`, `crm-requirements.md` и role onboarding copy при необходимости.
- Rollback: убрать granular права у `production_manager`, удалить entrypoint из `ProductionMoreHome`, вернуть raw/packaging handlers на `catalog.manage`.

## Критерии завершения

- Заведующий производства управляет только видами сырья и видами тары.
- Шаблоны продукции, цены и распределители остаются недоступны заведующему производства.
- UI переиспользует текущий `CatalogHome` и не вводит новый справочный экран.
- Обновлены SoR-документы.
- Пройдены targeted tests и максимально полный доступный verification contour.

## Выполненные проверки

Финальный verification contour:

  - `pnpm lint`;
  - `pnpm lint:boundaries`;
  - `pnpm typecheck`;
  - `pnpm test:ci`;
  - `pnpm docs:check`;
  - `pnpm audit`.

Дополнительно проверено:

- `pnpm --filter @buhta/api exec prisma migrate status` — схема БД актуальна, все миграции применены.
- `pnpm test` в параллельном режиме не используется как закрывающая проверка для API/Postgres integration suite: из-за общего DB окружения он может давать пересечение данных между integration тестами. Закрывающий прогон для DB контура — `pnpm test:ci`, который выполняет API тесты последовательно.

## Открытые вопросы

- Нет открытых продуктовых вопросов по scope текущей задачи: заведующий производства получает полный CRUD для видов сырья и видов тары, но не получает доступ к шаблонам продукции, ценам и распределителям.
