import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "../src/policy/actor";
import { DistributorService } from "../src/distributor/distributor.service";
import { prisma } from "../src/prisma/client";

const distributorService = new DistributorService();
const salesActor: Actor = {
	userId: "distributor-sales-manager",
	login: "distributor-sales-manager",
	displayName: "Distributor Sales Manager",
	role: "commercial_manager",
	permissions: ["distributor.sale.create", "distributor.cash.read", "client.read", "client.manage"],
};
const actorEmail = "distributor-sales-manager@internal.buhta.local";
const directorActor: Actor = {
	userId: "distributor-sales-director",
	login: "distributor-sales-director",
	displayName: "Distributor Sales Director",
	role: "director",
	permissions: ["cash.withdraw", "distributor.cash.read"],
};
const directorEmail = "distributor-sales-director@internal.buhta.local";
const adminActor: Actor = {
	userId: "distributor-sales-admin",
	login: "distributor-sales-admin",
	displayName: "Distributor Sales Admin",
	role: "admin",
	permissions: ["cash.withdraw"],
};
const adminEmail = "distributor-sales-admin@internal.buhta.local";

async function ensureActor() {
	for (const [actor, email] of [
		[salesActor, actorEmail],
		[directorActor, directorEmail],
		[adminActor, adminEmail],
	] as const) {
		await prisma.user.upsert({
			where: { email },
			update: {
				name: actor.displayName,
				role: actor.role,
				username: actor.login,
				displayUsername: actor.login,
			},
			create: {
				id: actor.userId,
				email,
				username: actor.login,
				displayUsername: actor.login,
				name: actor.displayName,
				emailVerified: true,
				role: actor.role,
			},
		});
	}
}

async function createSalesFixture(prefix: string, quantity = 3, priceCents = 125000) {
	const rawMaterialType = await prisma.rawMaterialType.create({
		data: {
			name: `${prefix}-raw`,
			unit: "кг",
		},
	});
	const packagingType = await prisma.packagingType.create({
		data: {
			name: `${prefix}-pack`,
			unit: "шт",
		},
	});
	const productTemplate = await prisma.productTemplate.create({
		data: {
			name: `${prefix}-template`,
			rawMaterialTypeId: rawMaterialType.id,
			packagingTypeId: packagingType.id,
			priceCents,
		},
	});
	const distributor = await prisma.distributor.create({
		data: {
			name: `${prefix}-distributor`,
		},
	});
	const batchOperation = await prisma.operation.create({
		data: {
			type: "production.product_batch.create",
			status: "succeeded",
			actorUserId: salesActor.userId,
		},
	});
	const productBatch = await prisma.productBatch.create({
		data: {
			productTemplateId: productTemplate.id,
			productName: `${prefix}-template`,
			rawMaterialTypeId: rawMaterialType.id,
			rawMaterialTypeName: rawMaterialType.name,
			rawMaterialUnit: rawMaterialType.unit,
			packagingTypeId: packagingType.id,
			packagingTypeName: packagingType.name,
			packagingUnit: packagingType.unit,
			priceCents,
			quantity,
			consumedRawMaterialQuantity: quantity,
			consumedPackagingQuantity: quantity,
			operationId: batchOperation.id,
			actorUserId: salesActor.userId,
		},
	});
	const distributorProductBalance = await prisma.distributorProductBalance.create({
		data: {
			distributorId: distributor.id,
			productBatchId: productBatch.id,
			quantity,
		},
	});
	const client = await prisma.client.create({
		data: {
			name: `${prefix}-client`,
			phone: `+7 999 ${quantity}${quantity}${quantity}-00-00`,
			phoneNormalized: `distributor-sales-${prefix}`,
			createdByUserId: salesActor.userId,
		},
	});

	return {
		rawMaterialType,
		packagingType,
		productTemplate,
		distributor,
		productBatch,
		distributorProductBalance,
		client,
	};
}

