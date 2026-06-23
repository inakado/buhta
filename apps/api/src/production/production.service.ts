import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
	CreateProductTransferRequest,
	CreatePackagingIntakeRequest,
	CreateProductBatchRequest,
	CreateRawMaterialIntakeRequest,
	ProductBatch,
	ProductTransferResponse,
	ProductionOptionsResponse,
	ProductionBalanceItem,
	ProductionSummary,
	ProductionTransferOptionsResponse,
	WorkshopProductBalanceItem,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { canonicalizeProductQuantity } from "../common/product-quantity";
import { OPERATION_STATUS, type BaselineOperationType } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapDistributor,
	mapPackagingType,
	mapProductTemplate,
	mapRawMaterialType,
} from "../catalog/catalog.mapper";
import {
	mapPackagingBalance,
	mapProductBatch,
	mapDistributorProductBalance,
	mapProductTransfer,
	mapProductionSummary,
	mapRawMaterialBalance,
	mapWorkshopProductBalance,
} from "./production.mapper";

type ProductionOperationInput = {
	actor: Actor;
	type: BaselineOperationType;
	entityType: string;
	entityId?: string;
	idempotencyKey?: string | undefined;
	details: Prisma.InputJsonValue;
};

@Injectable()
export class ProductionService {
	async getOptions(): Promise<ProductionOptionsResponse> {
		const [rawMaterialTypes, packagingTypes, productTemplates] = await Promise.all([
			prisma.rawMaterialType.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			prisma.packagingType.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			prisma.productTemplate.findMany({
				where: { active: true, priceCents: { gt: 0 } },
				include: {
					rawMaterialType: true,
					packagingType: true,
				},
				orderBy: { name: "asc" },
			}),
		]);

		return {
			rawMaterialTypes: rawMaterialTypes.map(mapRawMaterialType),
			packagingTypes: packagingTypes.map(mapPackagingType),
			productTemplates: productTemplates.map(mapProductTemplate),
		};
	}

	async getSummary(): Promise<ProductionSummary> {
		const [rawMaterialBalances, packagingBalances, workshopProductAggregate] = await Promise.all([
			this.listRawMaterialBalances(),
			this.listPackagingBalances(),
			prisma.workshopProductBalance.aggregate({
				where: { quantity: { gt: 0 } },
				_sum: { quantity: true },
			}),
		]);

		return mapProductionSummary({
			readyProductUnits: workshopProductAggregate._sum.quantity ?? 0,
			rawMaterialBalances,
			packagingBalances,
		});
	}

	async listRawMaterialBalances(): Promise<ProductionBalanceItem[]> {
		const balances = await prisma.rawMaterialBalance.findMany({
			include: { rawMaterialType: true },
			orderBy: { rawMaterialType: { name: "asc" } },
		});

		return balances.map(mapRawMaterialBalance);
	}

	async listPackagingBalances(): Promise<ProductionBalanceItem[]> {
		const balances = await prisma.packagingBalance.findMany({
			include: { packagingType: true },
			orderBy: { packagingType: { name: "asc" } },
		});

		return balances.map(mapPackagingBalance);
	}

	async listProductBatches(): Promise<ProductBatch[]> {
		const batches = await prisma.productBatch.findMany({
			orderBy: { createdAt: "desc" },
		});

		return batches.map(mapProductBatch);
	}

	async listWorkshopProductBalances(): Promise<WorkshopProductBalanceItem[]> {
		const balances = await prisma.workshopProductBalance.findMany({
			where: { quantity: { gt: 0 } },
			include: { productBatch: true },
			orderBy: { productBatch: { createdAt: "desc" } },
		});

		return balances.map(mapWorkshopProductBalance);
	}

	async getTransferOptions(): Promise<ProductionTransferOptionsResponse> {
		const [distributors, workshopProductBalances] = await Promise.all([
			prisma.distributor.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			this.listWorkshopProductBalances(),
		]);

		return {
			distributors: distributors.map(mapDistributor),
			workshopProductBalances,
		};
	}

