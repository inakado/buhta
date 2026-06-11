# Production Deploy And CI/CD

Статус: `Draft`

Дата старта: `2026-06-11`

Фактические входные данные:

- GitHub repo: `inakado/buhta`;
- production domain: `buhta-crm.ru`;
- VPS IPv4: `46.173.28.149`;
- SSH alias на Mac: `buhta`.

## 1. Цель

Поднять первую production-версию «Бухты» на выделенном Ubuntu-сервере так, чтобы deploy был простым, повторяемым и быстрым:

- разработчик коммитит локально;
- пуш в основной branch запускает проверки;
- успешный pipeline собирает production images;
- сервер получает конкретную версию по git SHA и перезапускает приложение;
- rollback можно сделать на предыдущий SHA без ручной пересборки проекта.

Контур рассчитан на закрытую CRM для небольшой команды примерно до 10 человек. Цель — надежный boring production, а не инфраструктура уровня большого SaaS.

## 2. Scope

Входит:

- production Dockerfiles для `api` и `web`;
- отдельный production compose-файл, не смешанный с dev `docker-compose.yml`;
- server bootstrap для Ubuntu: Docker Engine, firewall, директории, deploy user, volumes;
- reverse proxy с HTTPS;
- production env/secrets policy;
- GitHub Actions CI: install, lint, typecheck, tests, docs check, build;
- GitHub Actions deploy: push images, SSH на сервер, backup, migrate, restart, health check;
- простой manual deploy/rollback runbook;
- backup PostgreSQL перед deploy и ежедневный backup;
- минимальный monitoring через health checks, container restart policy и логи.

## 3. Out Of Scope

Не входит в первый production deploy:

- Kubernetes, Helm, ArgoCD, Flux;
- Terraform/Pulumi и полный IaC cloud provisioning;
- blue-green/canary deploy;
- отдельный staging-сервер;
- managed secret manager/Vault;
- autoscaling;
- Prometheus/Grafana/PagerDuty;
- zero-downtime миграции сложного класса.

Эти вещи можно добавить позже, если появится реальная нагрузка, команда или требования к доступности.

## 4. Целевая архитектура

Минимальная схема:

```text
Internet
  |
  v
HTTPS reverse proxy
  |
  +--> web container  -> Next.js production server
  |
  +--> api container  -> NestJS API /health
  |
  +--> postgres container with named volume
```

Рекомендуемый серверный layout:

```text
/opt/buhta/
  compose.prod.yml
  .env.production        # root/deploy-readable only, не в git
  deploy/
    deploy.sh
    rollback.sh
    backup-postgres.sh
  backups/
    postgres/
```

Images:

- `ghcr.io/<owner>/buhta-api:<git-sha>`
- `ghcr.io/<owner>/buhta-web:<git-sha>`
- optionally `:main` как удобный moving tag, но production compose должен уметь фиксироваться на SHA.

## 5. CI/CD модель

Основной flow:

1. Локально:
   - `git commit`
   - `git push origin main`
2. GitHub Actions `ci`:
   - `corepack enable`
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test` на свежем Postgres service в CI
   - `pnpm docs:check`
   - `pnpm build`
3. GitHub Actions `build-and-push`:
   - build `api` image;
   - build `web` image;
   - push в GHCR с tag `${GITHUB_SHA}`.
4. GitHub Actions `deploy-production` после успешной сборки:
   - SSH на `buhta`;
   - `docker login ghcr.io`;
   - pre-deploy `pg_dump`;
   - `docker compose pull`;
   - `docker compose run --rm api pnpm --filter @buhta/api prisma:deploy` или dedicated migration command внутри api image;
   - `docker compose up -d --remove-orphans`;
   - health check `curl http://127.0.0.1:<api-port>/health`;
   - web check через localhost/reverse proxy.

Manual fallback:

- локальный `ssh buhta`;
- `cd /opt/buhta`;
- `IMAGE_TAG=<sha> ./deploy/deploy.sh`.

## 6. Production container design

`api` image:

- base: Node 24 slim;
- устанавливает только нужные production dependencies;
- генерирует Prisma client на build stage;
- собирает `apps/api`;
- запускает compiled NestJS output, не `tsx watch`;
- содержит команду для `prisma migrate deploy`;
- не содержит `.env`.

`web` image:

- base: Node 24 slim;
- build Next.js production bundle;
- запускает `next start` или standalone output;
- получает `NEXT_PUBLIC_API_BASE_URL` на build/deploy этапе осознанно.

Общее:

- не использовать `latest` для production deploy;
- `restart: unless-stopped`;
- health checks на `api` и reverse proxy;
- resource limits задать мягко, если compose/runtime поддерживает их на выбранном сервере.

## 7. Secrets и env

Правила:

- секреты не попадают в git;
- `BETTER_AUTH_SECRET`, `DATABASE_URL`, `POSTGRES_PASSWORD`, registry token и SSH key хранятся в GitHub Environment Secrets или создаются на сервере вручную при bootstrap;
- runtime env-файл на сервере допустим как rendered artifact для MVP, но только с правами `600` и владельцем `root` или dedicated deploy user;
- `.env.example` остается только local-dev;
- production `BETTER_AUTH_SECRET` должен быть длинным random secret;
- production `DATABASE_URL` должен быть явным и не использовать local fallback.

