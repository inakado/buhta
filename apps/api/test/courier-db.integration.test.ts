import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CourierService } from "../src/courier/courier.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";

const courierService = new CourierService();

const courierActor: Actor = {
	userId: "courier-load-courier",
	login: "courier-load-courier",
	displayName: "Courier Load Courier",
	role: "courier",
	permissions: [
		"courier.stock.read",
		"courier.stock.load",
		"courier.cash.read",
		"courier.sale.create",
		"courier.sale.cancel",
		"courier.unload.create",
	],
};
const secondCourierActor: Actor = {
	userId: "courier-load-second-courier",
	login: "courier-load-second-courier",
	displayName: "Courier Load Second Courier",
	role: "courier",
	permissions: [
		"courier.stock.read",
		"courier.stock.load",
		"courier.cash.read",
		"courier.sale.create",
		"courier.sale.cancel",
		"courier.unload.create",
	],
};
const adminActor: Actor = {
	userId: "courier-load-admin",
	login: "courier-load-admin",
	displayName: "Courier Load Admin",
	role: "admin",
	permissions: [
		"courier.stock.read",
		"courier.stock.load",
		"courier.cash.read",
		"courier.sale.create",
		"courier.sale.cancel",
		"courier.unload.create",
	],
};
const commercialActor: Actor = {
	userId: "courier-load-commercial",
	login: "courier-load-commercial",
	displayName: "Courier Load Commercial",
	role: "commercial_manager",
	permissions: ["courier.stock.read", "courier.cash.read"],
};
const directorActor: Actor = {
	userId: "courier-load-director",
	login: "courier-load-director",
	displayName: "Courier Load Director",
	role: "director",
	permissions: ["courier.stock.read", "courier.cash.read"],
};

const actors = [courierActor, secondCourierActor, adminActor, commercialActor, directorActor];

async function ensureActors() {
	for (const actor of actors) {
		await prisma.user.upsert({
			where: { id: actor.userId },
			update: {
				email: `${actor.login}@internal.buhta.local`,
				name: actor.displayName,
				role: actor.role,
				username: actor.login,
				displayUsername: actor.login,
			},
			create: {
				id: actor.userId,
				email: `${actor.login}@internal.buhta.local`,
				username: actor.login,
				displayUsername: actor.login,
				name: actor.displayName,
				emailVerified: true,
				role: actor.role,
			},
		});
	}
}

async function createLoadFixture(prefix: string, quantity = 3, priceCents = 125000) {
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
			actorUserId: courierActor.userId,
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
			actorUserId: courierActor.userId,
		},
	});
	const distributorProductBalance = await prisma.distributorProductBalance.create({
		data: {
			distributorId: distributor.id,
			productBatchId: productBatch.id,
			unitPriceCents: productBatch.priceCents,
			quantity,
		},
	});

	return {
		rawMaterialType,
		packagingType,
		productTemplate,
		distributor,
		productBatch,
		distributorProductBalance,
	};
}

async function createClient(prefix: string) {
	return prisma.client.create({
		data: {
			name: `${prefix}-client`,
			phone: "+7 (900) 100-20-30",
			phoneNormalized: `79${numericSuffix(prefix)}`,
			description: `${prefix}-description`,
			createdByUserId: courierActor.userId,
		},
	});
}

function numericSuffix(value: string): string {
	const hash = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);

	return hash.toString().padStart(9, "0").slice(-9);
}

async function createSaleFixture(prefix: string, quantity = 3, priceCents = 125000) {
	const fixture = await createLoadFixture(prefix, quantity, priceCents);
	const courierProductBalance = await prisma.courierProductBalance.create({
		data: {
			courierUserId: courierActor.userId,
			productBatchId: fixture.productBatch.id,
			unitPriceCents: fixture.productBatch.priceCents,
			quantity,
		},
	});
	const client = await createClient(prefix);

	return {
		...fixture,
		courierProductBalance,
		client,
	};
}

