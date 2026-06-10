import { z } from "zod";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const PositiveIntegerSchema = z.number().int().positive();
const OptionalCommentSchema = z.string().trim().max(500).optional();
const CancellationReasonSchema = z.string().trim().min(3).max(500);

export const PaymentMethodSchema = z.enum(["cash", "cashless"]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const DistributorInventoryItemSchema = z.object({
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

export type DistributorInventoryItem = z.infer<typeof DistributorInventoryItemSchema>;

export const DistributorInventoryDistributorSummarySchema = z.object({
	distributorId: z.string(),
	distributorName: z.string(),
	stockItemCount: NonNegativeIntegerSchema,
	totalUnits: NonNegativeIntegerSchema,
	totalStockValueCents: NonNegativeIntegerSchema,
});

export type DistributorInventoryDistributorSummary = z.infer<
	typeof DistributorInventoryDistributorSummarySchema
>;

export const DistributorInventorySummarySchema = z.object({
	distributorCount: NonNegativeIntegerSchema,
	stockItemCount: NonNegativeIntegerSchema,
	totalUnits: NonNegativeIntegerSchema,
	totalStockValueCents: NonNegativeIntegerSchema,
});

export type DistributorInventorySummary = z.infer<typeof DistributorInventorySummarySchema>;

export const DistributorInventoryResponseSchema = z.object({
	summary: DistributorInventorySummarySchema,
	distributorSummaries: z.array(DistributorInventoryDistributorSummarySchema),
	items: z.array(DistributorInventoryItemSchema),
});

export type DistributorInventoryResponse = z.infer<typeof DistributorInventoryResponseSchema>;

export const DistributorSaleStockItemSchema = z.object({
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

export type DistributorSaleStockItem = z.infer<typeof DistributorSaleStockItemSchema>;

export const DistributorSaleOptionsResponseSchema = z.object({
	items: z.array(DistributorSaleStockItemSchema),
});

export type DistributorSaleOptionsResponse = z.infer<typeof DistributorSaleOptionsResponseSchema>;

export const CreateDistributorSaleRequestSchema = z.object({
	distributorProductBalanceId: z.string().min(1),
	clientId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	paymentMethod: PaymentMethodSchema,
	comment: OptionalCommentSchema,
});

export type CreateDistributorSaleRequest = z.infer<typeof CreateDistributorSaleRequestSchema>;

export const CancelDistributorSaleRequestSchema = z.object({
	reason: CancellationReasonSchema,
});

export type CancelDistributorSaleRequest = z.infer<typeof CancelDistributorSaleRequestSchema>;

export const DistributorCashBalanceItemSchema = z.object({
	distributorId: z.string(),
	distributorName: z.string(),
	active: z.boolean(),
	amountCents: NonNegativeIntegerSchema,
	updatedAt: z.string().nullable(),
});

export type DistributorCashBalanceItem = z.infer<typeof DistributorCashBalanceItemSchema>;

export const DistributorCashBalancesResponseSchema = z.object({
	totalAmountCents: NonNegativeIntegerSchema,
	items: z.array(DistributorCashBalanceItemSchema),
});

export type DistributorCashBalancesResponse = z.infer<typeof DistributorCashBalancesResponseSchema>;

export const CreateDistributorCashWithdrawalRequestSchema = z.object({
	distributorId: z.string().min(1),
	amountCents: PositiveIntegerSchema,
	comment: OptionalCommentSchema,
});

export type CreateDistributorCashWithdrawalRequest = z.infer<
	typeof CreateDistributorCashWithdrawalRequestSchema
>;

export const DistributorCashWithdrawalSchema = z.object({
	id: z.string(),
	distributorId: z.string(),
	amountCents: PositiveIntegerSchema,
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type DistributorCashWithdrawal = z.infer<typeof DistributorCashWithdrawalSchema>;

export const DistributorCashWithdrawalResponseSchema = z.object({
	withdrawal: DistributorCashWithdrawalSchema,
	cashBalance: DistributorCashBalanceItemSchema,
});

export type DistributorCashWithdrawalResponse = z.infer<
	typeof DistributorCashWithdrawalResponseSchema
>;

export const AssignDistributorDiscountRequestSchema = z.object({
	distributorProductBalanceId: z.string().min(1),
	quantity: PositiveIntegerSchema,
	discountedUnitPriceCents: PositiveIntegerSchema,
	comment: OptionalCommentSchema,
});

export type AssignDistributorDiscountRequest = z.infer<typeof AssignDistributorDiscountRequestSchema>;

export const ProductDiscountAssignmentSchema = z.object({
	id: z.string(),
	sourceDistributorProductBalanceId: z.string(),
	discountedDistributorProductBalanceId: z.string(),
	distributorId: z.string(),
	productBatchId: z.string(),
	quantity: PositiveIntegerSchema,
	baseUnitPriceCents: PositiveIntegerSchema,
	sourceUnitPriceCents: PositiveIntegerSchema,
	discountedUnitPriceCents: PositiveIntegerSchema,
	discountCentsPerUnit: NonNegativeIntegerSchema,
	stepDiscountCentsPerUnit: NonNegativeIntegerSchema,
	discountTotalCents: NonNegativeIntegerSchema,
	comment: z.string().nullable(),
	operationId: z.string(),
	actorUserId: z.string(),
	createdAt: z.string(),
});

export type ProductDiscountAssignment = z.infer<typeof ProductDiscountAssignmentSchema>;

export const AssignDistributorDiscountResponseSchema = z.object({
	discount: ProductDiscountAssignmentSchema,
	sourceBalance: DistributorInventoryItemSchema,
	discountedBalance: DistributorInventoryItemSchema,
});

export type AssignDistributorDiscountResponse = z.infer<typeof AssignDistributorDiscountResponseSchema>;

export const DistributorSaleSchema = z.object({
	id: z.string(),
	distributorProductBalanceId: z.string(),
	distributorId: z.string(),
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

export type DistributorSale = z.infer<typeof DistributorSaleSchema>;

export const DistributorSaleResponseSchema = z.object({
	sale: DistributorSaleSchema,
	distributorProductBalance: DistributorInventoryItemSchema,
	cashBalance: DistributorCashBalanceItemSchema.nullable(),
});

export type DistributorSaleResponse = z.infer<typeof DistributorSaleResponseSchema>;

export const DistributorSaleCancellationSchema = z.object({
	id: z.string(),
	distributorSaleId: z.string(),
	distributorProductBalanceId: z.string(),
	distributorId: z.string(),
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

export type DistributorSaleCancellation = z.infer<typeof DistributorSaleCancellationSchema>;

export const CancelDistributorSaleResponseSchema = z.object({
	cancellation: DistributorSaleCancellationSchema,
	distributorProductBalance: DistributorInventoryItemSchema,
	cashBalance: DistributorCashBalanceItemSchema.nullable(),
});

export type CancelDistributorSaleResponse = z.infer<typeof CancelDistributorSaleResponseSchema>;

export const DistributorRecentSaleItemSchema = z.object({
	id: z.string(),
	sourceType: z.literal("distributor"),
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

export type DistributorRecentSaleItem = z.infer<typeof DistributorRecentSaleItemSchema>;

export const DistributorRecentSalesResponseSchema = z.object({
	items: z.array(DistributorRecentSaleItemSchema),
});

export type DistributorRecentSalesResponse = z.infer<typeof DistributorRecentSalesResponseSchema>;

export const SaleHistoryStatusSchema = z.enum(["all", "active", "cancelled"]);

export const DistributorSalesHistoryQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: PositiveIntegerSchema.optional(),
	search: z.string().optional(),
	status: SaleHistoryStatusSchema.optional(),
});

export type DistributorSalesHistoryQuery = z.infer<typeof DistributorSalesHistoryQuerySchema>;

export const DistributorSalesHistoryResponseSchema = z.object({
	items: z.array(DistributorRecentSaleItemSchema),
	nextCursor: z.string().nullable(),
});

export type DistributorSalesHistoryResponse = z.infer<typeof DistributorSalesHistoryResponseSchema>;