Перед production deploy нужно закрыть или явно принять отдельным решением Prisma CLI fail-closed tech debt из `docs/exec-plans/tech-debt-tracker.md`.

## 8. Server bootstrap

Планируемые шаги на сервере:

1. Создать `deploy` user или осознанно оставить `root` только на самый первый bootstrap.
2. Настроить SSH key-only login.
3. Поставить Docker Engine и Compose plugin.
4. Включить firewall:
   - `22/tcp` только для SSH;
   - `80/tcp`, `443/tcp` наружу;
   - Postgres наружу не публиковать.
5. Создать `/opt/buhta`.
6. Создать Docker volumes:
   - postgres data;
   - proxy certificates;
   - backup directory.
7. Положить production env.
8. Проверить:
   - `docker version`;
   - `docker compose version`;
   - `docker compose config`;
   - `curl localhost` после первого запуска.

## 9. Reverse proxy и HTTPS

Первый выбор: `Caddy`, если нет причины брать другой proxy.

Причина:

- автоматический HTTPS;
- простой Caddyfile;
- достаточно для закрытой CRM;
- меньше ручной настройки, чем nginx + certbot.

Ожидаемые routes:

- `https://<domain>` -> web;
- `https://<domain>/api/*` -> api;
- `https://<domain>/health` или отдельный internal health path по решению реализации.

Если frontend уже ходит на API по отдельному origin, можно временно оставить отдельный API subdomain, но предпочтительнее один публичный origin, чтобы меньше усложнять cookies/CORS.

## 10. Database и backups

Production Postgres на первом этапе можно держать в Docker named volume на том же сервере.

Обязательные меры:

- volume не удалять при deploy;
- перед каждым deploy запускать `pg_dump`;
- ежедневный cron/systemd timer backup;
- retention: минимум 14 daily backups;
- периодически проверять restore на отдельной временной БД;
- Postgres port не публиковать наружу.

Позже можно перейти на managed Postgres, если появится потребность в автоматических backups/restore SLA.

## 11. Rollback

Rollback должен быть быстрым и понятным:

1. Узнать предыдущий successful SHA из deploy log или GitHub Actions.
2. На сервере:
   - `IMAGE_TAG=<previous-sha> ./deploy/rollback.sh`
3. `rollback.sh`:
   - обновляет image tag;
   - делает `docker compose pull`;
   - делает `docker compose up -d`;
   - проверяет `/health`.

DB rollback не автоматизировать без явной необходимости. Для миграций правило такое:

- перед deploy есть backup;
- миграции должны быть backward-compatible в рамках одного релиза, насколько возможно;
- destructive migrations требуют отдельного плана и ручного окна.

## 12. Затронутые документы

В ходе реализации обновить:

- `docs/TECH-STACK.md` — production deploy contour;
- `docs/DEVELOPMENT.md` — команды deploy/verification;
- `docs/SECURITY.md` — production env/secrets, SSH, exposed ports;
- `docs/RELIABILITY.md` — backups, health checks, rollback;
- `docs/DOCS-INDEX.md` — новый deployment/runbook документ, если он появится;
- этот plan-файл — фактические выполненные проверки перед переносом в `completed`.

Новый профильный документ после реализации:

- `docs/DEPLOYMENT.md` — короткий production runbook: first deploy, deploy, rollback, backup restore, logs.

## 13. Затронутые модули и файлы

Ожидаемые новые/измененные файлы:

- `.dockerignore`;
- `apps/api/Dockerfile`;
- `apps/web/Dockerfile`;
- `deploy/compose.prod.yml` или `docker-compose.prod.yml`;
- `deploy/Caddyfile`;
- `deploy/deploy.sh`;
- `deploy/rollback.sh`;
- `deploy/backup-postgres.sh`;
- `.github/workflows/ci.yml`;
- `.github/workflows/deploy-production.yml`;
- `docs/DEPLOYMENT.md`;
- профильные docs из раздела 12.

## 14. Шаги реализации

### Шаг 1. Production Docker baseline

Статус: `Completed`.

- Добавить `.dockerignore`.
- Добавить production Dockerfile для API.
- Добавить production Dockerfile для Web.
- Проверено на сервере вместо локальной машины из-за плохого локального соединения:
  - `docker build -f apps/api/Dockerfile -t buhta-api:server-test .`;
  - `docker build -f apps/web/Dockerfile -t buhta-web:server-test .`;
  - после проверки `server-test` images и временные files удалены.
- Локальный production compose не запускался; локально оставлен только dev-contour.

### Шаг 2. Production compose

Статус: `Completed`.

- Добавить `compose.prod.yml`.
- Добавить `postgres`, `api`, `web`, `caddy`.
- Убрать публикацию Postgres наружу.
- Добавить health checks и restart policy.
- Проверить `docker compose -f ... config`.

### Шаг 3. Server bootstrap

Статус: `Completed`.

- Установить Docker на сервер.
- Настроить firewall.
- Создать `/opt/buhta`.
- Положить env и Caddy config.
- Сделать первый deploy через GitHub Actions.

