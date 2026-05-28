import { describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { IdempotencyService } from "../src/operations/idempotency.service";

describe("IdempotencyService", () => {
	const service = new IdempotencyService();

	it("hashes equivalent command payloads deterministically", () => {
		const left = service.hashRequest({ quantity: 2, productId: "p1" });
		const right = service.hashRequest({ productId: "p1", quantity: 2 });

		expect(left).toBe(right);
	});

	it("rejects reused keys with different payloads", () => {
		const hash = service.hashRequest({ productId: "p1", quantity: 2 });

		expect(() => service.assertSameRequest(hash, { productId: "p1", quantity: 3 })).toThrow(AppError);
	});
});
