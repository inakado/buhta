import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { ClientsService } from "../src/clients/clients.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";

const clientsService = new ClientsService();
const managerActor: Actor = {
	userId: "clients-integration-manager",
	login: "clients-integration-manager",
	displayName: "Clients Integration Manager",
	role: "commercial_manager",
	permissions: ["client.read", "client.manage"],
};
const workerActor: Actor = {
	userId: "clients-integration-worker",
	login: "clients-integration-worker",
	displayName: "Clients Integration Worker",
	role: "distributor_worker",
	permissions: ["client.read", "client.manage"],
};
const managerEmail = "clients-integration-manager@internal.buhta.local";
const workerEmail = "clients-integration-worker@internal.buhta.local";

async function ensureActor(actor: Actor, email: string) {
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

async function ensureActors() {
	await ensureActor(managerActor, managerEmail);
	await ensureActor(workerActor, workerEmail);
}

async function cleanup() {
	const userIds = [managerActor.userId, workerActor.userId];
	await prisma.client.deleteMany({
		where: { createdByUserId: { in: userIds } },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: { in: userIds } },
	});
	await prisma.operation.deleteMany({
		where: { actorUserId: { in: userIds } },
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

describe("ClientsService real Postgres integration", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("creates, lists and searches clients without writing audit on read", async () => {
		await ensureActors();
		const actorUserIds = [managerActor.userId, workerActor.userId];
		const beforeReadAuditCount = await prisma.auditLog.count({
			where: { actorUserId: { in: actorUserIds } },
		});

		const client = await clientsService.createClient(managerActor, {
			name: "Иван Петров",
			phone: "+7 (999) 123-45-67",
			description: "Покупает икру",
		});

		expect(client).toMatchObject({
			name: "Иван Петров",
			phone: "+7 (999) 123-45-67",
			phoneNormalized: "79991234567",
			description: "Покупает икру",
			createdByUserId: managerActor.userId,
		});

		await expect(clientsService.listClients({ search: "иван" })).resolves.toEqual(
			expect.arrayContaining([expect.objectContaining({ id: client.id })]),
		);
		await expect(clientsService.listClients({ search: "999123" })).resolves.toEqual(
			expect.arrayContaining([expect.objectContaining({ id: client.id })]),
		);

		const afterReadAuditCount = await prisma.auditLog.count({
			where: { actorUserId: { in: actorUserIds } },
		});
		expect(afterReadAuditCount).toBe(beforeReadAuditCount + 1);
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "client.create",
					entityId: client.id,
				},
			}),
		).resolves.toBeTruthy();
	});

	it("rejects duplicate normalized phone on create and update", async () => {
		await ensureActors();
		await clientsService.createClient(managerActor, {
			name: "Первый клиент",
			phone: "+7 (999) 123-45-67",
		});
		const second = await clientsService.createClient(managerActor, {
			name: "Второй клиент",
			phone: "+7 (111) 123-45-67",
		});

		await expect(
			clientsService.createClient(managerActor, {
				name: "Дубль",
				phone: "7 999 123 45 67",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
		await expect(
			clientsService.updateClient(managerActor, second.id, {
				phone: "7 999 123 45 67",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("updates client fields, keeps creator and writes audit", async () => {
		await ensureActors();
		const client = await clientsService.createClient(managerActor, {
			name: "Старое имя",
			phone: "+7 (999) 000-00-00",
			description: "старое описание",
		});

		const updated = await clientsService.updateClient(workerActor, client.id, {
			name: "Новое имя",
			phone: "+7 (999) 111-22-33",
			description: "",
		});

		expect(updated).toMatchObject({
			id: client.id,
			name: "Новое имя",
			phone: "+7 (999) 111-22-33",
			phoneNormalized: "79991112233",
			description: null,
			createdByUserId: managerActor.userId,
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "client.update",
					entityId: client.id,
				},
			}),
		).resolves.toMatchObject({
			actorUserId: workerActor.userId,
		});
	});

	it("rejects missing clients and phones without digits", async () => {
		await ensureActors();

		await expect(
			clientsService.updateClient(managerActor, "missing-client", {
				name: "Новое имя",
			}),
		).rejects.toThrow(AppError);
		await expect(
			clientsService.createClient(managerActor, {
				name: "Без телефона",
				phone: "---",
			}),
		).rejects.toMatchObject({
			code: "VALIDATION_ERROR",
		});
	});
});
