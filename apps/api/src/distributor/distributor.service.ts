import { Injectable } from "@nestjs/common";
import type {
	CreateDistributorSaleRequest,
	DistributorCashBalancesResponse,
	DistributorInventoryResponse,
	DistributorSaleOptionsResponse,
	DistributorSaleResponse,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapDistributorCashBalanceItem,
	mapDistributorCashBalanceRecord,
	mapDistributorInventoryItem,
	mapDistributorSale,
	mapDistributorSaleStockItem,
	summarizeDistributorInventory,
} from "./distributor.mapper";

@Injectable()
export class DistributorService {
	async getInventory(): Promise<DistributorInventoryResponse> {
		const balances = await prisma.distributorProductBalance.findMany({
			where: { quantity: { gt: 0 } },
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
		const items = balances.map(mapDistributorInventoryItem);
		const { summary, distributorSummaries } = summarizeDistributorInventory(items);

		return {
			summary,
			distributorSummaries,
			items,
		};
	}

	async getSaleOptions(): Promise<DistributorSaleOptionsResponse> {
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
			items: balances.map(mapDistributorSaleStockItem),
		};
	}

	async getCashBalances(): Promise<DistributorCashBalancesResponse> {
		const distributors = await prisma.distributor.findMany({
			where: {
				OR: [
					{ active: true },
					{ cashBalance: { isNot: null } },
				],
			},
			include: { cashBalance: true },
			orderBy: { name: "asc" },
		});
		const items = distributors.map((distributor) =>
			mapDistributorCashBalanceItem(distributor, distributor.cashBalance),
		);

		return {
			totalAmountCents: items.reduce((sum, item) => sum + item.amountCents, 0),
			items,
		};
	}

	async createDistributorSale(
		actor: Actor,
		input: CreateDistributorSaleRequest,
	): Promise<DistributorSaleResponse> {
		const comment = input.comment?.trim();
		const result = await prisma.$transaction(async (tx) => {
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

			const client = await tx.client.findUnique({ where: { id: input.clientId } });
			if (!client) {
				throw new AppError("NOT_FOUND", "Client not found", { id: input.clientId });
			}

			const cashBalanceBefore = await tx.distributorCashBalance.findUnique({
				where: { distributorId: balanceBefore.distributorId },
			});
			const cashBalanceBeforeAmount = cashBalanceBefore?.amountCents ?? 0;

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

			const balanceAfter = await tx.distributorProductBalance.findUniqueOrThrow({
				where: { id: input.distributorProductBalanceId },
				include: {
					distributor: true,
					productBatch: true,
				},
			});
			const unitPriceCents = balanceBefore.productBatch.priceCents;
			const totalCents = input.quantity * unitPriceCents;

			const cashBalanceAfter = input.paymentMethod === "cash"
				? await tx.distributorCashBalance.upsert({
					where: { distributorId: balanceBefore.distributorId },
					create: {
						distributorId: balanceBefore.distributorId,
						amountCents: totalCents,
					},
					update: {
						amountCents: { increment: totalCents },
					},
					include: { distributor: true },
				})
				: cashBalanceBefore
					? await tx.distributorCashBalance.findUniqueOrThrow({
						where: { distributorId: balanceBefore.distributorId },
						include: { distributor: true },
					})
					: null;
			const cashBalanceAfterAmount = cashBalanceAfter?.amountCents ?? cashBalanceBeforeAmount;

			const operation = await tx.operation.create({
				data: {
					type: "distributor.sale.create",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const saleData: Prisma.DistributorSaleUncheckedCreateInput = {
				distributorProductBalanceId: input.distributorProductBalanceId,
				distributorId: balanceBefore.distributorId,
				productBatchId: balanceBefore.productBatchId,
				clientId: input.clientId,
				quantity: input.quantity,
				unitPriceCents,
				totalCents,
				paymentMethod: input.paymentMethod,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (comment !== undefined) {
				saleData.comment = comment;
			}

			const sale = await tx.distributorSale.create({
				data: saleData,
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "distributor.sale.create",
					entityType: "distributor_sale",
					entityId: sale.id,
					details: {
						distributorSaleId: sale.id,
						distributorProductBalanceId: input.distributorProductBalanceId,
						distributorId: balanceBefore.distributorId,
						distributorName: balanceBefore.distributor.name,
						productBatchId: balanceBefore.productBatchId,
						productName: balanceBefore.productBatch.productName,
						clientId: input.clientId,
						quantity: input.quantity,
						unitPriceCents,
						totalCents,
						paymentMethod: input.paymentMethod,
						stockBalanceBefore: balanceBefore.quantity,
						stockBalanceAfter: balanceAfter.quantity,
						cashBalanceBefore: cashBalanceBeforeAmount,
						cashBalanceAfter: cashBalanceAfterAmount,
						comment: comment ?? null,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				sale,
				balanceAfter,
				cashBalanceAfter,
				distributor: balanceBefore.distributor,
			};
		});

		const cashBalance = result.cashBalanceAfter
			? mapDistributorCashBalanceRecord(result.cashBalanceAfter)
			: mapDistributorCashBalanceItem(result.distributor, null);

		return {
			sale: mapDistributorSale(result.sale),
			distributorProductBalance: mapDistributorInventoryItem(result.balanceAfter),
			cashBalance,
		};
	}
}
