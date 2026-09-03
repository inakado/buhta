CREATE TABLE "distributor_stock_correction" (
    "id" TEXT NOT NULL,
    "distributorProductBalanceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "netWeightGrams" INTEGER NOT NULL,
    "totalNetWeightGrams" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "stockValueBeforeCents" INTEGER NOT NULL,
    "stockValueAfterCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_stock_correction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "distributor_stock_correction_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "distributor_stock_correction_net_weight_check" CHECK ("netWeightGrams" > 0 AND "totalNetWeightGrams" = "quantity" * "netWeightGrams"),
    CONSTRAINT "distributor_stock_correction_price_check" CHECK ("unitPriceCents" > 0),
    CONSTRAINT "distributor_stock_correction_balance_check" CHECK ("balanceBefore" >= 0 AND "balanceAfter" >= 0 AND "balanceBefore" - "balanceAfter" = "quantity"),
    CONSTRAINT "distributor_stock_correction_value_check" CHECK ("stockValueBeforeCents" = "balanceBefore" * "unitPriceCents" AND "stockValueAfterCents" = "balanceAfter" * "unitPriceCents"),
    CONSTRAINT "distributor_stock_correction_reason_length_check" CHECK (char_length("reason") BETWEEN 3 AND 500),
    CONSTRAINT "distributor_stock_correction_reason_trim_check" CHECK ("reason" = btrim("reason"))
);

CREATE UNIQUE INDEX "distributor_stock_correction_operationId_key" ON "distributor_stock_correction"("operationId");
CREATE INDEX "distributor_stock_correction_distributorProductBalanceId_idx" ON "distributor_stock_correction"("distributorProductBalanceId");
CREATE INDEX "distributor_stock_correction_actorUserId_idx" ON "distributor_stock_correction"("actorUserId");
CREATE INDEX "distributor_stock_correction_createdAt_idx" ON "distributor_stock_correction"("createdAt");

ALTER TABLE "distributor_stock_correction" ADD CONSTRAINT "distributor_stock_correction_distributorProductBalanceId_fkey" FOREIGN KEY ("distributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_stock_correction" ADD CONSTRAINT "distributor_stock_correction_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_stock_correction" ADD CONSTRAINT "distributor_stock_correction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
