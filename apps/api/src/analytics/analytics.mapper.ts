import type {
	DirectorAnalyticsProductOutputRow,
	DirectorAnalyticsRawMaterialRow,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

export function toNumber(value: DecimalLike | null | undefined): number {
	return Number(value ?? 0);
}

export function addRawMaterialQuantity(
	map: Map<string, DirectorAnalyticsRawMaterialRow>,
	input: {
		rawMaterialTypeId: string;
		rawMaterialName: string;
		unit: string;
		quantity: DecimalLike;
	},
): void {
	const existing = map.get(input.rawMaterialTypeId);
	const quantity = toNumber(input.quantity);

	if (existing) {
		existing.quantity += quantity;
		return;
	}

	map.set(input.rawMaterialTypeId, {
		rawMaterialTypeId: input.rawMaterialTypeId,
		rawMaterialName: input.rawMaterialName,
		unit: input.unit,
		quantity,
	});
}

export function addProductQuantity(
	map: Map<string, DirectorAnalyticsProductOutputRow>,
	input: {
		productName: string;
		quantity: number;
		rawMaterialConsumedQuantity: DecimalLike;
		rawMaterialUnit: string;
	},
): void {
	const existing = map.get(input.productName);
	const rawMaterialConsumedQuantity = toNumber(input.rawMaterialConsumedQuantity);

	if (existing) {
		existing.quantity += input.quantity;
		existing.rawMaterialConsumedQuantity += rawMaterialConsumedQuantity;
		return;
	}

	map.set(input.productName, {
		productName: input.productName,
		quantity: input.quantity,
		rawMaterialConsumedQuantity,
		rawMaterialUnit: input.rawMaterialUnit,
	});
}

export function sortedRawMaterialRows(
	map: Map<string, DirectorAnalyticsRawMaterialRow>,
): DirectorAnalyticsRawMaterialRow[] {
	return [...map.values()].sort((left, right) => left.rawMaterialName.localeCompare(right.rawMaterialName, "ru"));
}

export function sortedProductRows(
	map: Map<string, DirectorAnalyticsProductOutputRow>,
): DirectorAnalyticsProductOutputRow[] {
	return [...map.values()].sort((left, right) => left.productName.localeCompare(right.productName, "ru"));
}