async function cleanup() {
	const [rawMaterialTypes, packagingTypes, distributors, clients] = await Promise.all([
		prisma.rawMaterialType.findMany({
			where: { name: { startsWith: "distributor-sales" } },
			select: { id: true },
		}),
		prisma.packagingType.findMany({
			where: { name: { startsWith: "distributor-sales" } },
			select: { id: true },
		}),
		prisma.distributor.findMany({
			where: { name: { startsWith: "distributor-sales" } },
			select: { id: true },
		}),
		prisma.client.findMany({
			where: { name: { startsWith: "distributor-sales" } },
			select: { id: true },
		}),
	]);
	const rawMaterialTypeIds = rawMaterialTypes.map((item) => item.id);
	const packagingTypeIds = packagingTypes.map((item) => item.id);
	const distributorIds = distributors.map((item) => item.id);
	const clientIds = clients.map((item) => item.id);
	const operations = await prisma.operation.findMany({
		where: { actorUserId: salesActor.userId },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);
	const actorUserIds = [salesActor.userId, directorActor.userId, adminActor.userId];

	await prisma.distributorCashWithdrawal.deleteMany({
		where: {
			OR: [
				{ actorUserId: { in: actorUserIds } },
				{ distributorId: { in: distributorIds } },
			],
		},
	});
	await prisma.distributorSale.deleteMany({
		where: {
			OR: [
				{ actorUserId: salesActor.userId },
				{ distributorId: { in: distributorIds } },
				{ clientId: { in: clientIds } },
			],
		},
	});
	await prisma.distributorCashBalance.deleteMany({
		where: { distributorId: { in: distributorIds } },
	});
	await prisma.distributorProductBalance.deleteMany({
		where: { distributorId: { in: distributorIds } },
	});
	await prisma.workshopProductBalance.deleteMany({
		where: { productBatch: { actorUserId: salesActor.userId } },
	});
	await prisma.productBatch.deleteMany({
		where: { actorUserId: salesActor.userId },
	});
	await prisma.client.deleteMany({
		where: { id: { in: clientIds } },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: { in: actorUserIds } },
	});
	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: { in: actorUserIds } },
	});
	await prisma.operation.deleteMany({
		where: {
			OR: [
				{ id: { in: operationIds } },
				{ actorUserId: { in: actorUserIds } },
			],
		},
	});
	await prisma.productTemplate.deleteMany({
		where: { name: { startsWith: "distributor-sales" } },
	});
	await prisma.distributor.deleteMany({
		where: { id: { in: distributorIds } },
	});
	await prisma.packagingType.deleteMany({
		where: { id: { in: packagingTypeIds } },
	});
	await prisma.rawMaterialType.deleteMany({
		where: { id: { in: rawMaterialTypeIds } },
	});
	await prisma.user.deleteMany({
		where: { id: { in: actorUserIds } },
	});
}

