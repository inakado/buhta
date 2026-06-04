import type {
	DistributorCashBalanceItem,
	DistributorCashWithdrawal,
	DistributorSale,
	DistributorSaleStockItem,
	DistributorInventoryDistributorSummary,
	DistributorInventoryItem,
	DistributorInventorySummary,
	ProductDiscountAssignment,
} from "@buhta/shared";

type DistributorInventoryRecord = {
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

type DistributorCashBalanceRecord = {
	amountCents: number;
	updatedAt: Date;
	distributor: {
		id: string;
		name: string;
		active: boolean;
	};
};

type DistributorSaleOptionRecord = DistributorInventoryRecord;

type DistributorSaleRecord = {
	id: string;
	distributorProductBalanceId: string;
	distributorId: string;
	productBatchId: string;
	clientId: string;
	quantity: number;
	unitPriceCents: number;
	baseUnitPriceCents: number;
	discountCentsPerUnit: number;
	discountTotalCents: number;
	totalCents: number;
	paymentMethod: string;
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
};

type DistributorCashWithdrawalRecord = {
	id: string;
	distributorId: string;
	amountCents: number;
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
};

type ProductDiscountAssignmentRecord = {
	id: string;
	sourceDistributorProductBalanceId: string;
	discountedDistributorProductBalanceId: string;
	distributorId: string;
	productBatchId: string;
	quantity: number;
	baseUnitPriceCents: number;
	sourceUnitPriceCents: number;
	discountedUnitPriceCents: number;
	discountCentsPerUnit: number;
	stepDiscountCentsPerUnit: number;
	discountTotalCents: number;
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
};

export function mapDistributorInventoryItem(record: DistributorInventoryRecord): DistributorInventoryItem {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);
	const stockValueCents = record.quantity * price.unitPriceCents;

	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		quantity: record.quantity,
		stockValueCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorSaleStockItem(record: DistributorSaleOptionRecord): DistributorSaleStockItem {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);
	const stockValueCents = record.quantity * price.unitPriceCents;

	return {
		distributorProductBalanceId: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		availableQuantity: record.quantity,
		stockValueCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorCashBalanceItem(
	distributor: { id: string; name: string; active: boolean },
	balance: { amountCents: number; updatedAt: Date } | null,
): DistributorCashBalanceItem {
	return {
		distributorId: distributor.id,
		distributorName: distributor.name,
		active: distributor.active,
		amountCents: balance?.amountCents ?? 0,
		updatedAt: balance?.updatedAt.toISOString() ?? null,
	};
}

export function mapDistributorCashBalanceRecord(record: DistributorCashBalanceRecord): DistributorCashBalanceItem {
	return {
		distributorId: record.distributor.id,
		distributorName: record.distributor.name,
		active: record.distributor.active,
		amountCents: record.amountCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorCashWithdrawal(record: DistributorCashWithdrawalRecord): DistributorCashWithdrawal {
	return {
		id: record.id,
		distributorId: record.distributorId,
		amountCents: record.amountCents,
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapDistributorSale(record: DistributorSaleRecord): DistributorSale {
	return {
		id: record.id,
		distributorProductBalanceId: record.distributorProductBalanceId,
		distributorId: record.distributorId,
		productBatchId: record.productBatchId,
		clientId: record.clientId,
		quantity: record.quantity,
		baseUnitPriceCents: record.baseUnitPriceCents,
		unitPriceCents: record.unitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		discountTotalCents: record.discountTotalCents,
		totalCents: record.totalCents,
		paymentMethod: record.paymentMethod === "cash" ? "cash" : "cashless",
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapProductDiscountAssignment(record: ProductDiscountAssignmentRecord): ProductDiscountAssignment {
	return {
		id: record.id,
		sourceDistributorProductBalanceId: record.sourceDistributorProductBalanceId,
		discountedDistributorProductBalanceId: record.discountedDistributorProductBalanceId,
		distributorId: record.distributorId,
		productBatchId: record.productBatchId,
		quantity: record.quantity,
		baseUnitPriceCents: record.baseUnitPriceCents,
		sourceUnitPriceCents: record.sourceUnitPriceCents,
		discountedUnitPriceCents: record.discountedUnitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		stepDiscountCentsPerUnit: record.stepDiscountCentsPerUnit,
		discountTotalCents: record.discountTotalCents,
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function summarizeDistributorInventory(items: DistributorInventoryItem[]): {
	summary: DistributorInventorySummary;
	distributorSummaries: DistributorInventoryDistributorSummary[];
} {
	const distributorSummariesById = new Map<string, DistributorInventoryDistributorSummary>();

	for (const item of items) {
		const current = distributorSummariesById.get(item.distributorId) ?? {
			distributorId: item.distributorId,
			distributorName: item.distributorName,
			stockItemCount: 0,
			totalUnits: 0,
			totalStockValueCents: 0,
		};

		current.stockItemCount += 1;
		current.totalUnits += item.quantity;
		current.totalStockValueCents += item.stockValueCents;
		distributorSummariesById.set(item.distributorId, current);
	}

	const distributorSummaries = Array.from(distributorSummariesById.values()).sort((left, right) =>
		left.distributorName.localeCompare(right.distributorName, "ru"),
	);

	return {
		summary: {
			distributorCount: distributorSummaries.length,
			stockItemCount: items.length,
			totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
			totalStockValueCents: items.reduce((sum, item) => sum + item.stockValueCents, 0),
		},
		distributorSummaries,
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
