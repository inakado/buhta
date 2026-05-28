import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UpdateUserRoleRequestSchema } from "@buhta/shared";
import { AppError } from "../common/errors/app-error";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { UsersService } from "./users.service";

@Controller("users")
@RequirePermission("users.manage")
@UseGuards(PolicyGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	async listUsers() {
		return {
			users: await this.usersService.listUsers(),
		};
	}

	@Patch(":userId/role")
	async updateUserRole(@Param("userId") userId: string, @Body() body: unknown) {
		const parsedBody = UpdateUserRoleRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid user role payload", parsedBody.error.flatten());
		}

		return {
			user: await this.usersService.updateUserRole(userId, parsedBody.data.role),
		};
	}
}
