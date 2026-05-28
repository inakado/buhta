import { z } from "zod";

export type MoneyCents = number & { readonly __brand: "MoneyCents" };

export const MoneyCentsSchema = z.number().int().nonnegative();

export function moneyCents(value: number): MoneyCents {
	const result = MoneyCentsSchema.safeParse(value);
	if (!result.success) {
		throw new Error("Money amount must be a non-negative integer in cents");
	}

	return result.data as MoneyCents;
}

export function addMoneyCents(left: MoneyCents, right: MoneyCents): MoneyCents {
	return moneyCents(left + right);
}

export function subtractMoneyCents(left: MoneyCents, right: MoneyCents): MoneyCents {
	return moneyCents(left - right);
}

export function formatMoneyCents(value: MoneyCents): string {
	return (value / 100).toFixed(2);
}

export const QUANTITY_UNITS = ["kg", "piece"] as const;

export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const QuantitySchema = z.object({
	value: z.number().nonnegative(),
	unit: z.enum(QUANTITY_UNITS),
});

export type Quantity = z.infer<typeof QuantitySchema>;

export function quantity(value: number, unit: QuantityUnit): Quantity {
	const result = QuantitySchema.safeParse({ value, unit });
	if (!result.success) {
		throw new Error("Quantity must be non-negative and use a supported unit");
	}

	return result.data;
}

export function assertSameQuantityUnit(left: Quantity, right: Quantity): void {
	if (left.unit !== right.unit) {
		throw new Error("Quantity units must match");
	}
}

export function subtractQuantity(left: Quantity, right: Quantity): Quantity {
	assertSameQuantityUnit(left, right);
	return quantity(left.value - right.value, left.unit);
}
