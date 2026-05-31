CREATE TABLE "courier_product_balance" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_product_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_load" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "distributorProductBalanceId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_load_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_product_balance_courierUserId_productBatchId_key" ON "courier_product_balance"("courierUserId", "productBatchId");
CREATE INDEX "courier_product_balance_courierUserId_idx" ON "courier_product_balance"("courierUserId");
CREATE INDEX "courier_product_balance_productBatchId_idx" ON "courier_product_balance"("productBatchId");
CREATE UNIQUE INDEX "courier_load_operationId_key" ON "courier_load"("operationId");
CREATE INDEX "courier_load_courierUserId_idx" ON "courier_load"("courierUserId");
CREATE INDEX "courier_load_distributorId_idx" ON "courier_load"("distributorId");
CREATE INDEX "courier_load_productBatchId_idx" ON "courier_load"("productBatchId");
CREATE INDEX "courier_load_actorUserId_idx" ON "courier_load"("actorUserId");
CREATE INDEX "courier_load_createdAt_idx" ON "courier_load"("createdAt");

ALTER TABLE "courier_product_balance" ADD CONSTRAINT "courier_product_balance_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "courier_product_balance" ADD CONSTRAINT "courier_product_balance_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_product_balance" ADD CONSTRAINT "courier_product_balance_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_distributorProductBalanceId_fkey" FOREIGN KEY ("distributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
