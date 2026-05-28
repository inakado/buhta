import { describe, expect, it, afterEach } from "vitest";
import type { Actor } from "../src/policy/actor";
import { AppError } from "../src/common/errors/app-error";
import { IdempotencyService } from "../src/operations/idempotency.service";
import { OperationService } from "../src/operations/operation.service";
import { prisma } from "../src/prisma/client";

const testUserId = "operation-integration-user";
const actorEmail = "operation-integration@internal.buhta.local";
const operationService = new OperationService(new IdempotencyService());

const actor: Actor = {
	userId: testUserId,
	login: "operation-integration",
	displayName: "Operation Integration",
	role: "admin",
	permissions: ["users.manage"],
};

async function ensureUser() {
	await prisma.user.upsert({
		where: { email: actorEmail },
		update: {
			name: actor.displayName,
			role: actor.role,
			username: actor.login,
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

	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: actor.userId },
	});
	await prisma.operation.deleteMany({
		where: { id: { in: operationIds } },
	});
	await prisma.user.deleteMany({
		where: { id: actor.userId },
	});
}

describe("OperationService real Postgres integration", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("creates operation, audit log and idempotency record transactionally", async () => {
		await ensureUser();

		const result = await operationService.createBaselineOperation({
			actor,
			type: "foundation.baseline",
			commandName: "foundation.integration",
			idempotencyKey: "operation-integration-key",
			command: { value: 1 },
			metadata: { source: "operation-db.integration.test" },
		});

		expect(result.reused).toBe(false);

		const [operationCount, auditCount, idempotencyCount] = await Promise.all([
			prisma.operation.count({ where: { actorUserId: actor.userId } }),
			prisma.auditLog.count({ where: { actorUserId: actor.userId } }),
			prisma.idempotencyRecord.count({ where: { actorUserId: actor.userId } }),
		]);

		expect(operationCount).toBe(1);
		expect(auditCount).toBe(1);
		expect(idempotencyCount).toBe(1);
	});

	it("reuses the same operation for identical idempotency retry", async () => {
		await ensureUser();

		const first = await operationService.createBaselineOperation({
			actor,
			type: "foundation.baseline",
			commandName: "foundation.integration",
			idempotencyKey: "operation-retry-key",
			command: { productId: "p1", quantity: 2 },
		});

		const second = await operationService.createBaselineOperation({
			actor,
			type: "foundation.baseline",
			commandName: "foundation.integration",
			idempotencyKey: "operation-retry-key",
			command: { quantity: 2, productId: "p1" },
		});

		expect(second.reused).toBe(true);
		expect(second.operation.id).toBe(first.operation.id);
		expect(await prisma.operation.count({ where: { actorUserId: actor.userId } })).toBe(1);
	});

	it("rejects reused idempotency key with a different request", async () => {
		await ensureUser();

		await operationService.createBaselineOperation({
			actor,
			type: "foundation.baseline",
			commandName: "foundation.integration",
			idempotencyKey: "operation-conflict-key",
			command: { value: 1 },
		});

		const conflict = operationService.createBaselineOperation({
			actor,
			type: "foundation.baseline",
			commandName: "foundation.integration",
			idempotencyKey: "operation-conflict-key",
			command: { value: 2 },
		});

		await expect(conflict).rejects.toThrow(AppError);
	});
});
