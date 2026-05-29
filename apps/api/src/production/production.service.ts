import { Injectable } from "@nestjs/common";
import type {
	CreatePackagingIntakeRequest,
	CreateProductBatchRequest,
	CreateRawMaterialIntakeRequest,
	ProductBatch,
	ProductionOptionsResponse,
	ProductionBalanceItem,
	ProductionSummary,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OPERATION_STATUS, type BaselineOperationType } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapPackagingType,
	mapProductTemplate,
	mapRawMaterialType,
} from "../catalog/catalog.mapper";
import {
	mapPackagingBalance,
	mapProductBatch,
	mapProductionSummary,
	mapRawMaterialBalance,
} from "./production.mapper";

type ProductionOperationInput = {
	actor: Actor;
	type: BaselineOperationType;
	entityType: string;
	entityId?: string;
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
		const [rawMaterialBalances, packagingBalances, batchAggregate] = await Promise.all([
			this.listRawMaterialBalances(),
			this.listPackagingBalances(),
			prisma.productBatch.aggregate({
				where: { status: "in_workshop" },
				_sum: { quantity: true },
			}),
		]);

		return mapProductionSummary({
			readyProductUnits: batchAggregate._sum.quantity ?? 0,
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

	async createRawMaterialIntake(
		actor: Actor,
		input: CreateRawMaterialIntakeRequest,
	): Promise<ProductionBalanceItem> {
		const rawMaterialType = await this.ensureActiveRawMaterialType(input.rawMaterialTypeId);

		const balance = await prisma.$transaction(async (tx) => {
			const operation = await this.createOperation(tx, {
				actor,
				type: "production.raw_material_intake.create",
				entityType: "raw_material_type",
				entityId: input.rawMaterialTypeId,
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

	async createPackagingIntake(actor: Actor, input: CreatePackagingIntakeRequest): Promise<ProductionBalanceItem> {
		const packagingType = await this.ensureActivePackagingType(input.packagingTypeId);

		const balance = await prisma.$transaction(async (tx) => {
			const operation = await this.createOperation(tx, {
				actor,
				type: "production.packaging_intake.create",
				entityType: "packaging_type",
				entityId: input.packagingTypeId,
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

	async createProductBatch(actor: Actor, input: CreateProductBatchRequest): Promise<ProductBatch> {
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

		const consumedPackagingQuantity = input.quantity;

		const batch = await prisma.$transaction(async (tx) => {
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
				details: {
					productTemplateId: template.id,
					productName: template.name,
					rawMaterialTypeId: template.rawMaterialTypeId,
					rawMaterialTypeName: template.rawMaterialType.name,
					rawMaterialUnit: template.rawMaterialType.unit,
					packagingTypeId: template.packagingTypeId,
					packagingTypeName: template.packagingType.name,
					packagingUnit: template.packagingType.unit,
					quantity: input.quantity,
					consumedRawMaterialQuantity: input.consumedRawMaterialQuantity,
					consumedPackagingQuantity,
					priceCents: template.priceCents,
					comment: input.comment,
				},
			});

			const createdBatch = await tx.productBatch.create({
				data: {
					productTemplateId: template.id,
					productName: template.name,
					rawMaterialTypeId: template.rawMaterialTypeId,
					rawMaterialTypeName: template.rawMaterialType.name,
					rawMaterialUnit: template.rawMaterialType.unit,
					packagingTypeId: template.packagingTypeId,
					packagingTypeName: template.packagingType.name,
					packagingUnit: template.packagingType.unit,
					priceCents: template.priceCents,
					quantity: input.quantity,
					consumedRawMaterialQuantity: input.consumedRawMaterialQuantity,
					consumedPackagingQuantity,
					operationId: operation.id,
					actorUserId: actor.userId,
				},
			});

			await tx.auditLog.updateMany({
				where: { operationId: operation.id },
				data: { entityId: createdBatch.id },
			});

			return createdBatch;
		});

		return mapProductBatch(batch);
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
