import { z } from "zod";

const IntegerCentsSchema = z.number().int();
const NonNegativeIntegerSchema = z.number().int().nonnegative();
const NonNegativeNumberSchema = z.number().nonnegative();

export const DirectorAnalyticsPeriodPresetSchema = z.enum(["today", "7d", "30d", "90d"]);

export type DirectorAnalyticsPeriodPreset = z.infer<typeof DirectorAnalyticsPeriodPresetSchema>;

export const DirectorAnalyticsQuerySchema = z.object({
	dateFrom: z.string().min(1).optional(),
	dateTo: z.string().min(1).optional(),
	periodPreset: DirectorAnalyticsPeriodPresetSchema.optional(),
}).strict();

export type DirectorAnalyticsQuery = z.infer<typeof DirectorAnalyticsQuerySchema>;

export const DirectorAnalyticsFiltersSchema = z.object({
	dateFrom: z.string(),
	dateTo: z.string(),
	periodPreset: DirectorAnalyticsPeriodPresetSchema,
	timezone: z.literal("Asia/Vladivostok"),
});

export type DirectorAnalyticsFilters = z.infer<typeof DirectorAnalyticsFiltersSchema>;

export const DirectorAnalyticsMoneySchema = z.object({
	grossRevenueCents: NonNegativeIntegerSchema,
	cancelledRevenueCents: NonNegativeIntegerSchema,
	netRevenueCents: IntegerCentsSchema,
	cashRevenueCents: IntegerCentsSchema,
	cashlessRevenueCents: IntegerCentsSchema,
	saleCount: NonNegativeIntegerSchema,
	cancellationCount: NonNegativeIntegerSchema,
	currentCash: z.object({
		distributorCashCents: NonNegativeIntegerSchema,
		courierCashCents: NonNegativeIntegerSchema,
		totalCashCents: NonNegativeIntegerSchema,
	}),
	cashMovement: z.object({
		cashSalesCents: NonNegativeIntegerSchema,
		courierCashReturnedCents: NonNegativeIntegerSchema,
		directorWithdrawalsCents: NonNegativeIntegerSchema,
		cashSaleCancellationsCents: NonNegativeIntegerSchema,
	}),
});

export type DirectorAnalyticsMoney = z.infer<typeof DirectorAnalyticsMoneySchema>;

export const DirectorAnalyticsRawMaterialRowSchema = z.object({
	rawMaterialTypeId: z.string(),
	rawMaterialName: z.string(),
	unit: z.string(),
	quantity: NonNegativeNumberSchema,
});

export type DirectorAnalyticsRawMaterialRow = z.infer<typeof DirectorAnalyticsRawMaterialRowSchema>;

export const DirectorAnalyticsProductOutputRowSchema = z.object({
	productName: z.string(),
	quantity: NonNegativeIntegerSchema,
	rawMaterialConsumedQuantity: NonNegativeNumberSchema,
	rawMaterialUnit: z.string(),
});

export type DirectorAnalyticsProductOutputRow = z.infer<typeof DirectorAnalyticsProductOutputRowSchema>;

export const DirectorAnalyticsProductionSchema = z.object({
	rawMaterialIntakes: z.array(DirectorAnalyticsRawMaterialRowSchema),
	rawMaterialConsumed: z.array(DirectorAnalyticsRawMaterialRowSchema),
	currentRawMaterialBalances: z.array(DirectorAnalyticsRawMaterialRowSchema),
	productReleased: z.array(DirectorAnalyticsProductOutputRowSchema),
	productTransferredToDistributorUnits: NonNegativeIntegerSchema,
	currentWorkshopProductUnits: NonNegativeIntegerSchema,
	summary: z.object({
		rawMaterialConsumedQuantity: NonNegativeNumberSchema,
		rawMaterialConsumedUnit: z.string(),
		productReleasedUnits: NonNegativeIntegerSchema,
	}),
});

export type DirectorAnalyticsProduction = z.infer<typeof DirectorAnalyticsProductionSchema>;

export const DirectorAnalyticsRevenueByDayPointSchema = z.object({
	date: z.string(),
	grossRevenueCents: NonNegativeIntegerSchema,
	cancelledRevenueCents: NonNegativeIntegerSchema,
	netRevenueCents: IntegerCentsSchema,
});

export type DirectorAnalyticsRevenueByDayPoint = z.infer<typeof DirectorAnalyticsRevenueByDayPointSchema>;

export const DirectorAnalyticsPaymentSplitSchema = z.object({
	cashRevenueCents: IntegerCentsSchema,
	cashlessRevenueCents: IntegerCentsSchema,
});

export type DirectorAnalyticsPaymentSplit = z.infer<typeof DirectorAnalyticsPaymentSplitSchema>;

export const DirectorAnalyticsRawMaterialAndProductOutputSchema = z.object({
	rawMaterialConsumedQuantity: NonNegativeNumberSchema,
	rawMaterialConsumedUnit: z.string(),
	productReleasedUnits: NonNegativeIntegerSchema,
});

export type DirectorAnalyticsRawMaterialAndProductOutput = z.infer<
	typeof DirectorAnalyticsRawMaterialAndProductOutputSchema
>;

export const DirectorAnalyticsChartsSchema = z.object({
	revenueByDay: z.array(DirectorAnalyticsRevenueByDayPointSchema),
	paymentSplit: DirectorAnalyticsPaymentSplitSchema,
	rawMaterialAndProductOutput: DirectorAnalyticsRawMaterialAndProductOutputSchema,
});

export type DirectorAnalyticsCharts = z.infer<typeof DirectorAnalyticsChartsSchema>;

export const DirectorAnalyticsResponseSchema = z.object({
	filters: DirectorAnalyticsFiltersSchema,
	money: DirectorAnalyticsMoneySchema,
	production: DirectorAnalyticsProductionSchema,
	charts: DirectorAnalyticsChartsSchema,
	warnings: z.array(z.string()),
});

export type DirectorAnalyticsResponse = z.infer<typeof DirectorAnalyticsResponseSchema>;
