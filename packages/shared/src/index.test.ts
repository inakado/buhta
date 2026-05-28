import { describe, expect, it } from "vitest";
import {
	addMoneyCents,
	formatMoneyCents,
	HEALTH_RESPONSE_STATUS,
	moneyCents,
	permissionsForRole,
	quantity,
	ROLES,
	subtractMoneyCents,
	subtractQuantity,
	CreateUserRequestSchema,
	LoginSchema,
	UpdateUserRoleRequestSchema,
	UserSummarySchema,
} from "./index";

describe("shared contracts", () => {
	it("keeps health status and CRM roles available", () => {
		expect(HEALTH_RESPONSE_STATUS).toBe("ok");
		expect(ROLES).toContain("courier");
		expect(ROLES).toContain("distributor_worker");
	});

	it("keeps baseline permissions explicit by role", () => {
		expect(permissionsForRole("admin")).toContain("users.manage");
		expect(permissionsForRole("director")).toContain("cash.withdraw");
		expect(permissionsForRole("courier")).not.toContain("cash.withdraw");
	});

	it("handles money only as integer cents", () => {
		const left = moneyCents(10_50);
		const right = moneyCents(250);

		expect(addMoneyCents(left, right)).toBe(1300);
		expect(subtractMoneyCents(left, right)).toBe(800);
		expect(formatMoneyCents(left)).toBe("10.50");
		expect(() => moneyCents(10.5)).toThrow();
		expect(() => subtractMoneyCents(right, left)).toThrow();
	});

	it("handles quantities with explicit units", () => {
		expect(subtractQuantity(quantity(10, "kg"), quantity(3, "kg"))).toEqual({
			value: 7,
			unit: "kg",
		});
		expect(() => quantity(-1, "kg")).toThrow();
		expect(() => subtractQuantity(quantity(1, "kg"), quantity(1, "piece"))).toThrow();
	});

	it("validates user management contracts", () => {
		expect(LoginSchema.parse("Director-1")).toBe("director-1");
		expect(LoginSchema.safeParse("bad login").success).toBe(false);
		expect(CreateUserRequestSchema.safeParse({ name: "Nikita", role: "director" }).success).toBe(true);
		expect(
			CreateUserRequestSchema.safeParse({ name: "Nikita", role: "director", login: "director-1" }).success,
		).toBe(true);
		expect(UpdateUserRoleRequestSchema.safeParse({ role: "director" }).success).toBe(true);
		expect(UpdateUserRoleRequestSchema.safeParse({ role: "owner" }).success).toBe(false);
		expect(
			UserSummarySchema.safeParse({
				id: "u1",
				name: "Nikita",
				login: "director",
				role: "director",
				createdAt: new Date(0).toISOString(),
				updatedAt: new Date(0).toISOString(),
			}).success,
		).toBe(true);
	});
});
