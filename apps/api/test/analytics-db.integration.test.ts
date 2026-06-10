import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import {
	AnalyticsService,
	normalizeDirectorAnalyticsQuery,
} from "../src/analytics/analytics.service";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";

const analyticsService = new AnalyticsService();

const actorIds = {
	director: "analytics-director",
	worker: "analytics-worker",
	courier: "analytics-courier",
};
const distributorId = "analytics-distributor";
const rawMaterialTypeId = "analytics-raw-gorbusha";
const packagingTypeId = "analytics-packaging-jar";
const productTemplateId = "analytics-template";
const productBatchId = "analytics-batch";
const distributorProductBalanceId = "analytics-distributor-balance";
const courierProductBalanceId = "analytics-courier-balance";
const clientId = "analytics-client";

const dayStartUtc = "2036-06-04T14:00:00.000Z";
const nextDayStartUtc = "2036-06-05T14:00:00.000Z";
const periodSaleDate = new Date("2036-06-05T02:00:00.000Z");
const periodCashlessSaleDate = new Date("2036-06-05T03:00:00.000Z");
const periodCourierSaleDate = new Date("2036-06-05T04:00:00.000Z");
const periodCancellationDate = new Date("2036-06-05T05:00:00.000Z");
const beforePeriodSaleDate = new Date("2036-06-04T10:00:00.000Z");
const outsidePeriodDate = new Date("2036-06-06T01:00:00.000Z");
let baselineDistributorCashCents = 0;
let baselineCourierCashCents = 0;
let baselineWorkshopProductUnits = 0;

async function cleanup() {
	await prisma.distributorSaleCancellation.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { distributorId }] },
	});
	await prisma.courierSaleCancellation.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { courierUserId: actorIds.courier }] },
	});
	await prisma.distributorSale.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { distributorId }] },
	});
	await prisma.courierSale.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { courierUserId: actorIds.courier }] },
	});
	await prisma.courierUnloadItem.deleteMany({
		where: { courierUnload: { courierUserId: actorIds.courier } },
	});
	await prisma.courierUnload.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { courierUserId: actorIds.courier }] },
	});
	await prisma.distributorCashWithdrawal.deleteMany({
		where: { OR: [{ actorUserId: { in: Object.values(actorIds) } }, { distributorId }] },
	});
	await prisma.distributorCashBalance.deleteMany({ where: { distributorId } });
	await prisma.courierCashBalance.deleteMany({ where: { courierUserId: actorIds.courier } });
	await prisma.courierProductBalance.deleteMany({ where: { courierUserId: actorIds.courier } });
	await prisma.distributorProductBalance.deleteMany({ where: { distributorId } });
	await prisma.workshopProductBalance.deleteMany({ where: { productBatchId } });
	await prisma.productTransfer.deleteMany({ where: { productBatchId } });
	await prisma.productBatch.deleteMany({ where: { id: productBatchId } });
	await prisma.rawMaterialIntake.deleteMany({ where: { rawMaterialTypeId } });
	await prisma.rawMaterialBalance.deleteMany({ where: { rawMaterialTypeId } });
	await prisma.productTemplate.deleteMany({ where: { id: productTemplateId } });
	await prisma.client.deleteMany({ where: { id: clientId } });
	await prisma.distributor.deleteMany({ where: { id: distributorId } });
	await prisma.packagingType.deleteMany({ where: { id: packagingTypeId } });
	await prisma.rawMaterialType.deleteMany({ where: { id: rawMaterialTypeId } });

	const operations = await prisma.operation.findMany({
		where: { actorUserId: { in: Object.values(actorIds) } },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);
	await deleteAuditLogsForTest({ where: { operationId: { in: operationIds } } });
	await prisma.idempotencyRecord.deleteMany({ where: { operationId: { in: operationIds } } });
	await prisma.operation.deleteMany({ where: { id: { in: operationIds } } });
	await prisma.session.deleteMany({ where: { userId: { in: Object.values(actorIds) } } });
	await prisma.account.deleteMany({ where: { userId: { in: Object.values(actorIds) } } });
	await prisma.user.deleteMany({ where: { id: { in: Object.values(actorIds) } } });
}

async function seedUsers() {
	await prisma.user.createMany({
		data: [
			{
				id: actorIds.director,
				email: "analytics-director@internal.buhta.local",
				emailVerified: true,
				name: "Директор аналитики",
				username: "analytics-director",
				displayUsername: "analytics-director",
				role: "director",
			},
			{
				id: actorIds.worker,
				email: "analytics-worker@internal.buhta.local",
				emailVerified: true,
				name: "Работник аналитики",
				username: "analytics-worker",
				displayUsername: "analytics-worker",
				role: "distributor_worker",
			},
			{
				id: actorIds.courier,
				email: "analytics-courier@internal.buhta.local",
				emailVerified: true,
				name: "Курьер аналитики",
				username: "analytics-courier",
				displayUsername: "analytics-courier",
				role: "courier",
			},
		],
	});
}

