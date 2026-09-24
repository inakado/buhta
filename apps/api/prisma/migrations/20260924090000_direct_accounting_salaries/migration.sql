CREATE TABLE "direct_accounting_salary" (
    "id" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "rateBasisPoints" INTEGER NOT NULL,
    "baseRevenueCents" DECIMAL(18,0) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "direct_accounting_salary_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "direct_accounting_salary_period_valid" CHECK ("periodFrom" <= "periodTo"),
    CONSTRAINT "direct_accounting_salary_rate_valid" CHECK ("rateBasisPoints" BETWEEN 1 AND 10000),
    CONSTRAINT "direct_accounting_salary_base_positive" CHECK ("baseRevenueCents" > 0),
    CONSTRAINT "direct_accounting_salary_amount_positive" CHECK ("amountCents" > 0)
);

CREATE INDEX "direct_accounting_salary_periodTo_deletedAt_idx"
ON "direct_accounting_salary"("periodTo", "deletedAt");
