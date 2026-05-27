import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("health", () => {
	it("returns the shared health contract", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		const app = moduleRef.createNestApplication({ bodyParser: false });
		await app.init();

		await request(app.getHttpServer())
			.get("/health")
			.expect(200)
			.expect(({ body }) => {
				expect(body).toEqual({ status: "ok", schemaVersion: 1 });
			});

		await app.close();
	});
});
