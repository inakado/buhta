DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "distributor_product_balance" balance
        JOIN "product_batch" batch ON batch."id" = balance."productBatchId"
        WHERE balance."quantity" > 0 AND batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: non-zero distributor product balance references product batch with non-positive price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_product_balance" balance
        JOIN "product_batch" batch ON batch."id" = balance."productBatchId"
        WHERE balance."quantity" > 0 AND batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: non-zero courier product balance references product batch with non-positive price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "product_transfer" transfer
        JOIN "product_batch" batch ON batch."id" = transfer."productBatchId"
        WHERE transfer."quantity" > 0 AND batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: product transfer references product batch with non-positive price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_load" load
        JOIN "product_batch" batch ON batch."id" = load."productBatchId"
        WHERE load."quantity" > 0 AND batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: courier load references product batch with non-positive price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_unload_item" item
        JOIN "product_batch" batch ON batch."id" = item."productBatchId"
        WHERE item."quantity" > 0 AND batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: courier unload item references product batch with non-positive price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "distributor_sale" sale
        JOIN "product_batch" batch ON batch."id" = sale."productBatchId"
        WHERE sale."quantity" > 0 AND (sale."unitPriceCents" <= 0 OR batch."priceCents" <= 0)
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: distributor sale has non-positive sale or base price';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_sale" sale
        JOIN "product_batch" batch ON batch."id" = sale."productBatchId"
        WHERE sale."quantity" > 0 AND (sale."unitPriceCents" <= 0 OR batch."priceCents" <= 0)
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: courier sale has non-positive sale or base price';
    END IF;
END $$;

DELETE FROM "distributor_product_balance" balance
USING "product_batch" batch
WHERE batch."id" = balance."productBatchId"
  AND balance."quantity" = 0
  AND batch."priceCents" <= 0
  AND NOT EXISTS (
      SELECT 1 FROM "distributor_sale" sale
      WHERE sale."distributorProductBalanceId" = balance."id"
  )
  AND NOT EXISTS (
      SELECT 1 FROM "courier_load" load
      WHERE load."distributorProductBalanceId" = balance."id"
  )
  AND NOT EXISTS (
      SELECT 1 FROM "courier_unload_item" item
      WHERE item."distributorProductBalanceId" = balance."id"
  );

DELETE FROM "courier_product_balance" balance
USING "product_batch" batch
WHERE batch."id" = balance."productBatchId"
  AND balance."quantity" = 0
  AND batch."priceCents" <= 0
  AND NOT EXISTS (
      SELECT 1 FROM "courier_sale" sale
      WHERE sale."courierProductBalanceId" = balance."id"
  )
  AND NOT EXISTS (
      SELECT 1 FROM "courier_unload_item" item
      WHERE item."courierProductBalanceId" = balance."id"
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "distributor_product_balance" balance
        JOIN "product_batch" batch ON batch."id" = balance."productBatchId"
        WHERE batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: distributor product balance with non-positive base price remains after cleanup';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "courier_product_balance" balance
        JOIN "product_batch" batch ON batch."id" = balance."productBatchId"
        WHERE batch."priceCents" <= 0
    ) THEN
        RAISE EXCEPTION 'Cannot migrate priced stock: courier product balance with non-positive base price remains after cleanup';
    END IF;
END $$;

ALTER TABLE "distributor_product_balance" ADD COLUMN "unitPriceCents" INTEGER;
ALTER TABLE "courier_product_balance" ADD COLUMN "unitPriceCents" INTEGER;

UPDATE "distributor_product_balance" balance
SET "unitPriceCents" = batch."priceCents"
FROM "product_batch" batch
WHERE batch."id" = balance."productBatchId";

UPDATE "courier_product_balance" balance
SET "unitPriceCents" = batch."priceCents"
FROM "product_batch" batch
WHERE batch."id" = balance."productBatchId";

