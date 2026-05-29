import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";
import { ProductionService } from "../src/production/production.service";

const productionService = new ProductionService();
const actor: Actor = {
	userId: "production-integration-manager",
	login: "production-integration-manager",
	displayName: "Production Integration Manager",
	role: "production_manager",
	permissions: ["production.manage"],
};
const actorEmail = "production-integration-manager@internal.buhta.local";

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

async function createCatalogFixture(prefix = "production-integration") {
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
			priceCents: 88050,
		},
	});

	return {
		rawMaterialType,
		packagingType,
		productTemplate,
	};
}

async function cleanup() {
	const [rawMaterialTypes, packagingTypes] = await Promise.all([
		prisma.rawMaterialType.findMany({
			where: { name: { startsWith: "production-integration" } },
			select: { id: true },
		}),
		prisma.packagingType.findMany({
			where: { name: { startsWith: "production-integration" } },
			select: { id: true },
		}),
	]);
	const rawMaterialTypeIds = rawMaterialTypes.map((item) => item.id);
	const packagingTypeIds = packagingTypes.map((item) => item.id);
	const operations = await prisma.operation.findMany({
		where: { actorUserId: actor.userId },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

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
		where: { name: { startsWith: "production-integration" } },
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

describe("ProductionService real Postgres integration", () => {
	beforeEach(async () => {
		await ensureActor();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("records raw material and packaging intakes as balances and audit operations", async () => {
		const { rawMaterialType, packagingType } = await createCatalogFixture("production-integration-intake");

		const rawBalance = await productionService.createRawMaterialIntake(actor, {
			rawMaterialTypeId: rawMaterialType.id,
			quantity: 15.5,
			comment: "Первичный приход сырья",
		});
		const packagingBalance = await productionService.createPackagingIntake(actor, {
			packagingTypeId: packagingType.id,
			quantity: 10,
		});
		const summary = await productionService.getSummary();

		expect(rawBalance).toMatchObject({
			typeId: rawMaterialType.id,
			name: "production-integration-intake-raw",
			unit: "кг",
			quantity: 15.5,
		});
		expect(packagingBalance).toMatchObject({
			typeId: packagingType.id,
			name: "production-integration-intake-pack",
			unit: "шт",
			quantity: 10,
		});
		expect(summary.rawMaterialKinds).toBeGreaterThanOrEqual(1);
		expect(summary.packagingKinds).toBeGreaterThanOrEqual(1);
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					actorUserId: actor.userId,
					action: "production.raw_material_intake.create",
					entityId: rawMaterialType.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				rawMaterialTypeId: rawMaterialType.id,
				rawMaterialTypeName: "production-integration-intake-raw",
				unit: "кг",
			}),
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					actorUserId: actor.userId,
					action: "production.packaging_intake.create",
					entityId: packagingType.id,
				},
			}),
		).resolves.toMatchObject({
			details: expect.objectContaining({
				packagingTypeId: packagingType.id,
				packagingTypeName: "production-integration-intake-pack",
				unit: "шт",
			}),
		});
	});

	it("returns active production options without requiring catalog management", async () => {
		const { rawMaterialType, packagingType, productTemplate } =
			await createCatalogFixture("production-integration-options");

		const options = await productionService.getOptions();

		expect(options.rawMaterialTypes).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: rawMaterialType.id })]),
		);
		expect(options.packagingTypes).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: packagingType.id })]),
		);
		expect(options.productTemplates).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: productTemplate.id, priceCents: 88050 })]),
		);
	});

	it("creates product batch and decrements raw material and packaging balances transactionally", async () => {
		const { rawMaterialType, packagingType, productTemplate } =
			await createCatalogFixture("production-integration-release");

		await productionService.createRawMaterialIntake(actor, {
			rawMaterialTypeId: rawMaterialType.id,
			quantity: 15.5,
		});
		await productionService.createPackagingIntake(actor, {
			packagingTypeId: packagingType.id,
			quantity: 10,
		});

		const batch = await productionService.createProductBatch(actor, {
			productTemplateId: productTemplate.id,
			quantity: 4,
			consumedRawMaterialQuantity: 6.25,
			comment: "Первая партия",
		});

		expect(batch).toMatchObject({
			productTemplateId: productTemplate.id,
			productName: "production-integration-release-template",
			rawMaterialTypeName: "production-integration-release-raw",
			packagingTypeName: "production-integration-release-pack",
			priceCents: 88050,
			quantity: 4,
			consumedRawMaterialQuantity: 6.25,
			consumedPackagingQuantity: 4,
			status: "in_workshop",
		});
		const [rawBalance, packagingBalance, auditLog] = await Promise.all([
			prisma.rawMaterialBalance.findUniqueOrThrow({ where: { rawMaterialTypeId: rawMaterialType.id } }),
			prisma.packagingBalance.findUniqueOrThrow({ where: { packagingTypeId: packagingType.id } }),
			prisma.auditLog.findFirstOrThrow({
				where: {
					actorUserId: actor.userId,
					action: "production.product_batch.create",
					entityId: batch.id,
				},
			}),
		]);
		expect(Number(rawBalance.quantity)).toBe(9.25);
		expect(Number(packagingBalance.quantity)).toBe(6);
		expect(auditLog.details).toMatchObject({
			productName: "production-integration-release-template",
			rawMaterialTypeName: "production-integration-release-raw",
			packagingTypeName: "production-integration-release-pack",
			priceCents: 88050,
		});
		await prisma.rawMaterialType.update({
			where: { id: rawMaterialType.id },
			data: { name: "production-integration-release-raw-renamed" },
		});
		await prisma.packagingType.update({
			where: { id: packagingType.id },
			data: { name: "production-integration-release-pack-renamed" },
		});
		await expect(prisma.productBatch.findUniqueOrThrow({ where: { id: batch.id } })).resolves.toMatchObject({
			rawMaterialTypeName: "production-integration-release-raw",
			packagingTypeName: "production-integration-release-pack",
		});
	});

	it("rejects product batch when raw material balance is not enough", async () => {
		const { rawMaterialType, packagingType, productTemplate } =
			await createCatalogFixture("production-integration-insufficient");

		await productionService.createRawMaterialIntake(actor, {
			rawMaterialTypeId: rawMaterialType.id,
			quantity: 2,
		});
		await productionService.createPackagingIntake(actor, {
			packagingTypeId: packagingType.id,
			quantity: 10,
		});

		await expect(
			productionService.createProductBatch(actor, {
				productTemplateId: productTemplate.id,
				quantity: 4,
				consumedRawMaterialQuantity: 6.25,
			}),
		).rejects.toThrow(AppError);

		const [rawBalance, batchCount] = await Promise.all([
			prisma.rawMaterialBalance.findUniqueOrThrow({ where: { rawMaterialTypeId: rawMaterialType.id } }),
			prisma.productBatch.count({ where: { actorUserId: actor.userId } }),
		]);
		expect(Number(rawBalance.quantity)).toBe(2);
		expect(batchCount).toBe(0);
	});
});
