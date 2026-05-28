import { z } from "zod";
import { ROLES } from "./roles";

export const LoginSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(30)
	.regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, {
		message: "Login must contain lowercase latin letters, digits or hyphen and start/end with a letter or digit",
	});

export const UserSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	login: LoginSchema,
	role: z.enum(ROLES),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UsersListResponseSchema = z.object({
	users: z.array(UserSummarySchema),
});

export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;

export const CreateUserRequestSchema = z.object({
	name: z.string().trim().min(1),
	role: z.enum(ROLES),
	login: LoginSchema.optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const CreateUserResponseSchema = z.object({
	user: UserSummarySchema,
	temporaryPassword: z.string().min(1),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

export const UpdateUserRoleRequestSchema = z.object({
	role: z.enum(ROLES),
});

export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;

export const UpdateUserRoleResponseSchema = z.object({
	user: UserSummarySchema,
});

export type UpdateUserRoleResponse = z.infer<typeof UpdateUserRoleResponseSchema>;

export const ResetUserPasswordResponseSchema = z.object({
	user: UserSummarySchema,
	temporaryPassword: z.string().min(1),
});

export type ResetUserPasswordResponse = z.infer<typeof ResetUserPasswordResponseSchema>;
