CREATE TABLE "courier_cash_balance" (
    "id" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_cash_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_sale" (
    "id" TEXT NOT NULL,
    "courierProductBalanceId" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_sale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courier_cash_balance_courierUserId_key" ON "courier_cash_balance"("courierUserId");
CREATE UNIQUE INDEX "courier_sale_operationId_key" ON "courier_sale"("operationId");
CREATE INDEX "courier_sale_courierProductBalanceId_idx" ON "courier_sale"("courierProductBalanceId");
CREATE INDEX "courier_sale_courierUserId_idx" ON "courier_sale"("courierUserId");
CREATE INDEX "courier_sale_productBatchId_idx" ON "courier_sale"("productBatchId");
CREATE INDEX "courier_sale_clientId_idx" ON "courier_sale"("clientId");
CREATE INDEX "courier_sale_actorUserId_idx" ON "courier_sale"("actorUserId");
CREATE INDEX "courier_sale_createdAt_idx" ON "courier_sale"("createdAt");

ALTER TABLE "courier_cash_balance" ADD CONSTRAINT "courier_cash_balance_amount_check" CHECK ("amountCents" >= 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_unit_price_check" CHECK ("unitPriceCents" >= 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_total_check" CHECK ("totalCents" >= 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_payment_method_check" CHECK ("paymentMethod" IN ('cash', 'cashless'));
ALTER TABLE "courier_cash_balance" ADD CONSTRAINT "courier_cash_balance_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_courierProductBalanceId_fkey" FOREIGN KEY ("courierProductBalanceId") REFERENCES "courier_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_courierUserId_fkey" FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
