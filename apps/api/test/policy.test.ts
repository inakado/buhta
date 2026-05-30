import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { allRoles, type Permission } from "@buhta/shared";
import type { Actor, RequestWithActor } from "../src/policy/actor";
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
			username: "director",
			name: "Nikita",
			role: "director",
		});

		expect(actor).toMatchObject({
			userId: "u1",
			login: "director",
			displayName: "Nikita",
			role: "director",
		});
		expect(actor?.permissions).toContain("catalog.manage");
		expect(actor?.permissions).toContain("cash.withdraw");
		expect(actor?.permissions).not.toContain("users.manage");
	});

	it("gives production manager production access without catalog management", () => {
		const actor = registry.buildActor({
			id: "pm1",
			username: "production-manager",
			name: "Production Manager",
			role: "production_manager",
		});

		expect(actor?.permissions).toContain("production.manage");
		expect(actor?.permissions).not.toContain("catalog.manage");
	});

	it("allows every v1 role to read distributor stock", () => {
		for (const role of allRoles()) {
			const actor = registry.buildActor({
				id: `user-${role}`,
				username: role,
				name: role,
				role,
			});

			expect(actor?.permissions).toContain("distributor.stock.read");
		}
	});

	it("rejects missing identity fields and unknown roles", () => {
		expect(registry.buildActor({ username: "no-id", role: "director" })).toBeNull();
		expect(registry.buildActor({ id: "u1", username: "x", role: "owner" })).toBeNull();
	});
});

describe("PolicyGuard", () => {
	const registry = new PolicyRegistry();

	it("allows users with the required permission and stores actor on request", () => {
		const request: RequestWithActor = {
			user: {
				id: "u1",
				username: "director",
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
						username: "courier",
						name: "Courier",
						role: "courier",
					},
				}),
			),
		).toThrow(ForbiddenException);
	});

	it("rejects distributor stock reads when an artificial actor lacks permission", () => {
		const limitedRegistry = {
			buildActor: () => ({
				userId: "limited-user",
				login: "limited-user",
				displayName: "Limited User",
				role: "courier",
				permissions: [],
			}),
			hasPermission: (actor: Actor, permission: Permission) => actor.permissions.includes(permission),
			permissionsForRole: () => [],
		} as PolicyRegistry;
		const guard = new PolicyGuard(reflectorWithPermission("distributor.stock.read"), limitedRegistry);

		expect(() =>
			guard.canActivate(
				contextWithRequest({
					user: {
						id: "limited-user",
						username: "limited-user",
						name: "Limited User",
						role: "courier",
					},
				}),
			),
		).toThrow(ForbiddenException);
	});
});
