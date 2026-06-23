import type {
	CancelCourierSaleResponse,
	CourierCashBalanceItem,
	CourierLoad,
	CourierLoadOption,
	CourierProductBalanceItem,
	CourierProductBalancesCourierSummary,
	CourierProductBalancesSummary,
	CourierRecentSaleItem,
	CourierSale,
	CourierSaleCancellation,
	CourierSaleOption,
	CourierUnload,
	CourierUnloadDistributorCashBalance,
	CourierUnloadDistributorOption,
	CourierUnloadDistributorProductBalance,
	CourierUnloadItem,
	CourierUnloadProductOption,
} from "@buhta/shared";

type UserRecord = {
	id: string;
	email: string;
	username: string | null;
	displayUsername: string | null;
	name: string;
};

type ProductBatchRecord = {
	id: string;
	productName: string;
	priceCents: number;
	netWeightGrams: number;
};

type DistributorRecord = {
	id: string;
	name: string;
};

type DistributorBalanceRecord = {
	id: string;
	distributorId: string;
	productBatchId: string;
	unitPriceCents: number;
	quantity: number;
	updatedAt: Date;
	distributor: DistributorRecord;
	productBatch: ProductBatchRecord;
};

type CourierBalanceRecord = {
	id: string;
	courierUserId: string;
	productBatchId: string;
	unitPriceCents: number;
	quantity: number;
	updatedAt: Date;
	courier: UserRecord;
	productBatch: ProductBatchRecord;
};

type CourierCashBalanceRecord = {
	amountCents: number;
	updatedAt: Date;
};

type CourierLoadRecord = {
	id: string;
	courierUserId: string;
	distributorProductBalanceId: string;
	distributorId: string;
	productBatchId: string;
	quantity: number;
	baseUnitPriceCents: number;
	unitPriceCents: number;
	discountCentsPerUnit: number;
	stockValueCents: number;
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
	productBatch: {
		netWeightGrams: number;
	};
};

