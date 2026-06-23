"use client";

import type { ProductQuantityInput } from "@buhta/shared";

export type ProductQuantityInputMode = "net_weight" | "units";

export type ProductQuantityInputState = {
	mode: ProductQuantityInputMode;
	value: string;
};

export type ProductQuantityCalculation = {
	ok: true;
	input: ProductQuantityInput;
	quantity: number;
	totalNetWeightGrams: number;
	valueLabel: string;
	unitsLabel: string;
} | {
	ok: false;
	reason: string;
};

type ProductQuantityInputUnit = "кг" | "шт";

export function createDefaultProductQuantityState(): ProductQuantityInputState {
	return {
		mode: "net_weight",
		value: "",
	};
}

export function calculateProductQuantity({
	availableQuantity,
	netWeightGrams,
	state,
}: {
	availableQuantity?: number | undefined;
	netWeightGrams: number | undefined;
	state: ProductQuantityInputState;
}): ProductQuantityCalculation {
	if (!netWeightGrams || netWeightGrams <= 0) {
		return { ok: false, reason: "Выберите продукцию, чтобы CRM рассчитала штуки." };
	}

	if (state.mode === "units") {
		const quantity = Number(state.value);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			return { ok: false, reason: "Введите целое количество штук." };
		}
		if (availableQuantity !== undefined && quantity > availableQuantity) {
			return { ok: false, reason: "Количество больше доступного остатка." };
		}

		return {
			ok: true,
			input: { mode: "units", quantity },
			quantity,
			totalNetWeightGrams: quantity * netWeightGrams,
			valueLabel: `${formatKilograms(quantity * netWeightGrams)} кг`,
			unitsLabel: `${quantity} шт`,
		};
	}

	const netWeightKilograms = normalizeDecimalInput(state.value);
	if (!netWeightKilograms) {
		return { ok: false, reason: "Введите массу в кг." };
	}

	const totalNetWeightGrams = kilogramsToGrams(netWeightKilograms);
	if (totalNetWeightGrams <= 0) {
		return { ok: false, reason: "Масса должна быть больше нуля." };
	}
	if (totalNetWeightGrams % netWeightGrams !== 0) {
		return {
			ok: false,
			reason: `Масса должна делиться на ${formatKilograms(netWeightGrams)} кг без остатка.`,
		};
	}

	const quantity = totalNetWeightGrams / netWeightGrams;
	if (availableQuantity !== undefined && quantity > availableQuantity) {
		return { ok: false, reason: "Масса больше доступного остатка." };
	}

	return {
		ok: true,
		input: { mode: "net_weight", netWeightKilograms },
		quantity,
		totalNetWeightGrams,
		valueLabel: `${formatKilograms(totalNetWeightGrams)} кг`,
		unitsLabel: `${quantity} шт`,
	};
}