async function createOperation(actorUserId: string, type: string, createdAt: Date) {
	return prisma.operation.create({
		data: {
			actorUserId,
			createdAt,
			status: "succeeded",
			type,
		},
	});
}

async function seedCatalogAndProduction() {
	await prisma.rawMaterialType.create({
		data: {
			id: rawMaterialTypeId,
			name: "Икра горбуши аналитика",
			unit: "кг",
		},
	});
	await prisma.packagingType.create({
		data: {
			id: packagingTypeId,
			name: "Банка аналитика",
			unit: "шт",
		},
	});
	await prisma.productTemplate.create({
		data: {
			id: productTemplateId,
			name: "Икра горбуши аналитика 250 г",
			rawMaterialTypeId,
			packagingTypeId,
			priceCents: 125000,
		},
	});
	await prisma.distributor.create({
		data: {
			id: distributorId,
			name: "Распределитель аналитика",
		},
	});
	await prisma.client.create({
		data: {
			id: clientId,
			name: "Клиент аналитики",
			phone: "+7 999 000-00-00",
			phoneNormalized: "79990000000",
			createdByUserId: actorIds.worker,
		},
	});
	const rawIntakeOperation = await createOperation(
		actorIds.director,
		"production.raw_material_intake.create",
		periodSaleDate,
	);
	await prisma.rawMaterialIntake.create({
		data: {
			rawMaterialTypeId,
			quantity: 12.5,
			operationId: rawIntakeOperation.id,
			actorUserId: actorIds.director,
			createdAt: periodSaleDate,
		},
	});
	await prisma.rawMaterialBalance.create({
		data: {
			rawMaterialTypeId,
			quantity: 2.5,
		},
	});
	const productBatchOperation = await createOperation(
		actorIds.director,
		"production.product_batch.create",
		periodSaleDate,
	);
	await prisma.productBatch.create({
		data: {
			id: productBatchId,
			productTemplateId,
			productName: "Икра горбуши аналитика 250 г",
			rawMaterialTypeId,
			rawMaterialTypeName: "Икра горбуши аналитика",
			rawMaterialUnit: "кг",
			packagingTypeId,
			packagingTypeName: "Банка аналитика",
			packagingUnit: "шт",
			priceCents: 125000,
			quantity: 40,
			consumedRawMaterialQuantity: 10,
			consumedPackagingQuantity: 40,
			operationId: productBatchOperation.id,
			actorUserId: actorIds.director,
			createdAt: periodSaleDate,
		},
	});
	await prisma.workshopProductBalance.create({
		data: {
			productBatchId,
			quantity: 10,
		},
	});
	const transferOperation = await createOperation(
		actorIds.director,
		"production.product_transfer.create",
		periodSaleDate,
	);
	await prisma.productTransfer.create({
		data: {
			productBatchId,
			distributorId,
			quantity: 30,
			baseUnitPriceCents: 125000,
			unitPriceCents: 125000,
			discountCentsPerUnit: 0,
			stockValueCents: 3750000,
			operationId: transferOperation.id,
			actorUserId: actorIds.director,
			createdAt: periodSaleDate,
		},
	});
	await prisma.distributorProductBalance.create({
		data: {
			id: distributorProductBalanceId,
			distributorId,
			productBatchId,
			unitPriceCents: 125000,
			quantity: 10,
		},
	});
	await prisma.courierProductBalance.create({
		data: {
			id: courierProductBalanceId,
			courierUserId: actorIds.courier,
			productBatchId,
			unitPriceCents: 125000,
			quantity: 3,
		},
	});
	await prisma.distributorCashBalance.create({
		data: {
			distributorId,
			amountCents: 100000,
		},
	});
	await prisma.courierCashBalance.create({
		data: {
			courierUserId: actorIds.courier,
			amountCents: 25000,
		},
	});
}

