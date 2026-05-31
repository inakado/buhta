import { z } from "zod";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const PositiveIntegerSchema = z.number().int().positive();
const OptionalCommentSchema = z.string().trim().max(500).optional();

export const CourierLoadOptionSchema = z.object({
	distributorProductBalanceId: z.string(),
	distributorId: z.string(),
	distributorName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	unitPriceCents: NonNegativeIntegerSchema,
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
	unitPriceCents: NonNegativeIntegerSchema,
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
		priceCents: NonNegativeIntegerSchema,
		quantity: NonNegativeIntegerSchema,
		stockValueCents: NonNegativeIntegerSchema,
		updatedAt: z.string(),
	}),
	courierProductBalance: CourierProductBalanceItemSchema,
});

export type CourierLoadResponse = z.infer<typeof CourierLoadResponseSchema>;
