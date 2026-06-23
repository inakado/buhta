import type {
	CancelDistributorSaleResponse,
	DistributorCashBalanceItem,
	DistributorCashWithdrawal,
	DistributorRecentSaleItem,
	DistributorSale,
	DistributorSaleCancellation,
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
		netWeightGrams: number;
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
	productBatch: {
		netWeightGrams: number;
	};
};

type UserRecord = {
	id: string;
	email: string;
	username: string | null;
	displayUsername: string | null;
	name: string;
};

type DistributorSaleCancellationRecord = {
	id: string;
	distributorSaleId: string;
	distributorProductBalanceId: string;
	distributorId: string;
	productBatchId: string;
	clientId: string;
	quantity: number;
	baseUnitPriceCents: number;
	unitPriceCents: number;
	discountCentsPerUnit: number;
	discountTotalCents: number;
	totalCents: number;
	paymentMethod: string;
	reason: string;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
	productBatch: {
		netWeightGrams: number;
	};
};

type DistributorRecentSaleRecord = DistributorSaleRecord & {
	productBatch: {
		productName: string;
		netWeightGrams: number;
	};
	client: {
		id: string;
		name: string;
		phone: string;
	};
	operation: {
		actor: UserRecord;
	};
	cancellation: ({
		id: string;
		reason: string;
		actorUserId: string;
		createdAt: Date;
		actor: UserRecord;
	}) | null;
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
	productBatch: {
		netWeightGrams: number;
	};
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
		netWeightGrams: record.productBatch.netWeightGrams,
		quantity: record.quantity,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
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
		netWeightGrams: record.productBatch.netWeightGrams,
		availableQuantity: record.quantity,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
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
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
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

export function mapDistributorSaleCancellation(record: DistributorSaleCancellationRecord): DistributorSaleCancellation {
	return {
		id: record.id,
		distributorSaleId: record.distributorSaleId,
		distributorProductBalanceId: record.distributorProductBalanceId,
		distributorId: record.distributorId,
		productBatchId: record.productBatchId,
		clientId: record.clientId,
		quantity: record.quantity,
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		baseUnitPriceCents: record.baseUnitPriceCents,
		unitPriceCents: record.unitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		discountTotalCents: record.discountTotalCents,
		totalCents: record.totalCents,
		paymentMethod: record.paymentMethod === "cash" ? "cash" : "cashless",
		reason: record.reason,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapDistributorRecentSale(record: DistributorRecentSaleRecord): DistributorRecentSaleItem {
	return {
		id: record.id,
		sourceType: "distributor",
		productName: record.productBatch.productName,
		clientId: record.client.id,
		clientName: record.client.name,
		clientPhone: record.client.phone,
		quantity: record.quantity,
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		baseUnitPriceCents: record.baseUnitPriceCents,
		unitPriceCents: record.unitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		discountTotalCents: record.discountTotalCents,
		totalCents: record.totalCents,
		paymentMethod: record.paymentMethod === "cash" ? "cash" : "cashless",
		comment: record.comment,
		saleActorUserId: record.actorUserId,
		saleActorDisplayName: displayNameForUser(record.operation.actor),
		createdAt: record.createdAt.toISOString(),
		cancelled: record.cancellation !== null,
		cancellationId: record.cancellation?.id ?? null,
		cancellationReason: record.cancellation?.reason ?? null,
		cancelledByActorUserId: record.cancellation?.actorUserId ?? null,
		cancelledByActorDisplayName: record.cancellation
			? displayNameForUser(record.cancellation.actor)
			: null,
		cancelledAt: record.cancellation?.createdAt.toISOString() ?? null,
	};
}

export function mapCancelDistributorSaleResponse(input: {
	cancellation: DistributorSaleCancellationRecord;
	distributorProductBalance: DistributorInventoryRecord;
	cashBalance: DistributorCashBalanceRecord | null;
	distributor: { id: string; name: string; active: boolean };
}): CancelDistributorSaleResponse {
	return {
		cancellation: mapDistributorSaleCancellation(input.cancellation),
		distributorProductBalance: mapDistributorInventoryItem(input.distributorProductBalance),
		cashBalance: input.cashBalance
			? mapDistributorCashBalanceRecord(input.cashBalance)
			: mapDistributorCashBalanceItem(input.distributor, null),
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
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
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
			totalNetWeightGrams: 0,
			totalStockValueCents: 0,
		};

		current.stockItemCount += 1;
		current.totalUnits += item.quantity;
		current.totalNetWeightGrams += item.totalNetWeightGrams;
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
			totalNetWeightGrams: items.reduce((sum, item) => sum + item.totalNetWeightGrams, 0),
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

function totalNetWeightGrams(quantity: number, netWeightGrams: number): number {
	return quantity * netWeightGrams;
}

function displayNameForUser(user: UserRecord): string {
	return user.name ?? user.displayUsername ?? user.username ?? user.email ?? user.id;
}
