import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
	ClientSearchQuerySchema,
	CreateClientRequestSchema,
	UpdateClientRequestSchema,
} from "@buhta/shared";
import type { z } from "zod";
import { CurrentActor } from "../auth/actor.decorator";
import { AppError } from "../common/errors/app-error";
import type { Actor } from "../policy/actor";
import { PolicyGuard } from "../policy/policy.guard";
import { RequirePermission } from "../policy/require-permission.decorator";
import { ClientsService } from "./clients.service";

@Controller("clients")
@UseGuards(PolicyGuard)
export class ClientsController {
	constructor(@Inject(ClientsService) private readonly clientsService: ClientsService) {}

	@Get()
	@RequirePermission("client.read")
	async listClients(@Query() query: unknown) {
		return {
			clients: await this.clientsService.listClients(
				parseInput(ClientSearchQuerySchema, query, "Invalid client search query"),
			),
		};
	}

	@Post()
	@RequirePermission("client.manage")
	async createClient(@CurrentActor() actor: Actor | undefined, @Body() body: unknown) {
		return {
			client: await this.clientsService.createClient(
				requireActor(actor),
				parseInput(CreateClientRequestSchema, body, "Invalid client payload"),
			),
		};
	}

	@Patch(":clientId")
	@RequirePermission("client.manage")
	async updateClient(
		@CurrentActor() actor: Actor | undefined,
		@Param("clientId") clientId: string,
		@Body() body: unknown,
	) {
		return {
			client: await this.clientsService.updateClient(
				requireActor(actor),
				clientId,
				parseInput(UpdateClientRequestSchema, body, "Invalid client update payload"),
			),
		};
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
