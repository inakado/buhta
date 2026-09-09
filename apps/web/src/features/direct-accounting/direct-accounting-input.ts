import type { DirectAccountingReceiptInput, DirectAccountingSaleInput } from "@buhta/shared";

export type DirectAccountingDraft = {
	productName: string;
	occurredOn: string;
	quantityKg: string;
	unitPriceRubles: string;
};

export function parseSaleDraft(draft: DirectAccountingDraft, today: string): DirectAccountingSaleInput | string {
	const productName = normalizeProductName(draft.productName);
	if (!productName) return "Укажите наименование.";
	if (!draft.occurredOn) return "Укажите дату продажи.";
	if (draft.occurredOn > today) return "Дата продажи не может быть в будущем.";

	const quantityKg = parseDecimal(draft.quantityKg, 3);
	if (quantityKg === null || quantityKg <= 0) return "Укажите количество больше нуля, максимум 3 знака после запятой.";
	const unitPriceCents = parseRublesToCents(draft.unitPriceRubles);
	if (unitPriceCents === null || unitPriceCents <= 0) return "Укажите цену больше нуля, максимум 2 знака после запятой.";

	return { productName, soldOn: draft.occurredOn, quantityKg, unitPriceCents };
}

export function parseReceiptDraft(draft: DirectAccountingDraft, today: string): DirectAccountingReceiptInput | string {
	const productName = normalizeProductName(draft.productName);
	if (!productName) return "Укажите наименование.";
	if (!draft.occurredOn) return "Укажите дату прихода.";
	if (draft.occurredOn > today) return "Дата прихода не может быть в будущем.";

	const quantityKg = parseDecimal(draft.quantityKg, 3);
	if (quantityKg === null || quantityKg <= 0) return "Укажите количество больше нуля, максимум 3 знака после запятой.";

	return { productName, receivedOn: draft.occurredOn, quantityKg };
}

function normalizeProductName(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

function parseDecimal(value: string, fractionDigits: number): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!new RegExp(`^\\d+(?:\\.\\d{1,${fractionDigits}})?$`).test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseRublesToCents(value: string): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
	const [rubles = "0", kopecks = ""] = normalized.split(".");
	const cents = Number(rubles) * 100 + Number(kopecks.padEnd(2, "0"));
	return Number.isSafeInteger(cents) ? cents : null;
}
