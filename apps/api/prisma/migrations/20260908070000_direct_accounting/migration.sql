CREATE TABLE "direct_accounting_sale" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productNameNormalized" TEXT NOT NULL,
    "soldOn" DATE NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "direct_accounting_sale_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "direct_accounting_sale_quantity_positive" CHECK ("quantityKg" > 0),
    CONSTRAINT "direct_accounting_sale_unit_price_positive" CHECK ("unitPriceCents" > 0)
);

CREATE INDEX "direct_accounting_sale_soldOn_deletedAt_idx"
ON "direct_accounting_sale"("soldOn", "deletedAt");

CREATE INDEX "direct_accounting_sale_productNameNormalized_soldOn_idx"
ON "direct_accounting_sale"("productNameNormalized", "soldOn");
