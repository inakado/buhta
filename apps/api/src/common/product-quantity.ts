import type { ProductQuantityInput } from "@buhta/shared";
import { AppError } from "./errors/app-error";

export type ProductQuantityCommand = {
	quantity?: number | undefined;
	quantityInput?: ProductQuantityInput | undefined;
};

export type CanonicalProductQuantity = {
	quantity: number;
	quantityInputMode: "legacy" | "net_weight" | "units";
	quantityInputValue: number | string;
	quantityInputGrams: number | null;
	netWeightGrams: number;
	totalNetWeightGrams: number;
};

export function canonicalizeProductQuantity(
	command: ProductQuantityCommand,
	netWeightGrams: number,
): CanonicalProductQuantity {
	if (!Number.isInteger(netWeightGrams) || netWeightGrams <= 0) {
		throw new AppError("DOMAIN_RULE_VIOLATION", "Product net weight is invalid", {
			netWeightGrams,
		});
	}

	const quantityFromInput = command.quantityInput
		? canonicalizeQuantityInput(command.quantityInput, netWeightGrams)
		: null;

	if (command.quantity !== undefined && (!Number.isInteger(command.quantity) || command.quantity <= 0)) {
		throw new AppError("VALIDATION_ERROR", "Product quantity must be a positive integer", {
			quantity: command.quantity,
		});
	}

	if (command.quantity !== undefined && quantityFromInput && command.quantity !== quantityFromInput.quantity) {
		throw new AppError("VALIDATION_ERROR", "Product quantity conflicts with quantity input", {
			quantity: command.quantity,
			quantityInputQuantity: quantityFromInput.quantity,
		});
	}

	if (quantityFromInput) {
		return quantityFromInput;
	}

	if (command.quantity !== undefined) {
		return {
			quantity: command.quantity,
			quantityInputMode: "legacy",
			quantityInputValue: command.quantity,
			quantityInputGrams: null,
			netWeightGrams,
			totalNetWeightGrams: command.quantity * netWeightGrams,
		};
	}

	throw new AppError("VALIDATION_ERROR", "Product quantity is required");
}

function canonicalizeQuantityInput(
	input: ProductQuantityInput,
	netWeightGrams: number,
): CanonicalProductQuantity {
	if (input.mode === "units") {
		return {
			quantity: input.quantity,
			quantityInputMode: "units",
			quantityInputValue: input.quantity,
			quantityInputGrams: null,
			netWeightGrams,
			totalNetWeightGrams: input.quantity * netWeightGrams,
		};
	}

	const grams = parseKilogramsToGrams(input.netWeightKilograms);
	if (grams % netWeightGrams !== 0) {
		throw new AppError("VALIDATION_ERROR", "Net weight must be divisible by product unit net weight", {
			netWeightGrams,
			quantityInputGrams: grams,
		});
	}

	const quantity = grams / netWeightGrams;
	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw new AppError("VALIDATION_ERROR", "Product quantity must be a positive integer", {
			netWeightGrams,
			quantityInputGrams: grams,
		});
	}

	return {
		quantity,
		quantityInputMode: "net_weight",
		quantityInputValue: input.netWeightKilograms,
		quantityInputGrams: grams,
		netWeightGrams,
		totalNetWeightGrams: grams,
	};
}

function parseKilogramsToGrams(value: number | string): number {
	const normalized = String(value).trim().replace(",", ".");
	if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
		throw new AppError("VALIDATION_ERROR", "Net weight must be a positive kilogram value with up to 3 decimals", {
			netWeightKilograms: value,
		});
	}

	const [wholePart, decimalPart = ""] = normalized.split(".");
	const grams = Number(wholePart) * 1000 + Number(decimalPart.padEnd(3, "0"));
	if (!Number.isSafeInteger(grams) || grams <= 0) {
		throw new AppError("VALIDATION_ERROR", "Net weight must be a positive kilogram value", {
			netWeightKilograms: value,
		});
	}

	return grams;
}
