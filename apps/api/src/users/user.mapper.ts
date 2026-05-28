import { isRole, type UserSummary } from "@buhta/shared";
import type { User } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";

export function mapUserSummary(user: User): UserSummary {
	if (!isRole(user.role)) {
		throw new AppError("INTERNAL_ERROR", "User has unsupported role", {
			userId: user.id,
			role: user.role,
		});
	}

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}
