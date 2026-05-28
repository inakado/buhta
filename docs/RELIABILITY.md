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

Для критичных write-команд вводится таблица `idempotency_record`.

Текущий принцип:

- idempotency key уникален в рамках `actorUserId`;
- request hash считается детерминированно по command payload;
- повтор с тем же ключом и тем же payload возвращает уже созданную operation;
- повтор с тем же ключом и другим payload отклоняется ошибкой `IDEMPOTENCY_CONFLICT`;
- запись idempotency, `operation` и `audit_log` создаются в одной Prisma transaction.

Политика хранения и очистки старых idempotency records пока не автоматизирована. Baseline использует `expiresAt`; реальный cleanup нужно добавить перед появлением production write-команд.
