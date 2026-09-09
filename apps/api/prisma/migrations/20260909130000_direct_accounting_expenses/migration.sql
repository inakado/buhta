CREATE TABLE "direct_accounting_expense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "spentOn" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "direct_accounting_expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "direct_accounting_expense_amount_positive" CHECK ("amountCents" > 0)
);

CREATE INDEX "direct_accounting_expense_spentOn_deletedAt_idx"
ON "direct_accounting_expense"("spentOn", "deletedAt");

CREATE INDEX "direct_accounting_expense_nameNormalized_spentOn_idx"
ON "direct_accounting_expense"("nameNormalized", "spentOn");
