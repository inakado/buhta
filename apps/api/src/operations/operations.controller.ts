import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { OperationHistoryQuerySchema } from "@buhta/shared";
import type { z } from "zod";
import { AppError } from "../common/errors/app-error";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { OperationsService } from "./operations.service";

@Controller("operations")
@RequirePermission("operation.history.read")
@UseGuards(PolicyGuard)
export class OperationsController {
	constructor(@Inject(OperationsService) private readonly operationsService: OperationsService) {}

	@Get("history")
	async history(@Query() query: unknown) {
		return this.operationsService.getHistory(
			parseInput(OperationHistoryQuerySchema, query, "Invalid operation history query"),
		);
	}

	@Get("history/options")
	async historyOptions() {
		return this.operationsService.getHistoryOptions();
	}
}

function parseInput<T extends z.ZodType>(schema: T, value: unknown, message: string): z.infer<T> {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
	}

	return parsed.data;
}
