# HANDLER-MAP

Карта обработчиков проекта «Бухта».

Статус: `Draft`.

## 1. Назначение

Документ заполняется после появления API и нужен, чтобы быстро видеть:

- HTTP route;
- command/query handler;
- сервис или policy, где проверяются права;
- какие балансы меняются;
- какие события/записи истории создаются;
- какие тесты покрывают поток.

## 2. Текущие handlers

| Route | Handler | Domain operation | Rights | History | Tests |
|---|---|---|---|---|---|
| `GET /health` | `HealthController.health` | runtime health | public via `AllowAnonymous` | нет | `apps/api/test/health.test.ts` |
| `GET /auth/me` | `AuthMeController.me` | current actor/session summary | BetterAuth protected route | нет | `apps/api/test/auth-me.test.ts`, `apps/api/test/auth-http.integration.test.ts` |
| `GET /auth-spike/director-only` | `AuthSpikeController.directorOnly` | protected policy smoke route | `cash.withdraw` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/policy.test.ts`, `apps/api/test/auth-http.integration.test.ts` |
| `GET /users` | `UsersController.listUsers` | user list for admin baseline | `users.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/users-controller.test.ts`, `apps/api/test/users-db.integration.test.ts`, `apps/api/test/auth-http.integration.test.ts` |
| `POST /users` | `UsersController.createUser` | admin creates login/password user | `users.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `user.create`, без plaintext password | `apps/api/test/users-controller.test.ts`, `apps/api/test/users-db.integration.test.ts`, `apps/api/test/auth-http.integration.test.ts` |
| `PATCH /users/:userId/role` | `UsersController.updateUserRole` | update user role; self-role update запрещен | `users.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `user.role.update` | `apps/api/test/users-controller.test.ts`, `apps/api/test/users-db.integration.test.ts`, `apps/api/test/auth-http.integration.test.ts` |
| `POST /users/:userId/reset-password` | `UsersController.resetUserPassword` | admin resets temporary password; self-reset запрещен | `users.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `user.password.reset`, без plaintext password | `apps/api/test/auth-http.integration.test.ts`, `apps/api/test/users-db.integration.test.ts` |
| `GET /catalog/raw-material-types` | `CatalogController.listRawMaterialTypes` | list raw material type dictionary | `catalog.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/catalog-controller.test.ts`, `apps/api/test/catalog-db.integration.test.ts` |
| `POST /catalog/raw-material-types` | `CatalogController.createRawMaterialType` | create raw material type | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.raw_material_type.create` | `apps/api/test/catalog-controller.test.ts`, `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/raw-material-types/:id` | `CatalogController.updateRawMaterialType` | update raw material type, включая `active` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.raw_material_type.update` | `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/raw-material-types/:id/archive` | `CatalogController.archiveRawMaterialType` | set raw material type `active=false` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.raw_material_type.archive` | `apps/api/test/catalog-db.integration.test.ts` |
| `GET /catalog/packaging-types` | `CatalogController.listPackagingTypes` | list packaging type dictionary | `catalog.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/catalog-db.integration.test.ts` |
| `POST /catalog/packaging-types` | `CatalogController.createPackagingType` | create packaging type | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.packaging_type.create` | `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/packaging-types/:id` | `CatalogController.updatePackagingType` | update packaging type, включая `active` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.packaging_type.update` | `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/packaging-types/:id/archive` | `CatalogController.archivePackagingType` | set packaging type `active=false` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.packaging_type.archive` | `apps/api/test/catalog-db.integration.test.ts` |
| `GET /catalog/distributors` | `CatalogController.listDistributors` | list distributor dictionary | `catalog.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/catalog-db.integration.test.ts` |
| `POST /catalog/distributors` | `CatalogController.createDistributor` | create distributor | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.distributor.create` | `apps/api/test/catalog-controller.test.ts`, `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/distributors/:id` | `CatalogController.updateDistributor` | update distributor, включая `active` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.distributor.update` | `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/distributors/:id/archive` | `CatalogController.archiveDistributor` | set distributor `active=false` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.distributor.archive` | `apps/api/test/catalog-db.integration.test.ts` |
| `GET /catalog/product-templates` | `CatalogController.listProductTemplates` | list product template dictionary with raw/packaging links and `priceCents` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/catalog-db.integration.test.ts` |
| `POST /catalog/product-templates` | `CatalogController.createProductTemplate` | create product template linked to active raw material and packaging types with required price | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.product_template.create` | `apps/api/test/catalog-controller.test.ts`, `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/product-templates/:id` | `CatalogController.updateProductTemplate` | update product template links/name/price/active | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.product_template.update` | `apps/api/test/catalog-db.integration.test.ts` |
| `PATCH /catalog/product-templates/:id/archive` | `CatalogController.archiveProductTemplate` | set product template `active=false` | `catalog.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `catalog.product_template.archive` | `apps/api/test/catalog-db.integration.test.ts` |
| `GET /production/options` | `ProductionController.options` | read active raw material, packaging and priced product template options for production forms | `production.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/production-db.integration.test.ts` |
| `GET /production/summary` | `ProductionController.summary` | production home summary: ready product units, raw/packaging aggregate balances | `production.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/production-controller.test.ts`, `apps/api/test/production-db.integration.test.ts` |
| `GET /production/raw-material-balances` | `ProductionController.rawMaterialBalances` | list current raw material balances in workshop | `production.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/production-db.integration.test.ts` |
| `POST /production/raw-material-intakes` | `ProductionController.createRawMaterialIntake` | create raw material intake and increment raw balance | `production.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `production.raw_material_intake.create` | `apps/api/test/production-controller.test.ts`, `apps/api/test/production-db.integration.test.ts` |
| `GET /production/packaging-balances` | `ProductionController.packagingBalances` | list current packaging balances in workshop | `production.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/production-db.integration.test.ts` |
| `POST /production/packaging-intakes` | `ProductionController.createPackagingIntake` | create packaging intake and increment packaging balance | `production.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `production.packaging_intake.create` | `apps/api/test/production-db.integration.test.ts` |
| `GET /production/product-batches` | `ProductionController.productBatches` | list product batches currently produced in workshop | `production.manage` через `RequirePermission` + `PolicyGuard` | нет | `apps/api/test/production-db.integration.test.ts` |
| `POST /production/product-batches` | `ProductionController.createProductBatch` | release product batch, decrement raw/packaging balances, snapshot template fields | `production.manage` через `RequirePermission` + `PolicyGuard` | `operation` + `audit_log` с `production.product_batch.create` | `apps/api/test/production-controller.test.ts`, `apps/api/test/production-db.integration.test.ts` |

## 3. Минимальный формат будущей строки

Не описывать вымышленные endpoints до появления handler в коде. Новые строки добавлять только по фактической реализации route и тестов.

| Route | Handler | Domain operation | Rights | History | Tests |
|---|---|---|---|---|---|