ALTER TABLE "distributor_product_balance" ALTER COLUMN "unitPriceCents" SET NOT NULL;
ALTER TABLE "courier_product_balance" ALTER COLUMN "unitPriceCents" SET NOT NULL;

ALTER TABLE "distributor_product_balance" DROP CONSTRAINT IF EXISTS "distributor_product_balance_distributorId_productBatchId_key";
ALTER TABLE "courier_product_balance" DROP CONSTRAINT IF EXISTS "courier_product_balance_courierUserId_productBatchId_key";
DROP INDEX IF EXISTS "distributor_product_balance_distributorId_productBatchId_key";
DROP INDEX IF EXISTS "courier_product_balance_courierUserId_productBatchId_key";

CREATE UNIQUE INDEX "distributor_product_balance_distributorId_productBatchId_unitPriceCents_key"
    ON "distributor_product_balance"("distributorId", "productBatchId", "unitPriceCents");
CREATE UNIQUE INDEX "courier_product_balance_courierUserId_productBatchId_unitPriceCents_key"
    ON "courier_product_balance"("courierUserId", "productBatchId", "unitPriceCents");

ALTER TABLE "distributor_product_balance" DROP CONSTRAINT IF EXISTS "distributor_product_balance_quantity_check";
ALTER TABLE "courier_product_balance" DROP CONSTRAINT IF EXISTS "courier_product_balance_quantity_check";

ALTER TABLE "distributor_product_balance" ADD CONSTRAINT "distributor_product_balance_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "distributor_product_balance" ADD CONSTRAINT "distributor_product_balance_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "courier_product_balance" ADD CONSTRAINT "courier_product_balance_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "courier_product_balance" ADD CONSTRAINT "courier_product_balance_unit_price_check" CHECK ("unitPriceCents" > 0);

ALTER TABLE "product_transfer" ADD COLUMN "baseUnitPriceCents" INTEGER;
ALTER TABLE "product_transfer" ADD COLUMN "unitPriceCents" INTEGER;
ALTER TABLE "product_transfer" ADD COLUMN "discountCentsPerUnit" INTEGER;
ALTER TABLE "product_transfer" ADD COLUMN "stockValueCents" INTEGER;

UPDATE "product_transfer" transfer
SET
    "baseUnitPriceCents" = batch."priceCents",
    "unitPriceCents" = batch."priceCents",
    "discountCentsPerUnit" = 0,
    "stockValueCents" = transfer."quantity" * batch."priceCents"
FROM "product_batch" batch
WHERE batch."id" = transfer."productBatchId";

ALTER TABLE "product_transfer" ALTER COLUMN "baseUnitPriceCents" SET NOT NULL;
ALTER TABLE "product_transfer" ALTER COLUMN "unitPriceCents" SET NOT NULL;
ALTER TABLE "product_transfer" ALTER COLUMN "discountCentsPerUnit" SET NOT NULL;
ALTER TABLE "product_transfer" ALTER COLUMN "stockValueCents" SET NOT NULL;
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_discount_check" CHECK ("discountCentsPerUnit" >= 0);
ALTER TABLE "product_transfer" ADD CONSTRAINT "product_transfer_stock_value_check" CHECK ("stockValueCents" = "quantity" * "unitPriceCents");

ALTER TABLE "distributor_sale" ADD COLUMN "baseUnitPriceCents" INTEGER;
ALTER TABLE "distributor_sale" ADD COLUMN "discountCentsPerUnit" INTEGER;
ALTER TABLE "distributor_sale" ADD COLUMN "discountTotalCents" INTEGER;

UPDATE "distributor_sale" sale
SET
    "baseUnitPriceCents" = batch."priceCents",
    "discountCentsPerUnit" = batch."priceCents" - sale."unitPriceCents",
    "discountTotalCents" = sale."quantity" * (batch."priceCents" - sale."unitPriceCents")
FROM "product_batch" batch
WHERE batch."id" = sale."productBatchId";

