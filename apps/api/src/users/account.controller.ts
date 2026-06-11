import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { ChangeOwnPasswordRequestSchema } from "@buhta/shared";
import { AppError } from "../common/errors/app-error";
import type { Actor, RequestWithActor } from "../policy/actor";
import { PolicyRegistry } from "../policy/policy.registry";
import { UsersService } from "./users.service";

@Controller("account")
export class AccountController {
	constructor(
		@Inject(UsersService) private readonly usersService: UsersService,
		@Inject(PolicyRegistry) private readonly policyRegistry: PolicyRegistry,
	) {}

	@Post("password")
	async changeOwnPassword(@Req() request: RequestWithActor, @Body() body: unknown) {
		const parsedBody = ChangeOwnPasswordRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid change password payload", parsedBody.error.flatten());
		}

		return this.usersService.changeOwnPassword(this.requireActor(request), parsedBody.data);
	}

	private requireActor(request: RequestWithActor): Actor {
		const actor = request.user ? this.policyRegistry.buildActor(request.user) : null;

		if (!actor) {
			throw new AppError("UNAUTHENTICATED", "Authentication is required");
		}

		return actor;
	}
}