export function ProductQuantityInputField({
	availableQuantity,
	id,
	label = "Количество",
	netWeightGrams,
	onChange,
	state,
}: {
	availableQuantity?: number | undefined;
	id: string;
	label?: string;
	netWeightGrams: number | undefined;
	onChange: (next: ProductQuantityInputState) => void;
	state: ProductQuantityInputState;
}) {
	const calculation = calculateProductQuantity({ availableQuantity, netWeightGrams, state });
	const unit: ProductQuantityInputUnit = state.mode === "net_weight" ? "кг" : "шт";
	const inputLabel = `${label}, ${unit}`;
	const inputMode = state.mode === "net_weight" ? "decimal" : "numeric";
	const placeholder = state.mode === "net_weight" && netWeightGrams ? formatKilograms(netWeightGrams) : "1";
	const disabled = !netWeightGrams || netWeightGrams <= 0;
	const hintId = `${id}-hint`;
	const hasValue = Boolean(state.value.trim());
	const showHint = !disabled && !calculation.ok && hasValue;
	const hint = showHint && !calculation.ok ? calculation.reason : "";
	const metaLabel = calculation.ok && hasValue
		? state.mode === "net_weight" ? calculation.unitsLabel : calculation.valueLabel
		: netWeightGrams ? `${formatKilograms(netWeightGrams)} кг/шт` : "";
	const invalid = !disabled && !calculation.ok && state.value.trim() ? true : undefined;

	function handleModeChange(mode: ProductQuantityInputMode) {
		if (mode === state.mode) {
			return;
		}

		onChange({
			mode,
			value: convertQuantityValue({
				from: state.mode,
				netWeightGrams,
				value: state.value,
			}) ?? state.value,
		});
	}

	return (
		<div className="product-quantity-field">
			<div className="product-quantity-heading">
				<span>{label}</span>
				<div className="product-quantity-heading-meta">
					{metaLabel ? <strong>{metaLabel}</strong> : null}
					<div className="product-quantity-segmented" role="group" aria-label="Способ ввода количества">
						<button
							aria-pressed={state.mode === "net_weight"}
							className={state.mode === "net_weight" ? "active" : ""}
							disabled={disabled}
							onClick={() => handleModeChange("net_weight")}
							type="button"
						>
							кг
						</button>
						<button
							aria-pressed={state.mode === "units"}
							className={state.mode === "units" ? "active" : ""}
							disabled={disabled}
							onClick={() => handleModeChange("units")}
							type="button"
						>
							шт
						</button>
					</div>
				</div>
			</div>
			<label className="field product-quantity-input">
				<span className="sr-only">{inputLabel}</span>
				<div className="product-quantity-input-shell">
					<input
						aria-describedby={showHint ? hintId : undefined}
						aria-label={inputLabel}
						aria-invalid={invalid}
						disabled={disabled}
						id={id}
						inputMode={inputMode}
						min="0"
						onChange={(event) => onChange({ ...state, value: event.target.value })}
						placeholder={placeholder}
						type="text"
						value={state.value}
					/>
					<span aria-hidden="true">{unit}</span>
				</div>
			</label>
			{showHint ? (
				<div className="product-quantity-hint" id={hintId} aria-live="polite">
					<span>{hint}</span>
				</div>
			) : null}
		</div>
	);
}

export function formatKilograms(grams: number): string {
	return formatQuantity(grams / 1000);
}

export function formatProductQuantityLabel({
	quantity,
	totalNetWeightGrams,
}: {
	quantity: number;
	totalNetWeightGrams: number;
}): string {
	return `${formatKilograms(totalNetWeightGrams)} кг • ${quantity} шт`;
}

function kilogramsToGrams(value: string): number {
	const [wholePart, fractionPart = ""] = value.split(".");
	const paddedFraction = `${fractionPart}000`.slice(0, 3);

	return Number(wholePart) * 1000 + Number(paddedFraction);
}

function normalizeDecimalInput(value: string): string | null {
	const normalized = value.trim().replace(",", ".");
	if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
		return null;
	}

	return normalized;
}

function convertQuantityValue({
	from,
	netWeightGrams,
	value,
}: {
	from: ProductQuantityInputMode;
	netWeightGrams: number | undefined;
	value: string;
}): string | null {
	if (!netWeightGrams || !value.trim()) {
		return null;
	}

	if (from === "net_weight") {
		const netWeightKilograms = normalizeDecimalInput(value);
		if (!netWeightKilograms) {
			return null;
		}
		const totalNetWeightGrams = kilogramsToGrams(netWeightKilograms);
		if (totalNetWeightGrams <= 0 || totalNetWeightGrams % netWeightGrams !== 0) {
			return null;
		}

		return String(totalNetWeightGrams / netWeightGrams);
	}

	const quantity = Number(value);
	if (!Number.isInteger(quantity) || quantity <= 0) {
		return null;
	}

	return formatKilograms(quantity * netWeightGrams);
}

function formatQuantity(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: value.toLocaleString("ru-RU", {
			maximumFractionDigits: 3,
			minimumFractionDigits: 0,
		});
}
