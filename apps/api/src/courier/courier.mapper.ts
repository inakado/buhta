import type {
	CourierLoad,
	CourierLoadOption,
	CourierProductBalanceItem,
	CourierProductBalancesCourierSummary,
	CourierProductBalancesSummary,
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
