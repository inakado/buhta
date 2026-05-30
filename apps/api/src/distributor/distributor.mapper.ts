import type {
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
