import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { CreateDistributorCashWithdrawalRequestSchema, CreateDistributorSaleRequestSchema } from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
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

	@Get("cash-balances")
	@RequirePermission("distributor.cash.read")
	async cashBalances() {
		return this.distributorService.getCashBalances();
	}

	@Post("sales")
	@RequirePermission("distributor.sale.create")
	async createSale(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.distributorService.createDistributorSale(
			requireActor(actor),
			parseBody(CreateDistributorSaleRequestSchema, body, "Invalid distributor sale payload"),
		);
	}

	@Post("cash-withdrawals")
	@RequirePermission("cash.withdraw")
	async createCashWithdrawal(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.distributorService.createCashWithdrawal(
			requireActor(actor),
			parseBody(CreateDistributorCashWithdrawalRequestSchema, body, "Invalid distributor cash withdrawal payload"),
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
