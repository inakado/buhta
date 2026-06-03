import { Injectable } from "@nestjs/common";
import type {
	CourierCashBalancesResponse,
	CourierLoadOptionsResponse,
	CourierLoadResponse,
	CourierProductBalancesResponse,
	CourierSaleOptionsResponse,
	CourierSaleResponse,
	CourierUnloadOptionsResponse,
	CourierUnloadResponse,
	CreateCourierLoadRequest,
	CreateCourierSaleRequest,
	CreateCourierUnloadRequest,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapCourierLoad,
	mapCourierLoadOption,
	mapCourierCashBalanceItem,
	mapCourierProductBalanceItem,
	mapCourierSale,
	mapCourierSaleOption,
	mapCourierUnload,
	mapCourierUnloadDistributorCashBalance,
	mapCourierUnloadDistributorOption,
	mapCourierUnloadDistributorProductBalance,
	mapCourierUnloadItem,
	mapCourierUnloadProductOption,
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

	async getSaleOptions(actor: Actor): Promise<CourierSaleOptionsResponse> {
		if (!canCreateCourierSale(actor.role)) {
			throw new AppError("FORBIDDEN", "Courier sale options are not available for this role");
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

		return {
			items: balances.map(mapCourierSaleOption),
		};
	}

	async getCashBalances(actor: Actor): Promise<CourierCashBalancesResponse> {
		if (!canReadCashBalances(actor.role)) {
			throw new AppError("FORBIDDEN", "Courier cash balances are not available for this role");
		}

		const couriers = await prisma.user.findMany({
			where: actor.role === "courier"
				? { id: actor.userId, role: "courier" }
				: { role: "courier" },
			include: { courierCashBalance: true },
			orderBy: { name: "asc" },
		});
		const items = couriers.map((courier) => mapCourierCashBalanceItem(courier, courier.courierCashBalance));

		return {
			totalAmountCents: items.reduce((sum, item) => sum + item.amountCents, 0),
			courierCount: items.length,
			items,
		};
	}

	async getUnloadOptions(actor: Actor): Promise<CourierUnloadOptionsResponse> {
		if (actor.role !== "courier") {
			throw new AppError("FORBIDDEN", "Courier unload options are available only for courier self-flow");
		}

		const [distributors, balances, courier] = await Promise.all([
			prisma.distributor.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			prisma.courierProductBalance.findMany({
				where: {
					courierUserId: actor.userId,
					quantity: { gt: 0 },
				},
				include: {
					courier: true,
					productBatch: true,
				},
				orderBy: [
					{ productBatch: { productName: "asc" } },
					{ updatedAt: "desc" },
				],
			}),
			prisma.user.findUnique({
				where: { id: actor.userId },
				include: { courierCashBalance: true },
			}),
		]);

		if (!courier) {
			throw new AppError("NOT_FOUND", "Courier user not found", { id: actor.userId });
		}

		return {
			distributors: distributors.map(mapCourierUnloadDistributorOption),
			productItems: balances.map(mapCourierUnloadProductOption),
			cashBalance: mapCourierCashBalanceItem(courier, courier.courierCashBalance),
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

	async createCourierSale(actor: Actor, input: CreateCourierSaleRequest): Promise<CourierSaleResponse> {
		const targetCourierUserId = resolveSaleTargetCourierUserId(actor, input);
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

			const balanceBefore = await tx.courierProductBalance.findUnique({
				where: { id: input.courierProductBalanceId },
				include: {
					courier: true,
					productBatch: true,
				},
			});
			if (!balanceBefore) {
				throw new AppError("NOT_FOUND", "Courier product balance not found", {
					id: input.courierProductBalanceId,
				});
			}
			if (balanceBefore.courierUserId !== targetCourierUserId) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Courier product balance belongs to another courier", {
					courierProductBalanceId: input.courierProductBalanceId,
					courierUserId: targetCourierUserId,
				});
			}

			const client = await tx.client.findUnique({ where: { id: input.clientId } });
			if (!client) {
				throw new AppError("NOT_FOUND", "Client not found", { id: input.clientId });
			}

			const decrement = await tx.courierProductBalance.updateMany({
				where: {
					id: input.courierProductBalanceId,
					courierUserId: targetCourierUserId,
					quantity: { gte: input.quantity },
				},
				data: {
					quantity: { decrement: input.quantity },
				},
			});
			if (decrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough courier product balance", {
					courierProductBalanceId: input.courierProductBalanceId,
				});
			}

			const courierBalanceAfter = await tx.courierProductBalance.findUniqueOrThrow({
				where: { id: input.courierProductBalanceId },
				include: {
					courier: true,
					productBatch: true,
				},
			});
			const courierStockBalanceAfter = courierBalanceAfter.quantity;
			const courierStockBalanceBefore = courierStockBalanceAfter + input.quantity;
			const unitPriceCents = balanceBefore.productBatch.priceCents;
			const totalCents = input.quantity * unitPriceCents;

			const cashResult = input.paymentMethod === "cash"
				? await incrementCourierCashBalance(tx, targetCourierUserId, totalCents)
				: await readCourierCashBalance(tx, targetCourierUserId);

			const operation = await tx.operation.create({
				data: {
					type: "courier.sale.create",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const saleData: Prisma.CourierSaleUncheckedCreateInput = {
				courierProductBalanceId: input.courierProductBalanceId,
				courierUserId: targetCourierUserId,
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

			const sale = await tx.courierSale.create({
				data: saleData,
			});

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "courier.sale.create",
					entityType: "courier_sale",
					entityId: sale.id,
					details: {
						courierSaleId: sale.id,
						courierProductBalanceId: input.courierProductBalanceId,
						courierUserId: targetCourierUserId,
						courierLogin: courier.username ?? courier.displayUsername ?? courier.email ?? courier.id,
						productBatchId: balanceBefore.productBatchId,
						productName: balanceBefore.productBatch.productName,
						clientId: input.clientId,
						quantity: input.quantity,
						unitPriceCents,
						totalCents,
						paymentMethod: input.paymentMethod,
						courierStockBalanceBefore,
						courierStockBalanceAfter,
						courierCashBalanceBefore: cashResult.beforeAmountCents,
						courierCashBalanceAfter: cashResult.afterAmountCents,
						comment: comment ?? null,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				sale,
				courier,
				courierBalanceAfter,
				cashBalanceAfter: cashResult.balance,
			};
		});

		return {
			sale: mapCourierSale(result.sale),
			courierProductBalance: mapCourierProductBalanceItem(result.courierBalanceAfter),
			cashBalance: mapCourierCashBalanceItem(result.courier, result.cashBalanceAfter),
		};
	}

	async createCourierUnload(actor: Actor, input: CreateCourierUnloadRequest): Promise<CourierUnloadResponse> {
		const targetCourierUserId = resolveUnloadTargetCourierUserId(actor, input);
		const comment = input.comment?.trim() || undefined;
		assertValidUnloadRequest(input);

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

			const productResults = [];
			for (const item of input.items) {
				const balanceBefore = await tx.courierProductBalance.findUnique({
					where: { id: item.courierProductBalanceId },
					include: {
						courier: true,
						productBatch: true,
					},
				});
				if (!balanceBefore) {
					throw new AppError("NOT_FOUND", "Courier product balance not found", {
						id: item.courierProductBalanceId,
					});
				}
				if (balanceBefore.courierUserId !== targetCourierUserId) {
					throw new AppError("DOMAIN_RULE_VIOLATION", "Courier product balance belongs to another courier", {
						courierProductBalanceId: item.courierProductBalanceId,
						courierUserId: targetCourierUserId,
					});
				}

				const decrement = await tx.courierProductBalance.updateMany({
					where: {
						id: item.courierProductBalanceId,
						courierUserId: targetCourierUserId,
						quantity: { gte: item.quantity },
					},
					data: {
						quantity: { decrement: item.quantity },
					},
				});
				if (decrement.count !== 1) {
					throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough courier product balance", {
						courierProductBalanceId: item.courierProductBalanceId,
					});
				}

				const courierBalanceAfter = await tx.courierProductBalance.findUniqueOrThrow({
					where: { id: item.courierProductBalanceId },
					include: {
						courier: true,
						productBatch: true,
					},
				});
				const distributorBalanceAfter = await tx.distributorProductBalance.upsert({
					where: {
						distributorId_productBatchId: {
							distributorId: input.distributorId,
							productBatchId: balanceBefore.productBatchId,
						},
					},
					create: {
						distributorId: input.distributorId,
						productBatchId: balanceBefore.productBatchId,
						quantity: item.quantity,
					},
					update: {
						quantity: { increment: item.quantity },
					},
					include: {
						distributor: true,
						productBatch: true,
					},
				});
				const unitPriceCents = balanceBefore.productBatch.priceCents;
				const stockValueCents = item.quantity * unitPriceCents;

				productResults.push({
					inputItem: item,
					productBatchId: balanceBefore.productBatchId,
					productName: balanceBefore.productBatch.productName,
					unitPriceCents,
					stockValueCents,
					courierBalanceBefore: courierBalanceAfter.quantity + item.quantity,
					courierBalanceAfter,
					distributorBalanceBefore: distributorBalanceAfter.quantity - item.quantity,
					distributorBalanceAfter,
				});
			}

			const cashResult = input.cashAmountCents > 0
				? await moveCashFromCourierToDistributor(
					tx,
					targetCourierUserId,
					input.distributorId,
					input.cashAmountCents,
				)
				: await readUnloadCashBalances(tx, targetCourierUserId, input.distributorId);

			const operation = await tx.operation.create({
				data: {
					type: "courier.unload.create",
					status: OPERATION_STATUS.succeeded,
					actorUserId: actor.userId,
				},
			});

			const unloadData: Prisma.CourierUnloadUncheckedCreateInput = {
				courierUserId: targetCourierUserId,
				distributorId: input.distributorId,
				cashAmountCents: input.cashAmountCents,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (comment !== undefined) {
				unloadData.comment = comment;
			}
			const unload = await tx.courierUnload.create({ data: unloadData });

			const unloadItems = [];
			for (const productResult of productResults) {
				const unloadItem = await tx.courierUnloadItem.create({
					data: {
						courierUnloadId: unload.id,
						courierProductBalanceId: productResult.inputItem.courierProductBalanceId,
						distributorProductBalanceId: productResult.distributorBalanceAfter.id,
						productBatchId: productResult.productBatchId,
						quantity: productResult.inputItem.quantity,
						unitPriceCents: productResult.unitPriceCents,
						stockValueCents: productResult.stockValueCents,
					},
				});
				unloadItems.push(unloadItem);
			}

			await tx.auditLog.create({
				data: {
					operationId: operation.id,
					actorUserId: actor.userId,
					action: "courier.unload.create",
					entityType: "courier_unload",
					entityId: unload.id,
					details: {
						courierUnloadId: unload.id,
						courierUserId: targetCourierUserId,
						courierLogin: courier.username ?? courier.displayUsername ?? courier.email ?? courier.id,
						distributorId: input.distributorId,
						distributorName: distributor.name,
						items: productResults.map((productResult) => ({
							courierProductBalanceId: productResult.inputItem.courierProductBalanceId,
							distributorProductBalanceId: productResult.distributorBalanceAfter.id,
							productBatchId: productResult.productBatchId,
							productName: productResult.productName,
							quantity: productResult.inputItem.quantity,
							unitPriceCents: productResult.unitPriceCents,
							stockValueCents: productResult.stockValueCents,
							courierBalanceBefore: productResult.courierBalanceBefore,
							courierBalanceAfter: productResult.courierBalanceAfter.quantity,
							distributorBalanceBefore: productResult.distributorBalanceBefore,
							distributorBalanceAfter: productResult.distributorBalanceAfter.quantity,
						})),
						cashAmountCents: input.cashAmountCents,
						courierCashBalanceBefore: cashResult.courierBeforeAmountCents,
						courierCashBalanceAfter: cashResult.courierAfterAmountCents,
						distributorCashBalanceBefore: cashResult.distributorBeforeAmountCents,
						distributorCashBalanceAfter: cashResult.distributorAfterAmountCents,
						comment: comment ?? null,
					} satisfies Prisma.InputJsonValue,
				},
			});

			return {
				unload,
				unloadItems,
				courier,
				distributor,
				courierProductBalancesAfter: productResults.map((item) => item.courierBalanceAfter),
				distributorProductBalancesAfter: productResults.map((item) => item.distributorBalanceAfter),
				courierCashBalanceAfter: cashResult.courierCashBalanceAfter,
				distributorCashBalanceAfter: cashResult.distributorCashBalanceAfter,
			};
		});

		return {
			unload: mapCourierUnload(result.unload),
			items: result.unloadItems.map(mapCourierUnloadItem),
			courierProductBalances: result.courierProductBalancesAfter.map(mapCourierProductBalanceItem),
			courierCashBalance: mapCourierCashBalanceItem(result.courier, result.courierCashBalanceAfter),
			distributorProductBalances: result.distributorProductBalancesAfter.map(
				mapCourierUnloadDistributorProductBalance,
			),
			distributorCashBalance: mapCourierUnloadDistributorCashBalance(
				result.distributor,
				result.distributorCashBalanceAfter,
			),
		};
	}
}

