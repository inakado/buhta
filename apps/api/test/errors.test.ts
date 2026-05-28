import { describe, expect, it } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { appErrorResponse, httpStatusForAppError } from "../src/common/errors/http-error.mapper";

describe("AppError HTTP mapper", () => {
	it("maps domain errors to stable HTTP status and response shape", () => {
		const error = new AppError("DOMAIN_RULE_VIOLATION", "Insufficient stock", {
			available: 1,
			requested: 2,
		});

		expect(httpStatusForAppError(error)).toBe(422);
		expect(appErrorResponse(error)).toEqual({
			error: {
				code: "DOMAIN_RULE_VIOLATION",
				message: "Insufficient stock",
				details: {
					available: 1,
					requested: 2,
				},
			},
		});
	});

	it("maps idempotency conflicts to 409", () => {
		expect(httpStatusForAppError(new AppError("IDEMPOTENCY_CONFLICT", "Conflict"))).toBe(409);
	});
});
