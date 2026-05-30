import { Injectable } from "@nestjs/common";
import {
	normalizeClientPhone,
	type Client,
	type ClientSearchQuery,
	type CreateClientRequest,
	type UpdateClientRequest,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { BaselineOperationType } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import { mapClient } from "./clients.mapper";

type ClientOperationInput = {
	actor: Actor;
	type: BaselineOperationType;
	entityId: string;
	details: Prisma.InputJsonValue;
};

@Injectable()
export class ClientsService {
	async listClients(query: ClientSearchQuery): Promise<Client[]> {
		const search = query.search?.trim() ?? "";
		const limit = query.limit ?? 50;
		const where = buildClientSearchWhere(search);
		const findArgs: Prisma.ClientFindManyArgs = {
			orderBy: [{ name: "asc" }, { createdAt: "desc" }],
			take: limit,
		};

		if (where) {
			findArgs.where = where;
		}

		const records = await prisma.client.findMany(findArgs);

		return records.map(mapClient);
	}

	async createClient(actor: Actor, input: CreateClientRequest): Promise<Client> {
		const phoneNormalized = this.normalizeRequiredPhone(input.phone);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const client = await tx.client.create({
					data: {
						name: input.name,
						phone: input.phone,
						phoneNormalized,
						description: normalizeDescription(input.description),
						createdByUserId: actor.userId,
					},
				});

				await this.createOperation(tx, {
					actor,
					type: "client.create",
					entityId: client.id,
					details: {
						clientId: client.id,
						name: client.name,
						phone: client.phone,
						phoneNormalized: client.phoneNormalized,
						description: client.description,
					},
				});

				return client;
			});

			return mapClient(record);
		} catch (error) {
			throw this.mapClientError(error);
		}
	}

	async updateClient(actor: Actor, clientId: string, input: UpdateClientRequest): Promise<Client> {
		const data = this.buildClientUpdateData(input);
		const details = this.buildClientUpdateDetails(clientId, input);

		try {
			const record = await prisma.$transaction(async (tx) => {
				const client = await tx.client.update({
					where: { id: clientId },
					data,
				});

				await this.createOperation(tx, {
					actor,
					type: "client.update",
					entityId: client.id,
					details,
				});

				return client;
			});

			return mapClient(record);
		} catch (error) {
			throw this.mapClientError(error, clientId);
		}
	}

	private buildClientUpdateData(input: UpdateClientRequest): Prisma.ClientUpdateInput {
		const data: Prisma.ClientUpdateInput = {};

		if (input.name !== undefined) {
			data.name = input.name;
		}

		if (input.phone !== undefined) {
			data.phone = input.phone;
			data.phoneNormalized = this.normalizeRequiredPhone(input.phone);
		}

		if (input.description !== undefined) {
			data.description = normalizeDescription(input.description);
		}

		if (Object.keys(data).length === 0) {
			throw new AppError("VALIDATION_ERROR", "At least one client field must be provided");
		}

		return data;
	}

	private buildClientUpdateDetails(clientId: string, input: UpdateClientRequest): Prisma.InputJsonObject {
		const changes: Record<string, unknown> = {};

		if (input.name !== undefined) {
			changes.name = input.name;
		}

		if (input.phone !== undefined) {
			changes.phone = input.phone;
			changes.phoneNormalized = this.normalizeRequiredPhone(input.phone);
		}

		if (input.description !== undefined) {
			changes.description = normalizeDescription(input.description);
		}

		return {
			clientId,
			changes,
		} as Prisma.InputJsonObject;
	}

	private normalizeRequiredPhone(phone: string): string {
		const phoneNormalized = normalizeClientPhone(phone);
		if (phoneNormalized.length === 0) {
			throw new AppError("VALIDATION_ERROR", "Client phone must contain digits");
		}

		return phoneNormalized;
	}

	private async createOperation(tx: Prisma.TransactionClient, input: ClientOperationInput) {
		const operation = await tx.operation.create({
			data: {
				type: input.type,
				status: OPERATION_STATUS.succeeded,
				actorUserId: input.actor.userId,
			},
		});

		await tx.auditLog.create({
			data: {
				operationId: operation.id,
				actorUserId: input.actor.userId,
				action: input.type,
				entityType: "client",
				entityId: input.entityId,
				details: input.details,
			},
		});

		return operation;
	}

	private mapClientError(error: unknown, clientId?: string): AppError {
		if (error instanceof AppError) {
			return error;
		}

		if (isPrismaErrorCode(error, "P2002")) {
			return new AppError("CONFLICT", "Клиент с таким телефоном уже существует");
		}

		if (isPrismaErrorCode(error, "P2025")) {
			return new AppError("NOT_FOUND", "Client not found", clientId ? { id: clientId } : undefined);
		}

		return new AppError("INTERNAL_ERROR", "Client operation failed", {
			reason: error instanceof Error ? error.message : String(error),
		});
	}
}

function buildClientSearchWhere(search: string): Prisma.ClientWhereInput | undefined {
	if (search.length === 0) {
		return undefined;
	}

	const digits = normalizeClientPhone(search);
	const conditions: Prisma.ClientWhereInput[] = [
		{ name: { contains: search, mode: "insensitive" } },
	];

	if (digits.length > 0) {
		conditions.push({ phoneNormalized: { contains: digits } });
	}

	return { OR: conditions };
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function normalizeDescription(description: string | null | undefined): string | null {
	const trimmed = description?.trim() ?? "";
	return trimmed.length === 0 ? null : trimmed;
}
