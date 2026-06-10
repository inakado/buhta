import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { NotificationsService } from "../src/notifications/notifications.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";

const notificationsService = new NotificationsService();

const commercialActor: Actor = {
	userId: "notifications-integration-commercial",
	login: "notifications-integration-commercial",
	displayName: "Notifications Integration Commercial",
	role: "commercial_manager",
	permissions: ["notification.read", "notification.create"],
};
const otherCommercialActor: Actor = {
	userId: "notifications-integration-other-commercial",
	login: "notifications-integration-other-commercial",
	displayName: "Notifications Integration Other Commercial",
	role: "commercial_manager",
	permissions: ["notification.read", "notification.create"],
};
const productionActor: Actor = {
	userId: "notifications-integration-production",
	login: "notifications-integration-production",
	displayName: "Notifications Integration Production",
	role: "production_manager",
	permissions: ["notification.read", "notification.complete"],
};
const directorActor: Actor = {
	userId: "notifications-integration-director",
	login: "notifications-integration-director",
	displayName: "Notifications Integration Director",
	role: "director",
	permissions: ["notification.read"],
};
const courierActor: Actor = {
	userId: "notifications-integration-courier",
	login: "notifications-integration-courier",
	displayName: "Notifications Integration Courier",
	role: "courier",
	permissions: [],
};

const actors = [commercialActor, otherCommercialActor, productionActor, directorActor, courierActor];

async function ensureActor(actor: Actor) {
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

async function ensureActors() {
	for (const actor of actors) {
		await ensureActor(actor);
	}
}

async function cleanup() {
	const userIds = actors.map((actor) => actor.userId);
	const operations = await prisma.operation.findMany({
		where: {
			OR: [
				{ actorUserId: { in: userIds } },
				{ type: { startsWith: "production.notification." } },
			],
		},
		select: { id: true },
	});
	const operationIds = operations.map((operation) => operation.id);

	await prisma.productionNotification.deleteMany();
	await prisma.auditLog.deleteMany({
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

describe("NotificationsService real Postgres integration", () => {
	beforeEach(async () => {
		await cleanup();
	});

	afterEach(async () => {
		await cleanup();
	});

	it("creates, lists and completes production notifications with audit", async () => {
		await ensureActors();
		const beforeReadAuditCount = await prisma.auditLog.count({
			where: {
				actorUserId: { in: actors.map((actor) => actor.userId) },
			},
		});

		const notification = await notificationsService.createNotification(commercialActor, {
			message: " Сделать партию икры ",
		});

		expect(notification).toMatchObject({
			message: "Сделать партию икры",
			status: "new",
			createdBy: {
				userId: commercialActor.userId,
				login: commercialActor.login,
			},
			completedBy: null,
			completedAt: null,
		});

		const createOperation = await prisma.operation.findFirstOrThrow({
			where: {
				type: "production.notification.create",
				actorUserId: commercialActor.userId,
			},
		});
		await expect(prisma.auditLog.findFirstOrThrow({
			where: {
				action: "production.notification.create",
				entityId: notification.id,
				operationId: createOperation.id,
			},
		})).resolves.toBeTruthy();

		const commercialList = await notificationsService.listNotifications(otherCommercialActor, { status: "all" });
		expect(commercialList.items).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: notification.id })]),
		);
		expect(commercialList.summary).toEqual({ newCount: 1, completedCount: 0 });

		const directorList = await notificationsService.listNotifications(directorActor, { status: "new" });
		expect(directorList.items.map((item) => item.id)).toContain(notification.id);

		const afterReadAuditCount = await prisma.auditLog.count({
			where: {
				actorUserId: { in: actors.map((actor) => actor.userId) },
			},
		});
		expect(afterReadAuditCount).toBe(beforeReadAuditCount + 1);

		const completed = await notificationsService.completeNotification(productionActor, notification.id);
		expect(completed).toMatchObject({
			id: notification.id,
			status: "completed",
			completedBy: {
				userId: productionActor.userId,
				login: productionActor.login,
			},
		});
		expect(completed.completedAt).toBeTruthy();

		const completeOperation = await prisma.operation.findFirstOrThrow({
			where: {
				type: "production.notification.complete",
				actorUserId: productionActor.userId,
			},
		});
		const completeAudit = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "production.notification.complete",
				entityId: notification.id,
				operationId: completeOperation.id,
			},
		});
		expect(completeAudit.details).toMatchObject({
			notificationId: notification.id,
			statusBefore: "new",
			statusAfter: "completed",
			completedByUserId: productionActor.userId,
		});

		const completedList = await notificationsService.listNotifications(productionActor, { status: "completed" });
		expect(completedList.items.map((item) => item.id)).toContain(notification.id);
		expect(completedList.summary).toEqual({ newCount: 0, completedCount: 1 });
	});

	it("rejects invalid status transitions and wrong actors", async () => {
		await ensureActors();

		await expect(
			notificationsService.createNotification(courierActor, { message: "Нельзя создать" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		const notification = await notificationsService.createNotification(commercialActor, {
			message: "Сделать партию икры",
		});

		await expect(
			notificationsService.listNotifications(courierActor, { status: "all" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			notificationsService.completeNotification(commercialActor, notification.id),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		await notificationsService.completeNotification(productionActor, notification.id);
		await expect(
			notificationsService.completeNotification(productionActor, notification.id),
		).rejects.toMatchObject({
			code: "DOMAIN_RULE_VIOLATION",
			});
	});

	it("prevents duplicate completion under concurrency", async () => {
		await ensureActors();

		const notification = await notificationsService.createNotification(commercialActor, {
			message: "Сделать партию икры",
		});

		const results = await Promise.allSettled([
			notificationsService.completeNotification(productionActor, notification.id),
			notificationsService.completeNotification(productionActor, notification.id),
		]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

		await expect(prisma.operation.count({
			where: {
				type: "production.notification.complete",
				actorUserId: productionActor.userId,
			},
		})).resolves.toBe(1);
	});

	it("returns a typed error for missing notification", async () => {
		await ensureActors();

		await expect(
			notificationsService.completeNotification(productionActor, "missing-notification"),
		).rejects.toBeInstanceOf(AppError);
		await expect(
			notificationsService.completeNotification(productionActor, "missing-notification"),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
