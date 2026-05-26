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
- retry/idempotency strategy;
- backup/restore policy;
- реальные troubleshooting cases.