async function cleanup() {
	const [rawMaterialTypes, packagingTypes, distributors] = await Promise.all([
		prisma.rawMaterialType.findMany({
			where: { name: { startsWith: "courier-load" } },
			select: { id: true },
		}),
		prisma.packagingType.findMany({
			where: { name: { startsWith: "courier-load" } },
			select: { id: true },
		}),
		prisma.distributor.findMany({
			where: { name: { startsWith: "courier-load" } },
			select: { id: true },
		}),
	]);
	const rawMaterialTypeIds = rawMaterialTypes.map((item) => item.id);
	const packagingTypeIds = packagingTypes.map((item) => item.id);
	const distributorIds = distributors.map((item) => item.id);
	const actorIds = actors.map((actor) => actor.userId);
	const operations = await prisma.operation.findMany({
		where: { actorUserId: { in: actorIds } },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

	await prisma.courierLoad.deleteMany({
		where: {
			OR: [
				{ actorUserId: { in: actorIds } },
				{ courierUserId: { in: actorIds } },
				{ distributorId: { in: distributorIds } },
			],
		},
	});
	await prisma.courierUnloadItem.deleteMany({
		where: {
			courierUnload: {
				OR: [
					{ actorUserId: { in: actorIds } },
					{ courierUserId: { in: actorIds } },
					{ distributorId: { in: distributorIds } },
				],
			},
		},
	});
	await prisma.courierUnload.deleteMany({
		where: {
			OR: [
				{ actorUserId: { in: actorIds } },
				{ courierUserId: { in: actorIds } },
				{ distributorId: { in: distributorIds } },
			],
		},
	});
	await prisma.courierSaleCancellation.deleteMany({
		where: {
			OR: [
				{ actorUserId: { in: actorIds } },
				{ courierUserId: { in: actorIds } },
				{ client: { createdByUserId: { in: actorIds } } },
			],
		},
	});
	await prisma.courierSale.deleteMany({
		where: {
			OR: [
				{ actorUserId: { in: actorIds } },
				{ courierUserId: { in: actorIds } },
				{ client: { createdByUserId: { in: actorIds } } },
			],
		},
	});
	await prisma.courierCashBalance.deleteMany({
		where: { courierUserId: { in: actorIds } },
	});
	await prisma.distributorCashBalance.deleteMany({
		where: { distributorId: { in: distributorIds } },
	});
	await prisma.courierProductBalance.deleteMany({
		where: { courierUserId: { in: actorIds } },
	});
	await prisma.distributorProductBalance.deleteMany({
		where: { distributorId: { in: distributorIds } },
	});
	await prisma.workshopProductBalance.deleteMany({
		where: { productBatch: { actorUserId: { in: actorIds } } },
	});
	await prisma.productBatch.deleteMany({
		where: { actorUserId: { in: actorIds } },
	});
	await prisma.client.deleteMany({
		where: { createdByUserId: { in: actorIds } },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: { in: actorIds } },
	});
	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: { in: actorIds } },
	});
	await prisma.operation.deleteMany({
		where: { id: { in: operationIds } },
	});
	await prisma.productTemplate.deleteMany({
		where: { name: { startsWith: "courier-load" } },
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
		where: { id: { in: actorIds } },
	});
}

