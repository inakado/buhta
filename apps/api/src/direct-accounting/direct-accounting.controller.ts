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
	DirectAccountingEntriesQuerySchema,
	DirectAccountingReceiptInputSchema,
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
		const parsed = parseInput(DirectAccountingSalesQuerySchema, query, "Проверьте выбранный период продаж");
		return { sales: await this.service.listSales(parsed) };
	}

	@Get("entries")
	async listEntries(@Query() query: unknown) {
		const parsed = parseInput(DirectAccountingEntriesQuerySchema, query, "Проверьте выбранный период операций");
		return { entries: await this.service.listEntries(parsed) };
	}

	@Get("suggestions")
	async suggestions(@Query() query: unknown) {
		const parsed = parseInput(DirectAccountingSuggestionsQuerySchema, query, "Проверьте запрос поиска наименования");
		return { suggestions: await this.service.listSuggestions(parsed) };
	}

	@Get("statistics")
	async statistics(@Query() query: unknown) {
		return this.service.getStatistics(
			parseInput(DirectAccountingStatisticsQuerySchema, query, "Проверьте выбранный период статистики"),
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
				parseSaleInput(body),
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
				parseSaleInput(body),
			),
		};
	}

	@Delete("sales/:saleId")
	@HttpCode(204)
	async deleteSale(@CurrentActor() actor: Actor | undefined, @Param("saleId") saleId: string) {
		await this.service.deleteSale(requireActor(actor), saleId);
	}

	@Post("receipts")
	async createReceipt(
		@CurrentActor() actor: Actor | undefined,
		@Headers("idempotency-key") idempotencyKey: string | undefined,
		@Body() body: unknown,
	) {
		return {
			receipt: await this.service.createReceipt(
				requireActor(actor),
				parseReceiptInput(body),
				requireIdempotencyKey(idempotencyKey),
			),
		};
	}

	@Put("receipts/:receiptId")
	async updateReceipt(
		@CurrentActor() actor: Actor | undefined,
		@Param("receiptId") receiptId: string,
		@Body() body: unknown,
	) {
		return {
			receipt: await this.service.updateReceipt(requireActor(actor), receiptId, parseReceiptInput(body)),
		};
	}

	@Delete("receipts/:receiptId")
	@HttpCode(204)
	async deleteReceipt(@CurrentActor() actor: Actor | undefined, @Param("receiptId") receiptId: string) {
		await this.service.deleteReceipt(requireActor(actor), receiptId);
	}
}

function requireActor(actor: Actor | undefined): Actor {
	if (!actor) {
		throw new AppError("UNAUTHENTICATED", "Необходимо войти в систему");
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

function parseSaleInput(value: unknown): z.infer<typeof DirectAccountingSaleInputSchema> {
	const parsed = DirectAccountingSaleInputSchema.safeParse(value);
	if (parsed.success) {
		return parsed.data;
	}

	const invalidField = parsed.error.issues[0]?.path[0];
	const message = invalidField === "productName"
		? "Проверьте наименование: оно должно содержать от 1 до 120 символов"
		: invalidField === "soldOn"
			? "Проверьте дату продажи"
			: invalidField === "quantityKg"
				? "Проверьте количество: оно должно быть больше нуля, с точностью до грамма"
				: invalidField === "unitPriceCents"
					? "Проверьте цену: она должна быть больше нуля, с точностью до копейки"
					: "Проверьте данные продажи: наименование, дату, количество и цену";

	throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
}

function parseReceiptInput(value: unknown): z.infer<typeof DirectAccountingReceiptInputSchema> {
	const parsed = DirectAccountingReceiptInputSchema.safeParse(value);
	if (parsed.success) {
		return parsed.data;
	}

	const invalidField = parsed.error.issues[0]?.path[0];
	const message = invalidField === "productName"
		? "Проверьте наименование: оно должно содержать от 1 до 120 символов"
		: invalidField === "receivedOn"
			? "Проверьте дату прихода"
			: invalidField === "quantityKg"
				? "Проверьте количество: оно должно быть больше нуля, с точностью до грамма"
				: "Проверьте данные прихода: наименование, дату и количество";

	throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
}
