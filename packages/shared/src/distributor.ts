import { z } from "zod";

const NonNegativeIntegerSchema = z.number().int().nonnegative();

export const DistributorInventoryItemSchema = z.object({
	id: z.string(),
	distributorId: z.string(),
	distributorName: z.string(),
	productBatchId: z.string(),
	productName: z.string(),
	priceCents: NonNegativeIntegerSchema,
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