describe("Courier load real Postgres integration", () => {
	beforeEach(async () => {
		await ensureActors();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("returns load options and scoped courier balances", async () => {
		const fixture = await createLoadFixture("courier-load-options", 3, 125000);
		await courierService.createCourierLoad(courierActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			quantity: 1,
		});
		await prisma.courierProductBalance.create({
			data: {
				courierUserId: secondCourierActor.userId,
				productBatchId: fixture.productBatch.id,
				unitPriceCents: fixture.productBatch.priceCents,
				quantity: 1,
			},
		});

		const [options, courierBalances, commercialBalances, directorBalances] = await Promise.all([
			courierService.getLoadOptions(),
			courierService.getProductBalances(courierActor),
			courierService.getProductBalances(commercialActor),
			courierService.getProductBalances(directorActor),
		]);

		expect(options.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorProductBalanceId: fixture.distributorProductBalance.id,
					distributorId: fixture.distributor.id,
					productBatchId: fixture.productBatch.id,
					unitPriceCents: 125000,
					availableQuantity: 2,
					stockValueCents: 250000,
				}),
			]),
		);
		expect(courierBalances.items).toHaveLength(1);
		expect(courierBalances.items[0]).toMatchObject({
			courierUserId: courierActor.userId,
			quantity: 1,
		});
		expect(commercialBalances.items.map((item) => item.courierUserId)).toEqual(
			expect.arrayContaining([courierActor.userId, secondCourierActor.userId]),
		);
		expect(directorBalances.items.map((item) => item.courierUserId)).toEqual(
			expect.arrayContaining([courierActor.userId, secondCourierActor.userId]),
		);
	});

	it("loads product to courier balance and writes audit snapshot", async () => {
		const fixture = await createLoadFixture("courier-load-happy", 4, 90000);

		const response = await courierService.createCourierLoad(courierActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			quantity: 2,
			comment: " загрузка на день ",
		});

		expect(response.load).toMatchObject({
			courierUserId: courierActor.userId,
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			distributorId: fixture.distributor.id,
			productBatchId: fixture.productBatch.id,
			quantity: 2,
			comment: "загрузка на день",
			actorUserId: courierActor.userId,
		});
		expect(response.distributorProductBalance.quantity).toBe(2);
		expect(response.courierProductBalance).toMatchObject({
			courierUserId: courierActor.userId,
			productBatchId: fixture.productBatch.id,
			quantity: 2,
			stockValueCents: 180000,
		});
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: fixture.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: {
					courierUserId_productBatchId_unitPriceCents: {
						courierUserId: courierActor.userId,
						productBatchId: fixture.productBatch.id,
						unitPriceCents: fixture.productBatch.priceCents,
					},
				},
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "courier.stock.load.create",
					entityId: response.load.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				courierLoadId: response.load.id,
				courierUserId: courierActor.userId,
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				distributorId: fixture.distributor.id,
				distributorName: fixture.distributor.name,
				productBatchId: fixture.productBatch.id,
				productName: fixture.productBatch.productName,
				unitPriceCents: 90000,
				quantity: 2,
				distributorBalanceBefore: 4,
				distributorBalanceAfter: 2,
				courierBalanceBefore: 0,
				courierBalanceAfter: 2,
				comment: "загрузка на день",
			}),
			});
		});

	it("preserves discounted price through courier load, sale and unload facts", async () => {
		const fixture = await createLoadFixture("courier-load-discounted-movement", 4, 125000);
		await prisma.distributorProductBalance.update({
			where: { id: fixture.distributorProductBalance.id },
			data: { unitPriceCents: 100000 },
		});

		const loadResponse = await courierService.createCourierLoad(courierActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			quantity: 3,
		});

		expect(loadResponse.load).toMatchObject({
			baseUnitPriceCents: 125000,
			unitPriceCents: 100000,
			discountCentsPerUnit: 25000,
			stockValueCents: 300000,
		});
		expect(loadResponse.courierProductBalance).toMatchObject({
			productBatchId: fixture.productBatch.id,
			unitPriceCents: 100000,
			discounted: true,
			discountCentsPerUnit: 25000,
			quantity: 3,
			stockValueCents: 300000,
		});
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: {
					courierUserId_productBatchId_unitPriceCents: {
						courierUserId: courierActor.userId,
						productBatchId: fixture.productBatch.id,
						unitPriceCents: 100000,
					},
				},
			}),
		).resolves.toMatchObject({ quantity: 3 });

		const client = await createClient("courier-load-discounted-movement");
		const saleResponse = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: loadResponse.courierProductBalance.id,
			clientId: client.id,
			quantity: 1,
			paymentMethod: "cashless",
		});

		expect(saleResponse.sale).toMatchObject({
			baseUnitPriceCents: 125000,
			unitPriceCents: 100000,
			discountCentsPerUnit: 25000,
			discountTotalCents: 25000,
			totalCents: 100000,
		});

		const unloadResponse = await courierService.createCourierUnload(courierActor, {
			distributorId: fixture.distributor.id,
			items: [{ courierProductBalanceId: loadResponse.courierProductBalance.id, quantity: 1 }],
			cashAmountCents: 0,
		});

		expect(unloadResponse.items).toEqual([
			expect.objectContaining({
				productBatchId: fixture.productBatch.id,
				quantity: 1,
				baseUnitPriceCents: 125000,
				unitPriceCents: 100000,
				discountCentsPerUnit: 25000,
				stockValueCents: 100000,
				distributorProductBalanceId: fixture.distributorProductBalance.id,
			}),
		]);
		expect(unloadResponse.distributorProductBalances).toEqual([
			expect.objectContaining({
				id: fixture.distributorProductBalance.id,
				unitPriceCents: 100000,
				quantity: 2,
				stockValueCents: 200000,
			}),
		]);
	});

	it("increments existing courier balance on repeated load", async () => {
		const fixture = await createLoadFixture("courier-load-repeat", 5, 100000);

		await courierService.createCourierLoad(courierActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			quantity: 2,
		});
		const response = await courierService.createCourierLoad(courierActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			quantity: 1,
		});

		expect(response.distributorProductBalance.quantity).toBe(2);
		expect(response.courierProductBalance.quantity).toBe(3);
		expect(await prisma.courierProductBalance.count({ where: { courierUserId: courierActor.userId } })).toBe(1);
	});

	it("allows admin backend load only to a courier user", async () => {
		const fixture = await createLoadFixture("courier-load-admin", 2, 100000);

		const response = await courierService.createCourierLoad(adminActor, {
			distributorProductBalanceId: fixture.distributorProductBalance.id,
			courierUserId: courierActor.userId,
			quantity: 1,
		});

		expect(response.load).toMatchObject({
			courierUserId: courierActor.userId,
			actorUserId: adminActor.userId,
			quantity: 1,
		});
		await expect(
			courierService.createCourierLoad(adminActor, {
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				courierUserId: commercialActor.userId,
				quantity: 1,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
	});

	it("rejects insufficient stock, inactive distributor and wrong write actors atomically", async () => {
		const insufficient = await createLoadFixture("courier-load-insufficient", 1, 100000);

		await expect(
			courierService.createCourierLoad(courierActor, {
				distributorProductBalanceId: insufficient.distributorProductBalance.id,
				quantity: 2,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: insufficient.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
		await expect(
			prisma.courierProductBalance.findUnique({
				where: {
					courierUserId_productBatchId_unitPriceCents: {
						courierUserId: courierActor.userId,
						productBatchId: insufficient.productBatch.id,
						unitPriceCents: insufficient.productBatch.priceCents,
					},
				},
			}),
		).resolves.toBeNull();

		await expect(
			courierService.createCourierLoad(courierActor, {
				distributorProductBalanceId: insufficient.distributorProductBalance.id,
				courierUserId: secondCourierActor.userId,
				quantity: 1,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

		await expect(
			courierService.createCourierLoad(commercialActor, {
				distributorProductBalanceId: insufficient.distributorProductBalance.id,
				quantity: 1,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		const inactive = await createLoadFixture("courier-load-inactive", 2, 100000);
		await prisma.distributor.update({
			where: { id: inactive.distributor.id },
			data: { active: false },
		});
		await expect(
			courierService.createCourierLoad(courierActor, {
				distributorProductBalanceId: inactive.distributorProductBalance.id,
				quantity: 1,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
	});

	it("prevents double-spend under concurrent loads", async () => {
		const fixture = await createLoadFixture("courier-load-concurrent", 1, 120000);

		const results = await Promise.allSettled([
			courierService.createCourierLoad(courierActor, {
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				quantity: 1,
			}),
			courierService.createCourierLoad(courierActor, {
				distributorProductBalanceId: fixture.distributorProductBalance.id,
				quantity: 1,
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
			prisma.courierProductBalance.findUniqueOrThrow({
				where: {
					courierUserId_productBatchId_unitPriceCents: {
						courierUserId: courierActor.userId,
						productBatchId: fixture.productBatch.id,
						unitPriceCents: fixture.productBatch.priceCents,
					},
				},
			}),
		).resolves.toMatchObject({ quantity: 1 });
		expect(await prisma.courierLoad.count({ where: { distributorId: fixture.distributor.id } })).toBe(1);
	});

	it("returns sale options and cash balances with zero rows for visible couriers", async () => {
		const fixture = await createSaleFixture("courier-load-sale-options", 3, 125000);
		await prisma.courierProductBalance.create({
			data: {
				courierUserId: secondCourierActor.userId,
				productBatchId: fixture.productBatch.id,
				unitPriceCents: fixture.productBatch.priceCents,
				quantity: 1,
			},
		});
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: secondCourierActor.userId,
				amountCents: 70000,
			},
		});

		const [options, courierCash, commercialCash, directorCash] = await Promise.all([
			courierService.getSaleOptions(courierActor),
			courierService.getCashBalances(courierActor),
			courierService.getCashBalances(commercialActor),
			courierService.getCashBalances(directorActor),
		]);

		expect(options.items).toEqual([
			expect.objectContaining({
				courierProductBalanceId: fixture.courierProductBalance.id,
				courierUserId: courierActor.userId,
				productBatchId: fixture.productBatch.id,
				availableQuantity: 3,
				stockValueCents: 375000,
			}),
		]);
		expect(courierCash).toMatchObject({
			totalAmountCents: 0,
			courierCount: 1,
			items: [expect.objectContaining({
				courierUserId: courierActor.userId,
				amountCents: 0,
				updatedAt: null,
			})],
		});
		expect(commercialCash.courierCount).toBeGreaterThanOrEqual(2);
		expect(directorCash.items.map((item) => item.courierUserId)).toEqual(
			expect.arrayContaining([courierActor.userId, secondCourierActor.userId]),
		);
		expect(commercialCash.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ courierUserId: courierActor.userId, amountCents: 0, updatedAt: null }),
				expect.objectContaining({ courierUserId: secondCourierActor.userId, amountCents: 70000 }),
			]),
		);
	});

	it("creates cash sale, decrements courier stock and writes audit snapshot", async () => {
		const fixture = await createSaleFixture("courier-load-sale-cash", 4, 90000);

		const response = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 2,
			paymentMethod: "cash",
			comment: " продажа клиенту ",
		});

		expect(response.sale).toMatchObject({
			courierProductBalanceId: fixture.courierProductBalance.id,
			courierUserId: courierActor.userId,
			productBatchId: fixture.productBatch.id,
			clientId: fixture.client.id,
			quantity: 2,
			unitPriceCents: 90000,
			totalCents: 180000,
			paymentMethod: "cash",
			comment: "продажа клиенту",
			actorUserId: courierActor.userId,
		});
		expect(response.courierProductBalance.quantity).toBe(2);
		expect(response.cashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 180000,
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "courier.sale.create",
					entityId: response.sale.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				courierSaleId: response.sale.id,
				courierProductBalanceId: fixture.courierProductBalance.id,
				courierUserId: courierActor.userId,
				productBatchId: fixture.productBatch.id,
				productName: fixture.productBatch.productName,
				clientId: fixture.client.id,
				quantity: 2,
				unitPriceCents: 90000,
				totalCents: 180000,
				paymentMethod: "cash",
				courierStockBalanceBefore: 4,
				courierStockBalanceAfter: 2,
				courierCashBalanceBefore: 0,
				courierCashBalanceAfter: 180000,
				comment: "продажа клиенту",
			}),
		});
	});

	it("creates cashless sale without creating a cash row", async () => {
		const fixture = await createSaleFixture("courier-load-sale-cashless", 2, 110000);

		const response = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cashless",
		});

		expect(response.sale).toMatchObject({
			paymentMethod: "cashless",
			totalCents: 110000,
		});
		expect(response.cashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 0,
			updatedAt: null,
		});
		await expect(
			prisma.courierCashBalance.findUnique({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toBeNull();
	});

	it("allows admin backend sale only for the selected courier balance owner", async () => {
		const fixture = await createSaleFixture("courier-load-sale-admin", 2, 100000);

		const response = await courierService.createCourierSale(adminActor, {
			courierUserId: courierActor.userId,
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cash",
		});

		expect(response.sale).toMatchObject({
			courierUserId: courierActor.userId,
			actorUserId: adminActor.userId,
			quantity: 1,
		});
		await expect(
			courierService.createCourierSale(adminActor, {
				courierUserId: secondCourierActor.userId,
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			courierService.createCourierSale(adminActor, {
				courierUserId: commercialActor.userId,
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
	});

	it("rejects insufficient stock, missing client and wrong write actors atomically", async () => {
		const fixture = await createSaleFixture("courier-load-sale-reject", 1, 100000);

		await expect(
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: fixture.client.id,
				quantity: 2,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: fixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
		await expect(
			prisma.courierCashBalance.findUnique({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toBeNull();

		await expect(
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: "missing-client",
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: fixture.courierProductBalance.id,
				courierUserId: secondCourierActor.userId,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		await expect(
			courierService.createCourierSale(commercialActor, {
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("prevents stock double-spend and preserves cash increments under concurrent sales", async () => {
		const stockFixture = await createSaleFixture("courier-load-sale-concurrent-stock", 1, 120000);

		const stockResults = await Promise.allSettled([
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: stockFixture.courierProductBalance.id,
				clientId: stockFixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: stockFixture.courierProductBalance.id,
				clientId: stockFixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		]);

		expect(stockResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(stockResults.filter((result) => result.status === "rejected")).toHaveLength(1);
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: stockFixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 0 });

		const cashFixture = await createSaleFixture("courier-load-sale-concurrent-cash", 2, 50000);
		const cashResults = await Promise.allSettled([
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: cashFixture.courierProductBalance.id,
				clientId: cashFixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: cashFixture.courierProductBalance.id,
				clientId: cashFixture.client.id,
				quantity: 1,
				paymentMethod: "cash",
			}),
		]);

		expect(cashResults.filter((result) => result.status === "fulfilled")).toHaveLength(2);
		const successfulCashSales = cashResults
			.filter((result) => result.status === "fulfilled")
			.map((result) => result.value);
		await expect(
			prisma.courierCashBalance.findUniqueOrThrow({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toMatchObject({ amountCents: 220000 });
		const auditLogs = await prisma.auditLog.findMany({
			where: {
				action: "courier.sale.create",
				entityId: {
					in: successfulCashSales.map((response) => response.sale.id),
				},
			},
		});
		const auditDetails = auditLogs.map((log) => log.details as {
			courierCashBalanceAfter: number;
			courierCashBalanceBefore: number;
		}).sort((left, right) => left.courierCashBalanceBefore - right.courierCashBalanceBefore);
		expect(auditDetails).toEqual([
			expect.objectContaining({ courierCashBalanceBefore: 120000, courierCashBalanceAfter: 170000 }),
			expect.objectContaining({ courierCashBalanceBefore: 170000, courierCashBalanceAfter: 220000 }),
		]);
	});

	it("cancels own cash courier sale by restoring stock and decrementing aggregate courier cash", async () => {
		const fixture = await createSaleFixture("courier-load-cancel-cash", 4, 90000);
		const saleResponse = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 2,
			paymentMethod: "cash",
			comment: "продажа",
		});

		const cancelResponse = await courierService.cancelCourierSale(courierActor, saleResponse.sale.id, {
			reason: "Клиент вернул товар",
		});

		expect(cancelResponse.cancellation).toMatchObject({
			courierSaleId: saleResponse.sale.id,
			courierProductBalanceId: fixture.courierProductBalance.id,
			courierUserId: courierActor.userId,
			productBatchId: fixture.productBatch.id,
			clientId: fixture.client.id,
			quantity: 2,
			baseUnitPriceCents: 90000,
			unitPriceCents: 90000,
			totalCents: 180000,
			paymentMethod: "cash",
			reason: "Клиент вернул товар",
			actorUserId: courierActor.userId,
		});
		expect(cancelResponse.courierProductBalance).toMatchObject({
			id: fixture.courierProductBalance.id,
			quantity: 4,
			stockValueCents: 360000,
		});
		expect(cancelResponse.cashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 0,
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "courier.sale.cancel",
					entityId: cancelResponse.cancellation.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				courierSaleCancellationId: cancelResponse.cancellation.id,
				courierSaleId: saleResponse.sale.id,
				originalSaleOperationId: saleResponse.sale.operationId,
				courierStockBalanceBefore: 2,
				courierStockBalanceAfter: 4,
				courierCashBalanceBefore: 180000,
				courierCashBalanceAfter: 0,
				reason: "Клиент вернул товар",
			}),
		});
	});

	it("cancels cashless courier sale without cash row and marks recent sale", async () => {
		const fixture = await createSaleFixture("courier-load-cancel-cashless", 3, 110000);
		const saleResponse = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cashless",
		});

		const cancelResponse = await courierService.cancelCourierSale(courierActor, saleResponse.sale.id, {
			reason: "Ошибка в продаже",
		});
		const recent = await courierService.getRecentSales(courierActor, 5);

		expect(cancelResponse.cashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 0,
			updatedAt: null,
		});
		await expect(
			prisma.courierCashBalance.findUnique({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toBeNull();
		expect(recent.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: saleResponse.sale.id,
					cancelled: true,
					cancellationId: cancelResponse.cancellation.id,
					cancellationReason: "Ошибка в продаже",
					saleActorUserId: courierActor.userId,
					cancelledByActorUserId: courierActor.userId,
				}),
			]),
		);
	});

	it("rejects other courier cancellation and cash-insufficient courier cancellation atomically", async () => {
		const otherCourier = await createSaleFixture("courier-load-cancel-other-courier", 2, 100000);
		const otherCourierSale = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: otherCourier.courierProductBalance.id,
			clientId: otherCourier.client.id,
			quantity: 1,
			paymentMethod: "cashless",
		});

		await expect(
			courierService.cancelCourierSale(secondCourierActor, otherCourierSale.sale.id, {
				reason: "Чужой возврат",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: otherCourier.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });

		const insufficient = await createSaleFixture("courier-load-cancel-insufficient-cash", 2, 100000);
		const insufficientSale = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: insufficient.courierProductBalance.id,
			clientId: insufficient.client.id,
			quantity: 1,
			paymentMethod: "cash",
		});
		await prisma.courierCashBalance.update({
			where: { courierUserId: courierActor.userId },
			data: { amountCents: 99999 },
		});
		await expect(
			courierService.cancelCourierSale(courierActor, insufficientSale.sale.id, {
				reason: "Недостаточно наличных",
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: insufficient.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
		expect(await prisma.courierSaleCancellation.count({
			where: { courierSaleId: insufficientSale.sale.id },
		})).toBe(0);
	});

	it("restores discounted courier sale to the same priced stock row", async () => {
		const fixture = await createSaleFixture("courier-load-cancel-discount", 3, 300000);
		await prisma.courierProductBalance.update({
			where: { id: fixture.courierProductBalance.id },
			data: { unitPriceCents: 250000 },
		});
		const saleResponse = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cashless",
		});

		const cancelResponse = await courierService.cancelCourierSale(courierActor, saleResponse.sale.id, {
			reason: "Возврат дисконтной позиции",
		});

		expect(cancelResponse.cancellation).toMatchObject({
			baseUnitPriceCents: 300000,
			unitPriceCents: 250000,
			discountCentsPerUnit: 50000,
			discountTotalCents: 50000,
		});
		expect(cancelResponse.courierProductBalance).toMatchObject({
			id: fixture.courierProductBalance.id,
			unitPriceCents: 250000,
			quantity: 3,
		});
	});

	it("prevents duplicate courier sale cancellation under concurrency", async () => {
		const fixture = await createSaleFixture("courier-load-cancel-concurrent", 2, 120000);
		const saleResponse = await courierService.createCourierSale(courierActor, {
			courierProductBalanceId: fixture.courierProductBalance.id,
			clientId: fixture.client.id,
			quantity: 1,
			paymentMethod: "cash",
		});

		const results = await Promise.allSettled([
			courierService.cancelCourierSale(courierActor, saleResponse.sale.id, {
				reason: "Параллельный возврат 1",
			}),
			courierService.cancelCourierSale(courierActor, saleResponse.sale.id, {
				reason: "Параллельный возврат 2",
			}),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: fixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.courierCashBalance.findUniqueOrThrow({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toMatchObject({ amountCents: 0 });
		expect(await prisma.courierSaleCancellation.count({
			where: { courierSaleId: saleResponse.sale.id },
		})).toBe(1);
	});

	it("returns unload options for courier self-flow", async () => {
		const fixture = await createSaleFixture("courier-load-unload-options", 3, 125000);
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: courierActor.userId,
				amountCents: 90000,
			},
		});

		const options = await courierService.getUnloadOptions(courierActor);

		expect(options.distributors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorId: fixture.distributor.id,
					distributorName: fixture.distributor.name,
				}),
			]),
		);
		expect(options.productItems).toEqual([
			expect.objectContaining({
				courierProductBalanceId: fixture.courierProductBalance.id,
				productBatchId: fixture.productBatch.id,
				availableQuantity: 3,
				stockValueCents: 375000,
			}),
		]);
		expect(options.cashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 90000,
		});
		await expect(courierService.getUnloadOptions(adminActor)).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("unloads several product rows and cash to distributor with audit snapshot", async () => {
		const first = await createSaleFixture("courier-load-unload-happy-a", 4, 90000);
		const second = await createSaleFixture("courier-load-unload-happy-b", 3, 125000);
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: courierActor.userId,
				amountCents: 250000,
			},
		});

		const response = await courierService.createCourierUnload(courierActor, {
			distributorId: first.distributor.id,
			items: [
				{ courierProductBalanceId: first.courierProductBalance.id, quantity: 2 },
				{ courierProductBalanceId: second.courierProductBalance.id, quantity: 1 },
			],
			cashAmountCents: 150000,
			comment: " сгрузка смены ",
		});

		expect(response.unload).toMatchObject({
			courierUserId: courierActor.userId,
			distributorId: first.distributor.id,
			cashAmountCents: 150000,
			comment: "сгрузка смены",
			actorUserId: courierActor.userId,
		});
		expect(response.items).toHaveLength(2);
		expect(response.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					courierProductBalanceId: first.courierProductBalance.id,
					productBatchId: first.productBatch.id,
					quantity: 2,
					unitPriceCents: 90000,
					stockValueCents: 180000,
				}),
				expect.objectContaining({
					courierProductBalanceId: second.courierProductBalance.id,
					productBatchId: second.productBatch.id,
					quantity: 1,
					unitPriceCents: 125000,
					stockValueCents: 125000,
				}),
			]),
		);
		expect(response.items.every((item) => item.distributorProductBalanceId)).toBe(true);
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: first.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: second.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 2 });
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: { id: first.distributorProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 6 });
		await expect(
			prisma.distributorProductBalance.findUniqueOrThrow({
				where: {
					distributorId_productBatchId_unitPriceCents: {
						distributorId: first.distributor.id,
						productBatchId: second.productBatch.id,
						unitPriceCents: second.productBatch.priceCents,
					},
				},
			}),
		).resolves.toMatchObject({ quantity: 1 });
		await expect(
			prisma.courierCashBalance.findUniqueOrThrow({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toMatchObject({ amountCents: 100000 });
		await expect(
			prisma.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: first.distributor.id },
			}),
		).resolves.toMatchObject({ amountCents: 150000 });
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "courier.unload.create",
					entityId: response.unload.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				courierUnloadId: response.unload.id,
				courierUserId: courierActor.userId,
				distributorId: first.distributor.id,
				distributorName: first.distributor.name,
				cashAmountCents: 150000,
				courierCashBalanceBefore: 250000,
				courierCashBalanceAfter: 100000,
				distributorCashBalanceBefore: 0,
				distributorCashBalanceAfter: 150000,
				comment: "сгрузка смены",
				items: expect.arrayContaining([
					expect.objectContaining({
						courierProductBalanceId: first.courierProductBalance.id,
						distributorProductBalanceId: first.distributorProductBalance.id,
						productBatchId: first.productBatch.id,
						quantity: 2,
						courierBalanceBefore: 4,
						courierBalanceAfter: 2,
						distributorBalanceBefore: 4,
						distributorBalanceAfter: 6,
					}),
				]),
			}),
		});
	});

	it("supports product-only unload when courier cash row is missing", async () => {
		const fixture = await createSaleFixture("courier-load-unload-product-only", 2, 100000);

		const response = await courierService.createCourierUnload(courierActor, {
			distributorId: fixture.distributor.id,
			items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
			cashAmountCents: 0,
		});

		expect(response.courierCashBalance).toMatchObject({
			courierUserId: courierActor.userId,
			amountCents: 0,
			updatedAt: null,
		});
		expect(response.distributorCashBalance).toMatchObject({
			distributorId: fixture.distributor.id,
			amountCents: 0,
			updatedAt: null,
		});
		await expect(
			prisma.courierCashBalance.findUnique({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toBeNull();
	});

	it("supports cash-only unload and rejects missing or zero cash rows", async () => {
		const fixture = await createSaleFixture("courier-load-unload-cash-only", 1, 100000);
		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [],
				cashAmountCents: 1,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: courierActor.userId,
				amountCents: 0,
			},
		});
		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [],
				cashAmountCents: 1,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await prisma.courierCashBalance.update({
			where: { courierUserId: courierActor.userId },
			data: { amountCents: 70000 },
		});

		const response = await courierService.createCourierUnload(courierActor, {
			distributorId: fixture.distributor.id,
			items: [],
			cashAmountCents: 50000,
		});

		expect(response.items).toHaveLength(0);
		expect(response.courierCashBalance.amountCents).toBe(20000);
		expect(response.distributorCashBalance.amountCents).toBe(50000);
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: fixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
	});

	it("rejects over-unload, inactive distributor and wrong actors atomically", async () => {
		const fixture = await createSaleFixture("courier-load-unload-reject", 1, 100000);
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: courierActor.userId,
				amountCents: 1000,
			},
		});

		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 2 }],
				cashAmountCents: 0,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [],
				cashAmountCents: 2000,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
				courierUserId: secondCourierActor.userId,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		await expect(
			courierService.createCourierUnload(commercialActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await prisma.distributor.update({
			where: { id: fixture.distributor.id },
			data: { active: false },
		});
		await expect(
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: fixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 1 });
		await expect(
			prisma.courierCashBalance.findUniqueOrThrow({
				where: { courierUserId: courierActor.userId },
			}),
		).resolves.toMatchObject({ amountCents: 1000 });
	});

	it("allows admin backend unload only for the selected courier balance owner", async () => {
		const fixture = await createSaleFixture("courier-load-unload-admin", 2, 100000);
		await prisma.courierCashBalance.create({
			data: {
				courierUserId: courierActor.userId,
				amountCents: 30000,
			},
		});

		const response = await courierService.createCourierUnload(adminActor, {
			courierUserId: courierActor.userId,
			distributorId: fixture.distributor.id,
			items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
			cashAmountCents: 10000,
		});

		expect(response.unload).toMatchObject({
			courierUserId: courierActor.userId,
			actorUserId: adminActor.userId,
		});
		await expect(
			courierService.createCourierUnload(adminActor, {
				courierUserId: secondCourierActor.userId,
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
			}),
		).rejects.toMatchObject({ code: "DOMAIN_RULE_VIOLATION" });
		await expect(
			courierService.createCourierUnload(adminActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("prevents unload and sale from double-spending the same courier stock", async () => {
		const fixture = await createSaleFixture("courier-load-unload-concurrent", 1, 120000);

		const results = await Promise.allSettled([
			courierService.createCourierUnload(courierActor, {
				distributorId: fixture.distributor.id,
				items: [{ courierProductBalanceId: fixture.courierProductBalance.id, quantity: 1 }],
				cashAmountCents: 0,
			}),
			courierService.createCourierSale(courierActor, {
				courierProductBalanceId: fixture.courierProductBalance.id,
				clientId: fixture.client.id,
				quantity: 1,
				paymentMethod: "cashless",
			}),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
		await expect(
			prisma.courierProductBalance.findUniqueOrThrow({
				where: { id: fixture.courierProductBalance.id },
			}),
		).resolves.toMatchObject({ quantity: 0 });
	});
});
