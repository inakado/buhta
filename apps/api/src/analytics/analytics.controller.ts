import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DirectorAnalyticsQuerySchema } from "@buhta/shared";
import type { z } from "zod";
import { AppError } from "../common/errors/app-error";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@RequirePermission("director.analytics.read")
@UseGuards(PolicyGuard)
export class AnalyticsController {
	constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

	@Get("director")
	async director(@Query() query: unknown) {
		return this.analyticsService.getDirectorAnalytics(
			parseInput(DirectorAnalyticsQuerySchema, query, "Invalid director analytics query"),
		);
	}
}

function parseInput<T extends z.ZodType>(schema: T, value: unknown, message: string): z.infer<T> {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		throw new AppError("VALIDATION_ERROR", message, parsed.error.flatten());
	}

	return parsed.data;
}
