import type {
	DirectAccountingExpenseInput,
	DirectAccountingReceiptInput,
	DirectAccountingSaleInput,
	DirectAccountingTransferInput,
} from "@buhta/shared";

export type DirectAccountingDraft = {
	productName: string;
	occurredOn: string;
	quantityKg: string;
	unitPriceRubles: string;
	amountRubles: string;
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

export function parseExpenseDraft(draft: DirectAccountingDraft, today: string): DirectAccountingExpenseInput | string {
	const name = normalizeProductName(draft.productName);
	if (!name) return "Укажите наименование.";
	if (!draft.occurredOn) return "Укажите дату затраты.";
	if (draft.occurredOn > today) return "Дата затраты не может быть в будущем.";

	const amountCents = parseRublesToCents(draft.amountRubles);
	if (amountCents === null || amountCents <= 0 || amountCents > 2_147_483_647) {
		return "Укажите сумму больше нуля, максимум 2 знака после запятой.";
	}

	return { name, spentOn: draft.occurredOn, amountCents };
}

export function parseTransferDraft(draft: DirectAccountingDraft, today: string): DirectAccountingTransferInput | string {
	const comment = normalizeProductName(draft.productName);
	if (!comment) return "Укажите, кому или зачем переданы средства.";
	if (comment.length > 240) return "Комментарий должен быть не длиннее 240 символов.";
	if (!draft.occurredOn) return "Укажите дату передачи.";
	if (draft.occurredOn > today) return "Дата передачи не может быть в будущем.";

	const amountCents = parseRublesToCents(draft.amountRubles);
	if (amountCents === null || amountCents <= 0 || amountCents > 2_147_483_647) {
		return "Укажите сумму больше нуля, максимум 2 знака после запятой.";
	}

	return { comment, transferredOn: draft.occurredOn, amountCents };
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
