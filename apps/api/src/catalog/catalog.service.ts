import { Inject, Injectable } from "@nestjs/common";
import type {
	CreateDistributorRequest,
	CreatePackagingTypeRequest,
	CreateProductTemplateRequest,
	CreateRawMaterialTypeRequest,
	Distributor,
	PackagingType,
	ProductTemplate,
	RawMaterialType,
	UpdateDistributorRequest,
	UpdatePackagingTypeRequest,
	UpdateProductTemplateRequest,
	UpdateRawMaterialTypeRequest,
} from "@buhta/shared";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../common/errors/app-error";
import { OperationService } from "../operations/operation.service";
import type { BaselineOperationType } from "../operations/operation.types";
import type { Actor } from "../policy/actor";
import { prisma } from "../prisma/client";
import {
	mapDistributor,
	mapPackagingType,
	mapProductTemplate,
	mapRawMaterialType,
} from "./catalog.mapper";

type AuditInput = {
	actor: Actor;
	type: BaselineOperationType;
	entityType: string;
	entityId: string;
	details: Prisma.InputJsonValue;
};

@Injectable()
export class CatalogService {
	constructor(@Inject(OperationService) private readonly operationService: OperationService) {}

	async listRawMaterialTypes(): Promise<RawMaterialType[]> {
		const records = await prisma.rawMaterialType.findMany({
			orderBy: [{ active: "desc" }, { name: "asc" }],
		});

		return records.map(mapRawMaterialType);
	}

