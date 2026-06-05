CREATE INDEX "audit_log_createdAt_id_idx" ON "audit_log" ("createdAt" DESC, "id" DESC);
CREATE INDEX "audit_log_action_createdAt_idx" ON "audit_log" ("action", "createdAt" DESC);
CREATE INDEX "audit_log_actorUserId_createdAt_id_idx" ON "audit_log" ("actorUserId", "createdAt" DESC, "id" DESC);
CREATE INDEX "audit_log_entityType_createdAt_id_idx" ON "audit_log" ("entityType", "createdAt" DESC, "id" DESC);
CREATE INDEX "operation_type_createdAt_idx" ON "operation" ("type", "createdAt" DESC);