describe("Distributor sales real Postgres integration", () => {
	beforeEach(async () => {
		await ensureActor();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("returns sale options and zero cash balance before the first cash sale", async () => {
		const fixture = await createSalesFixture("distributor-sales-options", 3, 125000);

		const [options, cashBalances] = await Promise.all([
			distributorService.getSaleOptions(),
			distributorService.getCashBalances(),
		]);

		expect(options.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorProductBalanceId: fixture.distributorProductBalance.id,
					distributorId: fixture.distributor.id,
					productBatchId: fixture.productBatch.id,
					unitPriceCents: 125000,
					availableQuantity: 3,
					stockValueCents: 375000,
				}),
			]),
		);
		expect(cashBalances.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorId: fixture.distributor.id,
					active: true,
					amountCents: 0,
					updatedAt: null,
				}),
			]),
		);
	});

	it("creates a cash sale, decrements stock and increments cash balance", async () => {
		const fixture = await createSalesFixture("distributor-sales-cash", 4, 90000);

		const response = await distributorService.createDistributorSale(salesActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			clientId: fixture.client.id,
			quantity: 2,
			paymentMethod: "cash",
			comment: " наличная продажа ",
		});

		expect(response.sale).toMatchObject({
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			distributorId: fixture.distributor.id,
			productBatchId: fixture.productBatch.id,
			clientId: fixture.client.id,
			quantity: 2,
			unitPriceCents: 90000,
			totalCents: 180000,
			paymentMethod: "cash",
			comment: "наличная продажа",
		});
		expect(response.distributorProductBalance.quantity).toBe(2);
		expect(response.cashBalance).toMatchObject({
			distributorId: fixture.distributor.id,
			amountCents: 180000,
		});
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: fixture.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: fixture.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 180000 });
	});

	it("creates a cashless sale without changing cash balance", async () => {
		const fixture = await createSalesFixture("distributor-sales-cashless", 4, 100000);
		await prisma.distributorCashBalance.create({
			data: {
				distributorId: fixture.distributor.id,
				amountCents: 50000,
			},
		});

		const response = await distributorService.createDistributorSale(salesActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			clientId: fixture.client.id,
			quantity: 3,
			paymentMethod: "cashless",
		});

		expect(response.sale).toMatchObject({
			quantity: 3,
			unitPriceCents: 100000,
			totalCents: 300000,
			paymentMethod: "cashless",
		});
		expect(response.distributorProductBalance.quantity).toBe(1);
		expect(response.cashBalance).toMatchObject({
			distributorId: fixture.distributor.id,
			amountCents: 50000,
		});
	});

	it("rejects insufficient stock, missing client and inactive distributor atomically", async () => {
		const insufficient = await createSalesFixture("distributor-sales-insufficient", 1, 100000);

		await expect(
			distributorService.createDistributorSale(salesActor, {
				distributorProductBalanceId: insufficient.distributorProductBalance.id,
				clientId: insufficient.client.id,
				quantity: 2,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: insufficient.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
		await expect(
			prisma.distributorCashBalance.findUnique({
				where: { distributorId: insufficient.distributor.id },
			}),
		).resolves.toBeNull();

		await expect(
			distributorService.createDistributorSale(salesActor, {
				distributorProductBalanceId: insufficient.distributorProductBalance.id,
				clientId: "missing-client",
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		const inactive = await createSalesFixture("distributor-sales-inactive", 2, 100000);
		await prisma.distributor.update({
			where: { id: inactive.distributor.id },
			data: { active: false },
		});
		await expect(
			distributorService.createDistributorSale(salesActor, {
				distributorProductBalanceId: inactive.distributorProductBalance.id,
				clientId: inactive.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
	});

	it("writes audit snapshot and keeps sale price after template changes", async () => {
		const fixture = await createSalesFixture("distributor-sales-audit", 2, 88050);

		const response = await distributorService.createDistributorSale(salesActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cash",
		});
		await prisma.productTemplate.update({
			where: { id: fixture.productTemplate.id },
			data: { priceCents: 1 },
		});

		await expect(
			prisma.distributorSale.findUniqueOrThrow({ where: { id: response.sale.id } }),
		).resolves.toMatchObject({
			unitPriceCents: 88050,
			totalCents: 88050,
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "distributor.sale.create",
					entityId: response.sale.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				distributorSaleId: response.sale.id,
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				distributorId: fixture.distributor.id,
				distributorName: fixture.distributor.name,
				productBatchId: fixture.productBatch.id,
				productName: fixture.productBatch.productName,
				clientId: fixture.client.id,
				quantity: 1,
				unitPriceCents: 88050,
				totalCents: 88050,
				paymentMethod: "cash",
				stockBalanceBefore: 2,
				stockBalanceAfter: 1,
				cashBalanceBefore: 0,
				cashBalanceAfter: 88050,
			}),
		});
	});

	it("lets director and admin withdraw distributor cash with audit", async () => {
		const fixture = await createSalesFixture("distributor-sales-withdraw", 1, 100000);
		await prisma.distributorCashBalance.create({
			data: {
				distributorId: fixture.distributor.id,
				amountCents: 250000,
			},
		});

		const directorResponse = await distributorService.createCashWithdrawal(directorActor, {
			distributorId: fixture.distributor.id,
			amountCents: 75000,
			comment: " забрал на расходы ",
		});
		const adminResponse = await distributorService.createCashWithdrawal(adminActor, {
			distributorId: fixture.distributor.id,
			amountCents: 25000,
		});

		expect(directorResponse.withdrawal).toMatchObject({
			distributorId: fixture.distributor.id,
			amountCents: 75000,
			comment: "забрал на расходы",
			actorUserId: directorActor.userId,
		});
		expect(directorResponse.cashBalance).toMatchObject({
			distributorId: fixture.distributor.id,
			active: true,
			amountCents: 175000,
		});
		expect(adminResponse.withdrawal).toMatchObject({
			distributorId: fixture.distributor.id,
			amountCents: 25000,
			comment: null,
			actorUserId: adminActor.userId,
		});
		expect(adminResponse.cashBalance.amountCents).toBe(150000);
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: fixture.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 150000 });
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "distributor.cash.withdraw",
					entityId: directorResponse.withdrawal.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				distributorCashWithdrawalId: directorResponse.withdrawal.id,
				distributorId: fixture.distributor.id,
				distributorName: fixture.distributor.name,
				amountCents: 75000,
				cashBalanceBefore: 250000,
				cashBalanceAfter: 175000,
				comment: "забрал на расходы",
			}),
		});
	});

	it("keeps inactive cash rows visible read-only but rejects withdrawals from them", async () => {
		const fixture = await createSalesFixture("distributor-sales-withdraw-inactive", 1, 100000);
		await prisma.distributorCashBalance.create({
			data: {
				distributorId: fixture.distributor.id,
				amountCents: 50000,
			},
		});
		await prisma.distributor.update({
			where: { id: fixture.distributor.id },
			data: { active: false },
		});

		const cashBalances = await distributorService.getCashBalances();

		expect(cashBalances.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorId: fixture.distributor.id,
					active: false,
					amountCents: 50000,
				}),
			]),
		);
		await expect(
			distributorService.createCashWithdrawal(directorActor, {
				distributorId: fixture.distributor.id,
				amountCents: 10000,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: fixture.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 50000 });
	});

	it("rejects missing cash row and insufficient distributor cash atomically", async () => {
		const missingCash = await createSalesFixture("distributor-sales-withdraw-missing-cash", 1, 100000);
		await expect(
			distributorService.createCashWithdrawal(directorActor, {
				distributorId: missingCash.distributor.id,
				amountCents: 1,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.distributorCashBalance.findUnique({
				where: { distributorId: missingCash.distributor.id },
			}),
		).resolves.toBeNull();

		const insufficient = await createSalesFixture("distributor-sales-withdraw-insufficient", 1, 100000);
		await prisma.distributorCashBalance.create({
			data: {
				distributorId: insufficient.distributor.id,
				amountCents: 30000,
			},
		});

		await expect(
			distributorService.createCashWithdrawal(directorActor, {
				distributorId: insufficient.distributor.id,
				amountCents: 30001,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: insufficient.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 30000 });
		expect(await prisma.distributorCashWithdrawal.count({
			where: { distributorId: insufficient.distributor.id },
		})).toBe(0);
	});

	it("prevents negative distributor cash under concurrent withdrawals", async () => {
		const fixture = await createSalesFixture("distributor-sales-withdraw-concurrent", 1, 100000);
		await prisma.distributorCashBalance.create({
			data: {
				distributorId: fixture.distributor.id,
				amountCents: 100000,
			},
		});

		const results = await Promise.allSettled([
			distributorService.createCashWithdrawal(directorActor, {
				distributorId: fixture.distributor.id,
				amountCents: 70000,
			}),
			distributorService.createCashWithdrawal(directorActor, {
				distributorId: fixture.distributor.id,
				amountCents: 70000,
			}),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: fixture.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 30000 });
		expect(await prisma.distributorCashWithdrawal.count({ where: { distributorId: fixture.distributor.id } })).toBe(1);
	});

	it("prevents double-spend under concurrent sales", async () => {
		const fixture = await createSalesFixture("distributor-sales-concurrent", 1, 120000);

		const results = await Promise.allSettled([
			distributorService.createDistributorSale(salesActor, {
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
			distributorService.createDistributorSale(salesActor, {
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: fixture.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 0 });
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: fixture.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 120000 });
		expect(await prisma.distributorSale.count({ where: { distributorId: fixture.distributor.id } })).toBe(1);
	});
});
