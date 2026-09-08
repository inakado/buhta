import type { DirectAccountingSale } from "@buhta/shared";
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

export function calculateDirectAccountingTotalCents(
	quantityKg: Prisma.Decimal | number | string,
	unitPriceCents: number,
): number {
	const total = new Prisma.Decimal(quantityKg)
		.mul(unitPriceCents)
		.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
		.toNumber();

	if (!Number.isSafeInteger(total) || total < 0) {
		throw new RangeError("Direct accounting total exceeds safe integer range");
	}

	return total;
}
