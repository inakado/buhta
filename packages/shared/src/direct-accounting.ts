import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_QUANTITY_KG = 1_000_000;
const MAX_UNIT_PRICE_CENTS = 100_000_000;
const MAX_DIRECT_ACCOUNTING_AMOUNT_CENTS = 2_147_483_647;
const GRAMS_PER_KILOGRAM = 1_000;

export const DirectAccountingDateSchema = z.string().regex(DATE_PATTERN).refine(isCalendarDate, {
	message: "Укажите существующую календарную дату в формате ГГГГ-ММ-ДД",
});

export const DirectAccountingProductNameSchema = z.string().trim().min(1).max(120);
export const DirectAccountingTransferCommentSchema = z.string().trim().min(1).max(240);

export const DirectAccountingQuantityKgSchema = z.number()
	.positive()
	.max(MAX_QUANTITY_KG)
	.refine(hasWholeGrams, {
		message: "Количество должно содержать не более 3 знаков после запятой",
	});

export const DirectAccountingUnitPriceCentsSchema = z.number()
	.int()
	.min(1)
	.max(MAX_UNIT_PRICE_CENTS);

export const DirectAccountingSaleInputSchema = z.object({
	productName: DirectAccountingProductNameSchema,
	soldOn: DirectAccountingDateSchema,
	quantityKg: DirectAccountingQuantityKgSchema,
	unitPriceCents: DirectAccountingUnitPriceCentsSchema,
}).strict();

export type DirectAccountingSaleInput = z.infer<typeof DirectAccountingSaleInputSchema>;

export const DirectAccountingReceiptInputSchema = z.object({
	productName: DirectAccountingProductNameSchema,
	receivedOn: DirectAccountingDateSchema,
	quantityKg: DirectAccountingQuantityKgSchema,
}).strict();

export type DirectAccountingReceiptInput = z.infer<typeof DirectAccountingReceiptInputSchema>;

export const DirectAccountingExpenseInputSchema = z.object({
	name: DirectAccountingProductNameSchema,
	spentOn: DirectAccountingDateSchema,
	amountCents: z.number().int().min(1).max(MAX_DIRECT_ACCOUNTING_AMOUNT_CENTS),
}).strict();

export type DirectAccountingExpenseInput = z.infer<typeof DirectAccountingExpenseInputSchema>;

export const DirectAccountingTransferInputSchema = z.object({
	comment: DirectAccountingTransferCommentSchema,
	transferredOn: DirectAccountingDateSchema,
	amountCents: z.number().int().min(1).max(MAX_DIRECT_ACCOUNTING_AMOUNT_CENTS),
}).strict();

export type DirectAccountingTransferInput = z.infer<typeof DirectAccountingTransferInputSchema>;

