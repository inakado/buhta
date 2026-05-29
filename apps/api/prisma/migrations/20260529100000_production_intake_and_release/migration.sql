ALTER TABLE "product_template" ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "raw_material_balance" (
    "id" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "packaging_balance" (
    "id" TEXT NOT NULL,
    "packagingTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_balance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "raw_material_intake" (
    "id" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_intake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "packaging_intake" (
    "id" TEXT NOT NULL,
    "packagingTypeId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packaging_intake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_batch" (
    "id" TEXT NOT NULL,
    "productTemplateId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "rawMaterialTypeName" TEXT NOT NULL,
    "rawMaterialUnit" TEXT NOT NULL,
    "packagingTypeId" TEXT NOT NULL,
    "packagingTypeName" TEXT NOT NULL,
    "packagingUnit" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "consumedRawMaterialQuantity" DECIMAL(12,3) NOT NULL,
    "consumedPackagingQuantity" DECIMAL(12,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_workshop',
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_batch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raw_material_balance_rawMaterialTypeId_key" ON "raw_material_balance"("rawMaterialTypeId");
CREATE UNIQUE INDEX "packaging_balance_packagingTypeId_key" ON "packaging_balance"("packagingTypeId");
CREATE UNIQUE INDEX "raw_material_intake_operationId_key" ON "raw_material_intake"("operationId");
CREATE INDEX "raw_material_intake_rawMaterialTypeId_idx" ON "raw_material_intake"("rawMaterialTypeId");
CREATE INDEX "raw_material_intake_actorUserId_idx" ON "raw_material_intake"("actorUserId");
CREATE UNIQUE INDEX "packaging_intake_operationId_key" ON "packaging_intake"("operationId");
CREATE INDEX "packaging_intake_packagingTypeId_idx" ON "packaging_intake"("packagingTypeId");
CREATE INDEX "packaging_intake_actorUserId_idx" ON "packaging_intake"("actorUserId");
CREATE UNIQUE INDEX "product_batch_operationId_key" ON "product_batch"("operationId");
CREATE INDEX "product_batch_productTemplateId_idx" ON "product_batch"("productTemplateId");
CREATE INDEX "product_batch_actorUserId_idx" ON "product_batch"("actorUserId");
CREATE INDEX "product_batch_status_idx" ON "product_batch"("status");

ALTER TABLE "raw_material_balance" ADD CONSTRAINT "raw_material_balance_rawMaterialTypeId_fkey" FOREIGN KEY ("rawMaterialTypeId") REFERENCES "raw_material_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packaging_balance" ADD CONSTRAINT "packaging_balance_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raw_material_intake" ADD CONSTRAINT "raw_material_intake_rawMaterialTypeId_fkey" FOREIGN KEY ("rawMaterialTypeId") REFERENCES "raw_material_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "raw_material_intake" ADD CONSTRAINT "raw_material_intake_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packaging_intake" ADD CONSTRAINT "packaging_intake_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "packaging_intake" ADD CONSTRAINT "packaging_intake_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_batch" ADD CONSTRAINT "product_batch_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "product_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_batch" ADD CONSTRAINT "product_batch_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
