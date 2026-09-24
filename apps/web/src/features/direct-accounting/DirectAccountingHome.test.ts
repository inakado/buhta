// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseExpenseDraft, parseReceiptDraft, parseSaleDraft, parseSalaryDraft, parseTransferDraft } from "./direct-accounting-input";

const PERIOD_FIELDS = { periodFrom: "2026-09-01", periodTo: "2026-09-08", ratePercent: "5" };

describe("direct accounting input", () => {
	it("accepts comma decimals and converts rubles to cents", () => {
		expect(parseSaleDraft({
			...PERIOD_FIELDS,
			productName: "  Икра   кеты ",
			occurredOn: "2026-09-08",
			quantityKg: "0,425",
			unitPriceRubles: "1250,50",
			amountRubles: "",
		}, "2026-09-08")).toEqual({
			productName: "Икра кеты",
			soldOn: "2026-09-08",
			quantityKg: 0.425,
			unitPriceCents: 125_050,
		});
	});

	it("rejects excess precision and future dates", () => {
		expect(parseSaleDraft({
			...PERIOD_FIELDS,
			productName: "Икра",
			occurredOn: "2026-09-08",
			quantityKg: "1,0001",
			unitPriceRubles: "1000",
			amountRubles: "",
		}, "2026-09-08")).toContain("3 знака");
		expect(parseSaleDraft({
			...PERIOD_FIELDS,
			productName: "Икра",
			occurredOn: "2026-09-09",
			quantityKg: "1",
			unitPriceRubles: "1000",
			amountRubles: "",
		}, "2026-09-08")).toContain("будущем");
	});

	it("parses a backdated receipt without a price", () => {
		expect(parseReceiptDraft({
			...PERIOD_FIELDS,
			productName: "  Кета расчетный счет ",
			occurredOn: "2026-09-03",
			quantityKg: "300,125",
			unitPriceRubles: "",
			amountRubles: "",
		}, "2026-09-08")).toEqual({
			productName: "Кета расчетный счет",
			receivedOn: "2026-09-03",
			quantityKg: 300.125,
		});
	});

	it("parses a backdated expense amount", () => {
		expect(parseExpenseDraft({
			...PERIOD_FIELDS,
			productName: " Доставка ",
			occurredOn: "2026-09-02",
			quantityKg: "",
			unitPriceRubles: "",
			amountRubles: "1250,50",
		}, "2026-09-08")).toEqual({
			name: "Доставка",
			spentOn: "2026-09-02",
			amountCents: 125_050,
		});
	});

	it("parses a backdated transfer with a comment and amount", () => {
		expect(parseTransferDraft({
			...PERIOD_FIELDS,
			productName: " Ивану   на закупку ",
			occurredOn: "2026-09-01",
			quantityKg: "",
			unitPriceRubles: "",
			amountRubles: "500,50",
		}, "2026-09-08")).toEqual({
			comment: "Ивану на закупку",
			transferredOn: "2026-09-01",
			amountCents: 50_050,
		});
	});

	it("parses a salary period and percentage into basis points", () => {
		expect(parseSalaryDraft({
			...PERIOD_FIELDS,
			productName: " Иван   Петров ",
			occurredOn: "2026-09-08",
			quantityKg: "",
			unitPriceRubles: "",
			amountRubles: "",
			ratePercent: "3,75",
		}, "2026-09-08")).toEqual({
			employeeName: "Иван Петров",
			periodFrom: "2026-09-01",
			periodTo: "2026-09-08",
			rateBasisPoints: 375,
		});
	});
});
