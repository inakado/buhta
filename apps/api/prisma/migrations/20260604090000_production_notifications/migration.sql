-- CreateTable
CREATE TABLE "production_notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdByUserId" TEXT NOT NULL,
    "completedByUserId" TEXT,
    "createOperationId" TEXT NOT NULL,
    "completeOperationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "production_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_notification_createOperationId_key" ON "production_notification"("createOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "production_notification_completeOperationId_key" ON "production_notification"("completeOperationId");

-- CreateIndex
CREATE INDEX "production_notification_status_idx" ON "production_notification"("status");

-- CreateIndex
CREATE INDEX "production_notification_createdByUserId_idx" ON "production_notification"("createdByUserId");

-- CreateIndex
CREATE INDEX "production_notification_completedByUserId_idx" ON "production_notification"("completedByUserId");

-- CreateIndex
CREATE INDEX "production_notification_createdAt_idx" ON "production_notification"("createdAt");

-- CreateIndex
CREATE INDEX "production_notification_completedAt_idx" ON "production_notification"("completedAt");

-- AddForeignKey
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_createOperationId_fkey" FOREIGN KEY ("createOperationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_completeOperationId_fkey" FOREIGN KEY ("completeOperationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_status_check" CHECK ("status" IN ('new', 'completed'));
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_message_not_blank_check" CHECK (length(btrim("message")) > 0);
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_message_length_check" CHECK (char_length("message") <= 1000);
ALTER TABLE "production_notification" ADD CONSTRAINT "production_notification_completed_consistency_check" CHECK (
    ("status" = 'new' AND "completedByUserId" IS NULL AND "completedAt" IS NULL AND "completeOperationId" IS NULL)
    OR
    ("status" = 'completed' AND "completedByUserId" IS NOT NULL AND "completedAt" IS NOT NULL AND "completeOperationId" IS NOT NULL)
);
