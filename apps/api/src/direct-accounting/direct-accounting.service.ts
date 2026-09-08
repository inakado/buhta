import { Injectable } from "@nestjs/common";
import type {
	DirectAccountingDetailPeriod,
	DirectAccountingPeriodTotal,
	DirectAccountingProductStatistics,
	DirectAccountingSale,
	DirectAccountingSaleInput,
	DirectAccountingSalesQuery,
	DirectAccountingStatisticsQuery,
	DirectAccountingStatisticsResponse,
	DirectAccountingSuggestionsQuery,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	calculateDirectAccountingTotalCents,
	mapDirectAccountingSale,
} from "./direct-accounting.mapper";

const BUSINESS_TIMEZONE = "Asia/Vladivostok" as const;
const VLADIVOSTOK_OFFSET_MS = 10 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_STATISTICS_RANGE_DAYS = 366;
const SUGGESTION_SCAN_LIMIT = 200;
const SUGGESTION_LIMIT = 10;

type SaleRecord = Prisma.DirectAccountingSaleGetPayload<Record<string, never>>;
type DateRange = { dateFrom: string; dateTo: string; from: Date; to: Date };

@Injectable()
export class DirectAccountingService {
	async listSales(query: DirectAccountingSalesQuery): Promise<DirectAccountingSale[]> {
		let range: DateRange;
		if (query.date) {
			range = rangeFromDates(parseDateOnly(query.date), parseDateOnly(query.date));
		} else if (query.dateFrom && query.dateTo) {
			range = buildCustomRange(query.dateFrom, query.dateTo);
		} else {
			throw new AppError("VALIDATION_ERROR", "Укажите дату или диапазон продаж");
		}
		const records = await prisma.directAccountingSale.findMany({
			where: { soldOn: { gte: range.from, lte: range.to }, deletedAt: null },
			orderBy: [{ soldOn: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		});

		return records.map(mapDirectAccountingSale);
	}

	async listSuggestions(query: DirectAccountingSuggestionsQuery): Promise<string[]> {
		const normalizedSearch = normalizeProductName(query.search ?? "");
		const records = await prisma.directAccountingSale.findMany({
			where: {
				deletedAt: null,
				...(normalizedSearch ? { productNameNormalized: { startsWith: normalizedSearch } } : {}),
			},
			select: { id: true, productName: true, productNameNormalized: true },
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			take: SUGGESTION_SCAN_LIMIT,
		});
		const seen = new Set<string>();
		const suggestions: string[] = [];

		for (const record of records) {
			if (seen.has(record.productNameNormalized)) {
				continue;
			}
			seen.add(record.productNameNormalized);
			suggestions.push(record.productName);
			if (suggestions.length === SUGGESTION_LIMIT) {
				break;
			}
		}

		return suggestions;
	}

	async createSale(
		actor: Actor,
		input: DirectAccountingSaleInput,
		idempotencyKey: string,
	): Promise<DirectAccountingSale> {
		this.assertNotFutureDate(input.soldOn);
		const normalized = normalizeSaleInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const sale = await tx.directAccountingSale.create({ data: saleData(normalized) });
				await createAuditOperation(tx, actor, "direct_accounting.sale.create", sale, {
					before: null,
					after: saleSnapshot(sale),
				}, idempotencyKey);
				return sale;
			});

			return mapDirectAccountingSale(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async updateSale(actor: Actor, saleId: string, input: DirectAccountingSaleInput): Promise<DirectAccountingSale> {
		this.assertNotFutureDate(input.soldOn);
		const normalized = normalizeSaleInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingSale.findFirst({ where: { id: saleId, deletedAt: null } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Продажа прямого учета не найдена", { id: saleId });
				}

				const after = await tx.directAccountingSale.update({
					where: { id: saleId },
					data: saleData(normalized),
				});
				await createAuditOperation(tx, actor, "direct_accounting.sale.update", after, {
					before: saleSnapshot(before),
					after: saleSnapshot(after),
				});
				return after;
			});

			return mapDirectAccountingSale(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async deleteSale(actor: Actor, saleId: string): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingSale.findUnique({ where: { id: saleId } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Продажа прямого учета не найдена", { id: saleId });
				}
				if (before.deletedAt) {
					return;
				}

				const deletedAt = new Date();
				const after = await tx.directAccountingSale.update({
					where: { id: saleId },
					data: { deletedAt },
				});
				await createAuditOperation(tx, actor, "direct_accounting.sale.delete", after, {
					before: saleSnapshot(before),
					after: { ...saleSnapshot(after), deletedAt: deletedAt.toISOString() },
				});
			});
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async getStatistics(
		query: DirectAccountingStatisticsQuery,
		now = new Date(),
	): Promise<DirectAccountingStatisticsResponse> {
		const anchorDate = query.anchorDate ?? businessDateKey(now);
		const detailPeriod = query.detailPeriod ?? "day";
		this.assertNotFutureDate(anchorDate, now);
		const ranges = buildRanges(anchorDate);
		const selectedRange = query.dateFrom && query.dateTo
			? buildCustomRange(query.dateFrom, query.dateTo)
			: ranges[detailPeriod];
		this.assertNotFutureDate(selectedRange.dateTo, now);
		const overallFrom = [ranges.day.from, ranges.week.from, ranges.month.from, selectedRange.from]
			.reduce((earliest, current) => current < earliest ? current : earliest);
		const overallTo = [ranges.day.to, ranges.week.to, ranges.month.to, selectedRange.to]
			.reduce((latest, current) => current > latest ? current : latest);
		const records = await prisma.directAccountingSale.findMany({
			where: { soldOn: { gte: overallFrom, lte: overallTo }, deletedAt: null },
			orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		});

		return {
			filters: {
				anchorDate,
				detailPeriod,
				dateFrom: selectedRange.dateFrom,
				dateTo: selectedRange.dateTo,
				timezone: BUSINESS_TIMEZONE,
			},
			selection: buildPeriodTotal(records, selectedRange),
			totals: {
				day: buildPeriodTotal(records, ranges.day),
				week: buildPeriodTotal(records, ranges.week),
				month: buildPeriodTotal(records, ranges.month),
			},
			byProduct: buildProductStatistics(records, selectedRange),
		};
	}

	private assertNotFutureDate(soldOn: string, now = new Date()): void {
		if (soldOn > businessDateKey(now)) {
			throw new AppError("VALIDATION_ERROR", "Дата продажи не может быть в будущем");
		}
	}
}

function normalizeSaleInput(input: DirectAccountingSaleInput): DirectAccountingSaleInput & {
	productNameNormalized: string;
} {
	const productName = input.productName.trim().replace(/\s+/g, " ");
	return {
		...input,
		productName,
		productNameNormalized: normalizeProductName(productName),
	};
}

function normalizeProductName(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function saleData(input: DirectAccountingSaleInput & { productNameNormalized: string }) {
	return {
		productName: input.productName,
		productNameNormalized: input.productNameNormalized,
		soldOn: parseDateOnly(input.soldOn),
		quantityKg: input.quantityKg,
		unitPriceCents: input.unitPriceCents,
	};
}

function saleSnapshot(record: SaleRecord) {
	const sale = mapDirectAccountingSale(record);
	return {
		productName: sale.productName,
		soldOn: sale.soldOn,
		quantityKg: sale.quantityKg,
		unitPriceCents: sale.unitPriceCents,
		totalCents: sale.totalCents,
	};
}

async function createAuditOperation(
	tx: Prisma.TransactionClient,
	actor: Actor,
	type: "direct_accounting.sale.create" | "direct_accounting.sale.update" | "direct_accounting.sale.delete",
	sale: SaleRecord,
	details: Prisma.InputJsonValue,
	idempotencyKey?: string,
) {
	const operation = await tx.operation.create({
		data: {
			type,
			status: OPERATION_STATUS.succeeded,
			actorUserId: actor.userId,
			idempotencyKey: idempotencyKey ?? null,
		},
	});
	await tx.auditLog.create({
		data: {
			operationId: operation.id,
			actorUserId: actor.userId,
			action: type,
			entityType: "direct_accounting_sale",
			entityId: sale.id,
			details,
		},
	});
}

function buildPeriodTotal(records: SaleRecord[], range: DateRange): DirectAccountingPeriodTotal {
	let quantityKg = 0;
	let revenueCents = 0;
	for (const record of records) {
		if (!isInRange(record.soldOn, range)) {
			continue;
		}
		quantityKg += Number(record.quantityKg);
		revenueCents = addRevenueCents(
			revenueCents,
			calculateDirectAccountingTotalCents(record.quantityKg, record.unitPriceCents),
		);
	}

	return { dateFrom: range.dateFrom, dateTo: range.dateTo, quantityKg: roundQuantityKg(quantityKg), revenueCents };
}

function buildProductStatistics(records: SaleRecord[], range: DateRange): DirectAccountingProductStatistics[] {
	const rows = new Map<string, DirectAccountingProductStatistics>();
	for (const record of records) {
		if (!isInRange(record.soldOn, range)) {
			continue;
		}
		const existing = rows.get(record.productNameNormalized);
		if (existing) {
			existing.quantityKg += Number(record.quantityKg);
			existing.revenueCents = addRevenueCents(
				existing.revenueCents,
				calculateDirectAccountingTotalCents(record.quantityKg, record.unitPriceCents),
			);
			continue;
		}
		rows.set(record.productNameNormalized, {
			productName: record.productName,
			quantityKg: Number(record.quantityKg),
			revenueCents: calculateDirectAccountingTotalCents(record.quantityKg, record.unitPriceCents),
		});
	}

	return [...rows.values()].map((row) => ({
		...row,
		quantityKg: roundQuantityKg(row.quantityKg),
	})).sort((left, right) =>
		right.revenueCents - left.revenueCents || left.productName.localeCompare(right.productName, "ru"),
	);
}

function roundQuantityKg(value: number): number {
	return Math.round(value * 1_000) / 1_000;
}

function addRevenueCents(current: number, addition: number): number {
	const total = current + addition;
	if (!Number.isSafeInteger(total)) {
		throw new RangeError("Выручка прямого учета вышла за допустимый числовой диапазон");
	}
	return total;
}

function buildRanges(anchorDate: string): Record<DirectAccountingDetailPeriod, DateRange> {
	const anchor = parseDateOnly(anchorDate);

	return {
		day: rangeFromDates(anchor, anchor),
		week: rangeFromDates(addDays(anchor, -6), anchor),
		month: rangeFromDates(addDays(anchor, -29), anchor),
	};
}

function buildCustomRange(dateFrom: string, dateTo: string): DateRange {
	const from = parseDateOnly(dateFrom);
	const to = parseDateOnly(dateTo);
	const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
	if (inclusiveDays < 1 || inclusiveDays > MAX_STATISTICS_RANGE_DAYS) {
		throw new AppError("VALIDATION_ERROR", "Период должен быть от 1 до 366 дней");
	}
	return rangeFromDates(from, to);
}

function rangeFromDates(from: Date, to: Date): DateRange {
	return { dateFrom: dateKey(from), dateTo: dateKey(to), from, to };
}

function parseDateOnly(value: string): Date {
	return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * DAY_MS);
}

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function businessDateKey(date: Date): string {
	return new Date(date.getTime() + VLADIVOSTOK_OFFSET_MS).toISOString().slice(0, 10);
}

function isInRange(date: Date, range: DateRange): boolean {
	return date >= range.from && date <= range.to;
}

function mapWriteError(error: unknown): AppError {
	if (error instanceof AppError) {
		return error;
	}
	if (isPrismaErrorCode(error, "P2002")) {
		return new AppError("CONFLICT", "Эта операция уже была сохранена");
	}
	return new AppError("INTERNAL_ERROR", "Не удалось сохранить прямой учет", {
		reason: error instanceof Error ? error.message : String(error),
	});
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
