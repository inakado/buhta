// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseReceiptDraft, parseSaleDraft } from "./direct-accounting-input";

describe("direct accounting input", () => {
	it("accepts comma decimals and converts rubles to cents", () => {
		expect(parseSaleDraft({
			productName: "  Икра   кеты ",
			occurredOn: "2026-09-08",
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
			occurredOn: "2026-09-08",
			quantityKg: "1,0001",
			unitPriceRubles: "1000",
		}, "2026-09-08")).toContain("3 знака");
		expect(parseSaleDraft({
			productName: "Икра",
			occurredOn: "2026-09-09",
			quantityKg: "1",
			unitPriceRubles: "1000",
		}, "2026-09-08")).toContain("будущем");
	});

	it("parses a backdated receipt without a price", () => {
		expect(parseReceiptDraft({
			productName: "  Кета расчетный счет ",
			occurredOn: "2026-09-03",
			quantityKg: "300,125",
			unitPriceRubles: "",
		}, "2026-09-08")).toEqual({
			productName: "Кета расчетный счет",
			receivedOn: "2026-09-03",
			quantityKg: 300.125,
		});
	});
});
