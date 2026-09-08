import { describe, expect, it } from "vitest";
import {
	DirectAccountingQuantityKgSchema,
	DirectAccountingSaleInputSchema,
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
});
