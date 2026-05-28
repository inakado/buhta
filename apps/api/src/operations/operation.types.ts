export const BASELINE_OPERATION_TYPES = ["foundation.baseline"] as const;

export type BaselineOperationType = (typeof BASELINE_OPERATION_TYPES)[number];

export const OPERATION_STATUS = {
	succeeded: "succeeded",
	failed: "failed",
} as const;

export type OperationStatus = (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];
