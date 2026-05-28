import cookieParser from "cookie-parser";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { prisma } from "../src/prisma/client";

const email = "auth-http-integration@buhta.local";
const password = "Pass123!";

describe("auth and policy HTTP integration", () => {
	let app: INestApplication | undefined;
	let server: Parameters<typeof request.agent>[0];
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

		server = app.getHttpServer();
		agent = request.agent(server);

		await agent
			.post("/api/auth/sign-up/email")
			.send({
				email,
				password,
				name: "Auth HTTP Integration",
			})
			.expect(200);

		const user = await prisma.user.findUniqueOrThrow({
			where: { email },
		});
		userId = user.id;
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
				email,
				role: "courier",
			},
		});
		expect(response.body.actor.permissions).toContain("courier.sale.create");
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
					email,
					role: "admin",
				}),
			]),
		);

		const updateResponse = await agent
			.patch(`/users/${userId}/role`)
			.send({ role: "director" })
			.expect(200);

		expect(updateResponse.body.user).toMatchObject({
			id: userId,
			role: "director",
		});
	});
});

async function cleanupUser() {
	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (!user) {
		return;
	}

	await prisma.idempotencyRecord.deleteMany({
		where: { actorUserId: user.id },
	});
	await prisma.auditLog.deleteMany({
		where: { actorUserId: user.id },
	});
	await prisma.operation.deleteMany({
		where: { actorUserId: user.id },
	});
	await prisma.session.deleteMany({
		where: { userId: user.id },
	});
	await prisma.account.deleteMany({
		where: { userId: user.id },
	});
	await prisma.user.delete({
		where: { id: user.id },
	});
}
