# Clients Foundation Plan

Статус: `Completed`
Дата: 2026-05-30
Roadmap stage: `6. Inventory, Courier, Sales, Cash` -> `Clients Foundation`

## Цель

Добавить базовый контур клиентов перед реализацией продаж.

После этапа роли, которые работают с продажами, должны уметь:

- видеть общую базу клиентов;
- искать клиента по имени или телефону;
- создать клиента с именем и телефоном;
- отредактировать имя, телефон и описание клиента, если данные уточнили;
- использовать актуальную карточку клиента как будущий source of truth для продаж.

Backend должен обеспечить уникальность телефона через нормализованное значение, защищать права через policy layer и писать `operation`/`audit_log` для создания и редактирования клиента.

## Анализ текущего состояния

Уже есть:

- роли и policy layer;
- permissions `client.manage`, но нет отдельного `client.read`;
- mobile app shell и bottom navigation;
- distributor inventory read model для ролей с `distributor.stock.read`;
- placeholder вкладка `Продажа`;
- operation/audit baseline;
- frontend success feedback pattern, пока локально реализованный в production flow.

Сейчас нет:

- модели клиента в Prisma;
- shared contracts для клиентов;
- API `/clients`;
- UI списка/поиска/создания/редактирования клиентов;
- отдельного read permission для директора, который по требованиям должен видеть клиентов, но не создавать их;
- тестов клиентского контура.

Вывод: клиенты стоит закрыть отдельным foundation-этапом до продаж. Продажа дальше сможет ссылаться на `clientId` и использовать один `ClientPicker`, не смешивая создание клиента с первой реализацией денежных и товарных операций.

## Фактический результат

Реализовано:

- добавлен shared contract `clients.ts`: client item, list/create/update/search schemas и helper `normalizeClientPhone`;
- добавлен permission `client.read`, а `client.manage` закреплен за create/update;
- role matrix обновлена: директор получил read-only доступ к клиентам, production manager доступа не получил;
- добавлена Prisma model `Client` и migration `20260530110000_clients_foundation`;
- `phoneNormalized` хранится в camelCase-колонке и защищен unique constraint;
- добавлен backend module `clients` с `GET /clients`, `POST /clients`, `PATCH /clients/:clientId`;
- `GET /clients` не пишет историю, `POST/PATCH` пишут `operation` и `audit_log` с `client.create`/`client.update`;
- duplicate normalized phone возвращает `CONFLICT`;
- телефон без цифр возвращает `VALIDATION_ERROR`;
- добавлен web feature `ClientsHome` со списком, поиском, созданием, редактированием и read-only режимом директора;
- добавлена вкладка `Клиенты` для ролей с `client.read`, кроме production manager;
- success feedback pattern расширен на clients flow: `Клиент добавлен` и `Клиент обновлен`;
- SoR-документы обновлены по фактическому поведению.

Выполненные проверки:

