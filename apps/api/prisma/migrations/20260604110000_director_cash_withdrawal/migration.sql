CREATE TABLE "distributor_cash_withdrawal" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_cash_withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "distributor_cash_withdrawal_operationId_key" ON "distributor_cash_withdrawal"("operationId");
CREATE INDEX "distributor_cash_withdrawal_distributorId_idx" ON "distributor_cash_withdrawal"("distributorId");
CREATE INDEX "distributor_cash_withdrawal_actorUserId_idx" ON "distributor_cash_withdrawal"("actorUserId");
CREATE INDEX "distributor_cash_withdrawal_createdAt_idx" ON "distributor_cash_withdrawal"("createdAt");

ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_amount_check" CHECK ("amountCents" > 0);
ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_comment_length_check" CHECK ("comment" IS NULL OR char_length("comment") <= 500);
ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_comment_trim_check" CHECK ("comment" IS NULL OR "comment" = btrim("comment"));
ALTER TABLE "distributor_cash_balance" ADD CONSTRAINT "distributor_cash_balance_amount_check" CHECK ("amountCents" >= 0);

ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "distributor_cash_withdrawal" ADD CONSTRAINT "distributor_cash_withdrawal_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