async function seedMoneyFacts() {
	const distributorCashSaleOperation = await createOperation(
		actorIds.worker,
		"distributor.sale.create",
		periodSaleDate,
	);
	await prisma.distributorSale.create({
		data: {
			id: "analytics-distributor-cash-sale",
			distributorProductBalanceId,
			distributorId,
			productBatchId,
			clientId,
			quantity: 1,
			baseUnitPriceCents: 100000,
			unitPriceCents: 100000,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 100000,
			paymentMethod: "cash",
			operationId: distributorCashSaleOperation.id,
			actorUserId: actorIds.worker,
			createdAt: periodSaleDate,
		},
	});

	const distributorCashlessSaleOperation = await createOperation(
		actorIds.worker,
		"distributor.sale.create",
		periodCashlessSaleDate,
	);
	await prisma.distributorSale.create({
		data: {
			id: "analytics-distributor-cashless-sale",
			distributorProductBalanceId,
			distributorId,
			productBatchId,
			clientId,
			quantity: 2,
			baseUnitPriceCents: 100000,
			unitPriceCents: 100000,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 200000,
			paymentMethod: "cashless",
			operationId: distributorCashlessSaleOperation.id,
			actorUserId: actorIds.worker,
			createdAt: periodCashlessSaleDate,
		},
	});

	const courierSaleOperation = await createOperation(actorIds.courier, "courier.sale.create", periodCourierSaleDate);
	await prisma.courierSale.create({
		data: {
			id: "analytics-courier-cash-sale",
			courierProductBalanceId,
			courierUserId: actorIds.courier,
			productBatchId,
			clientId,
			quantity: 1,
			baseUnitPriceCents: 50000,
			unitPriceCents: 50000,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 50000,
			paymentMethod: "cash",
			operationId: courierSaleOperation.id,
			actorUserId: actorIds.courier,
			createdAt: periodCourierSaleDate,
		},
	});

	const beforePeriodSaleOperation = await createOperation(
		actorIds.worker,
		"distributor.sale.create",
		beforePeriodSaleDate,
	);
	await prisma.distributorSale.create({
		data: {
			id: "analytics-before-period-sale",
			distributorProductBalanceId,
			distributorId,
			productBatchId,
			clientId,
			quantity: 1,
			baseUnitPriceCents: 30000,
			unitPriceCents: 30000,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 30000,
			paymentMethod: "cash",
			operationId: beforePeriodSaleOperation.id,
			actorUserId: actorIds.worker,
			createdAt: beforePeriodSaleDate,
		},
	});

	const cancellationOperation = await createOperation(
		actorIds.worker,
		"distributor.sale.cancel",
		periodCancellationDate,
	);
	await prisma.distributorSaleCancellation.create({
		data: {
			id: "analytics-period-cancellation",
			distributorSaleId: "analytics-before-period-sale",
			distributorProductBalanceId,
			distributorId,
			productBatchId,
			clientId,
			quantity: 1,
			baseUnitPriceCents: 30000,
			unitPriceCents: 30000,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 30000,
			paymentMethod: "cash",
			reason: "Ошибка продажи",
			operationId: cancellationOperation.id,
			actorUserId: actorIds.worker,
			createdAt: periodCancellationDate,
		},
	});

	const outsideSaleOperation = await createOperation(actorIds.worker, "distributor.sale.create", outsidePeriodDate);
	await prisma.distributorSale.create({
		data: {
			id: "analytics-outside-period-sale",
			distributorProductBalanceId,
			distributorId,
			productBatchId,
			clientId,
			quantity: 1,
			baseUnitPriceCents: 999999,
			unitPriceCents: 999999,
			discountCentsPerUnit: 0,
			discountTotalCents: 0,
			totalCents: 999999,
			paymentMethod: "cash",
			operationId: outsideSaleOperation.id,
			actorUserId: actorIds.worker,
			createdAt: outsidePeriodDate,
		},
	});

	const unloadOperation = await createOperation(actorIds.courier, "courier.unload.create", periodSaleDate);
	await prisma.courierUnload.create({
		data: {
			id: "analytics-courier-unload",
			courierUserId: actorIds.courier,
			distributorId,
			cashAmountCents: 40000,
			operationId: unloadOperation.id,
			actorUserId: actorIds.courier,
			createdAt: periodSaleDate,
		},
	});

	const withdrawalOperation = await createOperation(
		actorIds.director,
		"distributor.cash.withdraw",
		periodSaleDate,
	);
	await prisma.distributorCashWithdrawal.create({
		data: {
			id: "analytics-withdrawal",
			distributorId,
			amountCents: 25000,
			operationId: withdrawalOperation.id,
			actorUserId: actorIds.director,
			createdAt: periodSaleDate,
		},
	});
}

