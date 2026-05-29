# Catalog Foundation Plan

Статус: `Completed`
Дата: 2026-05-28
Roadmap stage: `4. Catalog And Admin Data`.

## Цель

Заложить простые справочники, на которые затем будут ссылаться производство, перемещения, распределители, курьеры и продажи.

Этап должен дать минимальную, но рабочую основу:

- виды сырья;
- виды тары;
- распределители;
- шаблоны продукции со связями на сырье и тару.

Главный принцип этапа: не расширять справочники до полноценной товарной системы раньше времени. Сейчас нужны только поля, которые уже подтверждены бизнес-процессом и нужны следующему производственному этапу.

## Scope

Входит:

- Prisma models и migration для справочников;
- shared zod contracts и типы для CRUD/read responses;
- backend module/API для справочников;
- policy `catalog.manage` для `admin` и `director`;
- audit/operation records для create/update/archive действий;
- frontend раздел справочников в mobile shell;
- доступ к справочникам для `admin` и `director`;
- loading/error/empty states;
- tests для contracts, policy, API/service и real Postgres integration;
- обновление документации и handler map.

Не входит:

- поступление сырья;
- учет остатков сырья/тары/готовой продукции;
- выпуск партии продукции;
- цены, фасовки и нормативы списания;
- продажи, скидки и деньги;
- сложная история версий шаблонов продукции;
- физическое удаление справочников;
- сортировки, фильтры, поиск и pagination сверх простого списка.

## Доменные решения этапа

### 1. Справочник сырья

Поля:

- `name` — вид сырья;
- `unit` — единица измерения;
- `active` — доступен для новых операций.

Минимальные правила:

- название обязательно;
- единица измерения обязательна;
- название уникально в рамках справочника;
- отключение выполняется через `active=false`, без физического удаления.

### 2. Справочник тары

Поля:

- `name` — вид тары;
- `unit` — единица учета;
- `active` — доступна для новых операций.

Минимальные правила:

- название обязательно;
- единица учета обязательна;
- название уникально в рамках справочника;
- отключение выполняется через `active=false`, без физического удаления.

### 3. Распределители

Поля:

- `name`;
- `active`.

Минимальные правила:

- название обязательно;
- название уникально;
- отключение выполняется через `active=false`, без физического удаления.

### 4. Шаблон продукции

Поля:

- `name`;
- `rawMaterialTypeId` — связанный вид сырья;
- `packagingTypeId` — связанный вид тары;
- `active`.

Минимальные правила:

- название обязательно;
- связанный вид сырья должен существовать и быть активным при создании/изменении;
- связанный вид тары должен существовать и быть активным при создании/изменении;
- название уникально;
- отключение выполняется через `active=false`, без физического удаления;
- будущие партии продукции будут хранить snapshot нужных полей, поэтому изменение шаблона не должно менять уже созданные партии, когда они появятся.

## Права

Для всех write-действий справочников используется permission `catalog.manage`.

Роли:

- `admin`;
- `director`.

Read-доступ на этом этапе:

- для экранов управления справочниками — только пользователям с `catalog.manage`;
- более широкий read-доступ для операционных ролей появится позже, когда справочники понадобятся в производстве, продаже и загрузке.

## API Draft

Имена endpoints можно уточнить во время реализации, но стартовое направление:

- `GET /catalog/raw-material-types`;
- `POST /catalog/raw-material-types`;
- `PATCH /catalog/raw-material-types/:id`;
- `PATCH /catalog/raw-material-types/:id/archive`;
- `GET /catalog/packaging-types`;
- `POST /catalog/packaging-types`;
- `PATCH /catalog/packaging-types/:id`;
- `PATCH /catalog/packaging-types/:id/archive`;
- `GET /catalog/distributors`;
- `POST /catalog/distributors`;
- `PATCH /catalog/distributors/:id`;
- `PATCH /catalog/distributors/:id/archive`;
- `GET /catalog/product-templates`;
- `POST /catalog/product-templates`;
- `PATCH /catalog/product-templates/:id`;
- `PATCH /catalog/product-templates/:id/archive`.

Archive endpoint должен быть идемпотентным по смыслу: повторное отключение уже неактивной записи не должно ломать UI.

## Затронутые документы

- `docs/crm-requirements.md` — постоянные правила справочников;
- `docs/ARCHITECTURE.md` — catalog module/data flow;
- `docs/SECURITY.md` — `catalog.manage` для `admin` и `director`;
- `docs/HANDLER-MAP.md` — новые handlers;
- `docs/DOMAIN-EVENTS.md` — catalog operation/audit actions;
- `docs/FRONTEND.md` — раздел справочников и component placement;
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — фактический прогресс.

## Затронутые модули

- `packages/shared/src` — contracts и типы справочников;
- `apps/api/prisma/schema.prisma` и новая migration;
- `apps/api/src/catalog` — новый backend module/controller/service;
- `apps/api/src/policy` — проверка `catalog.manage` уже должна покрывать `admin` и `director`;
- `apps/api/src/operations` — audit operation details;
- `apps/web/src/roles/admin` или общий catalog feature;
- `apps/web/src/roles/director` или общий catalog feature;
- `apps/web/src/features/catalog` — предпочтительное место для переиспользуемых catalog UI.

## Frontend Direction

Справочники не должны разрастаться в большой role screen.

Целевая структура:

```text
apps/web/src/features/catalog/
  CatalogHome.tsx
  RawMaterialTypesPanel.tsx
  PackagingTypesPanel.tsx
  DistributorsPanel.tsx
  ProductTemplatesPanel.tsx
```

