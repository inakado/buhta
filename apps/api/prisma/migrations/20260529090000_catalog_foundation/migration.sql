CREATE TABLE "raw_material_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_type_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "packaging_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_type_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rawMaterialTypeId" TEXT NOT NULL,
    "packagingTypeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_template_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "raw_material_type_name_key" ON "raw_material_type"("name");
CREATE UNIQUE INDEX "packaging_type_name_key" ON "packaging_type"("name");
CREATE UNIQUE INDEX "distributor_name_key" ON "distributor"("name");
CREATE UNIQUE INDEX "product_template_name_key" ON "product_template"("name");
CREATE INDEX "product_template_rawMaterialTypeId_idx" ON "product_template"("rawMaterialTypeId");
CREATE INDEX "product_template_packagingTypeId_idx" ON "product_template"("packagingTypeId");

ALTER TABLE "product_template" ADD CONSTRAINT "product_template_rawMaterialTypeId_fkey" FOREIGN KEY ("rawMaterialTypeId") REFERENCES "raw_material_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_template" ADD CONSTRAINT "product_template_packagingTypeId_fkey" FOREIGN KEY ("packagingTypeId") REFERENCES "packaging_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