function canReadBalances(role: Actor["role"]): boolean {
	return role === "admin" || role === "director" || role === "commercial_manager" || role === "courier";
}

function canReadCashBalances(role: Actor["role"]): boolean {
	return role === "admin" || role === "director" || role === "commercial_manager" || role === "courier";
}

function canCreateCourierSale(role: Actor["role"]): boolean {
	return role === "admin" || role === "courier";
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

function resolveSaleTargetCourierUserId(actor: Actor, input: CreateCourierSaleRequest): string {
	if (actor.role === "courier") {
		if (input.courierUserId !== undefined) {
			throw new AppError("VALIDATION_ERROR", "Courier cannot choose a courier user for self sale");
		}

		return actor.userId;
	}

	if (actor.role === "admin") {
		if (!input.courierUserId) {
			throw new AppError("VALIDATION_ERROR", "courierUserId is required for admin courier sale");
		}

		return input.courierUserId;
	}

	throw new AppError("FORBIDDEN", "Only courier can sell product from own balance");
}

function resolveUnloadTargetCourierUserId(actor: Actor, input: CreateCourierUnloadRequest): string {
	if (actor.role === "courier") {
		if (input.courierUserId !== undefined) {
			throw new AppError("VALIDATION_ERROR", "Courier cannot choose a courier user for self unload");
		}

		return actor.userId;
	}

	if (actor.role === "admin") {
		if (!input.courierUserId) {
			throw new AppError("VALIDATION_ERROR", "courierUserId is required for admin courier unload");
		}

		return input.courierUserId;
	}

	throw new AppError("FORBIDDEN", "Only courier can unload own balance");
}

function assertValidUnloadRequest(input: CreateCourierUnloadRequest): void {
	if (input.items.length === 0 && input.cashAmountCents === 0) {
		throw new AppError("VALIDATION_ERROR", "Courier unload must include product items or cash amount");
	}

	const seenBalanceIds = new Set<string>();
	for (const item of input.items) {
		if (seenBalanceIds.has(item.courierProductBalanceId)) {
			throw new AppError("VALIDATION_ERROR", "Courier unload item is duplicated", {
				courierProductBalanceId: item.courierProductBalanceId,
			});
		}
		seenBalanceIds.add(item.courierProductBalanceId);
	}
}

async function incrementCourierCashBalance(
	tx: Prisma.TransactionClient,
	courierUserId: string,
	totalCents: number,
) {
	const balance = await tx.courierCashBalance.upsert({
		where: { courierUserId },
		create: {
			courierUserId,
			amountCents: totalCents,
		},
		update: {
			amountCents: { increment: totalCents },
		},
	});

	return {
		balance,
		beforeAmountCents: balance.amountCents - totalCents,
		afterAmountCents: balance.amountCents,
	};
}

async function readCourierCashBalance(tx: Prisma.TransactionClient, courierUserId: string) {
	const balance = await tx.courierCashBalance.findUnique({
		where: { courierUserId },
	});
	const amountCents = balance?.amountCents ?? 0;

	return {
		balance,
		beforeAmountCents: amountCents,
		afterAmountCents: amountCents,
	};
}

async function moveCashFromCourierToDistributor(
	tx: Prisma.TransactionClient,
	courierUserId: string,
	distributorId: string,
	amountCents: number,
) {
	const decrement = await tx.courierCashBalance.updateMany({
		where: {
			courierUserId,
			amountCents: { gte: amountCents },
		},
		data: {
			amountCents: { decrement: amountCents },
		},
	});
	if (decrement.count !== 1) {
		throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough courier cash balance", {
			courierUserId,
		});
	}

	const [courierCashBalanceAfter, distributorCashBalanceAfter] = await Promise.all([
		tx.courierCashBalance.findUniqueOrThrow({ where: { courierUserId } }),
		tx.distributorCashBalance.upsert({
			where: { distributorId },
			create: {
				distributorId,
				amountCents,
			},
			update: {
				amountCents: { increment: amountCents },
			},
		}),
	]);

	return {
		courierCashBalanceAfter,
		distributorCashBalanceAfter,
		courierBeforeAmountCents: courierCashBalanceAfter.amountCents + amountCents,
		courierAfterAmountCents: courierCashBalanceAfter.amountCents,
		distributorBeforeAmountCents: distributorCashBalanceAfter.amountCents - amountCents,
		distributorAfterAmountCents: distributorCashBalanceAfter.amountCents,
	};
}

async function readUnloadCashBalances(
	tx: Prisma.TransactionClient,
	courierUserId: string,
	distributorId: string,
) {
	const [courierCashBalanceAfter, distributorCashBalanceAfter] = await Promise.all([
		tx.courierCashBalance.findUnique({ where: { courierUserId } }),
		tx.distributorCashBalance.findUnique({ where: { distributorId } }),
	]);
	const courierAmountCents = courierCashBalanceAfter?.amountCents ?? 0;
	const distributorAmountCents = distributorCashBalanceAfter?.amountCents ?? 0;

	return {
		courierCashBalanceAfter,
		distributorCashBalanceAfter,
		courierBeforeAmountCents: courierAmountCents,
		courierAfterAmountCents: courierAmountCents,
		distributorBeforeAmountCents: distributorAmountCents,
		distributorAfterAmountCents: distributorAmountCents,
	};
}
