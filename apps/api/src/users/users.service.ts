import { Injectable } from "@nestjs/common";
import type { Role, UserSummary } from "@buhta/shared";
import { AppError } from "../common/errors/app-error";
import { prisma } from "../prisma/client";
import { mapUserSummary } from "./user.mapper";

@Injectable()
export class UsersService {
	async listUsers(): Promise<UserSummary[]> {
		const users = await prisma.user.findMany({
			orderBy: [{ email: "asc" }],
		});

		return users.map(mapUserSummary);
	}

	async updateUserRole(userId: string, role: Role): Promise<UserSummary> {
		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			throw new AppError("NOT_FOUND", "User not found", { userId });
		}

		const user = await prisma.user.update({
			where: { id: userId },
			data: { role },
		});

		return mapUserSummary(user);
	}
}
