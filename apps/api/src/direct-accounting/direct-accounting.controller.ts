import {
	Body,
	Controller,
	Delete,
	Get,
	Headers,
	HttpCode,
	Inject,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from "@nestjs/common";
import {
	DirectAccountingSaleInputSchema,
	DirectAccountingSalesQuerySchema,
	DirectAccountingStatisticsQuerySchema,
	DirectAccountingSuggestionsQuerySchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import { requireIdempotencyKey } from "../common/idempotency-key";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { DirectAccountingService } from "./direct-accounting.service";

@Controller("direct-accounting")
@RequirePermission("direct_accounting.manage")
@UseGuards(PolicyGuard)
export class DirectAccountingController {
	constructor(@Inject(DirectAccountingService) private readonly service: DirectAccountingService) {}

	@Get("sales")
	async listSales(@Query() query: unknown) {
		const parsed = parseInput(DirectAccountingSalesQuerySchema, query, "Invalid direct accounting sales query");
		return { sales: await this.service.listSales(parsed) };
	}

	@Get("suggestions")
	async suggestions(@Query() query: unknown) {
		const parsed = parseInput(DirectAccountingSuggestionsQuerySchema, query, "Invalid suggestions query");
		return { suggestions: await this.service.listSuggestions(parsed) };
	}

	@Get("statistics")
	async statistics(@Query() query: unknown) {
		return this.service.getStatistics(
			parseInput(DirectAccountingStatisticsQuerySchema, query, "Invalid direct accounting statistics query"),
		);
	}

	@Post("sales")
	async createSale(
		@CurrentActor() actor: Actor | undefined,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
		@Body() body: unknown,
	) {
		return {
			sale: await this.service.createSale(
				requireActor(actor),
				parseInput(DirectAccountingSaleInputSchema, body, "Invalid direct accounting sale"),
				requireIdempotencyKey(idempotencyKey),
			),
		};
	}

	@Put("sales/:saleId")
	async updateSale(
		@CurrentActor() actor: Actor | undefined,
		@Param("saleId") saleId: string,
		@Body() body: unknown,
	) {
		return {
			sale: await this.service.updateSale(
				requireActor(actor),
				saleId,
				parseInput(DirectAccountingSaleInputSchema, body, "Invalid direct accounting sale"),
			),
		};
	}

	@Delete("sales/:saleId")
	@HttpCode(204)
	async deleteSale(@CurrentActor() actor: Actor | undefined, @Param("saleId") saleId: string) {
		await this.service.deleteSale(requireActor(actor), saleId);
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Authentication is required");
	}
	return actor;
}

function parseInput<T extends z.ZodType>(schema: T, value: unknown, message: string): z.infer<T> {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
	}
	return parsed.data;
}
