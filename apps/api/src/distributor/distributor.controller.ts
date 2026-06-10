import { Body, Controller, Get, Headers, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
	AssignDistributorDiscountRequestSchema,
	CancelDistributorSaleRequestSchema,
	CreateDistributorCashWithdrawalRequestSchema,
	CreateDistributorSaleRequestSchema,
	DistributorSalesHistoryQuerySchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import { requireIdempotencyKey } from "../common/idempotency-key";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { DistributorService } from "./distributor.service";

@Controller("distributor")
@RequirePermission("distributor.stock.read")
@UseGuards(PolicyGuard)
export class DistributorController {
	constructor(@Inject(DistributorService) private readonly distributorService: DistributorService) {}

	@Get("inventory")
	async inventory() {
		return this.distributorService.getInventory();
	}

	@Get("sale-options")
	@RequirePermission("distributor.sale.create")
	async saleOptions() {
		return this.distributorService.getSaleOptions();
	}

	@Get("sales/recent")
	@RequirePermission("distributor.sale.create")
	async recentSales(@Query("limit") limit?: string) {
		return this.distributorService.getRecentSales(parseLimit(limit));
	}

	@Get("sales/history")
	@RequirePermission("distributor.sale.create")
	async salesHistory(@Query() query: Record<string, string | undefined>) {
		return this.distributorService.getSalesHistory(parseSalesHistoryQuery(query));
	}

	@Get("cash-balances")
	@RequirePermission("distributor.cash.read")
	async cashBalances() {
		return this.distributorService.getCashBalances();
	}

	@Post("sales")
	@RequirePermission("distributor.sale.create")
	async createSale(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return this.distributorService.createDistributorSale(
			requireActor(actor),
			parseBody(CreateDistributorSaleRequestSchema, body, "Invalid distributor sale payload"),
			requireIdempotencyKey(idempotencyKey),
		);
	}

	@Post("sales/:saleId/cancel")
	@RequirePermission("distributor.sale.cancel")
	async cancelSale(
		@CurrentActor() actor: Actor | undefined,
		@Param("saleId") saleId: string,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return this.distributorService.cancelDistributorSale(
			requireActor(actor),
			saleId,
			parseBody(CancelDistributorSaleRequestSchema, body, "Invalid distributor sale cancellation payload"),
			requireIdempotencyKey(idempotencyKey),
		);
	}

	@Post("cash-withdrawals")
	@RequirePermission("cash.withdraw")
	async createCashWithdrawal(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return this.distributorService.createCashWithdrawal(
			requireActor(actor),
			parseBody(CreateDistributorCashWithdrawalRequestSchema, body, "Invalid distributor cash withdrawal payload"),
			requireIdempotencyKey(idempotencyKey),
		);
	}

	@Post("discounts")
	@RequirePermission("discount.assign")
	async assignDiscount(
		@CurrentActor() actor: Actor | undefined,
		@Body() body: unknown,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
	) {
		return this.distributorService.assignDiscount(
			requireActor(actor),
			parseBody(AssignDistributorDiscountRequestSchema, body, "Invalid distributor discount payload"),
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

function parseLimit(value: string | undefined): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSalesHistoryQuery(query: Record<string, string | undefined>) {
	const parsedQuery = DistributorSalesHistoryQuerySchema.safeParse({
		cursor: emptyToUndefined(query.cursor),
		limit: parseLimit(query.limit),
		search: emptyToUndefined(query.search),
		status: emptyToUndefined(query.status),
	});

	if (!parsedQuery.success) {
		throw new AppError("VALIDATION_ERROR", "Invalid distributor sales history query", parsedQuery.error.flatten());
	}

	return parsedQuery.data;
}

function emptyToUndefined(value: string | undefined): string | undefined {
	return value === "" ? undefined : value;
}
