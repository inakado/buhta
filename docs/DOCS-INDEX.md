# DOCS-INDEX

Карта документации проекта «Бухта».

## Основные документы

- `AGENTS.md` — правила работы агента с репозиторием и документацией.
- `docs/crm-requirements.md` — основной документ бизнес-требований CRM.
- `docs/ARCHITECTURE-PRINCIPLES.md` — общие архитектурные и инженерные принципы.
- `docs/TECH-STACK.md` — выбранный базовый стек, auth-направление и Docker-dev принцип.
- `docs/DEVELOPMENT.md` — dev/test/docs runbook и целевой Docker-contour.
- `docs/FOR-HUMANS.md` — короткая человеческая инструкция: как поднять dev-версию, API, frontend, БД и прогнать проверки.
- `docs/DECISIONS.md` — короткий журнал принятых архитектурных решений.
- `docs/PLANS.md` — правила execution plans и lifecycle инициатив.
- `docs/ARCHITECTURE.md` — placeholder для будущей карты модулей и потоков данных.
- `docs/SECURITY.md` — placeholder для auth/security решений после scaffold.
- `docs/FRONTEND.md` — placeholder для frontend conventions после первых экранов.
- `docs/RELIABILITY.md` — placeholder для runtime/reliability notes.
- `docs/DOMAIN-EVENTS.md` — placeholder для будущего audit/event каталога.
- `docs/HANDLER-MAP.md` — placeholder для карты API handlers после scaffold.
- `docs/QUALITY_SCORE.md` — черновая шкала оценки зрелости проекта.
- `docs/exec-plans/deferred-roadmap.md` — отложенные идеи, которые не являются активной задачей.
- `docs/exec-plans/tech-debt-tracker.md` — признанный техдолг после появления кода или harness.
- `docs/exec-plans/active/2026-05-27-v1-roadmap.md` — долгоживущая roadmap/meta-plan полной v1.
- `docs/exec-plans/completed/2026-05-29-production-distributor-transfer.md` — завершенный этап Production → Distributor Transfer: перемещение продукции из цеха на распределитель.
- `docs/exec-plans/completed/2026-05-29-production-intake-and-release.md` — завершенный план производственного baseline: цена шаблона, поступления сырья/тары, выпуск партии.
- `docs/exec-plans/completed/2026-05-28-catalog-foundation.md` — завершенный этап справочников: сырье, тара, распределители, шаблоны продукции.
- `docs/exec-plans/completed/2026-05-28-admin-login-and-mobile-shell.md` — завершенный этап: admin-managed login/password, пользователи, mobile/PWA shell.
- `docs/exec-plans/completed/2026-05-28-architecture-baseline-and-domain-core.md` — завершенный план первого кодового этапа: architecture baseline, domain core, BetterAuth + policy integration.
- `docs/diagrams/business-flow.d2` — редактируемый исходник диаграммы бизнес-процесса.
- `docs/diagrams/business-flow.png` — PNG-версия диаграммы для просмотра.

## Структура и назначение

Текущий набор документов разделен на source-of-truth документы и placeholder-документы, которые будут заполняться после scaffold и появления кода.

Source-of-truth сейчас:

- `docs/crm-requirements.md`
- `docs/ARCHITECTURE-PRINCIPLES.md`
- `docs/TECH-STACK.md`
- `docs/DEVELOPMENT.md`
- `docs/DECISIONS.md`
- `docs/PLANS.md`

Placeholder-документы:

- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/FRONTEND.md`
- `docs/RELIABILITY.md`
- `docs/DOMAIN-EVENTS.md`
- `docs/HANDLER-MAP.md`
- `docs/QUALITY_SCORE.md`

Placeholder-документы не должны фиксировать решения заранее. Их нужно заполнять только по мере появления кода, API, схемы БД, UI и проверочного контура.

## Docs Harness

В проекте должна появиться команда `docs:check`, которая проверяет:

- битые ссылки на документы и файлы;
- что все актуальные SoR-документы перечислены в этом индексе;
- что ключевые документы содержат обязательные разделы;
- что в активной документации нет терминов и путей старых проектов.

После появления приложения эта проверка должна входить в общий набор pre-commit/PR verification вместе с тестами.
