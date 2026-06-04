import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "../src/policy/actor";
import { DistributorService } from "../src/distributor/distributor.service";
import { summarizeDistributorInventory } from "../src/distributor/distributor.mapper";
import { ProductionService } from "../src/production/production.service";
import { prisma } from "../src/prisma/client";

const distributorService = new DistributorService();
const productionService = new ProductionService();
const actor: Actor = {
	userId: "distributor-inventory-manager",
	login: "distributor-inventory-manager",
	displayName: "Distributor Inventory Manager",
	role: "production_manager",
	permissions: ["production.manage", "distributor.stock.read"],
};
const actorEmail = "distributor-inventory-manager@internal.buhta.local";

async function ensureActor() {
	await prisma.user.upsert({
		where: { email: actorEmail },
		update: {
			name: actor.displayName,
			role: actor.role,
			username: actor.login,
			displayUsername: actor.login,
		},
		create: {
			id: actor.userId,
			email: actorEmail,
			username: actor.login,
			displayUsername: actor.login,
			name: actor.displayName,
			emailVerified: true,
			role: actor.role,
		},
	});
}

async function createCatalogFixture(prefix: string, priceCents = 88050) {
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

	return {
		rawMaterialType,
		packagingType,
		productTemplate,
		distributor,
	};
}

async function releaseAndTransfer(prefix: string, quantity: number, transferQuantity: number, priceCents = 88050) {
	const fixture = await createCatalogFixture(prefix, priceCents);
	await productionService.createRawMaterialIntake(actor, {
		rawMaterialTypeId: fixture.rawMaterialType.id,
		quantity: quantity * 2,
	});
	await productionService.createPackagingIntake(actor, {
		packagingTypeId: fixture.packagingType.id,
		quantity,
	});
	const batch = await productionService.createProductBatch(actor, {
		productTemplateId: fixture.productTemplate.id,
		quantity,
		consumedRawMaterialQuantity: quantity,
	});
	await productionService.createProductTransfer(actor, {
		productBatchId: batch.id,
		distributorId: fixture.distributor.id,
		quantity: transferQuantity,
	});

	return {
		...fixture,
		batch,
	};
}

