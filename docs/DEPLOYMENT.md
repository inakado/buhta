# DEPLOYMENT

Production deploy runbook проекта «Бухта».

Статус: `Active`. Первый production-контур для закрытой CRM небольшой команды: Ubuntu Server, Docker Compose, Caddy, GitHub Actions и GHCR images.

Текущее состояние на `2026-06-11`: production deploy выполнен через GitHub Actions, `https://buhta-crm.ru/health` отвечает `200`, Caddy получил Let's Encrypt certificate, `api`, `web`, `postgres` и `caddy` работают в Docker Compose.

## 1. Production contour

Целевой контур:

- домен: `buhta-crm.ru`;
- сервер: `46.173.28.149`;
- OS: Ubuntu Server;
- runtime: Docker Engine + Docker Compose plugin;
- reverse proxy: Caddy container;
- database: Postgres 18 в Docker named volume;
- images:
  - `ghcr.io/inakado/buhta-api:<git-sha>`;
  - `ghcr.io/inakado/buhta-web:<git-sha>`;
- deploy: GitHub Actions по SSH на сервер.

Публично открыты только:

- `80/tcp`;
- `443/tcp`;
- `22/tcp` для SSH.

Postgres наружу не публикуется.

## 2. Required GitHub secrets

В GitHub repository settings нужно добавить Environment `production` и secrets:

- `PRODUCTION_HOST` — `46.173.28.149` или `buhta-crm.ru`;
- `PRODUCTION_USER` — SSH user на сервере, сейчас допустимо `root` для первого bootstrap;
- `PRODUCTION_SSH_KEY` — private key, которым GitHub Actions подключается к серверу.

`GITHUB_TOKEN` используется самим GitHub Actions для push/pull GHCR images. Отдельный registry token на первом этапе не нужен.

## 3. Server env file

На сервере должен существовать файл:

```text
/opt/buhta/.env.production
```

Пример формы есть в `deploy/env/production.example`.

Обязательные значения:

```sh
BUHTA_DOMAIN=buhta-crm.ru
IMAGE_TAG=<git-sha>
BUHTA_API_IMAGE=ghcr.io/inakado/buhta-api
BUHTA_WEB_IMAGE=ghcr.io/inakado/buhta-web

POSTGRES_DB=buhta
POSTGRES_USER=buhta
POSTGRES_PASSWORD=<long-random-password>

BETTER_AUTH_SECRET=<at-least-32-random-chars>
```

Права:

```sh
chmod 600 /opt/buhta/.env.production
```

Секреты не коммитить.

## 4. First server bootstrap

Первый bootstrap выполняется по SSH:

```sh
ssh buhta
```

На сервер копируется `deploy/bootstrap-ubuntu.sh`, затем запускается от root:

```sh
sh /tmp/bootstrap-ubuntu.sh
```

Скрипт:

- ставит Docker Engine и Compose plugin из официального Docker apt repository;
- включает Docker service;
- включает firewall;
- разрешает `OpenSSH`, `80/tcp`, `443/tcp`;
- создает `/opt/buhta/deploy` и `/opt/buhta/backups/postgres`.

Проверенный bootstrap результат:

- Docker Engine `29.5.3`;
- Docker Compose plugin `v5.1.4`;
- ufw active, публично разрешены только `22/tcp`, `80/tcp`, `443/tcp`.

## 5. First deploy

Обычный путь — через GitHub Actions:

1. Push в `main`.
2. Workflow `CI` прогоняет проверки.
3. Workflow `Deploy Production` собирает images, пушит их в GHCR и по SSH запускает deploy на сервере.

Перед первым deploy вручную создать `/opt/buhta/.env.production`.

После первого deploy создать первичного admin-пользователя:

```sh
ssh buhta
cd /opt/buhta/deploy
IMAGE_TAG=<current-git-sha> docker compose --env-file /opt/buhta/.env.production -f compose.prod.yml run --rm \
  -e SEED_ADMIN_LOGIN=admin \
  -e SEED_ADMIN_PASSWORD=<temporary-password> \
  api pnpm --filter @buhta/api seed
```

В текущем production-contour временный пароль первичного admin сохранен на сервере:

```text
/opt/buhta/initial-admin-password.txt
```

Файл имеет права `600 root:root`. После первого входа admin должен сменить пароль в интерфейсе, а файл с временным паролем нужно удалить.

Если нужен ручной deploy уже существующего image tag:

```sh
ssh buhta
cd /opt/buhta/deploy
./deploy.sh <git-sha>
```

## 6. What deploy does

`deploy/deploy.sh`:

1. Загружает `/opt/buhta/.env.production`.
2. Делает `docker compose pull`.
3. Поднимает `postgres`.
4. Ждет готовности Postgres через `pg_isready`.
5. Делает pre-deploy backup через `pg_dump -Fc`.
6. Запускает Prisma migrations:
   ```sh
   pnpm --filter @buhta/api prisma:deploy
   ```
7. Перезапускает сервисы:
   ```sh
   docker compose up -d --remove-orphans
   ```
8. Форсированно пересоздает только `caddy`, чтобы обновленный через `rsync` `Caddyfile` попал внутрь container file bind mount.
9. Проверяет:
   ```sh
   https://buhta-crm.ru/health
   ```

## 7. Rollback

Rollback приложения:

```sh
ssh buhta
cd /opt/buhta/deploy
./rollback.sh <previous-git-sha>
```

Rollback меняет app images обратно на старый SHA и снова прогоняет health check.

Database rollback автоматом не делается. Если миграция или данные повреждены, восстановление выполняется вручную из backup.

## 8. Backups

Ручной backup:

```sh
ssh buhta
cd /opt/buhta/deploy
./backup-postgres.sh
```

Backups складываются в:

```text
/opt/buhta/backups/postgres/
```

Формат: custom `pg_dump -Fc`.

Перед production-hardening добавить cron или systemd timer для ежедневного backup и проверить restore на временной базе.

## 9. Useful operations

Статус:

```sh
ssh buhta
cd /opt/buhta/deploy
docker compose --env-file ../.env.production -f compose.prod.yml ps
```

Логи API:

```sh
docker compose --env-file ../.env.production -f compose.prod.yml logs -f api
```

Логи web:

```sh
docker compose --env-file ../.env.production -f compose.prod.yml logs -f web
```

Логи Caddy:

```sh
docker compose --env-file ../.env.production -f compose.prod.yml logs -f caddy
```

Health:

```sh
curl -fsS https://buhta-crm.ru/health
```

## 10. Current MVP compromises

- API production image пока запускает `tsx src/main.ts` после обязательного build-step в image build. Причина: текущий `@buhta/shared` экспортирует `src/index.ts`, и compiled Node runtime требует отдельного bundling/module-resolution решения.
- Runtime image содержит dev dependencies, потому что `tsx` нужен для MVP runtime. Перед hardening нужно перейти на compiled/bundled API runtime.
- Postgres живет в Docker volume на том же сервере. Для маленькой закрытой CRM это допустимо на старте, но backups обязательны.
- `.github/workflows/**` разрешены в git, остальная `.github` остается ignored.

## 11. Production-hardening follow-up

- Перейти с `tsx` API runtime на compiled/bundled Node runtime.
- Закрыть Prisma CLI `DATABASE_URL` fail-closed tech debt.
- Добавить ежедневный backup timer и restore-check процедуру.
- Пересмотреть BetterAuth admin plugin accepted risk перед публичным production-hardening.
- Создать dedicated `deploy` user вместо root deploy, если первый bootstrap делался от root.
