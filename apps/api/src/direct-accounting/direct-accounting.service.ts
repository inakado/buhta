import { Injectable } from "@nestjs/common";
import type {
	DirectAccountingDetailPeriod,
	DirectAccountingEntriesQuery,
	DirectAccountingEntry,
	DirectAccountingExpense,
	DirectAccountingExpenseInput,
	DirectAccountingPeriodTotal,
	DirectAccountingProductStatistics,
	DirectAccountingReceipt,
	DirectAccountingReceiptInput,
	DirectAccountingSale,
	DirectAccountingSaleInput,
	DirectAccountingSalesQuery,
	DirectAccountingStatisticsQuery,
	DirectAccountingStatisticsResponse,
	DirectAccountingSuggestionsQuery,
	DirectAccountingTransfer,
	DirectAccountingTransferInput,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	calculateDirectAccountingTotalCents,
	mapDirectAccountingExpense,
	mapDirectAccountingExpenseEntry,
	mapDirectAccountingReceipt,
	mapDirectAccountingReceiptEntry,
	mapDirectAccountingSale,
	mapDirectAccountingSaleEntry,
	mapDirectAccountingTransfer,
	mapDirectAccountingTransferEntry,
} from "./direct-accounting.mapper";

const BUSINESS_TIMEZONE = "Asia/Vladivostok" as const;
const VLADIVOSTOK_OFFSET_MS = 10 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_STATISTICS_RANGE_DAYS = 366;
const SUGGESTION_SCAN_LIMIT = 200;
const SUGGESTION_LIMIT = 10;

type SaleRecord = Prisma.DirectAccountingSaleGetPayload<Record<string, never>>;
type ReceiptRecord = Prisma.DirectAccountingReceiptGetPayload<Record<string, never>>;
type ExpenseRecord = Prisma.DirectAccountingExpenseGetPayload<Record<string, never>>;
type TransferRecord = Prisma.DirectAccountingTransferGetPayload<Record<string, never>>;
type DateRange = { dateFrom: string; dateTo: string; from: Date; to: Date };

