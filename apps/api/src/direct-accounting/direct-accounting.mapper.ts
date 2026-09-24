import type {
	DirectAccountingEntry,
	DirectAccountingExpense,
	DirectAccountingReceipt,
	DirectAccountingSale,
	DirectAccountingSalary,
	DirectAccountingTransfer,
} from "@buhta/shared";
import { Prisma } from "../generated/prisma/client";

type DirectAccountingSaleRecord = {
	id: string;
	productName: string;
	soldOn: Date;
	quantityKg: Prisma.Decimal | number | string;
	unitPriceCents: number;
	createdAt: Date;
	updatedAt: Date;
};

type DirectAccountingReceiptRecord = {
	id: string;
	productName: string;
	receivedOn: Date;
	quantityKg: Prisma.Decimal | number | string;
	createdAt: Date;
	updatedAt: Date;
};

type DirectAccountingExpenseRecord = {
	id: string;
	name: string;
	spentOn: Date;
	amountCents: number;
	createdAt: Date;
	updatedAt: Date;
};

type DirectAccountingTransferRecord = {
	id: string;
	comment: string;
	transferredOn: Date;
	amountCents: number;
	createdAt: Date;
	updatedAt: Date;
};

type DirectAccountingSalaryRecord = {
	id: string;
	employeeName: string;
	periodFrom: Date;
	periodTo: Date;
	rateBasisPoints: number;
	baseRevenueCents: Prisma.Decimal | number | string;
	amountCents: number;
	createdAt: Date;
	updatedAt: Date;
};

export function mapDirectAccountingSale(record: DirectAccountingSaleRecord): DirectAccountingSale {
	return {
		id: record.id,
		productName: record.productName,
		soldOn: record.soldOn.toISOString().slice(0, 10),
		quantityKg: Number(record.quantityKg),
		unitPriceCents: record.unitPriceCents,
		totalCents: calculateDirectAccountingTotalCents(record.quantityKg, record.unitPriceCents),
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDirectAccountingReceipt(record: DirectAccountingReceiptRecord): DirectAccountingReceipt {
	return {
		id: record.id,
		productName: record.productName,
		receivedOn: record.receivedOn.toISOString().slice(0, 10),
		quantityKg: Number(record.quantityKg),
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDirectAccountingExpense(record: DirectAccountingExpenseRecord): DirectAccountingExpense {
	return {
		id: record.id,
		name: record.name,
		spentOn: record.spentOn.toISOString().slice(0, 10),
		amountCents: record.amountCents,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDirectAccountingTransfer(record: DirectAccountingTransferRecord): DirectAccountingTransfer {
	return {
		id: record.id,
		comment: record.comment,
		transferredOn: record.transferredOn.toISOString().slice(0, 10),
		amountCents: record.amountCents,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDirectAccountingSalary(record: DirectAccountingSalaryRecord): DirectAccountingSalary {
	return {
		id: record.id,
		employeeName: record.employeeName,
		periodFrom: record.periodFrom.toISOString().slice(0, 10),
		periodTo: record.periodTo.toISOString().slice(0, 10),
		rateBasisPoints: record.rateBasisPoints,
		baseRevenueCents: Number(record.baseRevenueCents),
		amountCents: record.amountCents,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function mapDirectAccountingSaleEntry(record: DirectAccountingSaleRecord): DirectAccountingEntry {
	const sale = mapDirectAccountingSale(record);
	return {
		kind: "sale",
		id: sale.id,
		productName: sale.productName,
		occurredOn: sale.soldOn,
		quantityKg: sale.quantityKg,
		unitPriceCents: sale.unitPriceCents,
		totalCents: sale.totalCents,
		createdAt: sale.createdAt,
		updatedAt: sale.updatedAt,
	};
}

export function mapDirectAccountingReceiptEntry(record: DirectAccountingReceiptRecord): DirectAccountingEntry {
	const receipt = mapDirectAccountingReceipt(record);
	return {
		kind: "receipt",
		id: receipt.id,
		productName: receipt.productName,
		occurredOn: receipt.receivedOn,
		quantityKg: receipt.quantityKg,
		createdAt: receipt.createdAt,
		updatedAt: receipt.updatedAt,
	};
}

export function mapDirectAccountingExpenseEntry(record: DirectAccountingExpenseRecord): DirectAccountingEntry {
	const expense = mapDirectAccountingExpense(record);
	return {
		kind: "expense",
		id: expense.id,
		name: expense.name,
		occurredOn: expense.spentOn,
		amountCents: expense.amountCents,
		createdAt: expense.createdAt,
		updatedAt: expense.updatedAt,
	};
}

export function mapDirectAccountingTransferEntry(record: DirectAccountingTransferRecord): DirectAccountingEntry {
	const transfer = mapDirectAccountingTransfer(record);
	return {
		kind: "transfer",
		id: transfer.id,
		comment: transfer.comment,
		occurredOn: transfer.transferredOn,
		amountCents: transfer.amountCents,
		createdAt: transfer.createdAt,
		updatedAt: transfer.updatedAt,
	};
}

export function mapDirectAccountingSalaryEntry(record: DirectAccountingSalaryRecord): DirectAccountingEntry {
	const salary = mapDirectAccountingSalary(record);
	return {
		kind: "salary",
		id: salary.id,
		employeeName: salary.employeeName,
		periodFrom: salary.periodFrom,
		periodTo: salary.periodTo,
		occurredOn: salary.periodTo,
		rateBasisPoints: salary.rateBasisPoints,
		baseRevenueCents: salary.baseRevenueCents,
		amountCents: salary.amountCents,
		createdAt: salary.createdAt,
		updatedAt: salary.updatedAt,
	};
}

export function calculateDirectAccountingTotalCents(
	quantityKg: Prisma.Decimal | number | string,
	unitPriceCents: number,
): number {
	const total = new Prisma.Decimal(quantityKg)
		.mul(unitPriceCents)
		.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
		.toNumber();

	if (!Number.isSafeInteger(total) || total < 0) {
		throw new RangeError("Сумма продажи прямого учета вышла за допустимый числовой диапазон");
	}

	return total;
}

export function calculateDirectAccountingSalaryAmountCents(
	baseRevenueCents: number,
	rateBasisPoints: number,
): number {
	const amount = (BigInt(baseRevenueCents) * BigInt(rateBasisPoints) + 5_000n) / 10_000n;
	if (amount < 1n || amount > 2_147_483_647n) {
		throw new RangeError("Сумма зарплаты прямого учета вышла за допустимый числовой диапазон");
	}
	return Number(amount);
}
