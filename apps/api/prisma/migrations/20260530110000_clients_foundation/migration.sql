CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_phoneNormalized_key" ON "client"("phoneNormalized");
CREATE INDEX "client_name_idx" ON "client"("name");
CREATE INDEX "client_createdByUserId_idx" ON "client"("createdByUserId");

ALTER TABLE "client" ADD CONSTRAINT "client_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
