export const BASELINE_OPERATION_TYPES = [
	"foundation.baseline",
	"catalog.distributor.archive",
	"catalog.distributor.create",
	"catalog.distributor.update",
	"catalog.packaging_type.archive",
	"catalog.packaging_type.create",
	"catalog.packaging_type.update",
	"catalog.product_template.archive",
	"catalog.product_template.create",
	"catalog.product_template.update",
	"catalog.raw_material_type.archive",
	"catalog.raw_material_type.create",
	"catalog.raw_material_type.update",
	"client.create",
	"client.update",
	"courier.sale.create",
	"courier.stock.load.create",
	"courier.unload.create",
	"distributor.cash.withdraw",
	"distributor.sale.create",
	"production.notification.complete",
	"production.notification.create",
	"production.packaging_intake.create",
	"production.product_batch.create",
	"production.product_transfer.create",
	"production.raw_material_intake.create",
	"user.create",
	"user.role.update",
	"user.password.reset",
] as const;

export type BaselineOperationType = (typeof BASELINE_OPERATION_TYPES)[number];

export const OPERATION_STATUS = {
	succeeded: "succeeded",
	failed: "failed",
} as const;

export type OperationStatus = (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];
