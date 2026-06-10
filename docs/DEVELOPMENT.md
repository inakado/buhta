# DEVELOPMENT

Runbook разработки проекта «Бухта».

Статус: `Draft`. Базовый scaffold приложения создан; команды ниже являются текущим рабочим контуром.

## 1. Цель dev-contour

Разработка должна запускаться повторяемо и без ручной настройки окружения.

Целевой минимум:

- `postgres` в Docker;
- `api` на NestJS;
- `web` на Next.js;
- shared contracts в `packages/shared`;
- единые команды для lint, typecheck, tests и docs check.

## 2. Ожидаемые prerequisites

- `pnpm 11.x`
- `OrbStack` как основной локальный Docker runtime владельца проекта
- `Docker Desktop` или совместимый Docker runtime для других окружений
- Node.js версии, выбранной при scaffold
- доступ к `.env` / `.env.example` после появления приложения

Текущая Node.js версия проекта: `24.14.0`.
Текущая версия package manager: `pnpm@11.3.0`.

Настройки pnpm проекта находятся в `pnpm-workspace.yaml`:

- `overrides` — точечные security overrides;
- `allowBuilds` — список зависимостей, которым разрешены install/build scripts.

Если `pnpm install` сообщает об ignored/unreviewed build scripts, нужно не включать общий allow-all режим, а явно проверить пакет и добавить его в `allowBuilds` только если он действительно нужен и доверенный.

## 3. Локальная разработка

Предпочтительный быстрый режим:

1. Поднять инфраструктуру:
   - `pnpm dev:infra`
2. Запустить API на host:
   - `pnpm dev:api`
3. Запустить web на host:
   - `pnpm dev:web`

Полный режим “как у нового разработчика”:

- `docker compose up --build`

По умолчанию:

- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- Postgres для host-run: `localhost:5433`
- Postgres внутри compose: `postgres:5432`

Принцип:

- база данных стабильно работает в Docker;
- локально Docker-команды ожидаются через OrbStack, но без OrbStack-specific API;
- `web` и `api` можно запускать на host ради быстрого hot reload;
- полный compose-контур должен оставаться рабочим и документированным.

## 4. Docker Compose target

Минимальные сервисы:

- `postgres`
- `api`
- `web`

После появления Prisma:

- миграции выполняются командой `pnpm --filter @buhta/api exec prisma migrate dev --name <name>`;
- Prisma client генерируется командой `pnpm --filter @buhta/api prisma:generate`;
- seed запускается командой `pnpm --filter @buhta/api seed`;
- dev seed создает bootstrap admin с логином `SEED_ADMIN_LOGIN` и паролем `SEED_ADMIN_PASSWORD` из env; значения из `.env.example` допустимы только для локального контура;
- healthchecks проверяют готовность `postgres`, `api`, `web`.

Docker не должен скрывать ошибки приложения. Если локальная команда `pnpm test` падает, compose-сборка не считается заменой исправления.

## 5. Verification commands

Целевой набор перед завершением задачи:

- `pnpm lint`
- `pnpm lint:boundaries`
- `pnpm typecheck`
- `pnpm test`
- `pnpm docs:check`
- `pnpm audit`

Frontend React diagnostics:

- `pnpm doctor` запускает установленный React Doctor entrypoint.
- `pnpm doctor:local` запускает React Doctor без telemetry и в advisory-режиме (`--blocking none`), чтобы находить React bugs/performance/accessibility/maintainability issues без превращения текущего backlog в CI-блокер.

После появления smoke:

- `pnpm smoke`

Если задача затрагивает только документацию, достаточно docs-проверок после появления `docs:check`.

Практическое правило для агентских запусков в sandbox:

- `pnpm lint`, `pnpm lint:boundaries`, `pnpm typecheck`, `pnpm docs:check` обычно запускать в sandbox;
- `pnpm build` запускать вне sandbox, потому что Next/Turbopack может создавать worker/process/port и падать с `EPERM`;
- `pnpm audit` запускать с сетевым доступом, потому что проверка обращается к npm registry;
- `pnpm test` можно запускать в sandbox только для unit/component tests без real Postgres; если API suite включает Prisma/Postgres integration tests, запускать с поднятым `postgres` и вне sandbox;
- Prisma migrate/status/deploy для локального Postgres запускать вне sandbox, если schema engine возвращает `undefined` или `EPERM`.

## 6. Testing rules

Критичные зоны покрываются тестами обязательно:

- товарные остатки;
- денежные балансы;
- наличные и безналичные продажи;
- загрузка и сгрузка курьера;
- списание наличных директором;
- заранее назначенный дисконт;
- права ролей;
- append-only история операций.

Текущие API unit tests не открывают сетевой listener: health contract проверяется через controller instance, а policy/error/idempotency baseline — прямыми unit tests. Browser/smoke проверки добавляются отдельно для UI и runtime flows.

