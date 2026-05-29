import type {
	ProductBatch,
	ProductionBalanceItem,
	ProductionSummary,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

type BalanceRecord = {
	id: string;
	quantity: DecimalLike;
	updatedAt: Date;
	rawMaterialType?: {
		id: string;
		name: string;
		unit: string;
	};
	packagingType?: {
		id: string;
		name: string;
		unit: string;
	};
};

type ProductBatchRecord = {
	id: string;
	productTemplateId: string;
	productName: string;
	rawMaterialTypeId: string;
	rawMaterialTypeName: string;
	rawMaterialUnit: string;
	packagingTypeId: string;
	packagingTypeName: string;
	packagingUnit: string;
	priceCents: number;
	quantity: number;
	consumedRawMaterialQuantity: DecimalLike;
	consumedPackagingQuantity: DecimalLike;
	status: string;
	createdAt: Date;
};

export function mapRawMaterialBalance(record: BalanceRecord): ProductionBalanceItem {
	if (!record.rawMaterialType) {
		throw new Error("Raw material balance requires raw material type");
	}

	return {
		id: record.id,
		typeId: record.rawMaterialType.id,
		name: record.rawMaterialType.name,
		unit: record.rawMaterialType.unit,
		quantity: toNumber(record.quantity),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapPackagingBalance(record: BalanceRecord): ProductionBalanceItem {
	if (!record.packagingType) {
		throw new Error("Packaging balance requires packaging type");
	}

	return {
		id: record.id,
		typeId: record.packagingType.id,
		name: record.packagingType.name,
		unit: record.packagingType.unit,
		quantity: toNumber(record.quantity),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapProductBatch(record: ProductBatchRecord): ProductBatch {
	return {
		id: record.id,
		productTemplateId: record.productTemplateId,
		productName: record.productName,
		rawMaterialTypeId: record.rawMaterialTypeId,
		rawMaterialTypeName: record.rawMaterialTypeName,
		rawMaterialUnit: record.rawMaterialUnit,
		packagingTypeId: record.packagingTypeId,
		packagingTypeName: record.packagingTypeName,
		packagingUnit: record.packagingUnit,
		priceCents: record.priceCents,
		quantity: record.quantity,
		consumedRawMaterialQuantity: toNumber(record.consumedRawMaterialQuantity),
		consumedPackagingQuantity: toNumber(record.consumedPackagingQuantity),
		status: "in_workshop",
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapProductionSummary(input: {
	readyProductUnits: number;
	rawMaterialBalances: ProductionBalanceItem[];
	packagingBalances: ProductionBalanceItem[];
}): ProductionSummary {
	return {
		readyProductUnits: input.readyProductUnits,
		rawMaterialKinds: input.rawMaterialBalances.length,
		rawMaterialTotal: sumQuantities(input.rawMaterialBalances),
		rawMaterialUnit: input.rawMaterialBalances[0]?.unit ?? "кг",
		packagingKinds: input.packagingBalances.length,
		packagingTotal: sumQuantities(input.packagingBalances),
		packagingUnit: input.packagingBalances[0]?.unit ?? "шт",
	};
}

function sumQuantities(items: ProductionBalanceItem[]): number {
	return items.reduce((sum, item) => sum + item.quantity, 0);
}

function toNumber(value: DecimalLike): number {
	return Number(value);
}
