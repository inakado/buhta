import { Injectable } from "@nestjs/common";
import type {
	CourierLoadOptionsResponse,
	CourierLoadResponse,
	CourierProductBalancesResponse,
	CreateCourierLoadRequest,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapCourierLoad,
	mapCourierLoadOption,
	mapCourierProductBalanceItem,
	mapDistributorBalanceAfter,
	summarizeCourierProductBalances,
} from "./courier.mapper";

@Injectable()
export class CourierService {
	async getLoadOptions(): Promise<CourierLoadOptionsResponse> {
		const balances = await prisma.distributorProductBalance.findMany({
			where: {
				quantity: { gt: 0 },
				distributor: { active: true },
			},
			include: {
				distributor: true,
				productBatch: true,
			},
			orderBy: [
				{ distributor: { name: "asc" } },
				{ productBatch: { productName: "asc" } },
				{ updatedAt: "desc" },
			],
		});

		return {
			items: balances.map(mapCourierLoadOption),
		};
	}

	async getProductBalances(actor: Actor): Promise<CourierProductBalancesResponse> {
		if (!canReadBalances(actor.role)) {
			throw new AppError("FORBIDDEN", "Courier product balances are not available for this role");
		}

		const balances = await prisma.courierProductBalance.findMany({
			where: {
				quantity: { gt: 0 },
				...(actor.role === "courier" ? { courierUserId: actor.userId } : {}),
			},
			include: {
				courier: true,
				productBatch: true,
			},
			orderBy: [
				{ courier: { name: "asc" } },
				{ productBatch: { productName: "asc" } },
				{ updatedAt: "desc" },
			],
		});
		const items = balances.map(mapCourierProductBalanceItem);
		const { summary, courierSummaries } = summarizeCourierProductBalances(items);

		return {
			summary,
			courierSummaries,
			items,
		};
	}

	async createCourierLoad(actor: Actor, input: CreateCourierLoadRequest): Promise<CourierLoadResponse> {
		const targetCourierUserId = resolveTargetCourierUserId(actor, input);
		const comment = input.comment?.trim() || undefined;

		const result = await prisma.$transaction(async (tx) => {
			const courier = await tx.user.findUnique({
				where: { id: targetCourierUserId },
			});
			if (!courier) {
				throw new AppError("NOT_FOUND", "Courier user not found", { id: targetCourierUserId });
			}
			if (courier.role !== "courier") {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Target user is not a courier", {
					id: targetCourierUserId,
					role: courier.role,
				});
			}

			const balanceBefore = await tx.distributorProductBalance.findUnique({
				where: { id: input.distributorProductBalanceId },
				include: {
					distributor: true,
					productBatch: true,
				},
			});
			if (!balanceBefore) {
				throw new AppError("NOT_FOUND", "Distributor product balance not found", {
					id: input.distributorProductBalanceId,
				});
			}
			if (!balanceBefore.distributor.active) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor is inactive", {
					id: balanceBefore.distributorId,
				});
			}

			const decrement = await tx.distributorProductBalance.updateMany({
				where: {
					id: input.distributorProductBalanceId,
					quantity: { gte: input.quantity },
				},
				data: {
					quantity: { decrement: input.quantity },
				},
			});
			if (decrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough distributor product balance", {
					distributorProductBalanceId: input.distributorProductBalanceId,
				});
			}

			const distributorBalanceAfter = await tx.distributorProductBalance.findUniqueOrThrow({
				where: { id: input.distributorProductBalanceId },
				include: {
					distributor: true,
					productBatch: true,
				},
			});
			const courierBalanceAfter = await tx.courierProductBalance.upsert({
				where: {
					courierUserId_productBatchId: {
						courierUserId: targetCourierUserId,
						productBatchId: balanceBefore.productBatchId,
					},
				},
				create: {
					courierUserId: targetCourierUserId,
					productBatchId: balanceBefore.productBatchId,
					quantity: input.quantity,
				},
				update: {
					quantity: { increment: input.quantity },
				},
				include: {
					courier: true,
					productBatch: true,
				},
			});
			const distributorBalanceBefore = distributorBalanceAfter.quantity + input.quantity;
			const courierBalanceBefore = courierBalanceAfter.quantity - input.quantity;

			const operation = await tx.operation.create({
				data: {
					type: "courier.stock.load.create",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const loadData: Prisma.CourierLoadUncheckedCreateInput = {
				courierUserId: targetCourierUserId,
				distributorProductBalanceId: input.distributorProductBalanceId,
				distributorId: balanceBefore.distributorId,
				productBatchId: balanceBefore.productBatchId,
				quantity: input.quantity,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (comment !== undefined) {
				loadData.comment = comment;
			}

			const load = await tx.courierLoad.create({
				data: loadData,
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "courier.stock.load.create",
					entityType: "courier_load",
					entityId: load.id,
					details: {
						courierLoadId: load.id,
						courierUserId: targetCourierUserId,
						courierLogin: courier.username ?? courier.displayUsername ?? courier.email ?? courier.id,
						distributorProductBalanceId: input.distributorProductBalanceId,
						distributorId: balanceBefore.distributorId,
						distributorName: balanceBefore.distributor.name,
						productBatchId: balanceBefore.productBatchId,
						productName: balanceBefore.productBatch.productName,
						unitPriceCents: balanceBefore.productBatch.priceCents,
						quantity: input.quantity,
						distributorBalanceBefore,
						distributorBalanceAfter: distributorBalanceAfter.quantity,
						courierBalanceBefore,
						courierBalanceAfter: courierBalanceAfter.quantity,
						comment: comment ?? null,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				load,
				distributorBalanceAfter,
				courierBalanceAfter,
			};
		});

		return {
			load: mapCourierLoad(result.load),
			distributorProductBalance: mapDistributorBalanceAfter(result.distributorBalanceAfter),
			courierProductBalance: mapCourierProductBalanceItem(result.courierBalanceAfter),
		};
	}
}

function canReadBalances(role: Actor["role"]): boolean {
	return role === "admin" || role === "director" || role === "commercial_manager" || role === "courier";
}

function resolveTargetCourierUserId(actor: Actor, input: CreateCourierLoadRequest): string {
	if (actor.role === "courier") {
		if (input.courierUserId !== undefined) {
			throw new AppError("VALIDATION_ERROR", "Courier cannot choose a courier user for self load");
		}

		return actor.userId;
	}

	if (actor.role === "admin") {
		if (!input.courierUserId) {
			throw new AppError("VALIDATION_ERROR", "courierUserId is required for admin courier load");
		}

		return input.courierUserId;
	}

	throw new AppError("FORBIDDEN", "Only courier can load product to own balance");
}
