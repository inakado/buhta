import type {
	DirectAccountingEntry,
	DirectAccountingExpense,
	DirectAccountingReceipt,
	DirectAccountingSale,
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
