import type {
	CourierCashBalanceItem,
	CourierLoad,
	CourierLoadOption,
	CourierProductBalanceItem,
	CourierProductBalancesCourierSummary,
	CourierProductBalancesSummary,
	CourierSale,
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
};

type DistributorRecord = {
	id: string;
	name: string;
};

type DistributorBalanceRecord = {
	id: string;
	distributorId: string;
	productBatchId: string;
	quantity: number;
	updatedAt: Date;
	distributor: DistributorRecord;
	productBatch: ProductBatchRecord;
};

type CourierBalanceRecord = {
	id: string;
	courierUserId: string;
	productBatchId: string;
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
	comment: string | null;
	operationId: string;
	actorUserId: string;
	createdAt: Date;
};

type CourierSaleRecord = {
	id: string;
	courierProductBalanceId: string;
	courierUserId: string;
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
	unitPriceCents: number;
	stockValueCents: number;
};

export function mapCourierLoadOption(record: DistributorBalanceRecord): CourierLoadOption {
	return {
		distributorProductBalanceId: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		unitPriceCents: record.productBatch.priceCents,
		availableQuantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDistributorBalanceAfter(record: DistributorBalanceRecord) {
	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		priceCents: record.productBatch.priceCents,
		quantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierProductBalanceItem(record: CourierBalanceRecord): CourierProductBalanceItem {
	const courierLogin = loginForUser(record.courier);

	return {
		id: record.id,
		courierUserId: record.courierUserId,
		courierLogin,
		courierDisplayName: record.courier.name ?? record.courier.displayUsername ?? courierLogin,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		unitPriceCents: record.productBatch.priceCents,
		quantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierSaleOption(record: CourierBalanceRecord): CourierSaleOption {
	const courierLogin = loginForUser(record.courier);

	return {
		courierProductBalanceId: record.id,
		courierUserId: record.courierUserId,
		courierLogin,
		courierDisplayName: displayNameForUser(record.courier, courierLogin),
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		unitPriceCents: record.productBatch.priceCents,
		availableQuantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapCourierUnloadProductOption(record: CourierBalanceRecord): CourierUnloadProductOption {
	return {
		courierProductBalanceId: record.id,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		unitPriceCents: record.productBatch.priceCents,
		availableQuantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
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
		unitPriceCents: record.unitPriceCents,
		totalCents: record.totalCents,
		paymentMethod: record.paymentMethod === "cashless" ? "cashless" : "cash",
		comment: record.comment,
		operationId: record.operationId,
		actorUserId: record.actorUserId,
		createdAt: record.createdAt.toISOString(),
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
		unitPriceCents: record.unitPriceCents,
		stockValueCents: record.stockValueCents,
	};
}

export function mapCourierUnloadDistributorProductBalance(
	record: DistributorBalanceRecord,
): CourierUnloadDistributorProductBalance {
	return {
		id: record.id,
		distributorId: record.distributorId,
		distributorName: record.distributor.name,
		productBatchId: record.productBatchId,
		productName: record.productBatch.productName,
		priceCents: record.productBatch.priceCents,
		quantity: record.quantity,
		stockValueCents: record.quantity * record.productBatch.priceCents,
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
			totalStockValueCents: 0,
		};

		current.stockItemCount += 1;
		current.totalUnits += item.quantity;
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
			totalStockValueCents: items.reduce((sum, item) => sum + item.stockValueCents, 0),
		},
		courierSummaries,
	};
}

function loginForUser(user: UserRecord): string {
	return user.username ?? user.displayUsername ?? user.email ?? user.id;
}

function displayNameForUser(user: UserRecord, fallback: string): string {
	return user.name ?? user.displayUsername ?? fallback;
}
