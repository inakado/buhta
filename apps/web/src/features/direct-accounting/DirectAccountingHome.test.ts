// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseSaleDraft } from "./DirectAccountingHome";

describe("direct accounting input", () => {
	it("accepts comma decimals and converts rubles to cents", () => {
		expect(parseSaleDraft({
			productName: "  Икра   кеты ",
			soldOn: "2026-09-08",
			quantityKg: "0,425",
			unitPriceRubles: "1250,50",
		}, "2026-09-08")).toEqual({
			productName: "Икра кеты",
			soldOn: "2026-09-08",
			quantityKg: 0.425,
			unitPriceCents: 125_050,
		});
	});

	it("rejects excess precision and future dates", () => {
		expect(parseSaleDraft({
			productName: "Икра",
			soldOn: "2026-09-08",
			quantityKg: "1,0001",
			unitPriceRubles: "1000",
		}, "2026-09-08")).toContain("3 знака");
		expect(parseSaleDraft({
			productName: "Икра",
			soldOn: "2026-09-09",
			quantityKg: "1",
			unitPriceRubles: "1000",
		}, "2026-09-08")).toContain("будущем");
	});
});
