import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { AppError } from "../src/common/errors/app-error";
import { IdempotencyService } from "../src/operations/idempotency.service";
import { OperationService } from "../src/operations/operation.service";
import type { Actor } from "../src/policy/actor";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";
import { UsersService } from "../src/users/users.service";

const usersService = new UsersService(new OperationService(new IdempotencyService()));
const adminActor: Actor = {
	userId: "users-integration-admin",
	login: "users-integration-admin",
	displayName: "Users Integration Admin",
	role: "admin",
	permissions: ["users.manage"],
};
const adminEmail = "users-integration-admin@internal.buhta.local";
const testUserId = "users-integration-user";
const testUserLogin = "users-integration";
const testUserEmail = "users-integration@internal.buhta.local";

async function ensureUser(role = "courier") {
	await prisma.user.upsert({
		where: { email: testUserEmail },
		update: {
			name: "Users Integration",
			role,
			username: testUserLogin,
			displayUsername: testUserLogin,
		},
		create: {
			id: testUserId,
			email: testUserEmail,
			username: testUserLogin,
			displayUsername: testUserLogin,
			name: "Users Integration",
			emailVerified: true,
			role,
		},
	});
}

async function ensureUserCredential(password: string) {
	await prisma.account.upsert({
		where: { id: `${testUserId}-credential` },
		update: {
			accountId: testUserId,
			providerId: "credential",
			userId: testUserId,
			password: await hashPassword(password),
		},
		create: {
			id: `${testUserId}-credential`,
			accountId: testUserId,
			providerId: "credential",
			userId: testUserId,
			password: await hashPassword(password),
		},
	});
}

async function ensureAdmin() {
	await prisma.user.upsert({
		where: { email: adminEmail },
		update: {
			name: adminActor.displayName,
			role: adminActor.role,
			username: adminActor.login,
			displayUsername: adminActor.login,
		},
		create: {
			id: adminActor.userId,
			email: adminEmail,
			username: adminActor.login,
			displayUsername: adminActor.login,
			name: adminActor.displayName,
			emailVerified: true,
			role: adminActor.role,
		},
	});
}

