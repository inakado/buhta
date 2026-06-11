import type { IncomingHttpHeaders } from "node:http";
import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { CreateUserRequestSchema, UpdateUserIdentityRequestSchema, UpdateUserRoleRequestSchema } from "@buhta/shared";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { UsersService } from "./users.service";

@Controller("users")
@RequirePermission("users.manage")
@UseGuards(PolicyGuard)
export class UsersController {
	constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

	@Get()
	async listUsers() {
		return {
			users: await this.usersService.listUsers(),
		};
	}

	@Post()
	async createUser(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		const parsedBody = CreateUserRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid create user payload", parsedBody.error.flatten());
		}

		return this.usersService.createUser(requireActor(actor), parsedBody.data);
	}

	@Patch(":userId/role")
	async updateUserRole(
		@CurrentActor() actor: Actor | undefined,
		@Param("userId") userId: string,
		@Body() body: unknown,
	) {
		const parsedBody = UpdateUserRoleRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid user role payload", parsedBody.error.flatten());
		}

		return {
			user: await this.usersService.updateUserRole(requireActor(actor), userId, parsedBody.data.role),
		};
	}

	@Patch(":userId/identity")
	async updateUserIdentity(
		@CurrentActor() actor: Actor | undefined,
		@Param("userId") userId: string,
		@Body() body: unknown,
	) {
		const parsedBody = UpdateUserIdentityRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid user identity payload", parsedBody.error.flatten());
		}

		return {
			user: await this.usersService.updateUserIdentity(requireActor(actor), userId, parsedBody.data),
		};
	}

	@Post(":userId/reset-password")
	async resetUserPassword(
		@CurrentActor() actor: Actor | undefined,
		@Param("userId") userId: string,
		@Req() request: { headers: IncomingHttpHeaders },
	) {
		return this.usersService.resetUserPassword(
			requireActor(actor),
			userId,
			toBetterAuthHeaders(request.headers),
		);
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Authentication is required");
	}

	return actor;
}

function toBetterAuthHeaders(headers: IncomingHttpHeaders): Headers {
	const betterAuthHeaders = new Headers();

	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) {
			continue;
		}

		betterAuthHeaders.set(key, Array.isArray(value) ? value.join(",") : value);
	}

	return betterAuthHeaders;
}
