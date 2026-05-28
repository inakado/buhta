import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HealthController } from "../src/health/health.controller";

describe("health", () => {
	it("returns the shared health contract", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile();

		expect(moduleRef.get(HealthController).health()).toEqual({
			status: "ok",
			schemaVersion: 1,
		});
	});
});
