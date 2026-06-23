ALTER TABLE "product_template"
ADD COLUMN "netWeightGrams" INTEGER NOT NULL DEFAULT 200;

ALTER TABLE "product_batch"
ADD COLUMN "netWeightGrams" INTEGER NOT NULL DEFAULT 200;

ALTER TABLE "product_template"
ADD CONSTRAINT "product_template_netWeightGrams_positive" CHECK ("netWeightGrams" > 0);

ALTER TABLE "product_batch"
ADD CONSTRAINT "product_batch_netWeightGrams_positive" CHECK ("netWeightGrams" > 0);
