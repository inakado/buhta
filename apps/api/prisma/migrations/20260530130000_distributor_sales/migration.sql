CREATE TABLE "distributor_cash_balance" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_cash_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distributor_sale" (
    "id" TEXT NOT NULL,
    "distributorProductBalanceId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
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

    CONSTRAINT "distributor_sale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "distributor_cash_balance_distributorId_key" ON "distributor_cash_balance"("distributorId");
CREATE UNIQUE INDEX "distributor_sale_operationId_key" ON "distributor_sale"("operationId");
CREATE INDEX "distributor_sale_distributorId_idx" ON "distributor_sale"("distributorId");
CREATE INDEX "distributor_sale_productBatchId_idx" ON "distributor_sale"("productBatchId");
CREATE INDEX "distributor_sale_clientId_idx" ON "distributor_sale"("clientId");
CREATE INDEX "distributor_sale_actorUserId_idx" ON "distributor_sale"("actorUserId");
CREATE INDEX "distributor_sale_createdAt_idx" ON "distributor_sale"("createdAt");

ALTER TABLE "distributor_cash_balance" ADD CONSTRAINT "distributor_cash_balance_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_distributorProductBalanceId_fkey" FOREIGN KEY ("distributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
