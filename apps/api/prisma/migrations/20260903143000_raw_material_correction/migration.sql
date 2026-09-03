CREATE TABLE "raw_material_correction" (
    "id" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "balanceBefore" DECIMAL(12,3) NOT NULL,
    "balanceAfter" DECIMAL(12,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_correction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raw_material_correction_operationId_key" ON "raw_material_correction"("operationId");
CREATE INDEX "raw_material_correction_rawMaterialTypeId_idx" ON "raw_material_correction"("rawMaterialTypeId");
CREATE INDEX "raw_material_correction_actorUserId_idx" ON "raw_material_correction"("actorUserId");
CREATE INDEX "raw_material_correction_createdAt_idx" ON "raw_material_correction"("createdAt");

ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_balance_check" CHECK ("balanceBefore" >= 0 AND "balanceAfter" >= 0 AND "balanceBefore" - "balanceAfter" = "quantity");
ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_reason_length_check" CHECK (char_length("reason") BETWEEN 3 AND 500);
ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_reason_trim_check" CHECK ("reason" = btrim("reason"));
ALTER TABLE "raw_material_balance" ADD CONSTRAINT "raw_material_balance_quantity_check" CHECK ("quantity" >= 0);

ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_rawMaterialTypeId_fkey" FOREIGN KEY ("rawMaterialTypeId") REFERENCES "raw_material_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raw_material_correction" ADD CONSTRAINT "raw_material_correction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
