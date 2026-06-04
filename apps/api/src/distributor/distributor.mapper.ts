import type {
	DistributorCashBalanceItem,
	DistributorCashWithdrawal,
	DistributorSale,
	DistributorSaleStockItem,
	DistributorInventoryDistributorSummary,
	DistributorInventoryItem,
	DistributorInventorySummary,
} from "@buhta/shared";

type DistributorInventoryRecord = {
	id: string;
	distributorId: string;
	productBatchId: string;
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

export function mapDistributorInventoryItem(record: DistributorInventoryRecord): DistributorInventoryItem {
	const stockValueCents = record.quantity * record.productBatch.priceCents;

	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		priceCents: record.productBatch.priceCents,
		quantity: record.quantity,
		stockValueCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorSaleStockItem(record: DistributorSaleOptionRecord): DistributorSaleStockItem {
	const stockValueCents = record.quantity * record.productBatch.priceCents;

	return {
		distributorProductBalanceId: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		unitPriceCents: record.productBatch.priceCents,
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
		unitPriceCents: record.unitPriceCents,
		totalCents: record.totalCents,
		paymentMethod: record.paymentMethod === "cash" ? "cash" : "cashless",
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
