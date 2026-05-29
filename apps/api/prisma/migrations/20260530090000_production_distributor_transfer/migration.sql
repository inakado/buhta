CREATE TABLE "workshop_product_balance" (
    "id" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_product_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distributor_product_balance" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_product_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_transfer" (
    "id" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_transfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_product_balance_productBatchId_key" ON "workshop_product_balance"("productBatchId");
CREATE UNIQUE INDEX "distributor_product_balance_distributorId_productBatchId_key" ON "distributor_product_balance"("distributorId", "productBatchId");
CREATE INDEX "distributor_product_balance_distributorId_idx" ON "distributor_product_balance"("distributorId");
CREATE INDEX "distributor_product_balance_productBatchId_idx" ON "distributor_product_balance"("productBatchId");
CREATE UNIQUE INDEX "product_transfer_operationId_key" ON "product_transfer"("operationId");
CREATE INDEX "product_transfer_productBatchId_idx" ON "product_transfer"("productBatchId");
CREATE INDEX "product_transfer_distributorId_idx" ON "product_transfer"("distributorId");
CREATE INDEX "product_transfer_actorUserId_idx" ON "product_transfer"("actorUserId");

ALTER TABLE "workshop_product_balance" ADD CONSTRAINT "workshop_product_balance_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_product_balance" ADD CONSTRAINT "distributor_product_balance_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_product_balance" ADD CONSTRAINT "distributor_product_balance_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "workshop_product_balance" ("id", "productBatchId", "quantity", "updatedAt")
SELECT 'wpb_' || "id", "id", "quantity", CURRENT_TIMESTAMP
FROM "product_batch"
WHERE "quantity" > 0
ON CONFLICT ("productBatchId") DO NOTHING;