type CourierSaleRecord = {
	id: string;
	courierProductBalanceId: string;
	courierUserId: string;
	productBatchId: string;
	clientId: string;
	quantity: number;
	baseUnitPriceCents: number;
	unitPriceCents: number;
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

type CourierSaleCancellationRecord = {
	id: string;
	courierSaleId: string;
	courierProductBalanceId: string;
	courierUserId: string;
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

type CourierRecentSaleRecord = CourierSaleRecord & {
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

type CourierUnloadRecord = {
	id: string;
	courierUserId: string;
	distributorId: string;
	cashAmountCents: number;
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
};

type CourierUnloadItemRecord = {
	id: string;
	courierUnloadId: string;
	courierProductBalanceId: string;
	distributorProductBalanceId: string;
	productBatchId: string;
	quantity: number;
	baseUnitPriceCents: number;
	unitPriceCents: number;
	discountCentsPerUnit: number;
	stockValueCents: number;
	productBatch: {
		netWeightGrams: number;
	};
};

export function mapCourierLoadOption(record: DistributorBalanceRecord): CourierLoadOption {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

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
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorBalanceAfter(record: DistributorBalanceRecord) {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

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
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierProductBalanceItem(record: CourierBalanceRecord): CourierProductBalanceItem {
	const courierLogin = loginForUser(record.courier);
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

	return {
		id: record.id,
		courierUserId: record.courierUserId,
		courierLogin,
		courierDisplayName: record.courier.name ?? record.courier.displayUsername ?? courierLogin,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		netWeightGrams: record.productBatch.netWeightGrams,
		quantity: record.quantity,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierSaleOption(record: CourierBalanceRecord): CourierSaleOption {
	const courierLogin = loginForUser(record.courier);
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

	return {
		courierProductBalanceId: record.id,
		courierUserId: record.courierUserId,
		courierLogin,
		courierDisplayName: displayNameForUser(record.courier, courierLogin),
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		netWeightGrams: record.productBatch.netWeightGrams,
		availableQuantity: record.quantity,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierUnloadProductOption(record: CourierBalanceRecord): CourierUnloadProductOption {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

	return {
		courierProductBalanceId: record.id,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		netWeightGrams: record.productBatch.netWeightGrams,
		availableQuantity: record.quantity,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierUnloadDistributorOption(record: DistributorRecord): CourierUnloadDistributorOption {
	return {
		distributorId: record.id,
		distributorName: record.name,
	};
}

export function mapCourierCashBalanceItem(
	courier: UserRecord,
	cashBalance: CourierCashBalanceRecord | null,
): CourierCashBalanceItem {
	const courierLogin = loginForUser(courier);

	return {
		courierUserId: courier.id,
		courierLogin,
		courierDisplayName: displayNameForUser(courier, courierLogin),
		amountCents: cashBalance?.amountCents ?? 0,
		updatedAt: cashBalance?.updatedAt.toISOString() ?? null,
	};
}

export function mapCourierLoad(record: CourierLoadRecord): CourierLoad {
	return {
		id: record.id,
		courierUserId: record.courierUserId,
		distributorProductBalanceId: record.distributorProductBalanceId,
		distributorId: record.distributorId,
		productBatchId: record.productBatchId,
		quantity: record.quantity,
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
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

export function mapCourierSale(record: CourierSaleRecord): CourierSale {
	return {
		id: record.id,
		courierProductBalanceId: record.courierProductBalanceId,
		courierUserId: record.courierUserId,
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
		paymentMethod: record.paymentMethod === "cashless" ? "cashless" : "cash",
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapCourierSaleCancellation(record: CourierSaleCancellationRecord): CourierSaleCancellation {
	return {
		id: record.id,
		courierSaleId: record.courierSaleId,
		courierProductBalanceId: record.courierProductBalanceId,
		courierUserId: record.courierUserId,
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
		paymentMethod: record.paymentMethod === "cashless" ? "cashless" : "cash",
		reason: record.reason,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapCourierRecentSale(record: CourierRecentSaleRecord): CourierRecentSaleItem {
	const saleActorLogin = loginForUser(record.operation.actor);
	const cancellationActorLogin = record.cancellation ? loginForUser(record.cancellation.actor) : null;

	return {
		id: record.id,
		sourceType: "courier",
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
		paymentMethod: record.paymentMethod === "cashless" ? "cashless" : "cash",
		comment: record.comment,
		saleActorUserId: record.actorUserId,
		saleActorDisplayName: displayNameForUser(record.operation.actor, saleActorLogin),
		createdAt: record.createdAt.toISOString(),
		cancelled: record.cancellation !== null,
		cancellationId: record.cancellation?.id ?? null,
		cancellationReason: record.cancellation?.reason ?? null,
		cancelledByActorUserId: record.cancellation?.actorUserId ?? null,
		cancelledByActorDisplayName: record.cancellation && cancellationActorLogin
			? displayNameForUser(record.cancellation.actor, cancellationActorLogin)
			: null,
		cancelledAt: record.cancellation?.createdAt.toISOString() ?? null,
	};
}

export function mapCancelCourierSaleResponse(input: {
	cancellation: CourierSaleCancellationRecord;
	courierProductBalance: CourierBalanceRecord;
	cashBalance: CourierCashBalanceRecord | null;
	courier: UserRecord;
}): CancelCourierSaleResponse {
	return {
		cancellation: mapCourierSaleCancellation(input.cancellation),
		courierProductBalance: mapCourierProductBalanceItem(input.courierProductBalance),
		cashBalance: mapCourierCashBalanceItem(input.courier, input.cashBalance),
	};
}

export function mapCourierUnload(record: CourierUnloadRecord): CourierUnload {
	return {
		id: record.id,
		courierUserId: record.courierUserId,
		distributorId: record.distributorId,
		cashAmountCents: record.cashAmountCents,
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapCourierUnloadItem(record: CourierUnloadItemRecord): CourierUnloadItem {
	return {
		id: record.id,
		courierUnloadId: record.courierUnloadId,
		courierProductBalanceId: record.courierProductBalanceId,
		distributorProductBalanceId: record.distributorProductBalanceId,
		productBatchId: record.productBatchId,
		quantity: record.quantity,
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		baseUnitPriceCents: record.baseUnitPriceCents,
		unitPriceCents: record.unitPriceCents,
		discountCentsPerUnit: record.discountCentsPerUnit,
		stockValueCents: record.stockValueCents,
	};
}

export function mapCourierUnloadDistributorProductBalance(
	record: DistributorBalanceRecord,
): CourierUnloadDistributorProductBalance {
	const price = priceSnapshot(record.productBatch.priceCents, record.unitPriceCents);

	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		...price,
		quantity: record.quantity,
		netWeightGrams: record.productBatch.netWeightGrams,
		totalNetWeightGrams: totalNetWeightGrams(record.quantity, record.productBatch.netWeightGrams),
		stockValueCents: record.quantity * price.unitPriceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierUnloadDistributorCashBalance(
	distributor: DistributorRecord,
	cashBalance: { amountCents: number; updatedAt: Date } | null,
): CourierUnloadDistributorCashBalance {
	return {
		distributorId: distributor.id,
		distributorName: distributor.name,
		amountCents: cashBalance?.amountCents ?? 0,
		updatedAt: cashBalance?.updatedAt.toISOString() ?? null,
	};
}

export function summarizeCourierProductBalances(items: CourierProductBalanceItem[]): {
	summary: CourierProductBalancesSummary;
	courierSummaries: CourierProductBalancesCourierSummary[];
} {
	const courierSummariesById = new Map<string, CourierProductBalancesCourierSummary>();

	for (const item of items) {
		const current = courierSummariesById.get(item.courierUserId) ?? {
			courierUserId: item.courierUserId,
			courierLogin: item.courierLogin,
			courierDisplayName: item.courierDisplayName,
			stockItemCount: 0,
			totalUnits: 0,
			totalNetWeightGrams: 0,
			totalStockValueCents: 0,
		};

		current.stockItemCount += 1;
		current.totalUnits += item.quantity;
		current.totalNetWeightGrams += item.totalNetWeightGrams;
		current.totalStockValueCents += item.stockValueCents;
		courierSummariesById.set(item.courierUserId, current);
	}

	const courierSummaries = Array.from(courierSummariesById.values()).sort((left, right) =>
		left.courierDisplayName.localeCompare(right.courierDisplayName, "ru"),
	);

	return {
		summary: {
			courierCount: courierSummaries.length,
			stockItemCount: items.length,
			totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
			totalNetWeightGrams: items.reduce((sum, item) => sum + item.totalNetWeightGrams, 0),
			totalStockValueCents: items.reduce((sum, item) => sum + item.stockValueCents, 0),
		},
		courierSummaries,
	};
}

function loginForUser(user: UserRecord): string {
	return user.username ?? user.displayUsername ?? user.email ?? user.id;
}

function totalNetWeightGrams(quantity: number, netWeightGrams: number): number {
	return quantity * netWeightGrams;
}

function displayNameForUser(user: UserRecord, fallback: string): string {
	return user.name ?? user.displayUsername ?? fallback;
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
