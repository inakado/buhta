CREATE TABLE "distributor_sale_cancellation" (
    "id" TEXT NOT NULL,
    "distributorSaleId" TEXT NOT NULL,
    "distributorProductBalanceId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "baseUnitPriceCents" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCentsPerUnit" INTEGER NOT NULL DEFAULT 0,
    "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_sale_cancellation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "distributor_sale_cancellation_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "distributor_sale_cancellation_price_check" CHECK ("baseUnitPriceCents" > 0 AND "unitPriceCents" > 0),
    CONSTRAINT "distributor_sale_cancellation_discount_check" CHECK ("discountCentsPerUnit" >= 0 AND "discountTotalCents" >= 0),
    CONSTRAINT "distributor_sale_cancellation_discount_total_check" CHECK ("discountTotalCents" = "quantity" * "discountCentsPerUnit"),
    CONSTRAINT "distributor_sale_cancellation_total_check" CHECK ("totalCents" = "quantity" * "unitPriceCents"),
    CONSTRAINT "distributor_sale_cancellation_payment_method_check" CHECK ("paymentMethod" IN ('cash', 'cashless')),
    CONSTRAINT "distributor_sale_cancellation_reason_check" CHECK (length(btrim("reason")) >= 3)
);

CREATE TABLE "courier_sale_cancellation" (
    "id" TEXT NOT NULL,
    "courierSaleId" TEXT NOT NULL,
    "courierProductBalanceId" TEXT NOT NULL,
    "courierUserId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "baseUnitPriceCents" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCentsPerUnit" INTEGER NOT NULL DEFAULT 0,
    "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_sale_cancellation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "courier_sale_cancellation_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "courier_sale_cancellation_price_check" CHECK ("baseUnitPriceCents" > 0 AND "unitPriceCents" > 0),
    CONSTRAINT "courier_sale_cancellation_discount_check" CHECK ("discountCentsPerUnit" >= 0 AND "discountTotalCents" >= 0),
    CONSTRAINT "courier_sale_cancellation_discount_total_check" CHECK ("discountTotalCents" = "quantity" * "discountCentsPerUnit"),
    CONSTRAINT "courier_sale_cancellation_total_check" CHECK ("totalCents" = "quantity" * "unitPriceCents"),
    CONSTRAINT "courier_sale_cancellation_payment_method_check" CHECK ("paymentMethod" IN ('cash', 'cashless')),
    CONSTRAINT "courier_sale_cancellation_reason_check" CHECK (length(btrim("reason")) >= 3)
);

CREATE UNIQUE INDEX "distributor_sale_cancellation_distributorSaleId_key" ON "distributor_sale_cancellation"("distributorSaleId");
CREATE UNIQUE INDEX "distributor_sale_cancellation_operationId_key" ON "distributor_sale_cancellation"("operationId");
CREATE INDEX "distributor_sale_cancellation_distributorProductBalanceId_idx" ON "distributor_sale_cancellation"("distributorProductBalanceId");
CREATE INDEX "distributor_sale_cancellation_distributorId_idx" ON "distributor_sale_cancellation"("distributorId");
CREATE INDEX "distributor_sale_cancellation_productBatchId_idx" ON "distributor_sale_cancellation"("productBatchId");
CREATE INDEX "distributor_sale_cancellation_clientId_idx" ON "distributor_sale_cancellation"("clientId");
CREATE INDEX "distributor_sale_cancellation_actorUserId_idx" ON "distributor_sale_cancellation"("actorUserId");
CREATE INDEX "distributor_sale_cancellation_createdAt_idx" ON "distributor_sale_cancellation"("createdAt");

CREATE UNIQUE INDEX "courier_sale_cancellation_courierSaleId_key" ON "courier_sale_cancellation"("courierSaleId");
CREATE UNIQUE INDEX "courier_sale_cancellation_operationId_key" ON "courier_sale_cancellation"("operationId");
CREATE INDEX "courier_sale_cancellation_courierProductBalanceId_idx" ON "courier_sale_cancellation"("courierProductBalanceId");
CREATE INDEX "courier_sale_cancellation_courierUserId_idx" ON "courier_sale_cancellation"("courierUserId");
CREATE INDEX "courier_sale_cancellation_productBatchId_idx" ON "courier_sale_cancellation"("productBatchId");
CREATE INDEX "courier_sale_cancellation_clientId_idx" ON "courier_sale_cancellation"("clientId");
CREATE INDEX "courier_sale_cancellation_actorUserId_idx" ON "courier_sale_cancellation"("actorUserId");
CREATE INDEX "courier_sale_cancellation_createdAt_idx" ON "courier_sale_cancellation"("createdAt");

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_distributorSaleId_fkey"
    FOREIGN KEY ("distributorSaleId") REFERENCES "distributor_sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_distributorProductBalanceId_fkey"
    FOREIGN KEY ("distributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_distributorId_fkey"
    FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_productBatchId_fkey"
    FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distributor_sale_cancellation"
    ADD CONSTRAINT "distributor_sale_cancellation_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_courierSaleId_fkey"
    FOREIGN KEY ("courierSaleId") REFERENCES "courier_sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_courierProductBalanceId_fkey"
    FOREIGN KEY ("courierProductBalanceId") REFERENCES "courier_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_courierUserId_fkey"
    FOREIGN KEY ("courierUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_productBatchId_fkey"
    FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_operationId_fkey"
    FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_sale_cancellation"
    ADD CONSTRAINT "courier_sale_cancellation_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