export const DirectAccountingSaleSchema = DirectAccountingSaleInputSchema.extend({
	id: z.string(),
	totalCents: z.number().int().nonnegative(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type DirectAccountingSale = z.infer<typeof DirectAccountingSaleSchema>;

export const DirectAccountingReceiptSchema = DirectAccountingReceiptInputSchema.extend({
	id: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type DirectAccountingReceipt = z.infer<typeof DirectAccountingReceiptSchema>;

export const DirectAccountingExpenseSchema = DirectAccountingExpenseInputSchema.extend({
	id: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type DirectAccountingExpense = z.infer<typeof DirectAccountingExpenseSchema>;

export const DirectAccountingTransferSchema = DirectAccountingTransferInputSchema.extend({
	id: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type DirectAccountingTransfer = z.infer<typeof DirectAccountingTransferSchema>;

export const DirectAccountingSaleResponseSchema = z.object({
	sale: DirectAccountingSaleSchema,
});

export type DirectAccountingSaleResponse = z.infer<typeof DirectAccountingSaleResponseSchema>;

export const DirectAccountingReceiptResponseSchema = z.object({
	receipt: DirectAccountingReceiptSchema,
});

export type DirectAccountingReceiptResponse = z.infer<typeof DirectAccountingReceiptResponseSchema>;

export const DirectAccountingExpenseResponseSchema = z.object({
	expense: DirectAccountingExpenseSchema,
});

export type DirectAccountingExpenseResponse = z.infer<typeof DirectAccountingExpenseResponseSchema>;

export const DirectAccountingTransferResponseSchema = z.object({
	transfer: DirectAccountingTransferSchema,
});

export type DirectAccountingTransferResponse = z.infer<typeof DirectAccountingTransferResponseSchema>;

export const DirectAccountingSalesQuerySchema = z.object({
	date: DirectAccountingDateSchema.optional(),
	dateFrom: DirectAccountingDateSchema.optional(),
	dateTo: DirectAccountingDateSchema.optional(),
}).strict().superRefine((value, context) => {
	const hasRangeBoundary = Boolean(value.dateFrom || value.dateTo);
	if (!value.date && !hasRangeBoundary) {
		context.addIssue({ code: "custom", message: "Укажите дату или границы периода" });
	}
	if (value.date && hasRangeBoundary) {
		context.addIssue({ code: "custom", message: "Нельзя одновременно указать дату и диапазон" });
	}
	if ((value.dateFrom && !value.dateTo) || (!value.dateFrom && value.dateTo)) {
		context.addIssue({ code: "custom", message: "Укажите обе границы периода" });
	}
	if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
		context.addIssue({ code: "custom", message: "Начало периода не может быть позже окончания" });
	}
});

export type DirectAccountingSalesQuery = z.infer<typeof DirectAccountingSalesQuerySchema>;

export const DirectAccountingEntriesQuerySchema = DirectAccountingSalesQuerySchema;
export type DirectAccountingEntriesQuery = z.infer<typeof DirectAccountingEntriesQuerySchema>;

export const DirectAccountingSalesResponseSchema = z.object({
	sales: z.array(DirectAccountingSaleSchema),
});

export type DirectAccountingSalesResponse = z.infer<typeof DirectAccountingSalesResponseSchema>;

export const DirectAccountingEntrySchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("sale"),
		id: z.string(),
		productName: DirectAccountingProductNameSchema,
		occurredOn: DirectAccountingDateSchema,
		quantityKg: DirectAccountingQuantityKgSchema,
		unitPriceCents: DirectAccountingUnitPriceCentsSchema,
		totalCents: z.number().int().nonnegative(),
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
	z.object({
		kind: z.literal("receipt"),
		id: z.string(),
		productName: DirectAccountingProductNameSchema,
		occurredOn: DirectAccountingDateSchema,
		quantityKg: DirectAccountingQuantityKgSchema,
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
	z.object({
		kind: z.literal("expense"),
		id: z.string(),
		name: DirectAccountingProductNameSchema,
		occurredOn: DirectAccountingDateSchema,
		amountCents: z.number().int().positive(),
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
	z.object({
		kind: z.literal("transfer"),
		id: z.string(),
		comment: DirectAccountingTransferCommentSchema,
		occurredOn: DirectAccountingDateSchema,
		amountCents: z.number().int().positive(),
		createdAt: z.string(),
		updatedAt: z.string(),
	}),
]);

export type DirectAccountingEntry = z.infer<typeof DirectAccountingEntrySchema>;

export const DirectAccountingEntriesResponseSchema = z.object({
	entries: z.array(DirectAccountingEntrySchema),
});

export type DirectAccountingEntriesResponse = z.infer<typeof DirectAccountingEntriesResponseSchema>;

export const DirectAccountingSuggestionsQuerySchema = z.object({
	search: z.string().trim().max(120).optional(),
	kind: z.enum(["stock", "expense"]).optional(),
}).strict();

export type DirectAccountingSuggestionsQuery = z.infer<typeof DirectAccountingSuggestionsQuerySchema>;

export const DirectAccountingSuggestionsResponseSchema = z.object({
	suggestions: z.array(DirectAccountingProductNameSchema),
});

export type DirectAccountingSuggestionsResponse = z.infer<typeof DirectAccountingSuggestionsResponseSchema>;

export const DirectAccountingDetailPeriodSchema = z.enum(["day", "week", "month"]);
export type DirectAccountingDetailPeriod = z.infer<typeof DirectAccountingDetailPeriodSchema>;

export const DirectAccountingStatisticsQuerySchema = z.object({
	anchorDate: DirectAccountingDateSchema.optional(),
	detailPeriod: DirectAccountingDetailPeriodSchema.optional(),
	dateFrom: DirectAccountingDateSchema.optional(),
	dateTo: DirectAccountingDateSchema.optional(),
}).strict().superRefine((value, context) => {
	if ((value.dateFrom && !value.dateTo) || (!value.dateFrom && value.dateTo)) {
		context.addIssue({
			code: "custom",
			message: "Укажите обе границы периода",
		});
	}
	if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
		context.addIssue({
			code: "custom",
			message: "Начало периода не может быть позже окончания",
		});
	}
});

export type DirectAccountingStatisticsQuery = z.infer<typeof DirectAccountingStatisticsQuerySchema>;

export const DirectAccountingPeriodTotalSchema = z.object({
	dateFrom: DirectAccountingDateSchema,
	dateTo: DirectAccountingDateSchema,
	quantityKg: z.number().nonnegative(),
	receivedQuantityKg: z.number().nonnegative(),
	balanceQuantityKg: z.number(),
	revenueCents: z.number().int().nonnegative(),
	expensesCents: z.number().int().nonnegative(),
	transfersCents: z.number().int().nonnegative(),
});

export type DirectAccountingPeriodTotal = z.infer<typeof DirectAccountingPeriodTotalSchema>;

export const DirectAccountingProductStatisticsSchema = z.object({
	productName: DirectAccountingProductNameSchema,
	quantityKg: z.number().nonnegative(),
	receivedQuantityKg: z.number().nonnegative(),
	balanceQuantityKg: z.number(),
	revenueCents: z.number().int().nonnegative(),
});

export type DirectAccountingProductStatistics = z.infer<typeof DirectAccountingProductStatisticsSchema>;

export const DirectAccountingStatisticsResponseSchema = z.object({
	filters: z.object({
		anchorDate: DirectAccountingDateSchema,
		detailPeriod: DirectAccountingDetailPeriodSchema,
		dateFrom: DirectAccountingDateSchema,
		dateTo: DirectAccountingDateSchema,
		timezone: z.literal("Asia/Vladivostok"),
	}),
	selection: DirectAccountingPeriodTotalSchema,
	totals: z.object({
		day: DirectAccountingPeriodTotalSchema,
		week: DirectAccountingPeriodTotalSchema,
		month: DirectAccountingPeriodTotalSchema,
	}),
	byProduct: z.array(DirectAccountingProductStatisticsSchema),
});

export type DirectAccountingStatisticsResponse = z.infer<typeof DirectAccountingStatisticsResponseSchema>;

function isCalendarDate(value: string): boolean {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));

	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === (month ?? 0) - 1
		&& date.getUTCDate() === day;
}

function hasWholeGrams(quantityKg: number): boolean {
	const quantityGrams = quantityKg * GRAMS_PER_KILOGRAM;
	const roundedQuantityGrams = Math.round(quantityGrams);
	const roundingErrorTolerance = Number.EPSILON * Math.max(1, Math.abs(quantityGrams)) * 8;

	return roundedQuantityGrams >= 1
		&& Math.abs(quantityGrams - roundedQuantityGrams) <= roundingErrorTolerance;
}
