import { Body, Controller, Get, Headers, Inject, Post, UseGuards } from "@nestjs/common";
import {
	CreatePackagingIntakeRequestSchema,
	CreateProductBatchRequestSchema,
	CreateProductTransferRequestSchema,
	CreateRawMaterialIntakeRequestSchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import { requireIdempotencyKey } from "../common/idempotency-key";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { ProductionService } from "./production.service";

@Controller("production")
@RequirePermission("production.manage")
@UseGuards(PolicyGuard)
export class ProductionController {
	constructor(@Inject(ProductionService) private readonly productionService: ProductionService) {}

	@Get("options")
	async options() {
		return this.productionService.getOptions();
	}

	@Get("summary")
	async summary() {
		return {
			summary: await this.productionService.getSummary(),
		};
	}

	@Get("raw-material-balances")
	async rawMaterialBalances() {
		return {
			rawMaterialBalances: await this.productionService.listRawMaterialBalances(),
		};
	}

	@Post("raw-material-intakes")
	async createRawMaterialIntake(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return {
			rawMaterialBalance: await this.productionService.createRawMaterialIntake(
				requireActor(actor),
				parseBody(CreateRawMaterialIntakeRequestSchema, body, "Invalid raw material intake payload"),
				requireIdempotencyKey(idempotencyKey),
			),
		};
	}

	@Get("packaging-balances")
	async packagingBalances() {
		return {
			packagingBalances: await this.productionService.listPackagingBalances(),
		};
	}

	@Post("packaging-intakes")
	async createPackagingIntake(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return {
			packagingBalance: await this.productionService.createPackagingIntake(
				requireActor(actor),
				parseBody(CreatePackagingIntakeRequestSchema, body, "Invalid packaging intake payload"),
				requireIdempotencyKey(idempotencyKey),
			),
		};
	}

	@Get("product-batches")
	async productBatches() {
		return {
			productBatches: await this.productionService.listProductBatches(),
		};
	}

	@Get("workshop-product-balances")
	async workshopProductBalances() {
		return {
			workshopProductBalances: await this.productionService.listWorkshopProductBalances(),
		};
	}

	@Get("transfer-options")
	async transferOptions() {
		return this.productionService.getTransferOptions();
	}

	@Post("product-batches")
	async createProductBatch(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return {
			productBatch: await this.productionService.createProductBatch(
				requireActor(actor),
				parseBody(CreateProductBatchRequestSchema, body, "Invalid product batch payload"),
				requireIdempotencyKey(idempotencyKey),
			),
		};
	}

	@Post("product-transfers")
	async createProductTransfer(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return this.productionService.createProductTransfer(
			requireActor(actor),
			parseBody(CreateProductTransferRequestSchema, body, "Invalid product transfer payload"),
			requireIdempotencyKey(idempotencyKey),
		);
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Authentication is required");
	}

	return actor;
}

function parseBody<T extends z.ZodType>(schema: T, body: unknown, message: string): z.infer<T> {
	const parsedBody = schema.safeParse(body);

	if (!parsedBody.success) {
		throw new AppError("VALIDATION_ERROR", message, parsedBody.error.flatten());
	}

	return parsedBody.data;
}
