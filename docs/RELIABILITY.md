# RELIABILITY

Reliability notes проекта «Бухта».

Статус: `Draft`. Заполняется по мере появления runtime-контура.

## 1. Scope

Документ должен покрывать:

- транзакционность доменных операций;
- идемпотентность write-запросов;
- защиту от двойного выполнения;
- healthchecks и smoke;
- backup/restore для БД;
- troubleshooting реальных runtime-проблем.

## 2. Уже принятые принципы

- Деньги и товар меняются атомарно.
- Продажи, загрузки, сгрузки, списания и корректировки должны быть защищены от повторного выполнения.
- История операций append-only.
- Docker Compose должен поднимать локальный контур одной командой.

## 3. Заполнить после scaffold

- health endpoints;
- smoke сценарии;
- backup/restore policy;
- реальные troubleshooting cases.

## 4. Текущая idempotency baseline

Критичные HTTP write-команды production, distributor и courier контуров требуют header `Idempotency-Key`.

Текущий принцип:

- idempotency key уникален в рамках `actorUserId`;
- key пишется в `operation.idempotencyKey` в той же Prisma transaction, что и бизнес-факт, audit и обновление балансов;
- повтор с тем же ключом откатывается уникальным индексом `operation(actorUserId, idempotencyKey)` и не создает вторую продажу, загрузку, сгрузку, списание или выпуск;
- frontend API client генерирует новый key для каждой write-команды;
- прямые service-level тесты могут вызывать сервисы без key, но HTTP controllers для критичных write endpoints требуют key.

Таблица `idempotency_record` остается baseline-заготовкой для будущего full replay flow с request hash и response snapshot. Текущий runtime-fix закрывает повторное выполнение fail-closed: повтор не возвращает сохраненный response, а не дает создать вторую доменную операцию.
