import cookieParser from "cookie-parser";
import { hashPassword } from "better-auth/crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { prisma } from "../src/prisma/client";
import { deleteAuditLogsForTest } from "./helpers/audit-log-cleanup";

const email = "auth-http-integration@buhta.local";
const username = "auth-http-admin";
const password = "Pass123!";
const seededUserId = "auth-http-admin-id";

describe("auth and policy HTTP integration", () => {
	let app: INestApplication | undefined;
	let server: Server;
	let agent: ReturnType<typeof request.agent>;
	let userId: string;

	beforeAll(async () => {
		await cleanupUser();

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleRef.createNestApplication({ bodyParser: false });
		app.use(cookieParser());
		await app.init();

		server = app.getHttpServer() as Server;
		agent = request.agent(server);

		userId = await createCredentialUser();

		await agent
			.post("/api/auth/sign-in/username")
			.send({
				username,
				password,
			})
			.expect(200);
	});

	afterAll(async () => {
		await app?.close();
		await cleanupUser();
	});

	it("returns current actor from BetterAuth session cookie", async () => {
		const response = await agent.get("/auth/me").expect(200);

		expect(response.body).toMatchObject({
			authenticated: true,
			actor: {
				userId,
				login: username,
				role: "courier",
			},
		});
		expect(response.body.actor.permissions).toContain("courier.sale.create");
	});

	it("rejects public BetterAuth email sign-up", async () => {
		const publicSignupEmail = "auth-http-public-signup@buhta.local";
		const publicSignupUsername = "auth-http-public-signup";

		await prisma.user.deleteMany({
			where: {
				OR: [{ email: publicSignupEmail }, { username: publicSignupUsername }],
			},
		});

		const response = await request(server)
			.post("/api/auth/sign-up/email")
			.send({
				email: publicSignupEmail,
				password: "Pass123!",
				name: "Public Signup",
				username: publicSignupUsername,
			});

		expect(response.status).toBeGreaterThanOrEqual(400);

		const createdUser = await prisma.user.findFirst({
			where: {
				OR: [{ email: publicSignupEmail }, { username: publicSignupUsername }],
			},
		});
		expect(createdUser).toBeNull();
	});

	it("rejects courier session on director-only policy route", async () => {
		await agent.get("/auth-spike/director-only").expect(403);
	});

	it("allows director session on director-only policy route", async () => {
		await prisma.user.update({
			where: { id: userId },
			data: { role: "director" },
		});

		const response = await agent.get("/auth-spike/director-only").expect(200);

		expect(response.body).toMatchObject({
			status: "ok",
			userId,
			role: "director",
		});
	});

	it("protects users endpoints with users.manage permission", async () => {
		await agent.get("/users").expect(403);

		await prisma.user.update({
			where: { id: userId },
			data: { role: "admin" },
		});

		const listResponse = await agent.get("/users").expect(200);
		expect(listResponse.body.users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: userId,
					login: username,
					role: "admin",
				}),
			]),
		);

		const createResponse = await agent
			.post("/users")
			.send({
				name: "Auth Role Target",
				role: "courier",
				login: "auth-http-role-target",
			})
			.expect(201);

		const updateResponse = await agent
			.patch(`/users/${createResponse.body.user.id}/role`)
			.send({ role: "director" })
			.expect(200);

		expect(updateResponse.body.user).toMatchObject({
			id: createResponse.body.user.id,
			role: "director",
		});
	});

	it("lets admin create a login user who can sign in with username", async () => {
		await prisma.user.update({
			where: { id: userId },
			data: { role: "admin" },
		});

		const createResponse = await agent
			.post("/users")
			.send({
				name: "Auth Created Courier",
				role: "courier",
				login: "auth-http-courier",
			})
			.expect(201);

		expect(createResponse.body.user).toMatchObject({
			name: "Auth Created Courier",
			login: "auth-http-courier",
			role: "courier",
		});
		expect(createResponse.body.temporaryPassword).toEqual(expect.any(String));

		const courierAgent = request.agent(server);
		await courierAgent
			.post("/api/auth/sign-in/username")
			.send({
				username: "auth-http-courier",
				password: createResponse.body.temporaryPassword,
			})
			.expect(200);

		const meResponse = await courierAgent.get("/auth/me").expect(200);
		expect(meResponse.body).toMatchObject({
			authenticated: true,
			actor: {
				login: "auth-http-courier",
				role: "courier",
			},
		});

		const auditLog = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "user.create",
				entityId: createResponse.body.user.id,
			},
		});
		expect(JSON.stringify(auditLog.details)).not.toContain(createResponse.body.temporaryPassword);
	});

	it("lets admin reset a user password without writing the password to audit", async () => {
		await prisma.user.update({
			where: { id: userId },
			data: { role: "admin" },
		});

		const createResponse = await agent
			.post("/users")
			.send({
				name: "Auth Reset Courier",
				role: "courier",
				login: "auth-http-reset",
			})
			.expect(201);

		const oldPassword = createResponse.body.temporaryPassword;

		const resetResponse = await agent
			.post(`/users/${createResponse.body.user.id}/reset-password`)
			.expect(201);

		expect(resetResponse.body.temporaryPassword).toEqual(expect.any(String));
		expect(resetResponse.body.temporaryPassword).not.toBe(oldPassword);

		const oldPasswordAgent = request.agent(server);
		const oldPasswordResponse = await oldPasswordAgent.post("/api/auth/sign-in/username").send({
			username: "auth-http-reset",
			password: oldPassword,
		});
		expect(oldPasswordResponse.status).toBeGreaterThanOrEqual(400);

		const newPasswordAgent = request.agent(server);
		await newPasswordAgent
			.post("/api/auth/sign-in/username")
			.send({
				username: "auth-http-reset",
				password: resetResponse.body.temporaryPassword,
			})
			.expect(200);

		const auditLog = await prisma.auditLog.findFirstOrThrow({
			where: {
				action: "user.password.reset",
				entityId: createResponse.body.user.id,
			},
		});
		expect(JSON.stringify(auditLog.details)).not.toContain(resetResponse.body.temporaryPassword);
	});
});

async function createCredentialUser(): Promise<string> {
	await prisma.user.create({
		data: {
			id: seededUserId,
			email,
			name: "Auth HTTP Integration",
			username,
			displayUsername: username,
			emailVerified: true,
			role: "courier",
		},
	});

	await prisma.account.create({
		data: {
			id: `${seededUserId}-credential`,
			accountId: seededUserId,
			providerId: "credential",
			userId: seededUserId,
			password: await hashPassword(password),
		},
	});

	return seededUserId;
}

async function cleanupUser() {
	const users = await prisma.user.findMany({
		where: {
			OR: [{ email }, { username: { startsWith: "auth-http" } }],
		},
		select: { id: true },
	});
	const userIds = users.map((user) => user.id);

	if (userIds.length === 0) {
		return;
	}

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