	async createRawMaterialIntake(
		actor: Actor,
		input: CreateRawMaterialIntakeRequest,
		idempotencyKey?: string,
	): Promise<ProductionBalanceItem> {
		const rawMaterialType = await this.ensureActiveRawMaterialType(input.rawMaterialTypeId);

		const balance = await prisma.$transaction(async (tx) => {
			const operation = await this.createOperation(tx, {
				actor,
					type: "production.raw_material_intake.create",
					entityType: "raw_material_type",
					entityId: input.rawMaterialTypeId,
					idempotencyKey,
					details: {
					rawMaterialTypeId: input.rawMaterialTypeId,
					rawMaterialTypeName: rawMaterialType.name,
					quantity: input.quantity,
					unit: rawMaterialType.unit,
					comment: input.comment,
				},
			});

			const intakeData: Prisma.RawMaterialIntakeUncheckedCreateInput = {
				rawMaterialTypeId: input.rawMaterialTypeId,
				quantity: input.quantity,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (input.comment !== undefined) {
				intakeData.comment = input.comment;
			}

			await tx.rawMaterialIntake.create({
				data: intakeData,
			});

			return tx.rawMaterialBalance.upsert({
				where: { rawMaterialTypeId: input.rawMaterialTypeId },
				create: {
					rawMaterialTypeId: input.rawMaterialTypeId,
					quantity: input.quantity,
				},
				update: {
					quantity: { increment: input.quantity },
				},
				include: { rawMaterialType: true },
			});
		});

		return mapRawMaterialBalance(balance);
	}

	async createPackagingIntake(
		actor: Actor,
		input: CreatePackagingIntakeRequest,
		idempotencyKey?: string,
	): Promise<ProductionBalanceItem> {
		const packagingType = await this.ensureActivePackagingType(input.packagingTypeId);

		const balance = await prisma.$transaction(async (tx) => {
			const operation = await this.createOperation(tx, {
				actor,
					type: "production.packaging_intake.create",
					entityType: "packaging_type",
					entityId: input.packagingTypeId,
					idempotencyKey,
					details: {
					packagingTypeId: input.packagingTypeId,
					packagingTypeName: packagingType.name,
					quantity: input.quantity,
					unit: packagingType.unit,
					comment: input.comment,
				},
			});

			const intakeData: Prisma.PackagingIntakeUncheckedCreateInput = {
				packagingTypeId: input.packagingTypeId,
				quantity: input.quantity,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (input.comment !== undefined) {
				intakeData.comment = input.comment;
			}

			await tx.packagingIntake.create({
				data: intakeData,
			});

			return tx.packagingBalance.upsert({
				where: { packagingTypeId: input.packagingTypeId },
				create: {
					packagingTypeId: input.packagingTypeId,
					quantity: input.quantity,
				},
				update: {
					quantity: { increment: input.quantity },
				},
				include: { packagingType: true },
			});
		});

		return mapPackagingBalance(balance);
	}

	async createProductBatch(
		actor: Actor,
		input: CreateProductBatchRequest,
		idempotencyKey?: string,
	): Promise<ProductBatch> {
		const template = await prisma.productTemplate.findUnique({
			where: { id: input.productTemplateId },
			include: {
				rawMaterialType: true,
				packagingType: true,
			},
		});

		if (!template) {
			throw new AppError("NOT_FOUND", "Product template not found", { id: input.productTemplateId });
		}
		if (!template.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Product template is inactive", { id: input.productTemplateId });
		}
		if (!template.rawMaterialType.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Raw material type is inactive", {
				id: template.rawMaterialTypeId,
			});
		}
		if (!template.packagingType.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Packaging type is inactive", {
				id: template.packagingTypeId,
			});
		}
		if (template.priceCents <= 0) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Product template price is required", {
				id: template.id,
			});
		}

		const productQuantity = canonicalizeProductQuantity(input, template.netWeightGrams);
		const consumedPackagingQuantity = productQuantity.quantity;

			const batch = await prisma.$transaction(async (tx) => {
				const productBatchId = randomUUID();
				const rawDecrement = await tx.rawMaterialBalance.updateMany({
				where: {
					rawMaterialTypeId: template.rawMaterialTypeId,
					quantity: { gte: input.consumedRawMaterialQuantity },
				},
				data: {
					quantity: { decrement: input.consumedRawMaterialQuantity },
				},
			});
			if (rawDecrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough raw material balance", {
					rawMaterialTypeId: template.rawMaterialTypeId,
				});
			}

			const packagingDecrement = await tx.packagingBalance.updateMany({
				where: {
					packagingTypeId: template.packagingTypeId,
					quantity: { gte: consumedPackagingQuantity },
				},
				data: {
					quantity: { decrement: consumedPackagingQuantity },
				},
			});
			if (packagingDecrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough packaging balance", {
					packagingTypeId: template.packagingTypeId,
				});
			}

				const operation = await this.createOperation(tx, {
					actor,
					type: "production.product_batch.create",
					entityType: "product_batch",
					entityId: productBatchId,
					idempotencyKey,
					details: {
						productTemplateId: template.id,
						productName: template.name,
					rawMaterialTypeId: template.rawMaterialTypeId,
					rawMaterialTypeName: template.rawMaterialType.name,
					rawMaterialUnit: template.rawMaterialType.unit,
					packagingTypeId: template.packagingTypeId,
					packagingTypeName: template.packagingType.name,
					packagingUnit: template.packagingType.unit,
					quantity: productQuantity.quantity,
					quantityInputMode: productQuantity.quantityInputMode,
					quantityInputValue: productQuantity.quantityInputValue,
					quantityInputGrams: productQuantity.quantityInputGrams,
					netWeightGrams: productQuantity.netWeightGrams,
					totalNetWeightGrams: productQuantity.totalNetWeightGrams,
					consumedRawMaterialQuantity: input.consumedRawMaterialQuantity,
					consumedPackagingQuantity,
					priceCents: template.priceCents,
					comment: input.comment,
				},
			});

				const createdBatch = await tx.productBatch.create({
					data: {
						id: productBatchId,
						productTemplateId: template.id,
					productName: template.name,
					rawMaterialTypeId: template.rawMaterialTypeId,
					rawMaterialTypeName: template.rawMaterialType.name,
					rawMaterialUnit: template.rawMaterialType.unit,
					packagingTypeId: template.packagingTypeId,
					packagingTypeName: template.packagingType.name,
					packagingUnit: template.packagingType.unit,
					priceCents: template.priceCents,
					netWeightGrams: template.netWeightGrams,
					quantity: productQuantity.quantity,
					consumedRawMaterialQuantity: input.consumedRawMaterialQuantity,
					consumedPackagingQuantity,
					operationId: operation.id,
					actorUserId: actor.userId,
				},
			});

			await tx.workshopProductBalance.create({
				data: {
					productBatchId: createdBatch.id,
					quantity: createdBatch.quantity,
				},
			});

				return createdBatch;
			});

		return mapProductBatch(batch);
	}

	async createProductTransfer(
		actor: Actor,
		input: CreateProductTransferRequest,
		idempotencyKey?: string,
	): Promise<ProductTransferResponse> {
		const productBatch = await prisma.productBatch.findUnique({ where: { id: input.productBatchId } });

		if (!productBatch) {
			throw new AppError("NOT_FOUND", "Product batch not found", { id: input.productBatchId });
		}
		const productQuantity = canonicalizeProductQuantity(input, productBatch.netWeightGrams);

			const result = await prisma.$transaction(async (tx) => {
				const productTransferId = randomUUID();
				const distributor = await tx.distributor.findUnique({ where: { id: input.distributorId } });
			if (!distributor) {
				throw new AppError("NOT_FOUND", "Distributor not found", { id: input.distributorId });
			}
			if (!distributor.active) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Distributor is inactive", { id: input.distributorId });
			}

			const workshopBalanceBefore = await tx.workshopProductBalance.findUnique({
				where: { productBatchId: input.productBatchId },
				include: { productBatch: true },
			});
			if (!workshopBalanceBefore) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Product batch has no workshop balance", {
					productBatchId: input.productBatchId,
				});
			}

			const distributorBalanceBefore = await tx.distributorProductBalance.findUnique({
				where: {
					distributorId_productBatchId_unitPriceCents: {
						distributorId: input.distributorId,
						productBatchId: input.productBatchId,
						unitPriceCents: productBatch.priceCents,
					},
				},
				include: { distributor: true, productBatch: true },
			});

				const decrement = await tx.workshopProductBalance.updateMany({
					where: {
						productBatchId: input.productBatchId,
						quantity: { gte: productQuantity.quantity },
					},
					data: {
						quantity: { decrement: productQuantity.quantity },
					},
				});
			if (decrement.count !== 1) {
				throw new AppError("DOMAIN_RULE_VIOLATION", "Not enough product balance in workshop", {
					productBatchId: input.productBatchId,
				});
			}

			const workshopBalanceAfter = await tx.workshopProductBalance.findUniqueOrThrow({
				where: { productBatchId: input.productBatchId },
				include: { productBatch: true },
			});

			const distributorProductBalance = await tx.distributorProductBalance.upsert({
				where: {
					distributorId_productBatchId_unitPriceCents: {
						distributorId: input.distributorId,
						productBatchId: input.productBatchId,
						unitPriceCents: productBatch.priceCents,
					},
				},
				create: {
						distributorId: input.distributorId,
						productBatchId: input.productBatchId,
						unitPriceCents: productBatch.priceCents,
						quantity: productQuantity.quantity,
					},
					update: {
						quantity: { increment: productQuantity.quantity },
					},
				include: { distributor: true, productBatch: true },
			});

				const operation = await this.createOperation(tx, {
					actor,
					type: "production.product_transfer.create",
					entityType: "product_transfer",
					entityId: productTransferId,
					idempotencyKey,
					details: {
						productBatchId: input.productBatchId,
					productName: productBatch.productName,
					baseUnitPriceCents: productBatch.priceCents,
						unitPriceCents: productBatch.priceCents,
						discountCentsPerUnit: 0,
						stockValueCents: productQuantity.quantity * productBatch.priceCents,
						distributorId: input.distributorId,
						distributorName: distributor.name,
						quantity: productQuantity.quantity,
						quantityInputMode: productQuantity.quantityInputMode,
						quantityInputValue: productQuantity.quantityInputValue,
						quantityInputGrams: productQuantity.quantityInputGrams,
						netWeightGrams: productQuantity.netWeightGrams,
						totalNetWeightGrams: productQuantity.totalNetWeightGrams,
						workshopBalanceBefore: workshopBalanceBefore.quantity,
					workshopBalanceAfter: workshopBalanceAfter.quantity,
					distributorBalanceBefore: distributorBalanceBefore?.quantity ?? 0,
					distributorBalanceAfter: distributorProductBalance.quantity,
					comment: input.comment,
				},
			});

				const transferData: Prisma.ProductTransferUncheckedCreateInput = {
					id: productTransferId,
					productBatchId: input.productBatchId,
				distributorId: input.distributorId,
				quantity: productQuantity.quantity,
				baseUnitPriceCents: productBatch.priceCents,
				unitPriceCents: productBatch.priceCents,
				discountCentsPerUnit: 0,
				stockValueCents: productQuantity.quantity * productBatch.priceCents,
				operationId: operation.id,
				actorUserId: actor.userId,
			};
			if (input.comment !== undefined) {
				transferData.comment = input.comment;
			}

				const transfer = await tx.productTransfer.create({
					data: transferData,
					include: { productBatch: true },
				});

				return {
					transfer,
				workshopProductBalance: workshopBalanceAfter,
				distributorProductBalance,
			};
		});

		return {
			transfer: mapProductTransfer(result.transfer),
			workshopProductBalance: mapWorkshopProductBalance(result.workshopProductBalance),
			distributorProductBalance: mapDistributorProductBalance(result.distributorProductBalance),
		};
	}

	private async ensureActiveRawMaterialType(id: string) {
		const record = await prisma.rawMaterialType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Raw material type not found", { id });
		}
		if (!record.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Raw material type is inactive", { id });
		}

		return record;
	}

	private async ensureActivePackagingType(id: string) {
		const record = await prisma.packagingType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Packaging type not found", { id });
		}
		if (!record.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Packaging type is inactive", { id });
		}

		return record;
	}

		private async createOperation(tx: Prisma.TransactionClient, input: ProductionOperationInput) {
			const operation = await tx.operation.create({
				data: {
					type: input.type,
					status: OPERATION_STATUS.succeeded,
					actorUserId: input.actor.userId,
					idempotencyKey: input.idempotencyKey ?? null,
				},
			});

		const auditData: Prisma.AuditLogUncheckedCreateInput = {
			operationId: operation.id,
			actorUserId: input.actor.userId,
			action: input.type,
			entityType: input.entityType,
			details: input.details,
		};

		if (input.entityId !== undefined) {
			auditData.entityId = input.entityId;
		}

		await tx.auditLog.create({
			data: auditData,
		});

		return operation;
	}
}
