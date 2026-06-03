CREATE TABLE "courier_unload" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "cashAmountCents" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_unload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_unload_item" (
    "id" TEXT NOT NULL,
    "courierUnloadId" TEXT NOT NULL,
    "courierProductBalanceId" TEXT NOT NULL,
    "distributorProductBalanceId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "stockValueCents" INTEGER NOT NULL,

    CONSTRAINT "courier_unload_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_unload_operationId_key" ON "courier_unload"("operationId");
CREATE INDEX "courier_unload_courierUserId_idx" ON "courier_unload"("courierUserId");
CREATE INDEX "courier_unload_distributorId_idx" ON "courier_unload"("distributorId");
CREATE INDEX "courier_unload_actorUserId_idx" ON "courier_unload"("actorUserId");
CREATE INDEX "courier_unload_createdAt_idx" ON "courier_unload"("createdAt");
CREATE UNIQUE INDEX "courier_unload_item_courierUnloadId_courierProductBalanceId_key" ON "courier_unload_item"("courierUnloadId", "courierProductBalanceId");
CREATE INDEX "courier_unload_item_courierProductBalanceId_idx" ON "courier_unload_item"("courierProductBalanceId");
CREATE INDEX "courier_unload_item_distributorProductBalanceId_idx" ON "courier_unload_item"("distributorProductBalanceId");
CREATE INDEX "courier_unload_item_productBatchId_idx" ON "courier_unload_item"("productBatchId");

ALTER TABLE "courier_unload" ADD CONSTRAINT "courier_unload_cash_amount_check" CHECK ("cashAmountCents" >= 0);
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_unit_price_check" CHECK ("unitPriceCents" >= 0);
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_stock_value_check" CHECK ("stockValueCents" >= 0);
ALTER TABLE "courier_unload" ADD CONSTRAINT "courier_unload_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload" ADD CONSTRAINT "courier_unload_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload" ADD CONSTRAINT "courier_unload_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_courierUnloadId_fkey" FOREIGN KEY ("courierUnloadId") REFERENCES "courier_unload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_courierProductBalanceId_fkey" FOREIGN KEY ("courierProductBalanceId") REFERENCES "courier_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_distributorProductBalanceId_fkey" FOREIGN KEY ("distributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
