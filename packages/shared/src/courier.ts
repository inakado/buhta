import { z } from "zod";
import { PaymentMethodSchema } from "./distributor";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const PositiveIntegerSchema = z.number().int().positive();
const OptionalCommentSchema = z.string().trim().max(500).optional();
const CancellationReasonSchema = z.string().trim().min(3).max(500);

export const CourierLoadOptionSchema = z.object({
	distributorProductBalanceId: z.string(),
	distributorId: z.string(),
	distributorName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discounted: z.boolean(),
	discountCentsPerUnit: NonNegativeIntegerSchema,
	availableQuantity: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	updatedAt: z.string(),
});

export type CourierLoadOption = z.infer<typeof CourierLoadOptionSchema>;

export const CourierLoadOptionsResponseSchema = z.object({
	items: z.array(CourierLoadOptionSchema),
});

export type CourierLoadOptionsResponse = z.infer<typeof CourierLoadOptionsResponseSchema>;

export const CreateCourierLoadRequestSchema = z.object({
	distributorProductBalanceId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	courierUserId: z.string().min(1).optional(),
	comment: OptionalCommentSchema,
});

export type CreateCourierLoadRequest = z.infer<typeof CreateCourierLoadRequestSchema>;

export const CourierProductBalanceItemSchema = z.object({
	id: z.string(),
	courierUserId: z.string(),
	courierLogin: z.string(),
	courierDisplayName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discounted: z.boolean(),
	discountCentsPerUnit: NonNegativeIntegerSchema,
	quantity: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	updatedAt: z.string(),
});

export type CourierProductBalanceItem = z.infer<typeof CourierProductBalanceItemSchema>;

export const CourierProductBalancesCourierSummarySchema = z.object({
	courierUserId: z.string(),
	courierLogin: z.string(),
	courierDisplayName: z.string(),
	stockItemCount: NonNegativeIntegerSchema,
	totalUnits: NonNegativeIntegerSchema,
	totalStockValueCents: NonNegativeIntegerSchema,
});

export type CourierProductBalancesCourierSummary = z.infer<
	typeof CourierProductBalancesCourierSummarySchema
>;

export const CourierProductBalancesSummarySchema = z.object({
	courierCount: NonNegativeIntegerSchema,
	stockItemCount: NonNegativeIntegerSchema,
	totalUnits: NonNegativeIntegerSchema,
	totalStockValueCents: NonNegativeIntegerSchema,
});

export type CourierProductBalancesSummary = z.infer<typeof CourierProductBalancesSummarySchema>;

export const CourierProductBalancesResponseSchema = z.object({
	summary: CourierProductBalancesSummarySchema,
	courierSummaries: z.array(CourierProductBalancesCourierSummarySchema),
	items: z.array(CourierProductBalanceItemSchema),
});

export type CourierProductBalancesResponse = z.infer<typeof CourierProductBalancesResponseSchema>;

