import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { prisma } from "../src/prisma/client";
import { UsersService } from "../src/users/users.service";

const usersService = new UsersService();
const testUserId = "users-integration-user";
const testUserEmail = "users-integration@buhta.local";

async function ensureUser(role = "courier") {
	await prisma.user.upsert({
		where: { email: testUserEmail },
		update: {
			name: "Users Integration",
			role,
		},
		create: {
			id: testUserId,
			email: testUserEmail,
			name: "Users Integration",
			emailVerified: true,
			role,
		},
	});
}

async function cleanup() {
	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: testUserId },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: testUserId },
	});
	await prisma.operation.deleteMany({
		where: { actorUserId: testUserId },
	});
	await prisma.user.deleteMany({
		where: { id: testUserId },
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
					email: testUserEmail,
					role: "courier",
				}),
			]),
		);
	});

	it("updates a user's role", async () => {
		await ensureUser();

		const user = await usersService.updateUserRole(testUserId, "director");

		expect(user.role).toBe("director");
		await expect(prisma.user.findUniqueOrThrow({ where: { id: testUserId } })).resolves.toMatchObject({
			role: "director",
		});
	});

	it("returns a typed error for missing user", async () => {
		await expect(usersService.updateUserRole("missing-user", "director")).rejects.toThrow(AppError);
	});
});