Выполнено на `2026-06-11`:

- Docker Engine `29.5.3` и Docker Compose plugin `v5.1.4` установлены.
- ufw включен, разрешены `OpenSSH`, `80/tcp`, `443/tcp`.
- `/opt/buhta/deploy` и `/opt/buhta/backups/postgres` созданы bootstrap-скриптом.
- `/opt/buhta/.env.production` создан вручную на сервере с правами `600 root:root`.
- Первый production deploy выполнен через GitHub Actions на `373466824e4b18cf3eecc740c7d80b946deaac6e`.

### Шаг 4. CI

Статус: `Completed`.

- Добавить workflow `ci.yml`.
- Поднять Postgres service в GitHub Actions.
- Прогнать lint/typecheck/test/docs/build.
- `pnpm test:ci` запускает API integration tests без file parallelism, чтобы тесты не влияли друг на друга через общую CI-БД.

### Шаг 5. Image build and registry

Статус: `Completed`.

- Добавить workflow build/push в GHCR.
- Тегировать images по git SHA.
- Не использовать `latest` как production selector.

### Шаг 6. Deploy workflow

Статус: `Completed`.

- Добавить GitHub Environment `production`.
- Добавить secrets:
  - server host;
  - server SSH user;
  - server SSH private key или deploy key;
  - registry token if needed;
  - production env values, если env рендерится pipeline-ом.
- SSH deploy на сервер:
  - backup;
  - pull images;
  - migrate;
  - restart;
  - health checks.

Проверено:

- GitHub Actions `CI` success.
- GitHub Actions `Deploy Production` success.
- `https://buhta-crm.ru/health` возвращает `200`.
- Caddy получил Let's Encrypt certificate.
- `docker compose ps` показывает healthy `api` и `postgres`, running `web` и `caddy`.
- Первичный `admin` создан seed-командой, временный пароль хранится на сервере в root-only файле `/opt/buhta/initial-admin-password.txt`.

### Шаг 7. Docs and operational runbook

Статус: `Completed`.

- Добавить `docs/DEPLOYMENT.md`.
- Описать:
  - first deploy;
  - обычный deploy;
  - rollback;
  - backup;
  - restore check;
  - logs;
  - restart конкретного сервиса.

## 15. Тестовый план

Перед завершением реализации:

- `pnpm lint`;
- `pnpm lint:boundaries`;
- `pnpm typecheck`;
- `pnpm test` на чистой CI-БД или зафиксированное исключение по текущему tech debt;
- `pnpm docs:check`;
- `pnpm build`;
- `docker compose -f <prod-compose> config`;
- local/prod image build для `api` и `web`;
- server deploy dry-run или первый deploy;
- `curl https://<domain>/health`;
- открыть web и проверить login;
- проверить `docker compose ps`;
- проверить backup-файл после deploy.

Browser smoke не включать в этот этап, если владелец явно не просит.

Проверено на `2026-06-11`:

- `docker compose --env-file deploy/env/production.example -f deploy/compose.prod.yml config`;
- VPS bootstrap: Docker/Compose installed, ufw active;
- server Docker build для `api` и `web`;
- повторный server Docker build для `web` после OpenSSL фикса;
- cleanup локальных test images `buhta-api:local` / `buhta-web:local`;
- cleanup server-test images и временных `/tmp/buhta-*`.

Локальный `pnpm install --lockfile-only --offline` был остановлен: локальная сеть не давала пройти npm registry / attestation DNS retries. Lockfile проверен фактически через server `pnpm install --frozen-lockfile` внутри Docker build.

## 16. Риски

- Full API test suite сейчас может быть нестабилен в общей dev-БД; CI должен использовать чистый Postgres service.
- Production `NEXT_PUBLIC_API_BASE_URL` может потребовать решения: один origin через proxy или отдельный API origin.
- Миграции Prisma должны запускаться строго перед новым app version.
- Build на маленьком сервере может быть медленным; поэтому images лучше собирать в CI.
- Runtime env на сервере как файл — MVP-компромисс; права и отсутствие git-tracking обязательны.
- Admin-only BetterAuth admin plugin risk принят для MVP, но перед production-hardening должен быть пересмотрен.

## 17. Rollback plan

- Rollback app images по предыдущему SHA.
- DB restore только вручную из backup, если миграция или данные повреждены.
- До destructive DB changes создавать отдельный план и ручное maintenance window.
- Если deploy health check не прошел, deploy script должен остановиться и вернуть предыдущий image tag.

## 18. Открытые вопросы

- Какой git hosting используется для production CI: GitHub уже окончательно?
- Какой branch считается production: `main`?
- Какой domain/subdomain будет у CRM?
- Нужен ли отдельный API subdomain или делаем один origin через proxy?
- Оставляем Postgres в Docker volume на первом этапе или сразу берем managed Postgres?
- Создаем dedicated `deploy` user на сервере сразу или первый bootstrap делаем через `root`, а потом закрываем root SSH?
- Нужно ли ограничить доступ к CRM по IP/VPN/basic auth на уровне proxy для первого закрытого запуска?