ALTER TABLE "distributor_sale" ALTER COLUMN "baseUnitPriceCents" SET NOT NULL;
ALTER TABLE "distributor_sale" ALTER COLUMN "discountCentsPerUnit" SET NOT NULL;
ALTER TABLE "distributor_sale" ALTER COLUMN "discountTotalCents" SET NOT NULL;
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_discount_check" CHECK ("discountCentsPerUnit" >= 0 AND "discountTotalCents" >= 0);
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_discount_total_check" CHECK ("discountTotalCents" = "quantity" * "discountCentsPerUnit");
ALTER TABLE "distributor_sale" ADD CONSTRAINT "distributor_sale_total_check" CHECK ("totalCents" = "quantity" * "unitPriceCents");

ALTER TABLE "courier_load" ADD COLUMN "baseUnitPriceCents" INTEGER;
ALTER TABLE "courier_load" ADD COLUMN "unitPriceCents" INTEGER;
ALTER TABLE "courier_load" ADD COLUMN "discountCentsPerUnit" INTEGER;
ALTER TABLE "courier_load" ADD COLUMN "stockValueCents" INTEGER;

UPDATE "courier_load" load
SET
    "baseUnitPriceCents" = batch."priceCents",
    "unitPriceCents" = batch."priceCents",
    "discountCentsPerUnit" = 0,
    "stockValueCents" = load."quantity" * batch."priceCents"
FROM "product_batch" batch
WHERE batch."id" = load."productBatchId";

ALTER TABLE "courier_load" ALTER COLUMN "baseUnitPriceCents" SET NOT NULL;
ALTER TABLE "courier_load" ALTER COLUMN "unitPriceCents" SET NOT NULL;
ALTER TABLE "courier_load" ALTER COLUMN "discountCentsPerUnit" SET NOT NULL;
ALTER TABLE "courier_load" ALTER COLUMN "stockValueCents" SET NOT NULL;
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_discount_check" CHECK ("discountCentsPerUnit" >= 0);
ALTER TABLE "courier_load" ADD CONSTRAINT "courier_load_stock_value_check" CHECK ("stockValueCents" = "quantity" * "unitPriceCents");

ALTER TABLE "courier_sale" ADD COLUMN "baseUnitPriceCents" INTEGER;
ALTER TABLE "courier_sale" ADD COLUMN "discountCentsPerUnit" INTEGER;
ALTER TABLE "courier_sale" ADD COLUMN "discountTotalCents" INTEGER;

UPDATE "courier_sale" sale
SET
    "baseUnitPriceCents" = batch."priceCents",
    "discountCentsPerUnit" = batch."priceCents" - sale."unitPriceCents",
    "discountTotalCents" = sale."quantity" * (batch."priceCents" - sale."unitPriceCents")
FROM "product_batch" batch
WHERE batch."id" = sale."productBatchId";

ALTER TABLE "courier_sale" ALTER COLUMN "baseUnitPriceCents" SET NOT NULL;
ALTER TABLE "courier_sale" ALTER COLUMN "discountCentsPerUnit" SET NOT NULL;
ALTER TABLE "courier_sale" ALTER COLUMN "discountTotalCents" SET NOT NULL;
ALTER TABLE "courier_sale" DROP CONSTRAINT IF EXISTS "courier_sale_unit_price_check";
ALTER TABLE "courier_sale" DROP CONSTRAINT IF EXISTS "courier_sale_total_check";
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_discount_check" CHECK ("discountCentsPerUnit" >= 0 AND "discountTotalCents" >= 0);
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_discount_total_check" CHECK ("discountTotalCents" = "quantity" * "discountCentsPerUnit");
ALTER TABLE "courier_sale" ADD CONSTRAINT "courier_sale_total_check" CHECK ("totalCents" = "quantity" * "unitPriceCents");

ALTER TABLE "courier_unload_item" ADD COLUMN "baseUnitPriceCents" INTEGER;
ALTER TABLE "courier_unload_item" ADD COLUMN "discountCentsPerUnit" INTEGER;

