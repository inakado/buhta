import { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { DirectorOnlyGuard } from "../src/auth/role.guard";

function contextWithRole(role: string | null): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => ({
				user: role ? { role } : undefined,
			}),
		}),
	} as ExecutionContext;
}

describe("DirectorOnlyGuard", () => {
	const guard = new DirectorOnlyGuard();

	it("accepts director and admin roles", () => {
		expect(guard.canActivate(contextWithRole("director"))).toBe(true);
		expect(guard.canActivate(contextWithRole("admin"))).toBe(true);
	});

	it("rejects anonymous and non-director roles", () => {
		expect(guard.canActivate(contextWithRole(null))).toBe(false);
		expect(guard.canActivate(contextWithRole("courier"))).toBe(false);
	});
});