async function cleanup() {
	const users = await prisma.user.findMany({
		where: {
			OR: [
				{ id: { in: [testUserId, adminActor.userId] } },
				{ username: { startsWith: "users-integration" } },
			],
		},
		select: { id: true },
	});
	const userIds = users.map((user) => user.id);

	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: { in: userIds } },
	});
	await deleteAuditLogsForTest({
		where: {
			OR: [{ actorUserId: { in: userIds } }, { entityId: { in: userIds } }],
		},
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

describe("UsersService real Postgres integration", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("lists users using shared summary shape", async () => {
		await ensureUser();

		const users = await usersService.listUsers();

		expect(users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: testUserId,
					login: testUserLogin,
					role: "courier",
				}),
			]),
		);
	});

	it("creates an admin-owned login user and returns the temporary password once", async () => {
		await ensureAdmin();

		const result = await usersService.createUser(adminActor, {
			name: "Created User",
			role: "courier",
			login: "users-integration-created",
		});

		expect(result.user).toMatchObject({
			name: "Created User",
			login: "users-integration-created",
			role: "courier",
		});
		expect(result.temporaryPassword).toMatch(/^Buh-/);

		const createdUser = await prisma.user.findUniqueOrThrow({
			where: { id: result.user.id },
			include: { accounts: true },
		});
		expect(createdUser.email).toBe("users-integration-created@internal.buhta.local");
		expect(createdUser.accounts.some((account) => Boolean(account.password))).toBe(true);

		const auditLog = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "user.create",
				entityId: result.user.id,
			},
		});
		expect(JSON.stringify(auditLog.details)).not.toContain(result.temporaryPassword);
	});

	it("rejects duplicate login with a typed conflict", async () => {
		await ensureAdmin();
		await ensureUser();

		await expect(
			usersService.createUser(adminActor, {
				name: "Duplicate User",
				role: "courier",
				login: testUserLogin,
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("updates a user's role", async () => {
		await ensureAdmin();
		await ensureUser();

		const user = await usersService.updateUserRole(adminActor, testUserId, "director");

		expect(user.role).toBe("director");
		await expect(prisma.user.findUniqueOrThrow({ where: { id: testUserId } })).resolves.toMatchObject({
			role: "director",
		});
		await expect(
			prisma.auditLog.findFirstOrThrow({
				where: {
					action: "user.role.update",
					entityId: testUserId,
				},
			}),
		).resolves.toBeTruthy();
	});

	it("rejects role update for the current actor", async () => {
		await ensureAdmin();

		await expect(usersService.updateUserRole(adminActor, adminActor.userId, "director")).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("updates a user's name and login without changing role or password", async () => {
		await ensureAdmin();
		await ensureUser("director");
		await ensureUserCredential("OldPass123!");

		const user = await usersService.updateUserIdentity(adminActor, testUserId, {
			name: "Renamed User",
			login: "users-integration-renamed",
		});

		expect(user).toMatchObject({
			id: testUserId,
			name: "Renamed User",
			login: "users-integration-renamed",
			role: "director",
		});
		await expect(prisma.user.findUniqueOrThrow({ where: { id: testUserId } })).resolves.toMatchObject({
			name: "Renamed User",
			email: "users-integration-renamed@internal.buhta.local",
			username: "users-integration-renamed",
			displayUsername: "users-integration-renamed",
			role: "director",
		});

		const credential = await prisma.account.findFirstOrThrow({
			where: { userId: testUserId, providerId: "credential" },
		});
		expect(await verifyPassword({ password: "OldPass123!", hash: credential.password ?? "" })).toBe(true);

		const auditLog = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "user.identity.update",
				entityId: testUserId,
			},
		});
		expect(auditLog.details).toMatchObject({
			targetUserId: testUserId,
			fromName: "Users Integration",
			toName: "Renamed User",
			fromLogin: testUserLogin,
			toLogin: "users-integration-renamed",
		});
		expect(JSON.stringify(auditLog.details)).not.toContain("OldPass123!");
	});

	it("allows changing only the user's name while keeping the same login", async () => {
		await ensureAdmin();
		await ensureUser("courier");

		const user = await usersService.updateUserIdentity(adminActor, testUserId, {
			name: "Only Name Changed",
			login: testUserLogin,
		});

		expect(user).toMatchObject({
			name: "Only Name Changed",
			login: testUserLogin,
			role: "courier",
		});
	});

	it("rejects identity update when another user already owns the login", async () => {
		await ensureAdmin();
		await ensureUser("courier");
		await prisma.user.create({
			data: {
				id: "users-integration-duplicate",
				email: "users-integration-duplicate@internal.buhta.local",
				username: "users-integration-duplicate",
				displayUsername: "users-integration-duplicate",
				name: "Duplicate",
				emailVerified: true,
				role: "courier",
			},
		});

		await expect(
			usersService.updateUserIdentity(adminActor, testUserId, {
				name: "Renamed User",
				login: "users-integration-duplicate",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("rejects identity update for the current actor", async () => {
		await ensureAdmin();

		await expect(
			usersService.updateUserIdentity(adminActor, adminActor.userId, {
				name: "Admin Renamed",
				login: "users-integration-admin-renamed",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("changes own password after verifying current password", async () => {
		await ensureUser("courier");
		await ensureUserCredential("OldPass123!");

		const actor: Actor = {
			userId: testUserId,
			login: testUserLogin,
			displayName: "Users Integration",
			role: "courier",
			permissions: [],
		};

		const result = await usersService.changeOwnPassword(actor, {
			currentPassword: "OldPass123!",
			newPassword: "NewPass123!",
			newPasswordConfirmation: "NewPass123!",
		});

		expect(result.user).toMatchObject({
			id: testUserId,
			login: testUserLogin,
		});
		const credential = await prisma.account.findFirstOrThrow({
			where: { userId: testUserId, providerId: "credential" },
		});
		expect(credential.password).toEqual(expect.any(String));
		expect(await verifyPassword({ password: "OldPass123!", hash: credential.password ?? "" })).toBe(false);
		expect(await verifyPassword({ password: "NewPass123!", hash: credential.password ?? "" })).toBe(true);

		const auditLog = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "user.password.change",
				entityId: testUserId,
			},
		});
		expect(JSON.stringify(auditLog.details)).not.toContain("OldPass123!");
		expect(JSON.stringify(auditLog.details)).not.toContain("NewPass123!");
	});

	it("rejects own password change when current password is wrong", async () => {
		await ensureUser("courier");
		await ensureUserCredential("OldPass123!");

		await expect(
			usersService.changeOwnPassword({
				userId: testUserId,
				login: testUserLogin,
				displayName: "Users Integration",
				role: "courier",
				permissions: [],
			}, {
				currentPassword: "WrongPass123!",
				newPassword: "NewPass123!",
				newPasswordConfirmation: "NewPass123!",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Current password is incorrect",
		});
	});

	it("returns a typed error for missing user", async () => {
		await ensureAdmin();

		await expect(usersService.updateUserRole(adminActor, "missing-user", "director")).rejects.toThrow(AppError);
	});

	it("creates a credential when resetting password for a legacy user without account", async () => {
		await ensureAdmin();
		await ensureUser("director");

		await prisma.account.deleteMany({
			where: { userId: testUserId },
		});

		const result = await usersService.resetUserPassword(adminActor, testUserId, new Headers());

		expect(result.user).toMatchObject({
			id: testUserId,
			login: testUserLogin,
			role: "director",
		});
		expect(result.temporaryPassword).toMatch(/^Buh-/);
		await expect(
			prisma.account.findFirstOrThrow({
				where: {
					userId: testUserId,
					providerId: "credential",
				},
			}),
		).resolves.toMatchObject({
			accountId: testUserId,
			password: expect.any(String),
		});
	});

	it("rejects admin password reset for the current actor", async () => {
		await ensureAdmin();

		await expect(usersService.resetUserPassword(adminActor, adminActor.userId, new Headers())).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});
});
