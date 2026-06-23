import { afterEach, describe, expect, it } from "vitest";
import { CatalogService } from "../src/catalog/catalog.service";
import { AppError } from "../src/common/errors/app-error";
import { IdempotencyService } from "../src/operations/idempotency.service";
import { OperationService } from "../src/operations/operation.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";

const catalogService = new CatalogService(new OperationService(new IdempotencyService()));
const actor: Actor = {
	userId: "catalog-integration-director",
	login: "catalog-integration-director",
	displayName: "Catalog Integration Director",
	role: "director",
	permissions: ["catalog.manage"],
};
const actorEmail = "catalog-integration-director@internal.buhta.local";

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

async function cleanup() {
	const operations = await prisma.operation.findMany({
		where: { actorUserId: actor.userId },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

	await deleteAuditLogsForTest({
		where: { actorUserId: actor.userId },
	});
	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.operation.deleteMany({
		where: { id: { in: operationIds } },
	});
	await prisma.productTemplate.deleteMany({
		where: { name: { startsWith: "catalog-integration" } },
	});
	await prisma.distributor.deleteMany({
		where: { name: { startsWith: "catalog-integration" } },
	});
	await prisma.packagingType.deleteMany({
		where: { name: { startsWith: "catalog-integration" } },
	});
	await prisma.rawMaterialType.deleteMany({
		where: { name: { startsWith: "catalog-integration" } },
	});
	await prisma.user.deleteMany({
		where: { id: actor.userId },
	});
}

describe("CatalogService real Postgres integration", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("creates and lists raw material types", async () => {
		await ensureActor();

		const rawMaterialType = await catalogService.createRawMaterialType(actor, {
			name: "catalog-integration-raw",
			unit: "кг",
		});

		expect(rawMaterialType).toMatchObject({
			name: "catalog-integration-raw",
			unit: "кг",
			active: true,
		});
		await expect(catalogService.listRawMaterialTypes()).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: rawMaterialType.id,
					name: "catalog-integration-raw",
				}),
			]),
		);
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "catalog.raw_material_type.create",
					entityId: rawMaterialType.id,
				},
			}),
		).resolves.toBeTruthy();
	});

	it("rejects duplicate catalog names with a typed conflict", async () => {
		await ensureActor();

		await catalogService.createPackagingType(actor, {
			name: "catalog-integration-pack",
			unit: "шт",
		});

		await expect(
			catalogService.createPackagingType(actor, {
				name: "catalog-integration-pack",
				unit: "шт",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("creates product templates only with active raw material and packaging types", async () => {
		await ensureActor();

		const rawMaterialType = await catalogService.createRawMaterialType(actor, {
			name: "catalog-integration-template-raw",
			unit: "кг",
		});
		const packagingType = await catalogService.createPackagingType(actor, {
			name: "catalog-integration-template-pack",
			unit: "шт",
		});

		const productTemplate = await catalogService.createProductTemplate(actor, {
			name: "catalog-integration-template",
			rawMaterialTypeId: rawMaterialType.id,
			packagingTypeId: packagingType.id,
			priceCents: 125000,
			netWeightGrams: 200,
		});

		expect(productTemplate).toMatchObject({
			name: "catalog-integration-template",
			rawMaterialType: {
				name: "catalog-integration-template-raw",
			},
			packagingType: {
				name: "catalog-integration-template-pack",
			},
		});
	});

	it("rejects product template with inactive raw material type", async () => {
		await ensureActor();

		const rawMaterialType = await catalogService.createRawMaterialType(actor, {
			name: "catalog-integration-inactive-raw",
			unit: "кг",
		});
		const packagingType = await catalogService.createPackagingType(actor, {
			name: "catalog-integration-active-pack",
			unit: "шт",
		});
		await catalogService.archiveRawMaterialType(actor, rawMaterialType.id);

		await expect(
			catalogService.createProductTemplate(actor, {
				name: "catalog-integration-rejected-template",
				rawMaterialTypeId: rawMaterialType.id,
				packagingTypeId: packagingType.id,
				priceCents: 125000,
				netWeightGrams: 200,
			}),
		).rejects.toMatchObject({
			code: "DOMAIN_RULE_VIOLATION",
		});
	});

	it("archives distributors without deleting them", async () => {
		await ensureActor();

		const distributor = await catalogService.createDistributor(actor, {
			name: "catalog-integration-distributor",
		});
		const archived = await catalogService.archiveDistributor(actor, distributor.id);

		expect(archived.active).toBe(false);
		await expect(prisma.distributor.findUniqueOrThrow({ where: { id: distributor.id } })).resolves.toMatchObject({
			active: false,
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "catalog.distributor.archive",
					entityId: distributor.id,
				},
			}),
		).resolves.toBeTruthy();
	});

	it("returns a typed error for missing product template relation", async () => {
		await ensureActor();

		await expect(
			catalogService.createProductTemplate(actor, {
				name: "catalog-integration-missing-template",
				rawMaterialTypeId: "missing-raw",
				packagingTypeId: "missing-pack",
				priceCents: 125000,
				netWeightGrams: 200,
			}),
		).rejects.toThrow(AppError);
	});
});
