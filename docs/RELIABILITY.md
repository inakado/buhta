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

## 5. Audit append-only guard

`audit_log` защищен database trigger-ом `audit_log_append_only_guard`: обычный runtime `UPDATE` и `DELETE` запрещены. Для миграций и тестового cleanup допускается явный session flag `buhta.allow_audit_log_mutation = 'on'`.

Production release/transfer больше не обновляет audit row после создания: id партии или перемещения генерируется до audit insert и сразу пишется как `entityId`. Catalog mutations пишут справочник и audit operation в одной Prisma transaction.

## 6. Production backup and rollback baseline

Первый production deploy использует `deploy/compose.prod.yml` и runbook `docs/DEPLOYMENT.md`.

Reliability baseline:

- перед каждым deploy выполняется `pg_dump -Fc` через `deploy/backup-postgres.sh`;
- backups лежат на сервере в `/opt/buhta/backups/postgres/`;
- deploy запускает Prisma migrations до restart приложения;
- после restart проверяется `https://buhta-crm.ru/health`;
- rollback приложения выполняется по предыдущему image tag через `deploy/rollback.sh`;
- database rollback автоматом не выполняется: восстановление из backup остается ручной операцией до отдельного production-hardening этапа.

Перед hardening нужно добавить ежедневный backup timer и отдельную restore-check процедуру.
