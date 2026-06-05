import { Injectable } from "@nestjs/common";
import type {
	AssignDistributorDiscountRequest,
	AssignDistributorDiscountResponse,
	CancelDistributorSaleRequest,
	CancelDistributorSaleResponse,
	CreateDistributorCashWithdrawalRequest,
	CreateDistributorSaleRequest,
	DistributorCashBalancesResponse,
	DistributorCashWithdrawalResponse,
	DistributorInventoryResponse,
	DistributorRecentSalesResponse,
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
	mapDistributorCashWithdrawal,
	mapDistributorInventoryItem,
	mapCancelDistributorSaleResponse,
	mapDistributorRecentSale,
	mapDistributorSale,
	mapDistributorSaleStockItem,
	mapProductDiscountAssignment,
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
		const items = balances.filter(hasLoadedProductBatch).map(mapDistributorInventoryItem);
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
			items: balances.filter(hasLoadedProductBatch).map(mapDistributorSaleStockItem),
		};
	}

	async getRecentSales(limit = 10): Promise<DistributorRecentSalesResponse> {
		const take = clampRecentSalesLimit(limit);
		const sales = await prisma.distributorSale.findMany({
			take,
			include: {
				productBatch: true,
				client: true,
				operation: {
					include: { actor: true },
				},
				cancellation: {
					include: { actor: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return {
			items: sales.map(mapDistributorRecentSale),
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

	async createCashWithdrawal(
		actor: Actor,
		input: CreateDistributorCashWithdrawalRequest,
	): Promise<DistributorCashWithdrawalResponse> {
		const comment = input.comment?.trim();
		const normalizedComment = comment ? comment : null;
		const result = await prisma.$transaction(async (tx) => {
			const distributor = await tx.distributor.findUnique({
				where: { id: input.distributorId },
			});
			if (!distributor) {
				throw new AppError("NOT_FOUND", "Distributor not found", { id: input.distributorId });
			}
			if (!distributor.active) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor is inactive", {
					id: input.distributorId,
				});
			}

			const decrement = await tx.distributorCashBalance.updateMany({
				where: {
					distributorId: input.distributorId,
					amountCents: { gte: input.amountCents },
				},
				data: {
					amountCents: { decrement: input.amountCents },
				},
			});
			if (decrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough distributor cash balance", {
					distributorId: input.distributorId,
				});
			}

			const cashBalanceAfter = await tx.distributorCashBalance.findUniqueOrThrow({
				where: { distributorId: input.distributorId },
				include: { distributor: true },
			});
			const cashBalanceAfterAmount = cashBalanceAfter.amountCents;
			const cashBalanceBeforeAmount = cashBalanceAfterAmount + input.amountCents;

			const operation = await tx.operation.create({
				data: {
					type: "distributor.cash.withdraw",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const withdrawal = await tx.distributorCashWithdrawal.create({
				data: {
					distributorId: input.distributorId,
					amountCents: input.amountCents,
					comment: normalizedComment,
					operationId: operation.id,
					actorUserId: actor.userId,
				},
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "distributor.cash.withdraw",
					entityType: "distributor_cash_withdrawal",
					entityId: withdrawal.id,
					details: {
						distributorCashWithdrawalId: withdrawal.id,
						distributorId: input.distributorId,
						distributorName: cashBalanceAfter.distributor.name,
						amountCents: input.amountCents,
						cashBalanceBefore: cashBalanceBeforeAmount,
						cashBalanceAfter: cashBalanceAfterAmount,
						comment: normalizedComment,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				withdrawal,
				cashBalanceAfter,
			};
		});

		return {
			withdrawal: mapDistributorCashWithdrawal(result.withdrawal),
			cashBalance: mapDistributorCashBalanceRecord(result.cashBalanceAfter),
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
			const baseUnitPriceCents = balanceBefore.productBatch.priceCents;
			const unitPriceCents = balanceBefore.unitPriceCents;
			const discountCentsPerUnit = Math.max(baseUnitPriceCents - unitPriceCents, 0);
			const discountTotalCents = input.quantity * discountCentsPerUnit;
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
				baseUnitPriceCents,
				unitPriceCents,
				discountCentsPerUnit,
				discountTotalCents,
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
						baseUnitPriceCents,
						unitPriceCents,
						discountCentsPerUnit,
						discountTotalCents,
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

	async cancelDistributorSale(
		actor: Actor,
		saleId: string,
		input: CancelDistributorSaleRequest,
	): Promise<CancelDistributorSaleResponse> {
		const reason = input.reason.trim();

		try {
			const result = await prisma.$transaction(async (tx) => {
				const sale = await tx.distributorSale.findUnique({
					where: { id: saleId },
					include: {
						distributor: true,
						productBatch: true,
						client: true,
						cancellation: true,
					},
				});
				if (!sale) {
					throw new AppError("NOT_FOUND", "Distributor sale not found", { id: saleId });
				}
				if (sale.cancellation) {
					throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor sale is already cancelled", {
						distributorSaleId: saleId,
					});
				}

				const operation = await tx.operation.create({
					data: {
						type: "distributor.sale.cancel",
						status: OPERATION_STATUS.succeeded,
						actorUserId: actor.userId,
					},
				});

				const cancellation = await tx.distributorSaleCancellation.create({
					data: {
						distributorSaleId: sale.id,
						distributorProductBalanceId: sale.distributorProductBalanceId,
						distributorId: sale.distributorId,
						productBatchId: sale.productBatchId,
						clientId: sale.clientId,
						quantity: sale.quantity,
						baseUnitPriceCents: sale.baseUnitPriceCents,
						unitPriceCents: sale.unitPriceCents,
						discountCentsPerUnit: sale.discountCentsPerUnit,
						discountTotalCents: sale.discountTotalCents,
						totalCents: sale.totalCents,
						paymentMethod: sale.paymentMethod,
						reason,
						operationId: operation.id,
						actorUserId: actor.userId,
					},
				});

				let cashBalanceAfter = null;
				let cashBalanceBeforeAmount: number | null = null;
				let cashBalanceAfterAmount: number | null = null;
				if (sale.paymentMethod === "cash") {
					const cashDecrement = await tx.distributorCashBalance.updateMany({
						where: {
							distributorId: sale.distributorId,
							amountCents: { gte: sale.totalCents },
						},
						data: {
							amountCents: { decrement: sale.totalCents },
						},
					});
					if (cashDecrement.count !== 1) {
						throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough distributor cash balance to cancel sale", {
							distributorId: sale.distributorId,
							distributorSaleId: sale.id,
						});
					}
					cashBalanceAfter = await tx.distributorCashBalance.findUniqueOrThrow({
						where: { distributorId: sale.distributorId },
						include: { distributor: true },
					});
					cashBalanceAfterAmount = cashBalanceAfter.amountCents;
					cashBalanceBeforeAmount = cashBalanceAfterAmount + sale.totalCents;
				} else {
					cashBalanceAfter = await tx.distributorCashBalance.findUnique({
						where: { distributorId: sale.distributorId },
						include: { distributor: true },
					});
					cashBalanceAfterAmount = cashBalanceAfter?.amountCents ?? null;
					cashBalanceBeforeAmount = cashBalanceAfterAmount;
				}

				await tx.distributorProductBalance.update({
					where: { id: sale.distributorProductBalanceId },
					data: { quantity: { increment: sale.quantity } },
				});
				const productBalanceAfter = await tx.distributorProductBalance.findUniqueOrThrow({
					where: { id: sale.distributorProductBalanceId },
					include: {
						distributor: true,
						productBatch: true,
					},
				});
				const productBalanceAfterQuantity = productBalanceAfter.quantity;
				const productBalanceBeforeQuantity = productBalanceAfterQuantity - sale.quantity;

				await tx.auditLog.create({
					data: {
						operationId: operation.id,
						actorUserId: actor.userId,
						action: "distributor.sale.cancel",
						entityType: "distributor_sale_cancellation",
						entityId: cancellation.id,
						details: {
							distributorSaleCancellationId: cancellation.id,
							distributorSaleId: sale.id,
							originalSaleOperationId: sale.operationId,
							distributorProductBalanceId: sale.distributorProductBalanceId,
							distributorId: sale.distributorId,
							distributorName: sale.distributor.name,
							productBatchId: sale.productBatchId,
							productName: sale.productBatch.productName,
							clientId: sale.clientId,
							quantity: sale.quantity,
							baseUnitPriceCents: sale.baseUnitPriceCents,
							unitPriceCents: sale.unitPriceCents,
							discountCentsPerUnit: sale.discountCentsPerUnit,
							discountTotalCents: sale.discountTotalCents,
							totalCents: sale.totalCents,
							paymentMethod: sale.paymentMethod,
							productBalanceBefore: productBalanceBeforeQuantity,
							productBalanceAfter: productBalanceAfterQuantity,
							cashBalanceBefore: cashBalanceBeforeAmount,
							cashBalanceAfter: cashBalanceAfterAmount,
							reason,
						} satisfies Prisma.InputJsonValue,
					},
				});

				return {
					cancellation,
					distributorProductBalance: productBalanceAfter,
					cashBalance: cashBalanceAfter,
					distributor: sale.distributor,
				};
			});

			return mapCancelDistributorSaleResponse(result);
		} catch (error) {
			if (isPrismaErrorCode(error, "P2002")) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor sale is already cancelled", {
					distributorSaleId: saleId,
				});
			}
			throw error;
		}
	}

	async assignDiscount(
		actor: Actor,
		input: AssignDistributorDiscountRequest,
	): Promise<AssignDistributorDiscountResponse> {
		const comment = input.comment?.trim();
		const normalizedComment = comment ? comment : null;
		const result = await prisma.$transaction(async (tx) => {
			const sourceBefore = await tx.distributorProductBalance.findUnique({
				where: { id: input.distributorProductBalanceId },
				include: {
					distributor: true,
					productBatch: true,
				},
			});
			if (!sourceBefore) {
				throw new AppError("NOT_FOUND", "Distributor product balance not found", {
					id: input.distributorProductBalanceId,
				});
			}
			if (!sourceBefore.distributor.active) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor is inactive", {
					id: sourceBefore.distributorId,
				});
			}
			if (input.discountedUnitPriceCents >= sourceBefore.unitPriceCents) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Discounted price must be lower than current stock price", {
					sourceUnitPriceCents: sourceBefore.unitPriceCents,
					discountedUnitPriceCents: input.discountedUnitPriceCents,
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

			const sourceAfter = await tx.distributorProductBalance.findUniqueOrThrow({
				where: { id: input.distributorProductBalanceId },
				include: {
					distributor: true,
					productBatch: true,
				},
			});
			const discountedAfter = await tx.distributorProductBalance.upsert({
				where: {
					distributorId_productBatchId_unitPriceCents: {
						distributorId: sourceBefore.distributorId,
						productBatchId: sourceBefore.productBatchId,
						unitPriceCents: input.discountedUnitPriceCents,
					},
				},
				create: {
					distributorId: sourceBefore.distributorId,
					productBatchId: sourceBefore.productBatchId,
					unitPriceCents: input.discountedUnitPriceCents,
					quantity: input.quantity,
				},
				update: {
					quantity: { increment: input.quantity },
				},
				include: {
					distributor: true,
					productBatch: true,
				},
			});

			const sourceQuantityAfter = sourceAfter.quantity;
			const sourceQuantityBefore = sourceQuantityAfter + input.quantity;
			const discountedQuantityAfter = discountedAfter.quantity;
			const discountedQuantityBefore = discountedQuantityAfter - input.quantity;
			const baseUnitPriceCents = sourceBefore.productBatch.priceCents;
			const sourceUnitPriceCents = sourceBefore.unitPriceCents;
			const discountedUnitPriceCents = input.discountedUnitPriceCents;
			const discountCentsPerUnit = baseUnitPriceCents - discountedUnitPriceCents;
			const stepDiscountCentsPerUnit = sourceUnitPriceCents - discountedUnitPriceCents;
			const discountTotalCents = input.quantity * discountCentsPerUnit;

			const operation = await tx.operation.create({
				data: {
					type: "distributor.discount.assign",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const discount = await tx.productDiscountAssignment.create({
				data: {
					sourceDistributorProductBalanceId: sourceBefore.id,
					discountedDistributorProductBalanceId: discountedAfter.id,
					distributorId: sourceBefore.distributorId,
					productBatchId: sourceBefore.productBatchId,
					quantity: input.quantity,
					baseUnitPriceCents,
					sourceUnitPriceCents,
					discountedUnitPriceCents,
					discountCentsPerUnit,
					stepDiscountCentsPerUnit,
					discountTotalCents,
					comment: normalizedComment,
					operationId: operation.id,
					actorUserId: actor.userId,
				},
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "distributor.discount.assign",
					entityType: "product_discount_assignment",
					entityId: discount.id,
					details: {
						productDiscountAssignmentId: discount.id,
						sourceDistributorProductBalanceId: sourceBefore.id,
						discountedDistributorProductBalanceId: discountedAfter.id,
						distributorId: sourceBefore.distributorId,
						distributorName: sourceBefore.distributor.name,
						productBatchId: sourceBefore.productBatchId,
						productName: sourceBefore.productBatch.productName,
						quantity: input.quantity,
						baseUnitPriceCents,
						sourceUnitPriceCents,
						discountedUnitPriceCents,
						discountCentsPerUnit,
						stepDiscountCentsPerUnit,
						discountTotalCents,
						sourceQuantityBefore,
						sourceQuantityAfter,
						discountedQuantityBefore,
						discountedQuantityAfter,
						comment: normalizedComment,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				discount,
				sourceAfter,
				discountedAfter,
			};
		});

		return {
			discount: mapProductDiscountAssignment(result.discount),
			sourceBalance: mapDistributorInventoryItem(result.sourceAfter),
			discountedBalance: mapDistributorInventoryItem(result.discountedAfter),
		};
	}
}

function hasLoadedProductBatch<T extends { productBatch: unknown }>(
	record: T,
): record is T & { productBatch: NonNullable<T["productBatch"]> } {
	return record.productBatch !== null;
}

function clampRecentSalesLimit(limit: number): number {
	if (!Number.isFinite(limit) || limit <= 0) {
		return 10;
	}

	return Math.min(Math.floor(limit), 50);
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
	return typeof error === "object"
		&& error !== null
		&& "code" in error
		&& (error as { code?: unknown }).code === code;
}
