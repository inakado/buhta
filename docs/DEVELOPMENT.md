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

После появления smoke:

- `pnpm smoke`

Если задача затрагивает только документацию, достаточно docs-проверок после появления `docs:check`.

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
- Для Postgres 18 named volume монтируется в `/var/lib/postgresql`, а не в `/var/lib/postgresql/data`.
