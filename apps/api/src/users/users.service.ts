import { Inject, Injectable } from "@nestjs/common";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import {
	ChangeOwnPasswordRequestSchema,
	type ChangeOwnPasswordRequest,
	type CreateUserRequest,
	type Role,
	type UserSummary,
} from "@buhta/shared";
import { auth } from "../auth/auth";
import { AppError } from "../common/errors/app-error";
import { OperationService } from "../operations/operation.service";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import { generateLoginCandidate, generateTemporaryPassword, normalizeLogin, technicalEmailForLogin } from "./login";
import { mapUserSummary } from "./user.mapper";

@Injectable()
export class UsersService {
	constructor(@Inject(OperationService) private readonly operationService: OperationService) {}

	async listUsers(): Promise<UserSummary[]> {
		const users = await prisma.user.findMany({
			orderBy: [{ username: "asc" }, { email: "asc" }],
		});

		return users.map(mapUserSummary);
	}

	async createUser(actor: Actor, input: CreateUserRequest): Promise<{ user: UserSummary; temporaryPassword: string }> {
		const login = await this.resolveUniqueLogin(input.login, input.name);
		const temporaryPassword = generateTemporaryPassword();
		const email = technicalEmailForLogin(login);

		await this.ensureLoginAvailable(login, email);

		try {
			await auth.api.createUser({
				body: {
					email,
					password: temporaryPassword,
					name: input.name,
					data: {
						role: input.role,
						username: login,
						displayUsername: login,
					},
				},
			});
		} catch (error) {
			throw this.mapAuthUserError(error, login);
		}

		const createdUser = await prisma.user.findUniqueOrThrow({
			where: { email },
		});

		await this.operationService.createAuditOperation({
			actor,
			type: "user.create",
			entityType: "user",
			entityId: createdUser.id,
			details: {
				targetUserId: createdUser.id,
				login,
				role: input.role,
			},
		});

		return {
			user: mapUserSummary(createdUser),
			temporaryPassword,
		};
	}

	async updateUserRole(actor: Actor, userId: string, role: Role): Promise<UserSummary> {
		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			throw new AppError("NOT_FOUND", "User not found", { userId });
		}

		if (existingUser.id === actor.userId) {
			throw new AppError("FORBIDDEN", "Admin cannot change own role", { userId });
		}

		const user = await prisma.user.update({
			where: { id: userId },
			data: { role },
		});

		await this.operationService.createAuditOperation({
			actor,
			type: "user.role.update",
			entityType: "user",
			entityId: user.id,
			details: {
				targetUserId: user.id,
				login: user.username ?? user.email,
				fromRole: existingUser.role,
				toRole: role,
			},
		});

