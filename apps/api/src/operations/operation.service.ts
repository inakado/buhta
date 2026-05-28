import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import { OPERATION_STATUS, type BaselineOperationType } from "./operation.types";
import { IdempotencyService } from "./idempotency.service";

type CreateBaselineOperationInput = {
	actor: Actor;
	type: BaselineOperationType;
	commandName: string;
	idempotencyKey: string;
	command: unknown;
	metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class OperationService {
	constructor(private readonly idempotencyService: IdempotencyService) {}

	async createBaselineOperation(input: CreateBaselineOperationInput) {
		const requestHash = this.idempotencyService.hashRequest(input.command);
		const existing = await prisma.idempotencyRecord.findUnique({
			where: {
				actorUserId_key: {
					actorUserId: input.actor.userId,
					key: input.idempotencyKey,
				},
			},
			include: {
				operation: true,
			},
		});

		if (existing) {
			this.idempotencyService.assertSameRequest(existing.requestHash, input.command);
			return {
				operation: existing.operation,
				reused: true,
			};
		}

		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

		const operation = await prisma.$transaction(async (tx) => {
			const operationData: Prisma.OperationUncheckedCreateInput = {
				type: input.type,
				status: OPERATION_STATUS.succeeded,
				actorUserId: input.actor.userId,
				idempotencyKey: input.idempotencyKey,
			};

			if (input.metadata !== undefined) {
				operationData.metadata = input.metadata;
			}

			const createdOperation = await tx.operation.create({
				data: operationData,
			});

			const auditData: Prisma.AuditLogUncheckedCreateInput = {
				operationId: createdOperation.id,
				actorUserId: input.actor.userId,
				action: input.type,
				entityType: "operation",
				entityId: createdOperation.id,
			};

			if (input.metadata !== undefined) {
				auditData.details = input.metadata;
			}

			await tx.auditLog.create({
				data: auditData,
			});

			await tx.idempotencyRecord.create({
				data: {
					key: input.idempotencyKey,
					actorUserId: input.actor.userId,
					commandName: input.commandName,
					operationId: createdOperation.id,
					requestHash,
					expiresAt,
				},
			});

			return createdOperation;
		});

		return {
			operation,
			reused: false,
		};
	}
}
