import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
	CreateDistributorRequestSchema,
	CreatePackagingTypeRequestSchema,
	CreateProductTemplateRequestSchema,
	CreateRawMaterialTypeRequestSchema,
	UpdateDistributorRequestSchema,
	UpdatePackagingTypeRequestSchema,
	UpdateProductTemplateRequestSchema,
	UpdateRawMaterialTypeRequestSchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { CatalogService } from "./catalog.service";

@Controller("catalog")
@RequirePermission("catalog.manage")
@UseGuards(PolicyGuard)
export class CatalogController {
	constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

	@Get("raw-material-types")
	async listRawMaterialTypes() {
		return {
			rawMaterialTypes: await this.catalogService.listRawMaterialTypes(),
		};
	}

	@Post("raw-material-types")
	async createRawMaterialType(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			rawMaterialType: await this.catalogService.createRawMaterialType(
				requireActor(actor),
				parseBody(CreateRawMaterialTypeRequestSchema, body, "Invalid raw material type payload"),
			),
		};
	}

	@Patch("raw-material-types/:id")
	async updateRawMaterialType(
		@CurrentActor() actor: Actor | undefined,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return {
			rawMaterialType: await this.catalogService.updateRawMaterialType(
				requireActor(actor),
				id,
				parseBody(UpdateRawMaterialTypeRequestSchema, body, "Invalid raw material type update payload"),
			),
		};
	}

	@Patch("raw-material-types/:id/archive")
	async archiveRawMaterialType(@CurrentActor() actor: Actor | undefined, @Param("id") id: string) {
		return {
			rawMaterialType: await this.catalogService.archiveRawMaterialType(requireActor(actor), id),
		};
	}

	@Get("packaging-types")
	async listPackagingTypes() {
		return {
			packagingTypes: await this.catalogService.listPackagingTypes(),
		};
	}

	@Post("packaging-types")
	async createPackagingType(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			packagingType: await this.catalogService.createPackagingType(
				requireActor(actor),
				parseBody(CreatePackagingTypeRequestSchema, body, "Invalid packaging type payload"),
			),
		};
	}

	@Patch("packaging-types/:id")
	async updatePackagingType(
		@CurrentActor() actor: Actor | undefined,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return {
			packagingType: await this.catalogService.updatePackagingType(
				requireActor(actor),
				id,
				parseBody(UpdatePackagingTypeRequestSchema, body, "Invalid packaging type update payload"),
			),
		};
	}

	@Patch("packaging-types/:id/archive")
	async archivePackagingType(@CurrentActor() actor: Actor | undefined, @Param("id") id: string) {
		return {
			packagingType: await this.catalogService.archivePackagingType(requireActor(actor), id),
		};
	}

	@Get("distributors")
	async listDistributors() {
		return {
			distributors: await this.catalogService.listDistributors(),
		};
	}

	@Post("distributors")
	async createDistributor(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			distributor: await this.catalogService.createDistributor(
				requireActor(actor),
				parseBody(CreateDistributorRequestSchema, body, "Invalid distributor payload"),
			),
		};
	}

	@Patch("distributors/:id")
	async updateDistributor(
		@CurrentActor() actor: Actor | undefined,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return {
			distributor: await this.catalogService.updateDistributor(
				requireActor(actor),
				id,
				parseBody(UpdateDistributorRequestSchema, body, "Invalid distributor update payload"),
			),
		};
	}

	@Patch("distributors/:id/archive")
	async archiveDistributor(@CurrentActor() actor: Actor | undefined, @Param("id") id: string) {
		return {
			distributor: await this.catalogService.archiveDistributor(requireActor(actor), id),
		};
	}

	@Get("product-templates")
	async listProductTemplates() {
		return {
			productTemplates: await this.catalogService.listProductTemplates(),
		};
	}

	@Post("product-templates")
	async createProductTemplate(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			productTemplate: await this.catalogService.createProductTemplate(
				requireActor(actor),
				parseBody(CreateProductTemplateRequestSchema, body, "Invalid product template payload"),
			),
		};
	}

	@Patch("product-templates/:id")
	async updateProductTemplate(
		@CurrentActor() actor: Actor | undefined,
		@Param("id") id: string,
		@Body() body: unknown,
	) {
		return {
			productTemplate: await this.catalogService.updateProductTemplate(
				requireActor(actor),
				id,
				parseBody(UpdateProductTemplateRequestSchema, body, "Invalid product template update payload"),
			),
		};
	}

	@Patch("product-templates/:id/archive")
	async archiveProductTemplate(@CurrentActor() actor: Actor | undefined, @Param("id") id: string) {
		return {
			productTemplate: await this.catalogService.archiveProductTemplate(requireActor(actor), id),
		};
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Authentication is required");
	}

	return actor;
}

function parseBody<T extends z.ZodType>(
	schema: T,
	body: unknown,
	message: string,
): z.infer<T> {
	const parsedBody = schema.safeParse(body);

	if (!parsedBody.success) {
		throw new AppError("VALIDATION_ERROR", message, parsedBody.error.flatten());
	}

	return parsedBody.data;
}