	async createRawMaterialType(actor: Actor, input: CreateRawMaterialTypeRequest): Promise<RawMaterialType> {
		try {
			const record = await prisma.rawMaterialType.create({
				data: input,
			});
			await this.audit({
				actor,
				type: "catalog.raw_material_type.create",
				entityType: "raw_material_type",
				entityId: record.id,
				details: {
					name: record.name,
					unit: record.unit,
				},
			});
			return mapRawMaterialType(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Raw material type already exists");
		}
	}

	async updateRawMaterialType(
		actor: Actor,
		id: string,
		input: UpdateRawMaterialTypeRequest,
	): Promise<RawMaterialType> {
		this.assertHasChanges(input);
		await this.ensureRawMaterialTypeExists(id);

		try {
			const record = await prisma.rawMaterialType.update({
				where: { id },
				data: buildRawMaterialTypeUpdateData(input),
			});
			await this.audit({
				actor,
				type: "catalog.raw_material_type.update",
				entityType: "raw_material_type",
				entityId: record.id,
				details: {
					changes: input,
				},
			});
			return mapRawMaterialType(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Raw material type already exists");
		}
	}

	async archiveRawMaterialType(actor: Actor, id: string): Promise<RawMaterialType> {
		await this.ensureRawMaterialTypeExists(id);
		const record = await prisma.rawMaterialType.update({
			where: { id },
			data: { active: false },
		});
		await this.audit({
			actor,
			type: "catalog.raw_material_type.archive",
			entityType: "raw_material_type",
			entityId: record.id,
			details: {
				active: false,
			},
		});
		return mapRawMaterialType(record);
	}

	async listPackagingTypes(): Promise<PackagingType[]> {
		const records = await prisma.packagingType.findMany({
			orderBy: [{ active: "desc" }, { name: "asc" }],
		});

		return records.map(mapPackagingType);
	}

	async createPackagingType(actor: Actor, input: CreatePackagingTypeRequest): Promise<PackagingType> {
		try {
			const record = await prisma.packagingType.create({
				data: input,
			});
			await this.audit({
				actor,
				type: "catalog.packaging_type.create",
				entityType: "packaging_type",
				entityId: record.id,
				details: {
					name: record.name,
					unit: record.unit,
				},
			});
			return mapPackagingType(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Packaging type already exists");
		}
	}

	async updatePackagingType(actor: Actor, id: string, input: UpdatePackagingTypeRequest): Promise<PackagingType> {
		this.assertHasChanges(input);
		await this.ensurePackagingTypeExists(id);

		try {
			const record = await prisma.packagingType.update({
				where: { id },
				data: buildPackagingTypeUpdateData(input),
			});
			await this.audit({
				actor,
				type: "catalog.packaging_type.update",
				entityType: "packaging_type",
				entityId: record.id,
				details: {
					changes: input,
				},
			});
			return mapPackagingType(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Packaging type already exists");
		}
	}

	async archivePackagingType(actor: Actor, id: string): Promise<PackagingType> {
		await this.ensurePackagingTypeExists(id);
		const record = await prisma.packagingType.update({
			where: { id },
			data: { active: false },
		});
		await this.audit({
			actor,
			type: "catalog.packaging_type.archive",
			entityType: "packaging_type",
			entityId: record.id,
			details: {
				active: false,
			},
		});
		return mapPackagingType(record);
	}

	async listDistributors(): Promise<Distributor[]> {
		const records = await prisma.distributor.findMany({
			orderBy: [{ active: "desc" }, { name: "asc" }],
		});

		return records.map(mapDistributor);
	}

	async createDistributor(actor: Actor, input: CreateDistributorRequest): Promise<Distributor> {
		try {
			const record = await prisma.distributor.create({
				data: input,
			});
			await this.audit({
				actor,
				type: "catalog.distributor.create",
				entityType: "distributor",
				entityId: record.id,
				details: {
					name: record.name,
				},
			});
			return mapDistributor(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Distributor already exists");
		}
	}

	async updateDistributor(actor: Actor, id: string, input: UpdateDistributorRequest): Promise<Distributor> {
		this.assertHasChanges(input);
		await this.ensureDistributorExists(id);

		try {
			const record = await prisma.distributor.update({
				where: { id },
				data: buildDistributorUpdateData(input),
			});
			await this.audit({
				actor,
				type: "catalog.distributor.update",
				entityType: "distributor",
				entityId: record.id,
				details: {
					changes: input,
				},
			});
			return mapDistributor(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Distributor already exists");
		}
	}

	async archiveDistributor(actor: Actor, id: string): Promise<Distributor> {
		await this.ensureDistributorExists(id);
		const record = await prisma.distributor.update({
			where: { id },
			data: { active: false },
		});
		await this.audit({
			actor,
			type: "catalog.distributor.archive",
			entityType: "distributor",
			entityId: record.id,
			details: {
				active: false,
			},
		});
		return mapDistributor(record);
	}

	async listProductTemplates(): Promise<ProductTemplate[]> {
		const records = await prisma.productTemplate.findMany({
			include: {
				rawMaterialType: true,
				packagingType: true,
			},
			orderBy: [{ active: "desc" }, { name: "asc" }],
		});

		return records.map(mapProductTemplate);
	}

	async createProductTemplate(actor: Actor, input: CreateProductTemplateRequest): Promise<ProductTemplate> {
		await this.ensureActiveRawMaterialType(input.rawMaterialTypeId);
		await this.ensureActivePackagingType(input.packagingTypeId);

		try {
			const record = await prisma.productTemplate.create({
				data: {
					name: input.name,
					rawMaterialTypeId: input.rawMaterialTypeId,
					packagingTypeId: input.packagingTypeId,
					priceCents: input.priceCents,
				},
				include: {
					rawMaterialType: true,
					packagingType: true,
				},
			});
			await this.audit({
				actor,
				type: "catalog.product_template.create",
				entityType: "product_template",
				entityId: record.id,
				details: {
					name: record.name,
					rawMaterialTypeId: record.rawMaterialTypeId,
					packagingTypeId: record.packagingTypeId,
					priceCents: record.priceCents,
				},
			});
			return mapProductTemplate(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Product template already exists");
		}
	}

	async updateProductTemplate(
		actor: Actor,
		id: string,
		input: UpdateProductTemplateRequest,
	): Promise<ProductTemplate> {
		this.assertHasChanges(input);
		await this.ensureProductTemplateExists(id);

		if (input.rawMaterialTypeId) {
			await this.ensureActiveRawMaterialType(input.rawMaterialTypeId);
		}

		if (input.packagingTypeId) {
			await this.ensureActivePackagingType(input.packagingTypeId);
		}

		try {
			const record = await prisma.productTemplate.update({
				where: { id },
				data: buildProductTemplateUpdateData(input),
				include: {
					rawMaterialType: true,
					packagingType: true,
				},
			});
			await this.audit({
				actor,
				type: "catalog.product_template.update",
				entityType: "product_template",
				entityId: record.id,
				details: {
					changes: input,
				},
			});
			return mapProductTemplate(record);
		} catch (error) {
			throw this.mapCatalogError(error, "Product template already exists");
		}
	}

	async archiveProductTemplate(actor: Actor, id: string): Promise<ProductTemplate> {
		await this.ensureProductTemplateExists(id);
		const record = await prisma.productTemplate.update({
			where: { id },
			data: { active: false },
			include: {
				rawMaterialType: true,
				packagingType: true,
			},
		});
		await this.audit({
			actor,
			type: "catalog.product_template.archive",
			entityType: "product_template",
			entityId: record.id,
			details: {
				active: false,
			},
		});
		return mapProductTemplate(record);
	}

	private async audit(input: AuditInput): Promise<void> {
		await this.operationService.createAuditOperation(input);
	}

	private assertHasChanges(input: object): void {
		if (Object.keys(input).length === 0) {
			throw new AppError("VALIDATION_ERROR", "No catalog changes provided");
		}
	}

	private async ensureRawMaterialTypeExists(id: string): Promise<void> {
		const record = await prisma.rawMaterialType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Raw material type not found", { id });
		}
	}

	private async ensurePackagingTypeExists(id: string): Promise<void> {
		const record = await prisma.packagingType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Packaging type not found", { id });
		}
	}

	private async ensureDistributorExists(id: string): Promise<void> {
		const record = await prisma.distributor.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Distributor not found", { id });
		}
	}

	private async ensureProductTemplateExists(id: string): Promise<void> {
		const record = await prisma.productTemplate.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Product template not found", { id });
		}
	}

	private async ensureActiveRawMaterialType(id: string): Promise<void> {
		const record = await prisma.rawMaterialType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Raw material type not found", { id });
		}
		if (!record.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Raw material type is inactive", { id });
		}
	}

	private async ensureActivePackagingType(id: string): Promise<void> {
		const record = await prisma.packagingType.findUnique({ where: { id } });
		if (!record) {
			throw new AppError("NOT_FOUND", "Packaging type not found", { id });
		}
		if (!record.active) {
			throw new AppError("DOMAIN_RULE_VIOLATION", "Packaging type is inactive", { id });
		}
	}

	private mapCatalogError(error: unknown, duplicateMessage: string): AppError {
		if (error instanceof AppError) {
			return error;
		}

		if (isPrismaErrorCode(error, "P2002")) {
			return new AppError("CONFLICT", duplicateMessage);
		}

		return new AppError("INTERNAL_ERROR", "Catalog operation failed", {
			reason: error instanceof Error ? error.message : String(error),
		});
	}
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function buildRawMaterialTypeUpdateData(input: UpdateRawMaterialTypeRequest): Prisma.RawMaterialTypeUpdateInput {
	const data: Prisma.RawMaterialTypeUpdateInput = {};
	if (input.name !== undefined) {
		data.name = input.name;
	}
	if (input.unit !== undefined) {
		data.unit = input.unit;
	}
	if (input.active !== undefined) {
		data.active = input.active;
	}
	return data;
}

function buildPackagingTypeUpdateData(input: UpdatePackagingTypeRequest): Prisma.PackagingTypeUpdateInput {
	const data: Prisma.PackagingTypeUpdateInput = {};
	if (input.name !== undefined) {
		data.name = input.name;
	}
	if (input.unit !== undefined) {
		data.unit = input.unit;
	}
	if (input.active !== undefined) {
		data.active = input.active;
	}
	return data;
}

function buildDistributorUpdateData(input: UpdateDistributorRequest): Prisma.DistributorUpdateInput {
	const data: Prisma.DistributorUpdateInput = {};
	if (input.name !== undefined) {
		data.name = input.name;
	}
	if (input.active !== undefined) {
		data.active = input.active;
	}
	return data;
}

function buildProductTemplateUpdateData(
	input: UpdateProductTemplateRequest,
): Prisma.ProductTemplateUncheckedUpdateInput {
	const data: Prisma.ProductTemplateUncheckedUpdateInput = {};
	if (input.name !== undefined) {
		data.name = input.name;
	}
	if (input.rawMaterialTypeId !== undefined) {
		data.rawMaterialTypeId = input.rawMaterialTypeId;
	}
	if (input.packagingTypeId !== undefined) {
		data.packagingTypeId = input.packagingTypeId;
	}
	if (input.priceCents !== undefined) {
		data.priceCents = input.priceCents;
	}
	if (input.active !== undefined) {
		data.active = input.active;
	}
	return data;
}
