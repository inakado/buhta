import { Injectable } from "@nestjs/common";
import type {
	DirectorAnalyticsProductOutputRow,
	DirectorAnalyticsPeriodPreset,
	DirectorAnalyticsQuery,
	DirectorAnalyticsRawMaterialRow,
	DirectorAnalyticsResponse,
	PaymentMethod,
} from "@buhta/shared";
import { AppError } from "../common/errors/app-error";
import { prisma } from "../prisma/client";
import {
	addProductQuantity,
	addRawMaterialQuantity,
	sortedProductRows,
	sortedRawMaterialRows,
} from "./analytics.mapper";

const BUSINESS_TIMEZONE = "Asia/Vladivostok" as const;
const VLADIVOSTOK_OFFSET_MS = 10 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DEFAULT_PERIOD_PRESET: DirectorAnalyticsPeriodPreset = "30d";

type NormalizedDirectorAnalyticsQuery = {
	dateFrom: Date;
	dateTo: Date;
	periodPreset: DirectorAnalyticsPeriodPreset;
};

type SaleFact = {
	createdAt: Date;
	paymentMethod: string;
	totalCents: number;
};

@Injectable()
export class AnalyticsService {
	async getDirectorAnalytics(query: DirectorAnalyticsQuery): Promise<DirectorAnalyticsResponse> {
		const normalized = normalizeDirectorAnalyticsQuery(query);
		const where = {
			createdAt: {
				gte: normalized.dateFrom,
				lt: normalized.dateTo,
			},
		};

		const [
			distributorSales,
			courierSales,
			distributorCancellations,
			courierCancellations,
			distributorCash,
			courierCash,
			courierCashReturned,
			directorWithdrawals,
			rawMaterialIntakes,
			productBatches,
			productTransfers,
			workshopProductBalance,
			currentRawMaterialBalances,
		] = await Promise.all([
			prisma.distributorSale.findMany({
				where,
				select: { totalCents: true, paymentMethod: true, createdAt: true },
			}),
			prisma.courierSale.findMany({
				where,
				select: { totalCents: true, paymentMethod: true, createdAt: true },
			}),
			prisma.distributorSaleCancellation.findMany({
				where,
				select: { totalCents: true, paymentMethod: true, createdAt: true },
			}),
			prisma.courierSaleCancellation.findMany({
				where,
				select: { totalCents: true, paymentMethod: true, createdAt: true },
			}),
			prisma.distributorCashBalance.aggregate({ _sum: { amountCents: true } }),
			prisma.courierCashBalance.aggregate({ _sum: { amountCents: true } }),
			prisma.courierUnload.aggregate({ where, _sum: { cashAmountCents: true } }),
			prisma.distributorCashWithdrawal.aggregate({ where, _sum: { amountCents: true } }),
			prisma.rawMaterialIntake.findMany({
				where,
				include: { rawMaterialType: true },
			}),
			prisma.productBatch.findMany({
				where,
				select: {
					productName: true,
					rawMaterialTypeId: true,
					rawMaterialTypeName: true,
					rawMaterialUnit: true,
					consumedRawMaterialQuantity: true,
					quantity: true,
					createdAt: true,
				},
			}),
			prisma.productTransfer.aggregate({ where, _sum: { quantity: true } }),
			prisma.workshopProductBalance.aggregate({ _sum: { quantity: true } }),
			prisma.rawMaterialBalance.findMany({
				include: { rawMaterialType: true },
				orderBy: { rawMaterialType: { name: "asc" } },
			}),
		]);

		const sales = [...distributorSales, ...courierSales];
		const cancellations = [...distributorCancellations, ...courierCancellations];
		const grossRevenueCents = sumCents(sales);
		const cancelledRevenueCents = sumCents(cancellations);
		const cashSalesCents = sumPaymentCents(sales, "cash");
		const cashSaleCancellationsCents = sumPaymentCents(cancellations, "cash");
		const cashRevenueCents = cashSalesCents - cashSaleCancellationsCents;
		const cashlessRevenueCents = sumPaymentCents(sales, "cashless") - sumPaymentCents(cancellations, "cashless");
		const distributorCashCents = distributorCash._sum.amountCents ?? 0;
		const courierCashCents = courierCash._sum.amountCents ?? 0;

		const rawMaterialIntakeMap = new Map<string, DirectorAnalyticsRawMaterialRow>();
		for (const intake of rawMaterialIntakes) {
			addRawMaterialQuantity(rawMaterialIntakeMap, {
				rawMaterialTypeId: intake.rawMaterialTypeId,
				rawMaterialName: intake.rawMaterialType.name,
				unit: intake.rawMaterialType.unit,
				quantity: intake.quantity,
			});
		}

		const rawMaterialConsumedMap = new Map<string, DirectorAnalyticsRawMaterialRow>();
		const productReleasedMap = new Map<string, DirectorAnalyticsProductOutputRow>();
		for (const batch of productBatches) {
			addRawMaterialQuantity(rawMaterialConsumedMap, {
				rawMaterialTypeId: batch.rawMaterialTypeId,
				rawMaterialName: batch.rawMaterialTypeName,
				unit: batch.rawMaterialUnit,
				quantity: batch.consumedRawMaterialQuantity,
			});
				addProductQuantity(productReleasedMap, {
					productName: batch.productName,
					quantity: batch.quantity,
					rawMaterialConsumedQuantity: batch.consumedRawMaterialQuantity,
					rawMaterialUnit: batch.rawMaterialUnit,
				});
			}

		const currentRawMaterialBalanceMap = new Map<string, DirectorAnalyticsRawMaterialRow>();
		for (const balance of currentRawMaterialBalances) {
			addRawMaterialQuantity(currentRawMaterialBalanceMap, {
				rawMaterialTypeId: balance.rawMaterialTypeId,
				rawMaterialName: balance.rawMaterialType.name,
				unit: balance.rawMaterialType.unit,
				quantity: balance.quantity,
			});
		}

		const rawMaterialConsumed = sortedRawMaterialRows(rawMaterialConsumedMap);
		const productReleased = sortedProductRows(productReleasedMap);
		const rawMaterialConsumedQuantity = rawMaterialConsumed.reduce((sum, item) => sum + item.quantity, 0);
		const productReleasedUnits = productReleased.reduce((sum, item) => sum + item.quantity, 0);
		const rawMaterialConsumedUnit = rawMaterialConsumed[0]?.unit ?? "кг";

		return {
			filters: {
				dateFrom: normalized.dateFrom.toISOString(),
				dateTo: normalized.dateTo.toISOString(),
				periodPreset: normalized.periodPreset,
				timezone: BUSINESS_TIMEZONE,
			},
			money: {
				grossRevenueCents,
				cancelledRevenueCents,
				netRevenueCents: grossRevenueCents - cancelledRevenueCents,
				cashRevenueCents,
				cashlessRevenueCents,
				saleCount: sales.length,
				cancellationCount: cancellations.length,
				currentCash: {
					distributorCashCents,
					courierCashCents,
					totalCashCents: distributorCashCents + courierCashCents,
				},
				cashMovement: {
					cashSalesCents,
					courierCashReturnedCents: courierCashReturned._sum.cashAmountCents ?? 0,
					directorWithdrawalsCents: directorWithdrawals._sum.amountCents ?? 0,
					cashSaleCancellationsCents,
				},
			},
			production: {
				rawMaterialIntakes: sortedRawMaterialRows(rawMaterialIntakeMap),
				rawMaterialConsumed,
				currentRawMaterialBalances: sortedRawMaterialRows(currentRawMaterialBalanceMap),
				productReleased,
				productTransferredToDistributorUnits: productTransfers._sum.quantity ?? 0,
				currentWorkshopProductUnits: workshopProductBalance._sum.quantity ?? 0,
				summary: {
					rawMaterialConsumedQuantity,
					rawMaterialConsumedUnit,
					productReleasedUnits,
				},
			},
			charts: {
				revenueByDay: buildRevenueByDay(normalized, sales, cancellations),
				paymentSplit: {
					cashRevenueCents,
					cashlessRevenueCents,
				},
				rawMaterialAndProductOutput: {
					rawMaterialConsumedQuantity,
					rawMaterialConsumedUnit,
					productReleasedUnits,
				},
			},
			warnings: [],
		};
	}
}

