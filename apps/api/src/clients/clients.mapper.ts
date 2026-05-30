import type { Client as ApiClient } from "@buhta/shared";
import type { Client as PrismaClient } from "../generated/prisma/client";

export function mapClient(record: PrismaClient): ApiClient {
	return {
		id: record.id,
		name: record.name,
		phone: record.phone,
		phoneNormalized: record.phoneNormalized,
		description: record.description,
		createdByUserId: record.createdByUserId,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}
