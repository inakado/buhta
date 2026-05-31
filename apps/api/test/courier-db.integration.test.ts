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
	permissions: ["courier.stock.read", "courier.stock.load"],
};
const secondCourierActor: Actor = {
	userId: "courier-load-second-courier",
	login: "courier-load-second-courier",
	displayName: "Courier Load Second Courier",
	role: "courier",
	permissions: ["courier.stock.read", "courier.stock.load"],
};
const adminActor: Actor = {
	userId: "courier-load-admin",
	login: "courier-load-admin",
	displayName: "Courier Load Admin",
	role: "admin",
	permissions: ["courier.stock.read", "courier.stock.load"],
};
const commercialActor: Actor = {
	userId: "courier-load-commercial",
	login: "courier-load-commercial",
	displayName: "Courier Load Commercial",
	role: "commercial_manager",
	permissions: ["courier.stock.read"],
};
const directorActor: Actor = {
	userId: "courier-load-director",
	login: "courier-load-director",
	displayName: "Courier Load Director",
	role: "director",
	permissions: ["courier.stock.read"],
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
		expect(commercialBalances.items.map((item) => item.courierUserId).sort()).toEqual([
			courierActor.userId,
			secondCourierActor.userId,
		].sort());
		expect(directorBalances.items.map((item) => item.courierUserId).sort()).toEqual([
			courierActor.userId,
			secondCourierActor.userId,
		].sort());
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
					courierUserId_productBatchId: {
						courierUserId: courierActor.userId,
						productBatchId: fixture.productBatch.id,
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
					courierUserId_productBatchId: {
						courierUserId: courierActor.userId,
						productBatchId: insufficient.productBatch.id,
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
					courierUserId_productBatchId: {
						courierUserId: courierActor.userId,
						productBatchId: fixture.productBatch.id,
					},
				},
			}),
		).resolves.toMatchObject({ quantity: 1 });
		expect(await prisma.courierLoad.count({ where: { distributorId: fixture.distributor.id } })).toBe(1);
	});
});
