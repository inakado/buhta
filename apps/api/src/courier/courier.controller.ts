import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { CreateCourierLoadRequestSchema } from "@buhta/shared";
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

	@Post("loads")
	@RequirePermission("courier.stock.load")
	async createLoad(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return this.courierService.createCourierLoad(
			requireActor(actor),
			parseBody(CreateCourierLoadRequestSchema, body, "Invalid courier load payload"),
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
