CREATE TABLE "direct_accounting_receipt" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productNameNormalized" TEXT NOT NULL,
    "receivedOn" DATE NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "direct_accounting_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "direct_accounting_receipt_quantity_positive" CHECK ("quantityKg" > 0)
);

CREATE INDEX "direct_accounting_receipt_receivedOn_deletedAt_idx"
ON "direct_accounting_receipt"("receivedOn", "deletedAt");

CREATE INDEX "direct_accounting_receipt_productNameNormalized_receivedOn_idx"
ON "direct_accounting_receipt"("productNameNormalized", "receivedOn");
