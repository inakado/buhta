import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { OperationsService } from "../src/operations/operations.service";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";

const operationsService = new OperationsService();
const now = new Date("2036-06-05T00:00:00.000Z");

const director = {
	userId: "operation-history-director",
	login: "operation-history-director",
	displayName: "Operation History Director",
	role: "director",
};
const courier = {
	userId: "operation-history-courier",
	login: "operation-history-courier",
	displayName: "Operation History Courier",
	role: "courier",
};
const actors = [director, courier];

async function ensureActors() {
	for (const actor of actors) {
		await prisma.user.upsert({
			where: { email: `${actor.login}@internal.buhta.local` },
			update: {
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

async function createAudit(input: {
	action?: string;
	actorUserId: string;
	createdAt: Date;
	details?: object;
	entityId?: string;
	entityType: string;
	type: string;
}) {
	const operation = await prisma.operation.create({
		data: {
			actorUserId: input.actorUserId,
			createdAt: input.createdAt,
			status: "succeeded",
			type: input.type,
		},
	});

	await prisma.auditLog.create({
		data: {
			action: input.action ?? input.type,
			actorUserId: input.actorUserId,
			createdAt: input.createdAt,
			details: input.details ?? {},
			entityId: input.entityId ?? null,
			entityType: input.entityType,
			operationId: operation.id,
		},
	});

	return operation;
}

async function seedHistory() {
	await createAudit({
		actorUserId: director.userId,
		createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
		details: {
			totalCents: 250000,
			quantity: 2,
			nested: {
				accessToken: "secret-token",
				Password: "plain-password",
			},
		},
		entityId: "sale-1",
		entityType: "distributor_sale",
		type: "distributor.sale.create",
	});
	await createAudit({
		actorUserId: courier.userId,
		createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		details: {
			totalCents: 125000,
			quantity: 1,
		},
		entityId: "courier-sale-1",
		entityType: "courier_sale",
		type: "courier.sale.create",
	});
	await createAudit({
		actorUserId: director.userId,
		createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
		details: {
			amountCents: 50000,
		},
		entityId: "withdrawal-1",
		entityType: "distributor_cash_withdrawal",
		type: "distributor.cash.withdraw",
	});
}

async function cleanup() {
	const userIds = actors.map((actor) => actor.userId);
	const operations = await prisma.operation.findMany({
		where: { actorUserId: { in: userIds } },
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

	await deleteAuditLogsForTest({
		where: {
			OR: [
				{ actorUserId: { in: userIds } },
				{ operationId: { in: operationIds } },
			],
		},
	});
	await prisma.operation.deleteMany({
		where: { id: { in: operationIds } },
	});
	await prisma.session.deleteMany({
		where: { userId: { in: userIds } },
	});
	await prisma.account.deleteMany({
		where: { userId: { in: userIds } },
	});
	await prisma.user.deleteMany({
		where: { id: { in: userIds } },
	});
}

describe("OperationsService history real Postgres integration", () => {
	beforeEach(async () => {
		await cleanup();
		await ensureActors();
		await seedHistory();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("returns operation history with default seven-day range and redacted details", async () => {
		const beforeReadAuditCount = await prisma.auditLog.count({
			where: { actorUserId: { in: actors.map((actor) => actor.userId) } },
		});
		const response = await operationsService.getHistory({
			dateTo: now.toISOString(),
		});

		expect(response.items).toHaveLength(2);
		expect(response.items.map((item) => item.operationType)).toEqual([
			"distributor.sale.create",
			"courier.sale.create",
		]);
		expect(response.items[0]).toMatchObject({
			summary: "Продажа с распределителя",
			amountCents: 250000,
			quantity: 2,
			actor: {
				userId: director.userId,
				role: "director",
			},
		});
		const firstItem = response.items[0];
		expect(firstItem).toBeDefined();
		const firstItemDetails = JSON.stringify(firstItem?.details);
		expect(firstItemDetails).toContain("[redacted]");
		expect(firstItemDetails).not.toContain("secret-token");
		expect(firstItemDetails).not.toContain("plain-password");
		const afterReadAuditCount = await prisma.auditLog.count({
			where: { actorUserId: { in: actors.map((actor) => actor.userId) } },
		});
		expect(afterReadAuditCount).toBe(beforeReadAuditCount);
	});

	it("filters by operation type, actor, role and entity type", async () => {
		const baseQuery = {
			dateFrom: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			dateTo: now.toISOString(),
		};

		await expect(operationsService.getHistory({
			...baseQuery,
			operationType: "distributor.cash.withdraw",
		})).resolves.toMatchObject({
			items: [{
				operationType: "distributor.cash.withdraw",
				entityType: "distributor_cash_withdrawal",
			}],
		});
		await expect(operationsService.getHistory({
			...baseQuery,
			actorUserId: courier.userId,
		})).resolves.toMatchObject({
			items: [{
				actor: { userId: courier.userId },
			}],
		});
		await expect(operationsService.getHistory({
			...baseQuery,
			actorRole: "director",
		})).resolves.toMatchObject({
			items: [
				{ actor: { role: "director" } },
				{ actor: { role: "director" } },
			],
		});
		await expect(operationsService.getHistory({
			...baseQuery,
			entityType: "courier_sale",
		})).resolves.toMatchObject({
			items: [{
				entityType: "courier_sale",
			}],
		});
	});

	it("paginates without duplicates", async () => {
		const baseQuery = {
			dateFrom: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			dateTo: now.toISOString(),
			limit: 2,
		};
		const firstPage = await operationsService.getHistory(baseQuery);
		expect(firstPage.items).toHaveLength(2);
		expect(firstPage.nextCursor).toBeTruthy();
		const firstPageIds = firstPage.items.map((item) => item.id);

		const secondPage = await operationsService.getHistory({
			...baseQuery,
			cursor: firstPage.nextCursor ?? undefined,
		});
		expect(secondPage.items).toHaveLength(1);
		expect(secondPage.items.map((item) => item.id)).not.toContain(firstPageIds[0]);
		expect(secondPage.items.map((item) => item.id)).not.toContain(firstPageIds[1]);
	});

	it("rejects ranges wider than 90 days", async () => {
		await expect(operationsService.getHistory({
			dateFrom: "2036-01-01T00:00:00.000Z",
			dateTo: "2036-06-05T00:00:00.000Z",
		})).rejects.toThrow(AppError);
	});

	it("returns filter options independent from current page", async () => {
		const options = await operationsService.getHistoryOptions();

		expect(options.operationTypes).toContain("distributor.sale.create");
		expect(options.roles).toContain("director");
		expect(options.actorUsers.map((actor) => actor.userId)).toContain(director.userId);
		expect(options.actorUsers.map((actor) => actor.userId)).toContain(courier.userId);
		expect(options.entityTypes).toContain("distributor_sale");
		expect(options.entityTypes).toContain("courier_sale");
	});
});
