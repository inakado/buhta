export const BASELINE_OPERATION_TYPES = [
	"foundation.baseline",
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
