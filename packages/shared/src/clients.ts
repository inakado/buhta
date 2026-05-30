import { z } from "zod";

const ClientNameSchema = z.string().trim().min(1).max(120);
const ClientPhoneSchema = z.string().trim().min(1).max(40).refine(
	(value) => normalizeClientPhone(value).length > 0,
	{ message: "Phone must contain digits" },
);
const ClientDescriptionSchema = z.string().trim().max(500).transform((value) => value === "" ? null : value);
const OptionalClientDescriptionSchema = ClientDescriptionSchema.optional();
const NormalizedPhoneSchema = z.string().regex(/^\d+$/);

export function normalizeClientPhone(phone: string): string {
	return phone.replace(/\D/g, "");
}

export const ClientSchema = z.object({
	id: z.string(),
	name: ClientNameSchema,
	phone: ClientPhoneSchema,
	phoneNormalized: NormalizedPhoneSchema,
	description: z.string().nullable(),
	createdByUserId: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type Client = z.infer<typeof ClientSchema>;

export const CreateClientRequestSchema = z.object({
	name: ClientNameSchema,
	phone: ClientPhoneSchema,
	description: OptionalClientDescriptionSchema,
});

export type CreateClientRequest = z.infer<typeof CreateClientRequestSchema>;

export const UpdateClientRequestSchema = z.object({
	name: ClientNameSchema.optional(),
	phone: ClientPhoneSchema.optional(),
	description: OptionalClientDescriptionSchema,
}).refine((value) => Object.values(value).some((field) => field !== undefined), {
	message: "At least one field must be provided",
});

export type UpdateClientRequest = z.infer<typeof UpdateClientRequestSchema>;

export const ClientResponseSchema = z.object({
	client: ClientSchema,
});

export type ClientResponse = z.infer<typeof ClientResponseSchema>;

export const ClientsListResponseSchema = z.object({
	clients: z.array(ClientSchema),
});

export type ClientsListResponse = z.infer<typeof ClientsListResponseSchema>;

export const ClientSearchQuerySchema = z.object({
	search: z.string().trim().max(100).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ClientSearchQuery = z.infer<typeof ClientSearchQuerySchema>;
