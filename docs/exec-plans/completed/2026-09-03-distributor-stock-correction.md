# Корректировка остатка продукции на распределителе

Статус: `Completed`.

## Цель

Дать Директору и администратору безопасно убирать ошибочную или тестовую продукцию с распределителя отдельной аудируемой операцией без фиктивной продажи и удаления истории.

## Scope

- корректировка конкретной строки `DistributorProductBalance` с учетом распределителя, партии и фактической цены;
- ввод количества в кг или штуках через существующий quantity contract;
- только уменьшение, обязательная причина, остаток и стоимость до/после;
- право `operation.correct`, typed fact, operation и audit;
- действие в переиспользуемом директорском экране `Еще → Продажи`;
- обновление inventory, sale options, аналитики и истории.

## Out of scope

- корректировка продукции в цеху или у курьера;
- изменение денег, продаж, цены партии или исходного перемещения;
- увеличение остатка корректировкой;
- отдельный экран корректировок.

## Затронутые документы

- `docs/crm-requirements.md`;
- `docs/FRONTEND.md`;
- `docs/ARCHITECTURE.md`;
- `docs/HANDLER-MAP.md`;
- `docs/SECURITY.md`;
- `docs/DOMAIN-EVENTS.md`.

## Затронутые модули

- `packages/shared/src/distributor.ts`;
- `apps/api/prisma/schema.prisma` и миграция `20260903153000_distributor_stock_correction`;
- `apps/api/src/distributor/*`;
- `apps/api/src/operations/*`;
- `apps/web/src/features/distributor/*` и API client;
- shared, API и web тесты.

## Выполнено

1. Добавлен request/response contract корректировки в shared.
2. Добавлен append-only `distributor_stock_correction` с DB constraints и связями с balance, operation и actor.
3. Реализован `POST /distributor/stock-corrections` с `operation.correct`, canonical quantity и conditional decrement.
4. В директорский экран продаж добавлено компактное действие и dialog с результатом; остальные рабочие роли действие не получают.
5. Операция подключена к общей истории, документация обновлена.

## Проверки

- shared tests: 17 passed;
- API controller/policy tests: 26 passed;
- distributor sales DB integration: 20 passed, включая обычную и дисконтированную priced stock row;
- web tests: 62 passed;
- root lint, typecheck и production build: passed;
- docs harness: passed;
- Prisma validate/generate и локальный migrate deploy: passed;
- React Doctor: 74/100, 7 прежних предупреждений крупных компонентов; новый dialog без диагностик;
- browser smoke: директорский экран и dialog проверены при ширинах 390 и 1440 px, реальные остатки не изменялись.

## Риски и rollback

- Конкурентные списания защищены conditional decrement и DB check `quantity >= 0`.
- Корректировка не меняет наличные и выручку, поэтому не заменяет продажу или отмену продажи.
- После появления production-фактов таблицу корректировок не удалять: записи остаются частью истории.

## Открытые вопросы

Нет.
