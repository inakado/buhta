import type {
	DistributorProductBalanceItem,
	ProductBatch,
	ProductTransfer,
	ProductionBalanceItem,
	ProductionSummary,
	WorkshopProductBalanceItem,
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

type WorkshopProductBalanceRecord = {
	id: string;
	productBatchId: string;
	quantity: number;
	updatedAt: Date;
	productBatch: {
		id: string;
		productName: string;
		priceCents: number;
		quantity: number;
		createdAt: Date;
	};
};

type DistributorProductBalanceRecord = {
	id: string;
	distributorId: string;
	productBatchId: string;
	unitPriceCents: number;
	quantity: number;
	updatedAt: Date;
	distributor: {
		id: string;
		name: string;
	};
	productBatch: {
		id: string;
		productName: string;
		priceCents: number;
	};
};

type ProductTransferRecord = {
	id: string;
	productBatchId: string;
	distributorId: string;
	quantity: number;
	baseUnitPriceCents: number;
	unitPriceCents: number;
	discountCentsPerUnit: number;
	stockValueCents: number;
	comment: string | null;
	operationId: string;
	actorUserId: string;
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

export function mapWorkshopProductBalance(record: WorkshopProductBalanceRecord): WorkshopProductBalanceItem {
	return {
		id: record.id,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		priceCents: record.productBatch.priceCents,
		quantity: record.quantity,
		producedQuantity: record.productBatch.quantity,
		createdAt: record.productBatch.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorProductBalance(
	record: DistributorProductBalanceRecord,
): DistributorProductBalanceItem {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		quantity: record.quantity,
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapProductTransfer(record: ProductTransferRecord): ProductTransfer {
	return {
		id: record.id,
		productBatchId: record.productBatchId,
		distributorId: record.distributorId,
		quantity: record.quantity,
		baseUnitPriceCents: record.baseUnitPriceCents,
		unitPriceCents: record.unitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		stockValueCents: record.stockValueCents,
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

function priceSnapshot(baseUnitPriceCents: number, unitPriceCents: number): {
	baseUnitPriceCents: number;
	unitPriceCents: number;
	discounted: boolean;
	discountCentsPerUnit: number;
} {
	const discountCentsPerUnit = Math.max(baseUnitPriceCents - unitPriceCents, 0);

	return {
		baseUnitPriceCents,
		unitPriceCents,
		discounted: discountCentsPerUnit > 0,
		discountCentsPerUnit,
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