export const CourierLoadSchema = z.object({
	id: z.string(),
	courierUserId: z.string(),
	distributorProductBalanceId: z.string(),
	distributorId: z.string(),
	productBatchId: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type CourierLoad = z.infer<typeof CourierLoadSchema>;

export const CourierLoadResponseSchema = z.object({
	load: CourierLoadSchema,
	distributorProductBalance: z.object({
		id: z.string(),
		distributorId: z.string(),
		distributorName: z.string(),
		productBatchId: z.string(),
		productName: z.string(),
		baseUnitPriceCents: NonNegativeIntegerSchema,
		unitPriceCents: NonNegativeIntegerSchema,
		discounted: z.boolean(),
		discountCentsPerUnit: NonNegativeIntegerSchema,
		quantity: NonNegativeIntegerSchema,
		stockValueCents: NonNegativeIntegerSchema,
		updatedAt: z.string(),
	}),
	courierProductBalance: CourierProductBalanceItemSchema,
});

export type CourierLoadResponse = z.infer<typeof CourierLoadResponseSchema>;

export const CourierSaleOptionSchema = z.object({
	courierProductBalanceId: z.string(),
	courierUserId: z.string(),
	courierLogin: z.string(),
	courierDisplayName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discounted: z.boolean(),
	discountCentsPerUnit: NonNegativeIntegerSchema,
	availableQuantity: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	updatedAt: z.string(),
});

export type CourierSaleOption = z.infer<typeof CourierSaleOptionSchema>;

export const CourierSaleOptionsResponseSchema = z.object({
	items: z.array(CourierSaleOptionSchema),
});

export type CourierSaleOptionsResponse = z.infer<typeof CourierSaleOptionsResponseSchema>;

export const CreateCourierSaleRequestSchema = z.object({
	courierProductBalanceId: z.string().min(1),
	clientId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	paymentMethod: PaymentMethodSchema,
	courierUserId: z.string().min(1).optional(),
	comment: OptionalCommentSchema,
});

export type CreateCourierSaleRequest = z.infer<typeof CreateCourierSaleRequestSchema>;

export const CancelCourierSaleRequestSchema = z.object({
	reason: CancellationReasonSchema,
});

export type CancelCourierSaleRequest = z.infer<typeof CancelCourierSaleRequestSchema>;

export const CourierCashBalanceItemSchema = z.object({
	courierUserId: z.string(),
	courierLogin: z.string(),
	courierDisplayName: z.string(),
	amountCents: NonNegativeIntegerSchema,
	updatedAt: z.string().nullable(),
});

export type CourierCashBalanceItem = z.infer<typeof CourierCashBalanceItemSchema>;

export const CourierCashBalancesResponseSchema = z.object({
	totalAmountCents: NonNegativeIntegerSchema,
	courierCount: NonNegativeIntegerSchema,
	items: z.array(CourierCashBalanceItemSchema),
});

export type CourierCashBalancesResponse = z.infer<typeof CourierCashBalancesResponseSchema>;

export const CourierSaleSchema = z.object({
	id: z.string(),
	courierProductBalanceId: z.string(),
	courierUserId: z.string(),
	productBatchId: z.string(),
	clientId: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	discountTotalCents: NonNegativeIntegerSchema,
	totalCents: NonNegativeIntegerSchema,
	paymentMethod: PaymentMethodSchema,
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type CourierSale = z.infer<typeof CourierSaleSchema>;

export const CourierSaleResponseSchema = z.object({
	sale: CourierSaleSchema,
	courierProductBalance: CourierProductBalanceItemSchema,
	cashBalance: CourierCashBalanceItemSchema,
});

export type CourierSaleResponse = z.infer<typeof CourierSaleResponseSchema>;

export const CourierSaleCancellationSchema = z.object({
	id: z.string(),
	courierSaleId: z.string(),
	courierProductBalanceId: z.string(),
	courierUserId: z.string(),
	productBatchId: z.string(),
	clientId: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: PositiveIntegerSchema,
	unitPriceCents: PositiveIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	discountTotalCents: NonNegativeIntegerSchema,
	totalCents: NonNegativeIntegerSchema,
	paymentMethod: PaymentMethodSchema,
	reason: CancellationReasonSchema,
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type CourierSaleCancellation = z.infer<typeof CourierSaleCancellationSchema>;

export const CancelCourierSaleResponseSchema = z.object({
	cancellation: CourierSaleCancellationSchema,
	courierProductBalance: CourierProductBalanceItemSchema,
	cashBalance: CourierCashBalanceItemSchema,
});

export type CancelCourierSaleResponse = z.infer<typeof CancelCourierSaleResponseSchema>;

export const CourierRecentSaleItemSchema = z.object({
	id: z.string(),
	sourceType: z.literal("courier"),
	productName: z.string(),
	clientId: z.string(),
	clientName: z.string(),
	clientPhone: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	discountTotalCents: NonNegativeIntegerSchema,
	totalCents: NonNegativeIntegerSchema,
	paymentMethod: PaymentMethodSchema,
	comment: z.string().nullable(),
	saleActorUserId: z.string(),
	saleActorDisplayName: z.string(),
	createdAt: z.string(),
	cancelled: z.boolean(),
	cancellationId: z.string().nullable(),
	cancellationReason: z.string().nullable(),
	cancelledByActorUserId: z.string().nullable(),
	cancelledByActorDisplayName: z.string().nullable(),
	cancelledAt: z.string().nullable(),
});

export type CourierRecentSaleItem = z.infer<typeof CourierRecentSaleItemSchema>;

export const CourierRecentSalesResponseSchema = z.object({
	items: z.array(CourierRecentSaleItemSchema),
});

export type CourierRecentSalesResponse = z.infer<typeof CourierRecentSalesResponseSchema>;

export const CourierUnloadDistributorOptionSchema = z.object({
	distributorId: z.string(),
	distributorName: z.string(),
});

export type CourierUnloadDistributorOption = z.infer<typeof CourierUnloadDistributorOptionSchema>;

export const CourierUnloadProductOptionSchema = z.object({
	courierProductBalanceId: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discounted: z.boolean(),
	discountCentsPerUnit: NonNegativeIntegerSchema,
	availableQuantity: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	updatedAt: z.string(),
});

export type CourierUnloadProductOption = z.infer<typeof CourierUnloadProductOptionSchema>;

export const CourierUnloadOptionsResponseSchema = z.object({
	distributors: z.array(CourierUnloadDistributorOptionSchema),
	productItems: z.array(CourierUnloadProductOptionSchema),
	cashBalance: CourierCashBalanceItemSchema,
});

export type CourierUnloadOptionsResponse = z.infer<typeof CourierUnloadOptionsResponseSchema>;

export const CourierUnloadRequestItemSchema = z.object({
	courierProductBalanceId: z.string().min(1),
	quantity: PositiveIntegerSchema,
});

export type CourierUnloadRequestItem = z.infer<typeof CourierUnloadRequestItemSchema>;

export const CreateCourierUnloadRequestSchema = z.object({
	distributorId: z.string().min(1),
	items: z.array(CourierUnloadRequestItemSchema),
	cashAmountCents: NonNegativeIntegerSchema,
	courierUserId: z.string().min(1).optional(),
	comment: OptionalCommentSchema,
}).superRefine((value, context) => {
	if (value.items.length === 0 && value.cashAmountCents === 0) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Unload must include product items or cash amount",
			path: ["items"],
		});
	}

	const seenBalanceIds = new Set<string>();
	for (const [index, item] of value.items.entries()) {
		if (seenBalanceIds.has(item.courierProductBalanceId)) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Duplicate courier product balance",
				path: ["items", index, "courierProductBalanceId"],
			});
		}
		seenBalanceIds.add(item.courierProductBalanceId);
	}
});

