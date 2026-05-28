import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentActor } from "./actor.decorator";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";

@Controller("auth-spike")
export class AuthSpikeController {
	@Get("director-only")
	@RequirePermission("cash.withdraw")
	@UseGuards(PolicyGuard)
	directorOnly(@CurrentActor() actor: Actor) {
		return {
			status: "ok",
			userId: actor.userId,
			role: actor.role,
		};
	}
}