Если API-тесту нужен HTTP boundary, сначала проверить, нельзя ли покрыть контракт без `listen()`. В sandbox `supertest(app.getHttpServer())` может пытаться открыть listener и падать с `EPERM`; для unit/contract тестов без сетевой семантики предпочтительнее прямой controller/service test. Реальные HTTP-flow проверки держать в integration/smoke контуре.

Integration-тесты, которые проверяют Prisma/Postgres поведение, требуют поднятого `postgres` из `pnpm dev:infra` и примененных миграций. Они могут не проходить в sandbox, если tooling или DB-доступ упирается в `EPERM`; в таком случае повторять тот же targeted test вне sandbox и отдельно фиксировать результат.

Ручные, browser и API-проверки в общей dev-базе не должны оставлять тестовый мусор. Если для проверки нужно создать справочник, партию, пользователя или другую запись, использовать русские доменные названия про переработку и продажу икры, а после проверки удалить созданные данные и связанные служебные записи, если они не нужны для seed/demo-сценария. Англоязычные заглушки вроде `browser-product`, `test raw`, `foo` в UI и dev-базе не использовать.

Минимальный набор для новой доменной операции:

- успешный сценарий;
- отказ при недостаточном остатке или недостаточных наличных;
- отказ при недостаточных правах;
- запись истории;
- корректное изменение всех затронутых балансов.

## 7. Docs harness target

Будущая команда `pnpm docs:check` должна проверять:

- битые ссылки;
- что активные документы перечислены в `docs/DOCS-INDEX.md`;
- обязательные разделы в ключевых SoR-документах;
- отсутствие терминов и артефактов старых проектов в активной документации.

Документация обновляется вместе с изменением поведения, доменной модели, прав, API, тестов или архитектурного решения.

## 8. Env policy

Env-файлы:

- `.env.example` для локальной разработки;
- отдельные переменные для `web`, `api`, `postgres`;
- секреты не должны попадать в git;
- dev seed не должен использовать production-данные.

`apps/api` в dev-режиме читает `.env.example` и затем `.env`; локальный `.env` может переопределять значения без попадания в git.

## 9. Troubleshooting

- Если Prisma на host-run получает `P1010` или видит не ту роль Postgres, проверить конфликт с локальным Postgres на `5432`. Проектный контейнер должен быть доступен на `localhost:5433`.
- Если `docker compose ps` не показывает Postgres, проверить, запущен ли OrbStack.
- Если `docker compose up -d postgres` не имеет доступа к OrbStack/Docker socket, повторить команду с разрешением доступа к Docker API.
- Для Postgres 18 named volume монтируется в `/var/lib/postgresql`, а не в `/var/lib/postgresql/data`.
- Если `pnpm build` падает в sandbox на Next/Turbopack с `EPERM` при создании процесса или binding to a port, повторить ту же команду вне sandbox. Это ограничение окружения проверки, а не обязательно ошибка frontend-кода.
- Если `pnpm audit` падает в sandbox с `ENOTFOUND` или `fetch failed`, повторить audit с разрешенным сетевым доступом к npm registry. Успешный результат audit все равно обязателен перед завершением этапа.
- Если `pnpm docs:check` или другая pnpm-команда не стартует из-за версии Node, проверить `node -v`: проект закреплен на Node `24.14.0` через `.node-version`, а `pnpm@11.3.0` требует Node новее системного `22.12.0`. В таком shell нужно активировать project Node 24 или запускать команду через runtime, который использует Node 24.
- Если `docs:check` ругается на placeholder-документ, не добавлять `TBD`-строки в Draft-документы. После появления фактических handlers/routes документ должен содержать реальные строки и явную фразу, что вымышленные endpoints заранее не описываются.
- Если `prisma migrate status/deploy` внутри sandbox возвращает неинформативный `Schema engine error: undefined`, повторить ту же Prisma-команду вне sandbox перед поиском ошибки в миграции.
- Не использовать длинные `tsx -e` one-liners для Prisma/debug-кода: shell легко ломает `$disconnect`, а `tsx` может открывать IPC pipe и падать с `EPERM`. Для проверки поведения предпочтительнее targeted test или небольшой временный script, который не попадает в коммит.
- Если API dev server отвечает `ERR_EMPTY_RESPONSE` / `ERR_CONNECTION_REFUSED` во время разработки, проверить лог `tsx watch`: частые рестарты из-за `node_modules/.pnpm/...` означают, что watch-контур снова захватывает зависимости. Dev script `@buhta/api` должен исключать `node_modules` из watch.
- Если нужно сделать `git add` или `git commit`, операция пишет в `.git`; при отказе на `.git/index.lock` повторить git-команду с разрешением на запись git metadata.
