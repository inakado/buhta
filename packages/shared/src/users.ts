import { z } from "zod";
import { ROLES } from "./roles";

export const UserSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	role: z.enum(ROLES),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UsersListResponseSchema = z.object({
	users: z.array(UserSummarySchema),
});

export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;

export const UpdateUserRoleRequestSchema = z.object({
	role: z.enum(ROLES),
});

export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;

export const UpdateUserRoleResponseSchema = z.object({
	user: UserSummarySchema,
});

export type UpdateUserRoleResponse = z.infer<typeof UpdateUserRoleResponseSchema>;