describe("AnalyticsService real Postgres integration", () => {
	beforeEach(async () => {
		await cleanup();
		const [distributorCash, courierCash, workshopProductBalance] = await Promise.all([
			prisma.distributorCashBalance.aggregate({ _sum: { amountCents: true } }),
			prisma.courierCashBalance.aggregate({ _sum: { amountCents: true } }),
			prisma.workshopProductBalance.aggregate({ _sum: { quantity: true } }),
		]);
		baselineDistributorCashCents = distributorCash._sum.amountCents ?? 0;
		baselineCourierCashCents = courierCash._sum.amountCents ?? 0;
		baselineWorkshopProductUnits = workshopProductBalance._sum.quantity ?? 0;
		await seedUsers();
		await seedCatalogAndProduction();
		await seedMoneyFacts();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("uses Asia/Vladivostok day boundaries for today preset", () => {
		const normalized = normalizeDirectorAnalyticsQuery(
			{ periodPreset: "today" },
			new Date("2036-06-05T03:00:00.000Z"),
		);

		expect(normalized.dateFrom.toISOString()).toBe(dayStartUtc);
		expect(normalized.dateTo.toISOString()).toBe(nextDayStartUtc);
	});

	it("gives dateFrom/dateTo priority and rejects partial custom ranges", () => {
		const normalized = normalizeDirectorAnalyticsQuery({
			dateFrom: "2036-06-05",
			dateTo: "2036-06-05",
			periodPreset: "90d",
		});

		expect(normalized.dateFrom.toISOString()).toBe(dayStartUtc);
		expect(normalized.dateTo.toISOString()).toBe(nextDayStartUtc);
		expect(normalized.periodPreset).toBe("90d");
		expect(() => normalizeDirectorAnalyticsQuery({ dateFrom: "2036-06-05" })).toThrow(AppError);
	});

	it("aggregates money and production facts without treating courier cash unload as revenue", async () => {
		const response = await analyticsService.getDirectorAnalytics({
			dateFrom: "2036-06-05",
			dateTo: "2036-06-05",
		});

		expect(response.filters).toMatchObject({
			dateFrom: dayStartUtc,
			dateTo: nextDayStartUtc,
			timezone: "Asia/Vladivostok",
		});
		expect(response.money).toMatchObject({
			grossRevenueCents: 350000,
			cancelledRevenueCents: 30000,
			netRevenueCents: 320000,
			cashRevenueCents: 120000,
			cashlessRevenueCents: 200000,
			saleCount: 3,
			cancellationCount: 1,
			currentCash: {
				distributorCashCents: baselineDistributorCashCents + 100000,
				courierCashCents: baselineCourierCashCents + 25000,
				totalCashCents: baselineDistributorCashCents + baselineCourierCashCents + 125000,
			},
			cashMovement: {
				cashSalesCents: 150000,
				courierCashReturnedCents: 40000,
				directorWithdrawalsCents: 25000,
				cashSaleCancellationsCents: 30000,
			},
		});
		expect(response.charts.paymentSplit).toEqual({
			cashRevenueCents: 120000,
			cashlessRevenueCents: 200000,
		});
		expect(response.charts.revenueByDay).toContainEqual({
			date: "2036-06-05",
			grossRevenueCents: 350000,
			cancelledRevenueCents: 30000,
			netRevenueCents: 320000,
		});
		expect(response.production.rawMaterialIntakes).toEqual([{
			rawMaterialTypeId,
			rawMaterialName: "Икра горбуши аналитика",
			unit: "кг",
			quantity: 12.5,
		}]);
		expect(response.production.rawMaterialConsumed).toEqual([{
			rawMaterialTypeId,
			rawMaterialName: "Икра горбуши аналитика",
			unit: "кг",
			quantity: 10,
		}]);
		expect(response.production.currentRawMaterialBalances).toContainEqual({
			rawMaterialTypeId,
			rawMaterialName: "Икра горбуши аналитика",
			unit: "кг",
			quantity: 2.5,
		});
			expect(response.production.productReleased).toEqual([{
				productName: "Икра горбуши аналитика 250 г",
				quantity: 40,
				rawMaterialConsumedQuantity: 10,
				rawMaterialUnit: "кг",
			}]);
		expect(response.production).toMatchObject({
			productTransferredToDistributorUnits: 30,
			currentWorkshopProductUnits: baselineWorkshopProductUnits + 10,
			summary: {
				rawMaterialConsumedQuantity: 10,
				rawMaterialConsumedUnit: "кг",
				productReleasedUnits: 40,
			},
		});
	});

	it("allows a one year custom range", async () => {
		await expect(analyticsService.getDirectorAnalytics({
			dateFrom: "2036-01-01",
			dateTo: "2036-12-31",
		})).resolves.toMatchObject({
			filters: {
				periodPreset: "30d",
			},
		});
	});

	it("rejects ranges wider than 366 days", async () => {
		await expect(analyticsService.getDirectorAnalytics({
			dateFrom: "2036-01-01",
			dateTo: "2037-01-02",
		})).rejects.toThrow(AppError);
	});
});