export function normalizeDirectorAnalyticsQuery(
	query: DirectorAnalyticsQuery,
	now = new Date(),
): NormalizedDirectorAnalyticsQuery {
	const hasDateFrom = query.dateFrom !== undefined;
	const hasDateTo = query.dateTo !== undefined;

	if (hasDateFrom !== hasDateTo) {
		throw new AppError("VALIDATION_ERROR", "dateFrom and dateTo must be provided together");
	}

	const periodPreset = query.periodPreset ?? DEFAULT_PERIOD_PRESET;
	const normalized = hasDateFrom && hasDateTo
		? {
			dateFrom: parseAnalyticsDate(query.dateFrom ?? "", "dateFrom"),
			dateTo: parseAnalyticsDate(query.dateTo ?? "", "dateTo", true),
			periodPreset,
		}
		: normalizePresetRange(periodPreset, now);

	if (normalized.dateTo.getTime() <= normalized.dateFrom.getTime()) {
		throw new AppError("VALIDATION_ERROR", "dateTo must be after dateFrom");
	}

	if (normalized.dateTo.getTime() - normalized.dateFrom.getTime() > MAX_RANGE_DAYS * DAY_MS) {
		throw new AppError("VALIDATION_ERROR", "Director analytics range cannot exceed 366 days");
	}

	return normalized;
}

