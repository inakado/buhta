import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import type { Permission } from "@buhta/shared";
import type { RequestWithActor } from "../src/policy/actor";
import { PolicyGuard } from "../src/policy/policy.guard";
import { PolicyRegistry } from "../src/policy/policy.registry";

function reflectorWithPermission(permission: Permission | undefined): Reflector {
	return {
		getAllAndOverride: <T>() => permission as T,
	} as unknown as Reflector;
}

function contextWithRequest(request: RequestWithActor): ExecutionContext {
	return {
		getHandler: () => function handler() {},
		getClass: () => class Controller {},
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	} as unknown as ExecutionContext;
}

describe("PolicyRegistry", () => {
	const registry = new PolicyRegistry();

	it("builds an application actor from an auth user", () => {
		const actor = registry.buildActor({
			id: "u1",
			email: "director@buhta.local",
			name: "Nikita",
			role: "director",
		});

		expect(actor).toMatchObject({
			userId: "u1",
			email: "director@buhta.local",
			displayName: "Nikita",
			role: "director",
		});
		expect(actor?.permissions).toContain("cash.withdraw");
		expect(actor?.permissions).not.toContain("users.manage");
	});

	it("rejects missing identity fields and unknown roles", () => {
		expect(registry.buildActor({ email: "no-id@buhta.local", role: "director" })).toBeNull();
		expect(registry.buildActor({ id: "u1", email: "x@buhta.local", role: "owner" })).toBeNull();
	});
});

describe("PolicyGuard", () => {
	const registry = new PolicyRegistry();

	it("allows users with the required permission and stores actor on request", () => {
		const request: RequestWithActor = {
			user: {
				id: "u1",
				email: "director@buhta.local",
				name: "Nikita",
				role: "director",
			},
		};
		const guard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);

		expect(guard.canActivate(contextWithRequest(request))).toBe(true);
		expect(request.actor?.role).toBe("director");
	});

	it("rejects anonymous and wrong-role users", () => {
		const anonymousGuard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);
		expect(() => anonymousGuard.canActivate(contextWithRequest({}))).toThrow(UnauthorizedException);

		const courierGuard = new PolicyGuard(reflectorWithPermission("cash.withdraw"), registry);
		expect(() =>
			courierGuard.canActivate(
				contextWithRequest({
					user: {
						id: "u2",
						email: "courier@buhta.local",
						name: "Courier",
						role: "courier",
					},
				}),
			),
		).toThrow(ForbiddenException);
	});
});
