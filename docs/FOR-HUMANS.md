# FOR HUMANS

Короткая инструкция для ручного запуска dev-версии проекта «Бухта».

## 1. Что нужно заранее

- Node.js `24.x`.
- `corepack`.
- `pnpm` из проекта: `pnpm@11.3.0`.
- OrbStack, Docker Desktop или совместимый Docker runtime.

Проверить базовые версии:

```bash
node -v
corepack pnpm -v
docker version
```

Все команды ниже запускать из корня проекта:

```bash
cd /Users/Alex/Documents/VSCodeProjects/Buhta
```

## 2. Первый запуск после клонирования или обновления зависимостей

Включить Corepack, если он еще не включен:

```bash
corepack enable
```

Установить зависимости:

```bash
corepack pnpm install
```

Отдельный `.env` для локальной разработки обычно не нужен: проект берет безопасные dev-значения из `.env.example`. Если нужно переопределить порт, пароль или URL, создай локальный `.env` и не добавляй его в git.

Поднять Postgres:

```bash
corepack pnpm dev:infra
```

Применить миграции:

```bash
corepack pnpm --filter @buhta/api prisma:deploy
```

Создать dev-пользователей/seed-данные:

```bash
corepack pnpm --filter @buhta/api seed
```

Dev seed читает `.env.example` и локальный `.env`, если он есть.

Локальный bootstrap admin по умолчанию:

- логин: `admin`
- пароль: `Pass123!`

Эти значения только для локального dev-контура.

## 3. Обычный запуск dev-контура

Поднять базу:

```bash
corepack pnpm dev:infra
```

В отдельном терминале запустить API:

```bash
corepack pnpm dev:api
```

В отдельном терминале запустить frontend:

```bash
corepack pnpm dev:web
```

Открыть приложение:

```text
http://localhost:3001
```

API будет доступен здесь:

```text
http://localhost:3000
```

Postgres на host-машине:

```text
localhost:5433
```

## 4. Полный Docker Compose запуск

Обычно удобнее запускать API и frontend на host, как описано выше. Если нужен полный compose-контур:

```bash
docker compose up --build
```

Остановить compose:

```bash
docker compose down
```

Остановить compose вместе с удалением локального volume Postgres:

```bash
docker compose down -v
```

`down -v` удаляет локальную dev-базу. Использовать только если нужно начать с чистого состояния.

## 5. Если нужно пересоздать локальную базу

Остановить контейнеры и удалить volume:

```bash
docker compose down -v
```

Поднять Postgres:

```bash
corepack pnpm dev:infra
```

Применить миграции:

```bash
corepack pnpm --filter @buhta/api prisma:deploy
```

Запустить seed:

```bash
corepack pnpm --filter @buhta/api seed
```

После этого снова запускать API и frontend:

```bash
corepack pnpm dev:api
corepack pnpm dev:web
```

API и frontend лучше запускать в разных терминалах.

## 6. Проверки перед коммитом или после изменений

Минимальный набор для обычной задачи:

```bash
corepack pnpm lint
corepack pnpm lint:boundaries
corepack pnpm typecheck
corepack pnpm test
corepack pnpm docs:check
```

Проверка production build:

```bash
corepack pnpm build
```

Проверка зависимостей:

```bash
corepack pnpm audit
```

Smoke-проверка, если локальный API запущен:

```bash
corepack pnpm smoke
```

Если во время ручной проверки в dev-приложении создавались временные данные, после проверки их нужно удалить. Для временных названий использовать русские доменные примеры из области икры, например `Икра кеты`, `Банка 250 г`, `Распределитель Центральный`, а не технические заглушки вроде `browser-product`.

## 7. Быстрые targeted-проверки

Только frontend:

```bash
corepack pnpm --filter @buhta/web lint
corepack pnpm --filter @buhta/web typecheck
corepack pnpm --filter @buhta/web test
```

Только API:

```bash
corepack pnpm --filter @buhta/api lint
corepack pnpm --filter @buhta/api typecheck
corepack pnpm --filter @buhta/api test
```

Только shared contracts:

```bash
corepack pnpm --filter @buhta/shared lint
corepack pnpm --filter @buhta/shared typecheck
corepack pnpm --filter @buhta/shared test
```

Только документация:

```bash
corepack pnpm docs:check
```

## 8. Полезные адреса и порты

| Что | URL / порт |
| --- | --- |
| Web app | `http://localhost:3001` |
| API | `http://localhost:3000` |
| API health | `http://localhost:3000/health` |
| Postgres host port | `localhost:5433` |
| Postgres container port | `postgres:5432` |

## 9. Частые проблемы

Если Postgres не стартует:

```bash
docker compose ps
```

Проверь, что OrbStack/Docker запущен.

Если API не может подключиться к базе:

- проверь, что `corepack pnpm dev:infra` запущен;
- проверь, что `DATABASE_URL` указывает на `localhost:5433`;
- применялись ли миграции через `prisma:deploy`.

Если frontend не обновил стили:

- обнови страницу в браузере;
- если не помогло, останови `dev:web` через `Ctrl+C` и запусти снова:

```bash
corepack pnpm dev:web
```

Если `next-env.d.ts` изменился после запуска frontend dev server:

- это автоматическое изменение Next dev tooling;
- перед коммитом проверь `git diff`;
- не коммить это изменение, если оно не связано с задачей.

Если `corepack pnpm build` падает в агентском sandbox на ошибке Turbopack `binding to a port`:

- это ограничение sandbox;
- на обычной машине команду нужно просто запустить из терминала.

## 10. Что читать дальше

- `docs/DEVELOPMENT.md` — инженерный runbook и troubleshooting для dev/test/docs контура.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — где проект находится по глобальному плану.
- `docs/crm-requirements.md` — бизнес-правила CRM.
- `docs/FRONTEND.md` — frontend-направление, mobile/PWA и текущие visual conventions.