		return mapUserSummary(user);
	}

	async changeOwnPassword(
		actor: Actor,
		input: ChangeOwnPasswordRequest,
	): Promise<{ user: UserSummary }> {
		const parsedInput = ChangeOwnPasswordRequestSchema.safeParse(input);

		if (!parsedInput.success) {
			throw new AppError("VALIDATION_ERROR", "Invalid change password payload", parsedInput.error.flatten());
		}

		const existingUser = await prisma.user.findUnique({
			where: { id: actor.userId },
		});

		if (!existingUser) {
			throw new AppError("UNAUTHENTICATED", "Authentication is required");
		}

		const existingCredential = await prisma.account.findFirst({
			where: {
				userId: actor.userId,
				providerId: "credential",
			},
		});

		if (!existingCredential?.password) {
			throw new AppError("FORBIDDEN", "Current password is incorrect");
		}

		const currentPasswordMatches = await verifyPassword({
			password: parsedInput.data.currentPassword,
			hash: existingCredential.password,
		});

		if (!currentPasswordMatches) {
			throw new AppError("FORBIDDEN", "Current password is incorrect");
		}

		await prisma.account.update({
			where: { id: existingCredential.id },
			data: {
				password: await hashPassword(parsedInput.data.newPassword),
			},
		});

		await this.operationService.createAuditOperation({
			actor,
			type: "user.password.change",
			entityType: "user",
			entityId: actor.userId,
			details: {
				targetUserId: actor.userId,
				login: existingUser.username ?? existingUser.email,
			},
		});

		const user = await prisma.user.findUniqueOrThrow({
			where: { id: actor.userId },
		});

		return {
			user: mapUserSummary(user),
		};
	}

	async resetUserPassword(
		actor: Actor,
		userId: string,
		headers: Headers,
	): Promise<{ user: UserSummary; temporaryPassword: string }> {
		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			throw new AppError("NOT_FOUND", "User not found", { userId });
		}

		if (existingUser.id === actor.userId) {
			throw new AppError("FORBIDDEN", "Admin cannot reset own password", { userId });
		}

		const temporaryPassword = generateTemporaryPassword();

		try {
			const existingCredential = await prisma.account.findFirst({
				where: {
					userId,
					providerId: "credential",
				},
			});

			if (existingCredential) {
				await auth.api.setUserPassword({
					body: {
						userId,
						newPassword: temporaryPassword,
					},
					headers,
				});
			}

			await this.ensureCredentialPassword(userId, temporaryPassword, existingCredential?.id);
		} catch (error) {
			throw this.mapAuthPasswordResetError(error, userId);
		}

		await this.operationService.createAuditOperation({
			actor,
			type: "user.password.reset",
			entityType: "user",
			entityId: existingUser.id,
			details: {
				targetUserId: existingUser.id,
				login: existingUser.username ?? existingUser.email,
			},
		});

		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
		});

		return {
			user: mapUserSummary(user),
			temporaryPassword,
		};
	}

	private async ensureCredentialPassword(
		userId: string,
		password: string,
		existingCredentialId?: string,
	): Promise<void> {
		const passwordHash = await hashPassword(password);

		if (existingCredentialId) {
			await prisma.account.update({
				where: { id: existingCredentialId },
				data: { password: passwordHash },
			});
			return;
		}

		await prisma.account.create({
			data: {
				id: `${userId}-credential`,
				accountId: userId,
				providerId: "credential",
				userId,
				password: passwordHash,
			},
		});
	}

	private async resolveUniqueLogin(login: string | undefined, name: string): Promise<string> {
		if (login) {
			return normalizeLogin(login);
		}

		for (let attempt = 0; attempt < 5; attempt += 1) {
			const candidate = generateLoginCandidate(name);
			const email = technicalEmailForLogin(candidate);
			const existingUser = await prisma.user.findFirst({
				where: {
					OR: [{ username: candidate }, { email }],
				},
			});

			if (!existingUser) {
				return candidate;
			}
		}

		throw new AppError("CONFLICT", "Could not generate unique login");
	}

	private async ensureLoginAvailable(login: string, email: string): Promise<void> {
		const existingUser = await prisma.user.findFirst({
			where: {
				OR: [{ username: login }, { email }],
			},
		});

		if (existingUser) {
			throw new AppError("CONFLICT", "Login already exists", { login });
		}
	}

	private mapAuthUserError(error: unknown, login: string): AppError {
		if (error instanceof AppError) {
			return error;
		}

		const message = error instanceof Error ? error.message : "Failed to create user";
		const normalizedMessage = message.toLowerCase();

		if (normalizedMessage.includes("already") || normalizedMessage.includes("unique")) {
			return new AppError("CONFLICT", "Login already exists", { login });
		}

		return new AppError("INTERNAL_ERROR", "Failed to create user", { reason: message });
	}

	private mapAuthPasswordResetError(error: unknown, userId: string): AppError {
		const message = error instanceof Error ? error.message : "Failed to reset password";

		return new AppError("INTERNAL_ERROR", "Failed to reset password", { userId, reason: message });
	}
}