- `corepack pnpm --filter @buhta/shared test`;
- `corepack pnpm --filter @buhta/api typecheck`;
- `corepack pnpm --filter @buhta/api exec vitest run test/clients-controller.test.ts test/clients-db.integration.test.ts test/policy.test.ts`;
- `corepack pnpm --filter @buhta/web lint`;
- `corepack pnpm --filter @buhta/web typecheck`;
- `corepack pnpm --filter @buhta/web test -- app/page.test.tsx`;
- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`.

Примечание: `prisma migrate deploy`, targeted DB integration tests, полный `pnpm test` и `pnpm build` выполнялись вне sandbox. В sandbox Prisma DB integration падает на доступе к local Postgres/schema engine, а Next/Turbopack build падает на `binding to a port / Operation not permitted`.

## Решения, подтвержденные перед планом

1. Телефон нормализуем простым удалением всех нецифровых символов.
   - `+7 (999) 123-45-67` -> `79991234567`.
   - Не добавляем E.164-библиотеку и страновые правила на этом этапе.
   - После нормализации значение не может быть пустым.
2. Для создания клиента обязательны `name` и `phone`.
3. `description` опционален.
4. Отдельную вкладку `Клиенты` в UI добавляем сейчас, но это не считается жестким долгосрочным navigation decision: если позже sales flow поглотит этот сценарий, вкладку можно убрать.
5. Редактирование клиента входит в этап.
6. Карточка клиента обновляется in-place. Если данные уточнили, актуальные имя/телефон/описание должны поменяться везде, где UI показывает клиента.

## Scope

Входит:

- добавить Prisma model `Client`;
- добавить migration с unique constraint на `phoneNormalized`;
- добавить `client.read` permission;
- уточнить `client.manage` как право create/update;
- обновить role permission matrix:
  - `admin`: read + manage;
  - `director`: read only;
  - `commercial_manager`: read + manage;
  - `distributor_worker`: read + manage;
  - `courier`: read + manage;
  - `production_manager`: без доступа к клиентам;
- добавить shared zod contracts для клиента, create/update payload и list response;
- добавить API:
  - `GET /clients`;
  - `POST /clients`;
  - `PATCH /clients/:clientId`;
- добавить поиск клиентов через query `search`;
- нормализовать телефон на backend;
- запретить дубли телефонов по `phoneNormalized`;
- создать operation types:
  - `client.create`;
  - `client.update`;
- писать audit для создания и редактирования клиента;
- добавить frontend feature `features/clients`;
- добавить вкладку `Клиенты` для ролей с `client.read`;
- для ролей без `client.manage` показывать read-only список без формы создания/редактирования;
- для ролей с `client.manage` добавить форму создания и редактирования;
- применить success feedback pattern после create/update;
- добавить shared, API и frontend tests;
- обновить SoR-документы.

## Out Of Scope

Не входит:

- продажи с распределителя;
- продажи курьером;
- выбор клиента внутри sale form;
- денежные балансы;
- товарные списания;
- скидки и дисконты;
- импорт клиентов;
- удаление клиента;
- архивирование клиента;
- объединение дублей;
- история коммуникаций с клиентом;
- внешние кабинеты клиентов;
- интеграции с телефонией, мессенджерами или кассой;
- сложная международная нормализация телефонов.

## Доменные решения этапа

### 1. Client как текущая карточка клиента

`Client` хранит актуальные данные покупателя:

- `name`;
- `phone`;
- `phoneNormalized`;
- `description`;
- `createdByUserId`;
- `createdAt`;
- `updatedAt`.

Правила:

- `name` обязателен, trim, непустой;
- `phone` обязателен, trim, непустой;
- `phoneNormalized` строится backend из `phone` удалением всех нецифровых символов;
- `phoneNormalized` должен быть непустым и unique;
- если после удаления нецифровых символов в телефоне не осталось цифр, backend возвращает `VALIDATION_ERROR`;
- `description` trim, optional/nullable, max length;
- `createdByUserId` фиксируется при создании и не меняется при редактировании;
- редактирование меняет текущую карточку in-place.

### 2. Клиентские данные в будущих продажах

`Client` — уточняемая актуальная карточка клиента, а не исторический snapshot.

Для будущих продаж `clientId` будет ссылкой на текущего клиента.

Решение этапа:

- будущие продажи хранят `clientId`;
- операционные экраны и будущие read models продаж должны показывать актуальные данные клиента через join на `Client`;
- UI продаж и отчетов показывает актуальные имя/телефон из `Client`;
- если имя, телефон или описание исправили, изменение должно примениться везде;
- старые значения клиента не нужны как operational source of truth;
- история самого исправления остается в `client.update` через `operation`/`audit_log`;
- не делать snapshot имени/телефона клиента в будущей продаже на этом этапе проектирования.

Это отличается от product/distributor snapshot rules: название продукции и цена партии являются историческим фактом операции, а клиентская карточка в v1 трактуется как уточняемая master data.

### 3. Audit без typed table

Для клиентов достаточно `operation` + `audit_log`, без отдельной typed table.

Operation types:

```text
client.create
client.update
```

Audit details:

- create: `clientId`, `name`, `phone`, `phoneNormalized`, `description`;
- update: `clientId`, `changes` из входного payload после trim/normalization.

Не добавлять отдельную таблицу `ClientChange` на этом этапе. Если позже появится полноценная история изменений клиентов или compliance-требование, это будет отдельный этап.

### 4. Права

Добавить permission:

```text
client.read
```

Семантика:

- `client.read` — список, поиск и просмотр клиентов;
- `client.manage` — создание и редактирование клиентов.

Роли:

| Role | client.read | client.manage |
|---|---:|---:|
| `admin` | Да | Да |
| `director` | Да | Нет |
| `production_manager` | Нет | Нет |
| `commercial_manager` | Да | Да |
| `distributor_worker` | Да | Да |
| `courier` | Да | Да |

Причина разделения: `docs/crm-requirements.md` уже говорит, что директор видит клиентов, но не создает их.

### 5. Поиск клиентов

`GET /clients` поддерживает optional query:

```text
search
```

Правила:

- пустой search возвращает последние/алфавитные клиенты по default order;
- search trim;
- если search после удаления нецифровых символов содержит цифры, искать также по `phoneNormalized contains digits`;
- искать по `name contains search` case-insensitive;
- ограничить размер ответа, чтобы не строить бесконечный список на мобильном экране.

Минимальный default:

```text
limit = 50
```

Pagination можно отложить до роста базы или sales-stage уточнения.

## Prisma / Migration Plan

Добавить в `apps/api/prisma/schema.prisma`:

```prisma
model Client {
  id              String   @id @default(cuid())
  name            String
  phone           String
  phoneNormalized String   @unique
  description     String?
  createdByUserId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       User     @relation("ClientCreatedBy", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@index([name])
  @@index([createdByUserId])
  @@map("client")
}
```

Добавить relation в `User`:

```prisma
createdClients Client[] @relation("ClientCreatedBy")
```

Migration:

- создать table `client`;
- unique index на `phoneNormalized`;
- indexes на `name`, `createdByUserId`;
- FK на `user(id)` с `Restrict`.

Важно: не вводить `@map` для отдельных полей и не переходить на snake_case для колонок внутри этой модели. В проекте текущий Prisma schema style использует camelCase поля без field-level `@map`; `@@map("client")` нужен только для имени таблицы.

Backfill не нужен, потому что клиентов еще нет.

## Shared Contracts

Добавить `packages/shared/src/clients.ts` и экспорт из `packages/shared/src/index.ts`.

Минимальные schemas/types:

```ts
ClientSchema
ClientListResponseSchema
CreateClientRequestSchema
UpdateClientRequestSchema
ClientResponseSchema
ClientSearchQuerySchema
```

`Client`:

```ts
{
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
```

Create request:

```ts
{
  name: string; // trim, min 1, max 120
  phone: string; // trim, min 1, max 40
  description?: string; // trim, max 500
}
```

Update request:

```ts
{
  name?: string;
  phone?: string;
  description?: string;
}
```

Правила:

- update должен требовать хотя бы одно поле;
- `name`, если передан, после trim не может быть пустым;
- `phone`, если передан, после trim не может быть пустым;
- `phoneNormalized`, если `phone` передан, после нормализации не может быть пустым;
- пустое `description` сохранять как `null`;
- validation ошибки возвращать через существующий error contract.

## API Plan

Новый module:

```text
apps/api/src/clients/
  clients.controller.ts
  clients.mapper.ts
  clients.module.ts
  clients.service.ts
```

Endpoints:

| Method | Route | Permission | Behavior |
|---|---|---|---|
| `GET` | `/clients` | `client.read` | list/search clients |
| `POST` | `/clients` | `client.manage` | create client |
| `PATCH` | `/clients/:clientId` | `client.manage` | update client |

Controller:

- валидировать body через shared schemas;
- валидировать query `search`;
- anonymous -> `401`;
- wrong role -> `403`;
- validation -> `VALIDATION_ERROR`.

Service:

- `listClients(query)`;
- `createClient(actor, input)`;
- `updateClient(actor, clientId, input)`;
- `normalizePhone(phone): string`;
- `assertHasChanges(input)`;
- map unique constraint на `CONFLICT` с понятным сообщением `Клиент с таким телефоном уже существует`;
- map missing client на `NOT_FOUND`.

Update-specific rules:

- если `phone` передан, recompute `phoneNormalized`;
- duplicate normalized phone проверяется относительно других клиентов;
- update без фактических полей возвращает `VALIDATION_ERROR`;
- update с пустым `name`, пустым `phone` или пустым normalized phone возвращает `VALIDATION_ERROR`;
- пустая строка `description` сохраняется как `null`.

Write transactions:

- create/update клиента;
- создать `Operation`;
- создать `AuditLog`;
- вернуть mapped client.

## Frontend Plan

Добавить:

```text
apps/web/src/features/clients/ClientsHome.tsx
```

API client functions в `apps/web/src/lib/api-client.ts`:

- `getClients(search?: string)`;
- `createClient(input)`;
- `updateClient(clientId, input)`.

UI:

- вкладка `Клиенты` в bottom nav для ролей с `client.read`;
- список клиентов с именем, телефоном и коротким описанием, если есть;
- поиск по имени/телефону;
- empty state `Клиентов пока нет`;
- loading/error states;
- кнопка/форма `Добавить клиента` только при `client.manage`;
- edit action только при `client.manage`;
- read-only режим для директора;
- submit disabled при `!online` или pending;
- inline errors остаются в форме;
- success notice после create/update:
  - create: `Клиент добавлен`;
  - update: `Клиент обновлен`.

Mobile UX:

- не превращать клиентов в таблицу;
- использовать карточки/list-stack;
- форма короткая: имя, телефон, описание;
- редактирование можно открыть в том же screen mode, без modal;
- не добавлять delete/archive controls.

Navigation:

- admin: добавить вкладку `Клиенты`;
- director/commercial_manager/distributor_worker/courier: добавить вкладку `Клиенты`;
- production_manager: вкладку не добавлять.

Техническое ограничение:

- `AppRoot` не должен разрастись бизнес-логикой клиентов;
- вся логика списка, поиска, create/edit/read-only modes живет в `features/clients/ClientsHome.tsx`;
- в `AppRoot` остается только выбор tab/screen и передача `actor`/`online`;
- если bottom nav станет тесной, это фиксируется как UI review issue, но не решается хаотично внутри этого этапа.

Если bottom nav станет тесной на мобильном, это зафиксировать как UI review issue после реализации, но не блокировать этап.

## Documentation Plan

Обновить вместе с кодом:

- `docs/crm-requirements.md`
  - client read/create/update rules;
  - нормализация телефона;
  - редактирование меняет текущую карточку клиента везде;
  - директор read-only.
- `docs/ARCHITECTURE.md`
  - добавить clients module;
  - client master data как текущий reference для будущих sales.
- `docs/DOMAIN-EVENTS.md`
  - `client.create`;
  - `client.update`.
- `docs/HANDLER-MAP.md`
  - новые `/clients` endpoints после реализации.
- `docs/SECURITY.md`
  - `client.read` vs `client.manage`.
- `docs/FRONTEND.md`
  - вкладка клиентов;
  - read-only/manage modes;
  - success notice pattern расширен на clients flow.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md`
  - после завершения отметить Clients Foundation как completed и следующей точкой оставить Sales From Distributor.

## Test Plan

Shared:

- create schema accepts valid `name + phone`;
- rejects empty name;
- rejects empty phone;
- rejects phone values whose normalized digits are empty;
- trims fields;
- limits description;
- update schema requires at least one field;
- update schema rejects empty `name`;
- update schema rejects empty `phone`;
- update schema rejects phone values whose normalized digits are empty;
- search query trims and limits length.

API controller/policy:

- anonymous `401`;
- production manager `403`;
- production manager gets `403` on all `/clients` API routes;
- director can `GET /clients`;
- director cannot `POST/PATCH`;
- admin/commercial_manager/distributor_worker/courier can create/update;
- invalid body rejected before service;
- invalid query rejected.

API integration with real Postgres:

- create client stores `phoneNormalized`;
- duplicate normalized phone rejected on create with `CONFLICT`;
- list returns clients ordered predictably;
- search by name works;
- search by phone digits works;
- update name changes returned client;
- update phone recomputes `phoneNormalized` and preserves uniqueness;
- duplicate normalized phone rejected on update with `CONFLICT`;
- update with phone that normalizes to empty is rejected;
- update description to empty stores `null`;
- missing client update returns `NOT_FOUND`;
- `GET /clients` does not write `Operation` or `AuditLog`;
- create/update write `Operation` and `AuditLog`;
- client `createdByUserId` remains original actor after update.

Frontend:

- roles with `client.read` see `Клиенты` tab;
- production manager does not see `Клиенты`;
- director sees list/search but no create/edit controls;
- role with `client.manage` can open create form;
- valid create sends `POST /clients`;
- success create shows `Клиент добавлен`;
- edit sends `PATCH /clients/:clientId`;
- success update shows `Клиент обновлен`;
- offline disables write submit;
- duplicate/backend error stays inline;
- empty state renders.

Final verification:

- `corepack pnpm --filter @buhta/shared test`;
- `corepack pnpm --filter @buhta/api typecheck`;
- `corepack pnpm --filter @buhta/api exec vitest run test/clients-controller.test.ts test/clients-db.integration.test.ts test/policy.test.ts`;
- `corepack pnpm --filter @buhta/web lint`;
- `corepack pnpm --filter @buhta/web typecheck`;
- `corepack pnpm --filter @buhta/web test -- app/page.test.tsx`;
- `corepack pnpm lint`;
- `corepack pnpm lint:boundaries`;
- `corepack pnpm typecheck`;
- `corepack pnpm test`;
- `corepack pnpm docs:check`;
- `corepack pnpm build`;
- `corepack pnpm audit`.

Integration tests may require local Postgres on `localhost:5433`; if sandbox blocks DB access, run targeted DB verification outside sandbox and record that in completed plan.

## Implementation Steps

1. Add shared client contracts and permission `client.read`.
2. Update policy tests for new client permission matrix.
3. Add Prisma `Client` model and migration.
4. Generate Prisma client.
5. Add API clients module with mapper/service/controller.
6. Add backend controller and DB integration tests.
7. Add web API functions/types.
8. Add `ClientsHome` UI with list/search/create/edit/read-only modes.
9. Add bottom nav routing for `Клиенты`.
10. Extend frontend tests.
11. Update SoR docs.
12. Run final verification.
13. Move plan to completed, update roadmap, commit.

## Risks And Mitigations

### Phone normalization too simple

Risk: `89991234567` and `79991234567` remain different normalized values.

Mitigation: this is accepted for v1 by explicit decision. If needed later, add Russian phone canonicalization as separate migration/cleanup plan.

### Bottom nav crowding

Risk: adding `Клиенты` creates too many tabs for some roles.

Mitigation: keep icon-only nav with `aria-label`; after implementation do manual mobile UI review. If it feels crowded, move clients under sales/profile in a separate UX step.

### Client audit vs corrected data

Risk: append-only audit can preserve traces of old entered values, while operational UI must show corrected current data.

Mitigation: treat `Client` as mutable master data. Operational screens use current `Client`. Audit is only action trail and does not drive client display.

### Scope creep into sales

Risk: adding clients tempts us to build sale form immediately.

Mitigation: no sale endpoint, no inventory decrement, no cash balance, no payment method in this plan.

## Rollback

Before production data exists:

- revert clients migration/code/docs;
- remove `client.read` from permissions;
- remove clients tab.

After data exists:

- do not drop client data casually;
- prefer forward migration to hide/disable UI if needed.

## Completion Criteria

Этап считается завершенным, когда:

- shared contracts and permissions merged;
- Prisma migration applied;
- API list/create/update clients works under correct permissions;
- phone uniqueness by normalized digits enforced;
- UI clients tab works for read/manage roles;
- director has read-only client UI;
- create/update success feedback works;
- docs updated;
- final verification completed and recorded;
- plan moved to `completed`;
- roadmap updated with actual result.

## Open Questions

Блокирующих вопросов нет.

Неблокирующее решение для будущих этапов: при реализации продаж дополнительно подтвердить, показываем ли в sale history всегда текущую карточку клиента или в каких-то audit/admin отчетах понадобится отдельный snapshot клиента на момент продажи.
