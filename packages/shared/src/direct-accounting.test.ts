import { describe, expect, it } from "vitest";
import {
	DirectAccountingEntriesResponseSchema,
	DirectAccountingQuantityKgSchema,
	DirectAccountingReceiptInputSchema,
	DirectAccountingSaleInputSchema,
	DirectAccountingStatisticsResponseSchema,
} from "./direct-accounting";

describe("direct accounting numeric contracts", () => {
	it.each([0.001, 0.2, 0.425, 2.5, 32.2, 999_999.999])(
		"accepts a valid kilogram value: %s",
		(quantityKg) => {
			expect(DirectAccountingQuantityKgSchema.safeParse(quantityKg).success).toBe(true);
		},
	);

	it.each([0, Number.MIN_VALUE, -0.001, 1.0001, 32.2001, 1_000_000.001])(
		"rejects an invalid kilogram value: %s",
		(quantityKg) => {
			expect(DirectAccountingQuantityKgSchema.safeParse(quantityKg).success).toBe(false);
		},
	);

	it("accepts the production payload that previously failed", () => {
		expect(DirectAccountingSaleInputSchema.safeParse({
			productName: "нерка",
			soldOn: "2026-09-03",
			quantityKg: 32.2,
			unitPriceCents: 650_000,
		}).success).toBe(true);
	});

	it("validates a backdated receipt", () => {
		expect(DirectAccountingReceiptInputSchema.parse({
			productName: " Кета   расчетный счет ",
			receivedOn: "2026-08-15",
			quantityKg: 300,
		})).toEqual({
			productName: "Кета   расчетный счет",
			receivedOn: "2026-08-15",
			quantityKg: 300,
		});
	});

	it("supports a mixed ledger and negative calculated balances", () => {
		const timestamps = { createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
		expect(DirectAccountingEntriesResponseSchema.safeParse({
			entries: [
				{ kind: "receipt", id: "r1", productName: "Кета", occurredOn: "2026-09-01", quantityKg: 300, ...timestamps },
				{ kind: "sale", id: "s1", productName: "Кета", occurredOn: "2026-09-03", quantityKg: 155, unitPriceCents: 650_000, totalCents: 100_750_000, ...timestamps },
			],
		}).success).toBe(true);

		expect(DirectAccountingStatisticsResponseSchema.safeParse({
			filters: { anchorDate: "2026-09-03", detailPeriod: "day", dateFrom: "2026-09-03", dateTo: "2026-09-03", timezone: "Asia/Vladivostok" },
			selection: { dateFrom: "2026-09-03", dateTo: "2026-09-03", quantityKg: 155, receivedQuantityKg: 0, balanceQuantityKg: -5, revenueCents: 100_750_000 },
			totals: {
				day: { dateFrom: "2026-09-03", dateTo: "2026-09-03", quantityKg: 155, receivedQuantityKg: 0, balanceQuantityKg: -5, revenueCents: 100_750_000 },
				week: { dateFrom: "2026-08-28", dateTo: "2026-09-03", quantityKg: 155, receivedQuantityKg: 150, balanceQuantityKg: -5, revenueCents: 100_750_000 },
				month: { dateFrom: "2026-08-05", dateTo: "2026-09-03", quantityKg: 155, receivedQuantityKg: 150, balanceQuantityKg: -5, revenueCents: 100_750_000 },
			},
			byProduct: [{ productName: "Кета", quantityKg: 155, receivedQuantityKg: 150, balanceQuantityKg: -5, revenueCents: 100_750_000 }],
		}).success).toBe(true);
	});
});