Role screens только подключают общий catalog feature:

- admin может открыть справочники из нижней навигации или настроек;
- director должен получить доступ к тем же справочникам через свой role home/navigation.

Формы должны быть компактными:

- список;
- создание;
- редактирование основных полей;
- отключение через `active=false`.

## Шаги реализации

1. Уточнить naming models/endpoints без добавления лишних полей.
2. Добавить shared contracts для четырех справочников.
3. Добавить Prisma models и migration.
4. Реализовать `CatalogModule` на backend.
5. Добавить policy protection `catalog.manage`.
6. Добавить audit/operation records для create/update/archive.
7. Добавить backend tests: contracts, policy, service/API integration.
8. Добавить frontend catalog feature и подключить его admin/director.
9. Добавить UI states: loading/error/empty/offline write disabled.
10. Обновить документацию и handler map.
11. Прогнать verification contour.

## Тестовый план

### Unit/shared

- contracts валидируют обязательные поля;
- пустые названия отклоняются;
- `active` возвращается в summary;
- product template требует `rawMaterialTypeId` и `packagingTypeId`.

### API/Integration with real Postgres

- `admin` может создать/обновить/отключить каждый справочник;
- `director` может создать/обновить/отключить каждый справочник;
- роль без `catalog.manage` получает `403`;
- duplicate name возвращает typed conflict;
- product template нельзя создать с несуществующим сырьем/тарой;
- product template нельзя создать с неактивным сырьем/тарой;
- archive не удаляет запись физически;
- create/update/archive пишут operation/audit.

### Frontend

- admin видит раздел справочников;
- director видит раздел справочников;
- courier/distributor worker не видит управление справочниками;
- создание записи обновляет список;
- отключенная запись отображается как неактивная;
- ошибки API отображаются по-русски;
- write actions disabled или дают понятную ошибку при offline.

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
- browser/manual check mobile viewport для admin/director catalog screens.

Практика sandbox остается прежней:

- Prisma migrate/status/deploy, API integration tests с real Postgres, build/audit/smoke при sandbox-сбоях повторять вне sandbox.

## Риски и rollback

### R1. Справочник разрастется раньше производственного этапа

Mitigation: держать только согласованные поля. Цены, фасовки, нормативы и остатки не добавлять в этом этапе.

Rollback: удалить лишнее поле из plan до миграции; после миграции — отдельная корректирующая миграция только если поле реально попало в код.

### R2. Физическое удаление сломает будущие ссылки операций

Mitigation: делать archive через `active=false`, без delete endpoint.

Rollback: если delete уже появился, заменить на archive до перехода к производству.

### R3. Director/admin права начнут расходиться между backend и UI

Mitigation: backend policy — источник истины; UI только скрывает недоступные элементы.

Rollback: убрать UI-only проверки и держать доступ через `catalog.manage`.

### R4. Product template начнет преждевременно хранить производственные поля

Mitigation: пока только `name`, `rawMaterialTypeId`, `packagingTypeId`, `active`.

Rollback: вынести неподтвержденные поля в deferred roadmap, не в schema.

## Открытые вопросы

- Нужны ли predefined единицы измерения как enum/list уже сейчас или достаточно строкового поля `unit`?
- Как назвать раздел в UI: `Справочники`, `Каталог` или `Настройки производства`?

## Progress Log

### 2026-05-29

- Добавлены shared zod contracts для видов сырья, видов тары, распределителей и шаблонов продукции.
- Добавлены Prisma models и migration `20260529090000_catalog_foundation`.
- Реализован backend `CatalogModule` с routes `/catalog/*`, проверкой `catalog.manage`, валидацией DTO и audit operations для create/update/archive.
- Реализован общий frontend feature `apps/web/src/features/catalog/CatalogHome.tsx`; он подключен в mobile shell для `admin` и `director` через permission `catalog.manage`.
- Write-действия справочников отключаются при offline state.
- Добавлены targeted tests для shared contracts, controller/policy, frontend catalog flow и real Postgres catalog service.
- Миграция применена в локальный dev Postgres через Orbstack.
- Исправлена mobile-shell верстка справочников: shell фиксируется в viewport, прокрутка остается внутри рабочей области, tabs и нижняя навигация проверены в viewport 375px и desktop.

## Выполненные проверки

- `corepack pnpm lint` — пройдено.
- `corepack pnpm lint:boundaries` — пройдено.
- `corepack pnpm typecheck` — пройдено.
- `corepack pnpm test` — пройдено после исправления устаревшего auth integration теста self-role update; API: 41 тест, включая real Postgres catalog integration.
- `corepack pnpm docs:check` — пройдено.
- `corepack pnpm build` — пройдено.
- `corepack pnpm audit` — пройдено, известных уязвимостей нет.
- `corepack pnpm smoke` — пройдено: `api health ok`, `web home ok`.
- Browser/manual check через Playwright:
  - `http://localhost:3001`, admin catalog screen;
  - viewport `375x812`;
  - desktop viewport `1200x902`;
  - console warnings/errors не обнаружены.

## Критерии завершения

Этап завершен, когда:

- четыре справочника реализованы в schema/shared/API/UI;
- `admin` и `director` могут управлять справочниками;
- остальные роли не могут выполнять write-действия справочников;
- product template ссылается только на существующие активные сырье и тару;
- отключение работает через `active=false`;
- audit/operation records пишутся для create/update/archive;
- tests и docs обновлены;
- browser/manual check пройден;
- plan перемещен в `completed`.