UPDATE "courier_unload_item" item
SET
    "baseUnitPriceCents" = batch."priceCents",
    "unitPriceCents" = batch."priceCents",
    "discountCentsPerUnit" = 0,
    "stockValueCents" = item."quantity" * batch."priceCents"
FROM "product_batch" batch
WHERE batch."id" = item."productBatchId";

ALTER TABLE "courier_unload_item" ALTER COLUMN "baseUnitPriceCents" SET NOT NULL;
ALTER TABLE "courier_unload_item" ALTER COLUMN "discountCentsPerUnit" SET NOT NULL;
ALTER TABLE "courier_unload_item" DROP CONSTRAINT IF EXISTS "courier_unload_item_unit_price_check";
ALTER TABLE "courier_unload_item" DROP CONSTRAINT IF EXISTS "courier_unload_item_stock_value_check";
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_unit_price_check" CHECK ("unitPriceCents" > 0);
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_discount_check" CHECK ("discountCentsPerUnit" >= 0);
ALTER TABLE "courier_unload_item" ADD CONSTRAINT "courier_unload_item_stock_value_check" CHECK ("stockValueCents" = "quantity" * "unitPriceCents");

CREATE TABLE "product_discount_assignment" (
    "id" TEXT NOT NULL,
    "sourceDistributorProductBalanceId" TEXT NOT NULL,
    "discountedDistributorProductBalanceId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "baseUnitPriceCents" INTEGER NOT NULL,
    "sourceUnitPriceCents" INTEGER NOT NULL,
    "discountedUnitPriceCents" INTEGER NOT NULL,
    "discountCentsPerUnit" INTEGER NOT NULL,
    "stepDiscountCentsPerUnit" INTEGER NOT NULL,
    "discountTotalCents" INTEGER NOT NULL,
    "comment" TEXT,
    "operationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_discount_assignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_discount_assignment_operationId_key" ON "product_discount_assignment"("operationId");
CREATE INDEX "product_discount_assignment_source_idx" ON "product_discount_assignment"("sourceDistributorProductBalanceId");
CREATE INDEX "product_discount_assignment_discounted_idx" ON "product_discount_assignment"("discountedDistributorProductBalanceId");
CREATE INDEX "product_discount_assignment_distributor_idx" ON "product_discount_assignment"("distributorId");
CREATE INDEX "product_discount_assignment_product_batch_idx" ON "product_discount_assignment"("productBatchId");
CREATE INDEX "product_discount_assignment_actor_idx" ON "product_discount_assignment"("actorUserId");
CREATE INDEX "product_discount_assignment_created_at_idx" ON "product_discount_assignment"("createdAt");

ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_price_check" CHECK ("baseUnitPriceCents" > 0 AND "sourceUnitPriceCents" > 0 AND "discountedUnitPriceCents" > 0);
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_price_order_check" CHECK ("sourceUnitPriceCents" > "discountedUnitPriceCents" AND "baseUnitPriceCents" > "discountedUnitPriceCents");
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_discount_check" CHECK ("discountCentsPerUnit" = "baseUnitPriceCents" - "discountedUnitPriceCents" AND "stepDiscountCentsPerUnit" = "sourceUnitPriceCents" - "discountedUnitPriceCents");
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_discount_total_check" CHECK ("discountTotalCents" = "quantity" * "discountCentsPerUnit");
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_comment_length_check" CHECK ("comment" IS NULL OR char_length("comment") <= 500);
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_comment_trim_check" CHECK ("comment" IS NULL OR "comment" = btrim("comment"));

ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_source_fkey" FOREIGN KEY ("sourceDistributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_discounted_fkey" FOREIGN KEY ("discountedDistributorProductBalanceId") REFERENCES "distributor_product_balance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_distributor_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_product_batch_fkey" FOREIGN KEY ("productBatchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_operation_fkey" FOREIGN KEY ("operationId") REFERENCES "operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_discount_assignment" ADD CONSTRAINT "product_discount_assignment_actor_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
