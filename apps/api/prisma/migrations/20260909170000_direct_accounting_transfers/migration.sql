CREATE TABLE "direct_accounting_transfer" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "transferredOn" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "direct_accounting_transfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "direct_accounting_transfer_amount_positive" CHECK ("amountCents" > 0)
);

CREATE INDEX "direct_accounting_transfer_transferredOn_deletedAt_idx"
ON "direct_accounting_transfer"("transferredOn", "deletedAt");