async function cleanup() {
	const [rawMaterialTypes, packagingTypes, distributors] = await Promise.all([
		prisma.rawMaterialType.findMany({
			where: { name: { startsWith: "distributor-inventory" } },
			select: { id: true },
		}),
		prisma.packagingType.findMany({
			where: { name: { startsWith: "distributor-inventory" } },
			select: { id: true },
		}),
		prisma.distributor.findMany({
			where: { name: { startsWith: "distributor-inventory" } },
			select: { id: true },
		}),
	]);
	const rawMaterialTypeIds = rawMaterialTypes.map((item) => item.id);
	const packagingTypeIds = packagingTypes.map((item) => item.id);
	const distributorIds = distributors.map((item) => item.id);
	const operations = await prisma.operation.findMany({
		where: { actorUserId: actor.userId },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

	await prisma.productTransfer.deleteMany({
		where: {
			OR: [{ actorUserId: actor.userId }, { distributorId: { in: distributorIds } }],
		},
	});
	await prisma.distributorProductBalance.deleteMany({
		where: { distributorId: { in: distributorIds } },
	});
	await prisma.workshopProductBalance.deleteMany({
		where: { productBatch: { actorUserId: actor.userId } },
	});
	await prisma.productBatch.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.rawMaterialIntake.deleteMany({
		where: {
			OR: [{ actorUserId: actor.userId }, { rawMaterialTypeId: { in: rawMaterialTypeIds } }],
		},
	});
	await prisma.packagingIntake.deleteMany({
		where: {
			OR: [{ actorUserId: actor.userId }, { packagingTypeId: { in: packagingTypeIds } }],
		},
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.operation.deleteMany({
		where: { id: { in: operationIds } },
	});
	await prisma.rawMaterialBalance.deleteMany({
		where: { rawMaterialTypeId: { in: rawMaterialTypeIds } },
	});
	await prisma.packagingBalance.deleteMany({
		where: { packagingTypeId: { in: packagingTypeIds } },
	});
	await prisma.productTemplate.deleteMany({
		where: { name: { startsWith: "distributor-inventory" } },
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
		where: { id: actor.userId },
	});
}

describe("Distributor inventory real Postgres integration", () => {
	beforeEach(async () => {
		await ensureActor();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("summarizes an empty inventory response", () => {
		expect(summarizeDistributorInventory([])).toEqual({
			summary: {
				distributorCount: 0,
				stockItemCount: 0,
				totalUnits: 0,
				totalStockValueCents: 0,
			},
			distributorSummaries: [],
		});
	});

	it("returns distributor inventory from transferred product batches", async () => {
		const { batch, distributor } = await releaseAndTransfer("distributor-inventory-read", 5, 2, 125000);

		const inventory = await distributorService.getInventory();
		const item = inventory.items.find((current) => current.productBatchId === batch.id);

		expect(item).toMatchObject({
			distributorId: distributor.id,
			distributorName: "distributor-inventory-read-distributor",
			productBatchId: batch.id,
			productName: "distributor-inventory-read-template",
			baseUnitPriceCents: 125000,
			unitPriceCents: 125000,
			discounted: false,
			discountCentsPerUnit: 0,
			quantity: 2,
			stockValueCents: 250000,
		});
		expect(inventory.distributorSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorId: distributor.id,
					stockItemCount: 1,
					totalUnits: 2,
					totalStockValueCents: 250000,
				}),
			]),
		);
	});

	it("sums multiple batches and distributors without grouping different stock rows", async () => {
		const first = await releaseAndTransfer("distributor-inventory-first", 5, 2, 100000);
		const second = await releaseAndTransfer("distributor-inventory-second", 4, 3, 50000);

		const inventory = await distributorService.getInventory();
		const createdItems = inventory.items.filter((item) =>
			[first.batch.id, second.batch.id].includes(item.productBatchId),
		);

		expect(createdItems).toHaveLength(2);
		expect(createdItems.reduce((sum, item) => sum + item.quantity, 0)).toBe(5);
		expect(createdItems.reduce((sum, item) => sum + item.stockValueCents, 0)).toBe(350000);
		expect(inventory.distributorSummaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					distributorId: first.distributor.id,
					stockItemCount: 1,
					totalUnits: 2,
					totalStockValueCents: 200000,
				}),
				expect.objectContaining({
					distributorId: second.distributor.id,
					stockItemCount: 1,
					totalUnits: 3,
					totalStockValueCents: 150000,
				}),
			]),
		);
	});

	it("hides zero balances from inventory", async () => {
		const { batch, distributor } = await releaseAndTransfer("distributor-inventory-zero", 3, 2);
			await prisma.distributorProductBalance.update({
				where: {
					distributorId_productBatchId_unitPriceCents: {
						distributorId: distributor.id,
						productBatchId: batch.id,
					unitPriceCents: batch.priceCents,
				},
			},
			data: { quantity: 0 },
		});

		const inventory = await distributorService.getInventory();

		expect(inventory.items).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ productBatchId: batch.id })]),
		);
	});

	it("uses product batch snapshot price after template price changes", async () => {
		const { batch, productTemplate } = await releaseAndTransfer("distributor-inventory-snapshot", 4, 3, 88050);
		await prisma.productTemplate.update({
			where: { id: productTemplate.id },
			data: { priceCents: 100 },
		});

		const inventory = await distributorService.getInventory();
			const item = inventory.items.find((current) => current.productBatchId === batch.id);

			expect(item).toMatchObject({
				baseUnitPriceCents: 88050,
				unitPriceCents: 88050,
				discounted: false,
				discountCentsPerUnit: 0,
				quantity: 3,
				stockValueCents: 264150,
		});
	});

	it("does not create operation or audit records for reads", async () => {
		await releaseAndTransfer("distributor-inventory-no-audit", 4, 2);
		const [operationCountBefore, auditCountBefore] = await Promise.all([
			prisma.operation.count({ where: { actorUserId: actor.userId } }),
			prisma.auditLog.count({ where: { actorUserId: actor.userId } }),
		]);

		await distributorService.getInventory();

		const [operationCountAfter, auditCountAfter] = await Promise.all([
			prisma.operation.count({ where: { actorUserId: actor.userId } }),
			prisma.auditLog.count({ where: { actorUserId: actor.userId } }),
		]);
		expect(operationCountAfter).toBe(operationCountBefore);
		expect(auditCountAfter).toBe(auditCountBefore);
	});
});
