import { describe, expect, it } from "vitest";
import { AuthMeController } from "../src/auth/auth-me.controller";
import { PolicyRegistry } from "../src/policy/policy.registry";

describe("AuthMeController", () => {
	const controller = new AuthMeController(new PolicyRegistry());

	it("returns current application actor for a valid auth user", () => {
		expect(
			controller.me({
				user: {
					id: "u1",
					username: "director",
					name: "Nikita",
					role: "director",
				},
			}),
		).toMatchObject({
			authenticated: true,
			actor: {
				userId: "u1",
				login: "director",
				role: "director",
				permissions: expect.arrayContaining(["cash.withdraw"]),
			},
		});
	});

	it("returns anonymous summary when actor cannot be built", () => {
		expect(controller.me({})).toEqual({
			authenticated: false,
			actor: null,
		});
	});
});