export type CreateCourierUnloadRequest = z.infer<typeof CreateCourierUnloadRequestSchema>;

export const CourierUnloadSchema = z.object({
	id: z.string(),
	courierUserId: z.string(),
	distributorId: z.string(),
	cashAmountCents: NonNegativeIntegerSchema,
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type CourierUnload = z.infer<typeof CourierUnloadSchema>;

export const CourierUnloadItemSchema = z.object({
	id: z.string(),
	courierUnloadId: z.string(),
	courierProductBalanceId: z.string(),
	distributorProductBalanceId: z.string(),
	productBatchId: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
});

export type CourierUnloadItem = z.infer<typeof CourierUnloadItemSchema>;

export const CourierUnloadDistributorProductBalanceSchema = z.object({
	id: z.string(),
	distributorId: z.string(),
	distributorName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	baseUnitPriceCents: NonNegativeIntegerSchema,
	unitPriceCents: NonNegativeIntegerSchema,
	discounted: z.boolean(),
	discountCentsPerUnit: NonNegativeIntegerSchema,
	quantity: NonNegativeIntegerSchema,
	stockValueCents: NonNegativeIntegerSchema,
	updatedAt: z.string(),
});

export type CourierUnloadDistributorProductBalance = z.infer<
	typeof CourierUnloadDistributorProductBalanceSchema
>;

export const CourierUnloadDistributorCashBalanceSchema = z.object({
	distributorId: z.string(),
	distributorName: z.string(),
	amountCents: NonNegativeIntegerSchema,
	updatedAt: z.string().nullable(),
});

export type CourierUnloadDistributorCashBalance = z.infer<
	typeof CourierUnloadDistributorCashBalanceSchema
>;

export const CourierUnloadResponseSchema = z.object({
	unload: CourierUnloadSchema,
	items: z.array(CourierUnloadItemSchema),
	courierProductBalances: z.array(CourierProductBalanceItemSchema),
	courierCashBalance: CourierCashBalanceItemSchema,
	distributorProductBalances: z.array(CourierUnloadDistributorProductBalanceSchema),
	distributorCashBalance: CourierUnloadDistributorCashBalanceSchema,
});

export type CourierUnloadResponse = z.infer<typeof CourierUnloadResponseSchema>;
