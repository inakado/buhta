import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { DirectAccountingService } from "../src/direct-accounting/direct-accounting.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";

const service = new DirectAccountingService();
const actor: Actor = {
	userId: "direct-accounting-integration-director",
	login: "direct-accounting-integration-director",
	displayName: "Direct Accounting Director",
	role: "director",
	permissions: ["direct_accounting.manage"],
};
const actorEmail = "direct-accounting-integration@internal.buhta.local";
const prefix = "Прямой тест";
const normalizedPrefix = prefix.toLocaleLowerCase("ru-RU");

async function cleanup() {
	await prisma.directAccountingSale.deleteMany({ where: { productNameNormalized: { startsWith: normalizedPrefix } } });
	const operations = await prisma.operation.findMany({
		where: { actorUserId: actor.userId },
		select: { id: true },
	});
	await deleteAuditLogsForTest({ where: { actorUserId: actor.userId } });
	await prisma.idempotencyRecord.deleteMany({ where: { actorUserId: actor.userId } });
	await prisma.operation.deleteMany({ where: { id: { in: operations.map(({ id }) => id) } } });
	await prisma.user.deleteMany({ where: { id: actor.userId } });
}

describe("DirectAccountingService real Postgres integration", () => {
	beforeEach(async () => {
		await cleanup();
		await prisma.user.upsert({
			where: { email: actorEmail },
			update: { name: actor.displayName, role: actor.role, username: actor.login },
			create: {
				id: actor.userId,
				email: actorEmail,
				username: actor.login,
				name: actor.displayName,
				emailVerified: true,
				role: actor.role,
			},
		});
	});

	afterEach(cleanup);

	it("creates, edits and soft-deletes a sale with before/after audit", async () => {
		const created = await service.createSale(actor, {
			productName: `${prefix} Икра`, soldOn: "2026-09-01", quantityKg: 2.5, unitPriceCents: 100_000,
		}, "direct-accounting-create");
		expect(created.totalCents).toBe(250_000);

		const updated = await service.updateSale(actor, created.id, {
			productName: `${prefix} Икра`, soldOn: "2026-09-02", quantityKg: 1.25, unitPriceCents: 120_000,
		});
		expect(updated.totalCents).toBe(150_000);
		await service.deleteSale(actor, created.id);
		expect(await service.listSales({ date: "2026-09-02" })).toEqual([]);

		const audit = await prisma.auditLog.findMany({
			where: { actorUserId: actor.userId, entityId: created.id },
			orderBy: { createdAt: "asc" },
		});
		expect(audit.map(({ action }) => action)).toEqual([
			"direct_accounting.sale.create",
			"direct_accounting.sale.update",
			"direct_accounting.sale.delete",
		]);
		expect(audit[1]?.details).toMatchObject({
			before: { soldOn: "2026-09-01", totalCents: 250_000 },
			after: { soldOn: "2026-09-02", totalCents: 150_000 },
		});
	});

	it("groups suggestions and statistics by normalized product name", async () => {
		await service.createSale(actor, {
			productName: `${prefix} Кета`, soldOn: "2000-01-07", quantityKg: 1.2, unitPriceCents: 100_000,
		}, "direct-accounting-stats-1");
		await service.createSale(actor, {
			productName: `${prefix.toLocaleLowerCase("ru-RU")}   кета`, soldOn: "2000-01-08", quantityKg: 0.8, unitPriceCents: 150_000,
		}, "direct-accounting-stats-2");

		const stats = await service.getStatistics({ anchorDate: "2000-01-08", detailPeriod: "week" });
		expect(stats.totals.day).toMatchObject({ quantityKg: 0.8, revenueCents: 120_000 });
		expect(stats.totals.week).toMatchObject({ quantityKg: 2, revenueCents: 240_000 });
		expect(stats.selection).toMatchObject({
			dateFrom: "2000-01-02",
			dateTo: "2000-01-08",
			quantityKg: 2,
			revenueCents: 240_000,
		});
		expect(stats.byProduct).toEqual([expect.objectContaining({ quantityKg: 2, revenueCents: 240_000 })]);

		const customStats = await service.getStatistics({ dateFrom: "2000-01-07", dateTo: "2000-01-07" });
		expect(customStats.selection).toMatchObject({ quantityKg: 1.2, revenueCents: 120_000 });
		expect(customStats.byProduct).toEqual([expect.objectContaining({ quantityKg: 1.2, revenueCents: 120_000 })]);
		expect(await service.listSuggestions({ search: prefix })).toHaveLength(1);
	});

	it("rejects future dates in Vladivostok business time", async () => {
		await expect(service.createSale(actor, {
			productName: `${prefix} Будущее`, soldOn: "2099-01-01", quantityKg: 1, unitPriceCents: 1,
		}, "direct-accounting-future")).rejects.toBeInstanceOf(AppError);
	});
});
