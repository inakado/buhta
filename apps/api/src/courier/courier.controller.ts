import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
	CancelCourierSaleRequestSchema,
	CreateCourierLoadRequestSchema,
	CreateCourierSaleRequestSchema,
	CreateCourierUnloadRequestSchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { CourierService } from "./courier.service";

@Controller("courier")
@UseGuards(PolicyGuard)
export class CourierController {
	constructor(@Inject(CourierService) private readonly courierService: CourierService) {}

	@Get("load-options")
	@RequirePermission("courier.stock.load")
	async loadOptions() {
		return this.courierService.getLoadOptions();
	}

	@Get("product-balances")
	@RequirePermission("courier.stock.read")
	async productBalances(@CurrentActor() actor: Actor | undefined) {
		return this.courierService.getProductBalances(requireActor(actor));
	}

	@Get("sale-options")
	@RequirePermission("courier.sale.create")
	async saleOptions(@CurrentActor() actor: Actor | undefined) {
		return this.courierService.getSaleOptions(requireActor(actor));
	}

	@Get("sales/recent")
	@RequirePermission("courier.sale.create")
	async recentSales(@CurrentActor() actor: Actor | undefined, @Query("limit") limit?: string) {
		return this.courierService.getRecentSales(requireActor(actor), parseLimit(limit));
	}

	@Get("cash-balances")
	@RequirePermission("courier.cash.read")
	async cashBalances(@CurrentActor() actor: Actor | undefined) {
		return this.courierService.getCashBalances(requireActor(actor));
	}

	@Get("unload-options")
	@RequirePermission("courier.unload.create")
	async unloadOptions(@CurrentActor() actor: Actor | undefined) {
		return this.courierService.getUnloadOptions(requireActor(actor));
	}

	@Post("loads")
	@RequirePermission("courier.stock.load")
	async createLoad(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.courierService.createCourierLoad(
			requireActor(actor),
			parseBody(CreateCourierLoadRequestSchema, body, "Invalid courier load payload"),
		);
	}

	@Post("sales")
	@RequirePermission("courier.sale.create")
	async createSale(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.courierService.createCourierSale(
			requireActor(actor),
			parseBody(CreateCourierSaleRequestSchema, body, "Invalid courier sale payload"),
		);
	}

	@Post("sales/:saleId/cancel")
	@RequirePermission("courier.sale.cancel")
	async cancelSale(
		@CurrentActor() actor: Actor | undefined,
		@Param("saleId") saleId: string,
		@Body() body: unknown,
	) {
		return this.courierService.cancelCourierSale(
			requireActor(actor),
			saleId,
			parseBody(CancelCourierSaleRequestSchema, body, "Invalid courier sale cancellation payload"),
		);
	}

	@Post("unloads")
	@RequirePermission("courier.unload.create")
	async createUnload(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.courierService.createCourierUnload(
			requireActor(actor),
			parseBody(CreateCourierUnloadRequestSchema, body, "Invalid courier unload payload"),
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

function parseLimit(value: string | undefined): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}
