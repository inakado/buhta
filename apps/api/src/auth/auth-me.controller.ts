import { Controller, Get, Inject, Req } from "@nestjs/common";
import { PolicyRegistry } from "../policy/policy.registry";
import type { RequestWithActor } from "../policy/actor";

@Controller("auth")
export class AuthMeController {
	constructor(@Inject(PolicyRegistry) private readonly policyRegistry: PolicyRegistry) {}

	@Get("me")
	me(@Req() request: RequestWithActor) {
		const actor = request.user ? this.policyRegistry.buildActor(request.user) : null;

		if (!actor) {
			return {
				authenticated: false,
				actor: null,
			};
		}

		return {
			authenticated: true,
			actor,
		};
	}
}