function normalizePresetRange(
	periodPreset: DirectorAnalyticsPeriodPreset,
	now: Date,
): NormalizedDirectorAnalyticsQuery {
	const todayStart = startOfBusinessDayUtc(now);
	const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
	const days = periodPreset === "today" ? 1 : Number(periodPreset.slice(0, -1));

	return {
		dateFrom: new Date(tomorrowStart.getTime() - days * DAY_MS),
		dateTo: tomorrowStart,
		periodPreset,
	};
}

function parseAnalyticsDate(value: string, field: string, endOfDateOnly = false): Date {
	const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
	const date = dateOnly
		? businessDateToUtc(value, endOfDateOnly ? 1 : 0)
		: new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new AppError("VALIDATION_ERROR", `Invalid ${field}`);
	}

	return date;
}

function businessDateToUtc(value: string, addDays: number): Date {
	const [year, month, day] = value.split("-").map(Number);
	if (year === undefined || month === undefined || day === undefined) {
		throw new AppError("VALIDATION_ERROR", "Invalid business date");
	}
	return new Date(Date.UTC(year, month - 1, day + addDays) - VLADIVOSTOK_OFFSET_MS);
}

function startOfBusinessDayUtc(date: Date): Date {
	const shifted = date.getTime() + VLADIVOSTOK_OFFSET_MS;
	const businessDayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
	return new Date(businessDayStart - VLADIVOSTOK_OFFSET_MS);
}

function businessDayKey(date: Date): string {
	return new Date(date.getTime() + VLADIVOSTOK_OFFSET_MS).toISOString().slice(0, 10);
}

function buildRevenueByDay(
	query: NormalizedDirectorAnalyticsQuery,
	sales: SaleFact[],
	cancellations: SaleFact[],
) {
	const points = new Map<string, {
		date: string;
		grossRevenueCents: number;
		cancelledRevenueCents: number;
		netRevenueCents: number;
	}>();
	for (
		let cursor = startOfBusinessDayUtc(query.dateFrom);
		cursor.getTime() < query.dateTo.getTime();
		cursor = new Date(cursor.getTime() + DAY_MS)
	) {
		const key = businessDayKey(cursor);
		points.set(key, {
			date: key,
			grossRevenueCents: 0,
			cancelledRevenueCents: 0,
			netRevenueCents: 0,
		});
	}

	for (const sale of sales) {
		const point = ensureRevenuePoint(points, sale.createdAt);
		point.grossRevenueCents += sale.totalCents;
		point.netRevenueCents += sale.totalCents;
	}
	for (const cancellation of cancellations) {
		const point = ensureRevenuePoint(points, cancellation.createdAt);
		point.cancelledRevenueCents += cancellation.totalCents;
		point.netRevenueCents -= cancellation.totalCents;
	}

	return [...points.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function ensureRevenuePoint(
	points: Map<string, {
		date: string;
		grossRevenueCents: number;
		cancelledRevenueCents: number;
		netRevenueCents: number;
	}>,
	date: Date,
) {
	const key = businessDayKey(date);
	const existing = points.get(key);
	if (existing) {
		return existing;
	}

	const point = {
		date: key,
		grossRevenueCents: 0,
		cancelledRevenueCents: 0,
		netRevenueCents: 0,
	};
	points.set(key, point);
	return point;
}

function sumCents(items: SaleFact[]): number {
	return items.reduce((sum, item) => sum + item.totalCents, 0);
}

function sumPaymentCents(items: SaleFact[], paymentMethod: PaymentMethod): number {
	return items
		.filter((item) => item.paymentMethod === paymentMethod)
		.reduce((sum, item) => sum + item.totalCents, 0);
}