@Injectable()
export class DirectAccountingService {
	async listSales(query: DirectAccountingSalesQuery): Promise<DirectAccountingSale[]> {
		const range = listRange(query);
		const records = await prisma.directAccountingSale.findMany({
			where: { soldOn: { gte: range.from, lte: range.to }, deletedAt: null },
			orderBy: [{ soldOn: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		});

		return records.map(mapDirectAccountingSale);
	}

	async listEntries(query: DirectAccountingEntriesQuery): Promise<DirectAccountingEntry[]> {
		const range = listRange(query);
		const [sales, receipts, expenses, transfers] = await Promise.all([
			prisma.directAccountingSale.findMany({
				where: { soldOn: { gte: range.from, lte: range.to }, deletedAt: null },
			}),
			prisma.directAccountingReceipt.findMany({
				where: { receivedOn: { gte: range.from, lte: range.to }, deletedAt: null },
			}),
			prisma.directAccountingExpense.findMany({
				where: { spentOn: { gte: range.from, lte: range.to }, deletedAt: null },
			}),
			prisma.directAccountingTransfer.findMany({
				where: { transferredOn: { gte: range.from, lte: range.to }, deletedAt: null },
			}),
		]);

		return [
			...sales.map(mapDirectAccountingSaleEntry),
			...receipts.map(mapDirectAccountingReceiptEntry),
			...expenses.map(mapDirectAccountingExpenseEntry),
			...transfers.map(mapDirectAccountingTransferEntry),
		].sort((left, right) =>
			right.occurredOn.localeCompare(left.occurredOn)
			|| right.createdAt.localeCompare(left.createdAt)
			|| right.id.localeCompare(left.id),
		);
	}

	async listSuggestions(query: DirectAccountingSuggestionsQuery): Promise<string[]> {
		const normalizedSearch = normalizeProductName(query.search ?? "");
		if (query.kind === "expense") {
			const expenses = await prisma.directAccountingExpense.findMany({
				where: {
					deletedAt: null,
					...(normalizedSearch ? { nameNormalized: { startsWith: normalizedSearch } } : {}),
				},
				select: { name: true, nameNormalized: true },
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
				take: SUGGESTION_SCAN_LIMIT,
			});
			return uniqueSuggestions(expenses.map((expense) => ({
				name: expense.name,
				normalizedName: expense.nameNormalized,
			})));
		}
		const where = {
			deletedAt: null,
			...(normalizedSearch ? { productNameNormalized: { startsWith: normalizedSearch } } : {}),
		};
		const [sales, receipts] = await Promise.all([
			prisma.directAccountingSale.findMany({
				where,
				select: { id: true, productName: true, productNameNormalized: true, updatedAt: true },
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
				take: SUGGESTION_SCAN_LIMIT,
			}),
			prisma.directAccountingReceipt.findMany({
				where,
				select: { id: true, productName: true, productNameNormalized: true, updatedAt: true },
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
				take: SUGGESTION_SCAN_LIMIT,
			}),
		]);
		const records = [...sales, ...receipts].sort((left, right) =>
			right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id),
		);
		return uniqueSuggestions(records.map((record) => ({
			name: record.productName,
			normalizedName: record.productNameNormalized,
		})));
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
				await createAuditOperation(tx, actor, "direct_accounting.sale.create", sale.id, {
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
				await createAuditOperation(tx, actor, "direct_accounting.sale.update", after.id, {
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
				await createAuditOperation(tx, actor, "direct_accounting.sale.delete", after.id, {
					before: saleSnapshot(before),
					after: { ...saleSnapshot(after), deletedAt: deletedAt.toISOString() },
				});
			});
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async createReceipt(
		actor: Actor,
		input: DirectAccountingReceiptInput,
		idempotencyKey: string,
	): Promise<DirectAccountingReceipt> {
		this.assertNotFutureDate(input.receivedOn);
		const normalized = normalizeReceiptInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const receipt = await tx.directAccountingReceipt.create({ data: receiptData(normalized) });
				await createAuditOperation(tx, actor, "direct_accounting.receipt.create", receipt.id, {
					before: null,
					after: receiptSnapshot(receipt),
				}, idempotencyKey);
				return receipt;
			});

			return mapDirectAccountingReceipt(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async updateReceipt(
		actor: Actor,
		receiptId: string,
		input: DirectAccountingReceiptInput,
	): Promise<DirectAccountingReceipt> {
		this.assertNotFutureDate(input.receivedOn);
		const normalized = normalizeReceiptInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingReceipt.findFirst({ where: { id: receiptId, deletedAt: null } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Приход прямого учета не найден", { id: receiptId });
				}
				const after = await tx.directAccountingReceipt.update({
					where: { id: receiptId },
					data: receiptData(normalized),
				});
				await createAuditOperation(tx, actor, "direct_accounting.receipt.update", after.id, {
					before: receiptSnapshot(before),
					after: receiptSnapshot(after),
				});
				return after;
			});

			return mapDirectAccountingReceipt(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async deleteReceipt(actor: Actor, receiptId: string): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingReceipt.findUnique({ where: { id: receiptId } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Приход прямого учета не найден", { id: receiptId });
				}
				if (before.deletedAt) {
					return;
				}
				const deletedAt = new Date();
				const after = await tx.directAccountingReceipt.update({ where: { id: receiptId }, data: { deletedAt } });
				await createAuditOperation(tx, actor, "direct_accounting.receipt.delete", after.id, {
					before: receiptSnapshot(before),
					after: { ...receiptSnapshot(after), deletedAt: deletedAt.toISOString() },
				});
			});
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async createExpense(
		actor: Actor,
		input: DirectAccountingExpenseInput,
		idempotencyKey: string,
	): Promise<DirectAccountingExpense> {
		this.assertNotFutureDate(input.spentOn);
		const normalized = normalizeExpenseInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const expense = await tx.directAccountingExpense.create({ data: expenseData(normalized) });
				await createAuditOperation(tx, actor, "direct_accounting.expense.create", expense.id, {
					before: null,
					after: expenseSnapshot(expense),
				}, idempotencyKey);
				return expense;
			});
			return mapDirectAccountingExpense(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async updateExpense(
		actor: Actor,
		expenseId: string,
		input: DirectAccountingExpenseInput,
	): Promise<DirectAccountingExpense> {
		this.assertNotFutureDate(input.spentOn);
		const normalized = normalizeExpenseInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingExpense.findFirst({ where: { id: expenseId, deletedAt: null } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Затрата прямого учета не найдена", { id: expenseId });
				}
				const after = await tx.directAccountingExpense.update({
					where: { id: expenseId },
					data: expenseData(normalized),
				});
				await createAuditOperation(tx, actor, "direct_accounting.expense.update", after.id, {
					before: expenseSnapshot(before),
					after: expenseSnapshot(after),
				});
				return after;
			});
			return mapDirectAccountingExpense(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async deleteExpense(actor: Actor, expenseId: string): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingExpense.findUnique({ where: { id: expenseId } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Затрата прямого учета не найдена", { id: expenseId });
				}
				if (before.deletedAt) return;
				const deletedAt = new Date();
				const after = await tx.directAccountingExpense.update({ where: { id: expenseId }, data: { deletedAt } });
				await createAuditOperation(tx, actor, "direct_accounting.expense.delete", after.id, {
					before: expenseSnapshot(before),
					after: { ...expenseSnapshot(after), deletedAt: deletedAt.toISOString() },
				});
			});
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async createTransfer(
		actor: Actor,
		input: DirectAccountingTransferInput,
		idempotencyKey: string,
	): Promise<DirectAccountingTransfer> {
		this.assertNotFutureDate(input.transferredOn);
		const normalized = normalizeTransferInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const transfer = await tx.directAccountingTransfer.create({ data: transferData(normalized) });
				await createAuditOperation(tx, actor, "direct_accounting.transfer.create", transfer.id, {
					before: null,
					after: transferSnapshot(transfer),
				}, idempotencyKey);
				return transfer;
			});
			return mapDirectAccountingTransfer(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async updateTransfer(
		actor: Actor,
		transferId: string,
		input: DirectAccountingTransferInput,
	): Promise<DirectAccountingTransfer> {
		this.assertNotFutureDate(input.transferredOn);
		const normalized = normalizeTransferInput(input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingTransfer.findFirst({ where: { id: transferId, deletedAt: null } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Передача средств прямого учета не найдена", { id: transferId });
				}
				const after = await tx.directAccountingTransfer.update({
					where: { id: transferId },
					data: transferData(normalized),
				});
				await createAuditOperation(tx, actor, "direct_accounting.transfer.update", after.id, {
					before: transferSnapshot(before),
					after: transferSnapshot(after),
				});
				return after;
			});
			return mapDirectAccountingTransfer(record);
		} catch (error) {
			throw mapWriteError(error);
		}
	}

	async deleteTransfer(actor: Actor, transferId: string): Promise<void> {
		try {
			await prisma.$transaction(async (tx) => {
				const before = await tx.directAccountingTransfer.findUnique({ where: { id: transferId } });
				if (!before) {
					throw new AppError("NOT_FOUND", "Передача средств прямого учета не найдена", { id: transferId });
				}
				if (before.deletedAt) return;
				const deletedAt = new Date();
				const after = await tx.directAccountingTransfer.update({ where: { id: transferId }, data: { deletedAt } });
				await createAuditOperation(tx, actor, "direct_accounting.transfer.delete", after.id, {
					before: transferSnapshot(before),
					after: { ...transferSnapshot(after), deletedAt: deletedAt.toISOString() },
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
		const overallTo = [ranges.day.to, ranges.week.to, ranges.month.to, selectedRange.to]
			.reduce((latest, current) => current > latest ? current : latest);
		// ponystack: aggregate the small direct ledger in memory; move this read model to SQL if volume grows.
		const [sales, receipts, expenses, transfers] = await Promise.all([
			prisma.directAccountingSale.findMany({
				where: { soldOn: { lte: overallTo }, deletedAt: null },
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			}),
			prisma.directAccountingReceipt.findMany({
				where: { receivedOn: { lte: overallTo }, deletedAt: null },
				orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
			}),
			prisma.directAccountingExpense.findMany({
				where: { spentOn: { lte: overallTo }, deletedAt: null },
			}),
			prisma.directAccountingTransfer.findMany({
				where: { transferredOn: { lte: overallTo }, deletedAt: null },
			}),
		]);

		return {
			filters: {
				anchorDate,
				detailPeriod,
				dateFrom: selectedRange.dateFrom,
				dateTo: selectedRange.dateTo,
				timezone: BUSINESS_TIMEZONE,
			},
			selection: buildPeriodTotal(sales, receipts, expenses, transfers, selectedRange),
			totals: {
				day: buildPeriodTotal(sales, receipts, expenses, transfers, ranges.day),
				week: buildPeriodTotal(sales, receipts, expenses, transfers, ranges.week),
				month: buildPeriodTotal(sales, receipts, expenses, transfers, ranges.month),
			},
			byProduct: buildProductStatistics(sales, receipts, selectedRange),
		};
	}

	private assertNotFutureDate(occurredOn: string, now = new Date()): void {
		if (occurredOn > businessDateKey(now)) {
			throw new AppError("VALIDATION_ERROR", "Дата операции не может быть в будущем");
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

function normalizeReceiptInput(input: DirectAccountingReceiptInput): DirectAccountingReceiptInput & {
	productNameNormalized: string;
} {
	const productName = input.productName.trim().replace(/\s+/g, " ");
	return {
		...input,
		productName,
		productNameNormalized: normalizeProductName(productName),
	};
}

function normalizeExpenseInput(input: DirectAccountingExpenseInput): DirectAccountingExpenseInput & {
	nameNormalized: string;
} {
	const name = input.name.trim().replace(/\s+/g, " ");
	return {
		...input,
		name,
		nameNormalized: normalizeProductName(name),
	};
}

function normalizeTransferInput(input: DirectAccountingTransferInput): DirectAccountingTransferInput {
	return { ...input, comment: input.comment.trim().replace(/\s+/g, " ") };
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

function receiptData(input: DirectAccountingReceiptInput & { productNameNormalized: string }) {
	return {
		productName: input.productName,
		productNameNormalized: input.productNameNormalized,
		receivedOn: parseDateOnly(input.receivedOn),
		quantityKg: input.quantityKg,
	};
}

function receiptSnapshot(record: ReceiptRecord) {
	const receipt = mapDirectAccountingReceipt(record);
	return {
		productName: receipt.productName,
		receivedOn: receipt.receivedOn,
		quantityKg: receipt.quantityKg,
	};
}

function expenseData(input: DirectAccountingExpenseInput & { nameNormalized: string }) {
	return {
		name: input.name,
		nameNormalized: input.nameNormalized,
		spentOn: parseDateOnly(input.spentOn),
		amountCents: input.amountCents,
	};
}

function expenseSnapshot(record: ExpenseRecord) {
	const expense = mapDirectAccountingExpense(record);
	return {
		name: expense.name,
		spentOn: expense.spentOn,
		amountCents: expense.amountCents,
	};
}

function transferData(input: DirectAccountingTransferInput) {
	return {
		comment: input.comment,
		transferredOn: parseDateOnly(input.transferredOn),
		amountCents: input.amountCents,
	};
}

function transferSnapshot(record: TransferRecord) {
	const transfer = mapDirectAccountingTransfer(record);
	return {
		comment: transfer.comment,
		transferredOn: transfer.transferredOn,
		amountCents: transfer.amountCents,
	};
}

type DirectAccountingWriteOperation =
	| "direct_accounting.sale.create"
	| "direct_accounting.sale.update"
	| "direct_accounting.sale.delete"
	| "direct_accounting.receipt.create"
	| "direct_accounting.receipt.update"
	| "direct_accounting.receipt.delete"
	| "direct_accounting.expense.create"
	| "direct_accounting.expense.update"
	| "direct_accounting.expense.delete"
	| "direct_accounting.transfer.create"
	| "direct_accounting.transfer.update"
	| "direct_accounting.transfer.delete";

async function createAuditOperation(
	tx: Prisma.TransactionClient,
	actor: Actor,
	type: DirectAccountingWriteOperation,
	entityId: string,
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
			entityType: type.includes(".receipt.")
				? "direct_accounting_receipt"
				: type.includes(".expense.")
					? "direct_accounting_expense"
					: type.includes(".transfer.") ? "direct_accounting_transfer" : "direct_accounting_sale",
			entityId,
			details,
		},
	});
}

function buildPeriodTotal(
	sales: SaleRecord[],
	receipts: ReceiptRecord[],
	expenses: ExpenseRecord[],
	transfers: TransferRecord[],
	range: DateRange,
): DirectAccountingPeriodTotal {
	let soldQuantityKg = 0;
	let receivedQuantityKg = 0;
	let balanceQuantityKg = 0;
	let revenueCents = 0;
	let expensesCents = 0;
	let transfersCents = 0;
	for (const sale of sales) {
		if (sale.soldOn <= range.to) {
			balanceQuantityKg -= Number(sale.quantityKg);
		}
		if (isInRange(sale.soldOn, range)) {
			soldQuantityKg += Number(sale.quantityKg);
			revenueCents = addRevenueCents(
				revenueCents,
				calculateDirectAccountingTotalCents(sale.quantityKg, sale.unitPriceCents),
			);
		}
	}
	for (const receipt of receipts) {
		if (receipt.receivedOn <= range.to) {
			balanceQuantityKg += Number(receipt.quantityKg);
		}
		if (isInRange(receipt.receivedOn, range)) {
			receivedQuantityKg += Number(receipt.quantityKg);
		}
	}
	for (const expense of expenses) {
		if (isInRange(expense.spentOn, range)) {
			expensesCents = addExpenseCents(expensesCents, expense.amountCents);
		}
	}
	for (const transfer of transfers) {
		if (isInRange(transfer.transferredOn, range)) {
			transfersCents = addTransferCents(transfersCents, transfer.amountCents);
		}
	}

	return {
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
		quantityKg: roundQuantityKg(soldQuantityKg),
		receivedQuantityKg: roundQuantityKg(receivedQuantityKg),
		balanceQuantityKg: roundQuantityKg(balanceQuantityKg),
		revenueCents,
		expensesCents,
		transfersCents,
	};
}

type ProductStatisticsAccumulator = DirectAccountingProductStatistics & { lastUpdatedAt: Date };

function buildProductStatistics(
	sales: SaleRecord[],
	receipts: ReceiptRecord[],
	range: DateRange,
): DirectAccountingProductStatistics[] {
	const rows = new Map<string, ProductStatisticsAccumulator>();
	for (const sale of sales) {
		if (sale.soldOn > range.to) continue;
		const row = productStatisticsRow(rows, sale.productNameNormalized, sale.productName, sale.updatedAt);
		row.balanceQuantityKg -= Number(sale.quantityKg);
		if (isInRange(sale.soldOn, range)) {
			row.quantityKg += Number(sale.quantityKg);
			row.revenueCents = addRevenueCents(
				row.revenueCents,
				calculateDirectAccountingTotalCents(sale.quantityKg, sale.unitPriceCents),
			);
		}
	}
	for (const receipt of receipts) {
		if (receipt.receivedOn > range.to) continue;
		const row = productStatisticsRow(rows, receipt.productNameNormalized, receipt.productName, receipt.updatedAt);
		row.balanceQuantityKg += Number(receipt.quantityKg);
		if (isInRange(receipt.receivedOn, range)) {
			row.receivedQuantityKg += Number(receipt.quantityKg);
		}
	}

	return [...rows.values()]
		.filter((row) => row.quantityKg !== 0 || row.receivedQuantityKg !== 0 || row.balanceQuantityKg !== 0)
		.map(({ lastUpdatedAt: _, ...row }) => ({
			...row,
			quantityKg: roundQuantityKg(row.quantityKg),
			receivedQuantityKg: roundQuantityKg(row.receivedQuantityKg),
			balanceQuantityKg: roundQuantityKg(row.balanceQuantityKg),
		}))
		.sort((left, right) =>
			right.balanceQuantityKg - left.balanceQuantityKg
			|| right.revenueCents - left.revenueCents
			|| left.productName.localeCompare(right.productName, "ru"),
		);
}

function productStatisticsRow(
	rows: Map<string, ProductStatisticsAccumulator>,
	normalizedName: string,
	productName: string,
	updatedAt: Date,
): ProductStatisticsAccumulator {
	const existing = rows.get(normalizedName);
	if (existing) {
		if (updatedAt > existing.lastUpdatedAt) {
			existing.productName = productName;
			existing.lastUpdatedAt = updatedAt;
		}
		return existing;
	}
	const created = {
		productName,
		quantityKg: 0,
		receivedQuantityKg: 0,
		balanceQuantityKg: 0,
		revenueCents: 0,
		lastUpdatedAt: updatedAt,
	};
	rows.set(normalizedName, created);
	return created;
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

function addExpenseCents(current: number, addition: number): number {
	const total = current + addition;
	if (!Number.isSafeInteger(total)) {
		throw new RangeError("Затраты прямого учета вышли за допустимый числовой диапазон");
	}
	return total;
}

function addTransferCents(current: number, addition: number): number {
	const total = current + addition;
	if (!Number.isSafeInteger(total)) {
		throw new RangeError("Передачи средств прямого учета вышли за допустимый числовой диапазон");
	}
	return total;
}

function uniqueSuggestions(records: Array<{ name: string; normalizedName: string }>): string[] {
	const seen = new Set<string>();
	const suggestions: string[] = [];
	for (const record of records) {
		if (seen.has(record.normalizedName)) continue;
		seen.add(record.normalizedName);
		suggestions.push(record.name);
		if (suggestions.length === SUGGESTION_LIMIT) break;
	}
	return suggestions;
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

function listRange(query: DirectAccountingEntriesQuery): DateRange {
	if (query.date) {
		return rangeFromDates(parseDateOnly(query.date), parseDateOnly(query.date));
	}
	if (query.dateFrom && query.dateTo) {
		return buildCustomRange(query.dateFrom, query.dateTo);
	}
	throw new AppError("VALIDATION_ERROR", "Укажите дату или диапазон операций");
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
