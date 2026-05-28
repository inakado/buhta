-- AlterTable
ALTER TABLE "user"
ADD COLUMN "username" TEXT,
ADD COLUMN "displayUsername" TEXT,
ADD COLUMN "banned" BOOLEAN DEFAULT false,
ADD COLUMN "banReason" TEXT,
ADD COLUMN "banExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
