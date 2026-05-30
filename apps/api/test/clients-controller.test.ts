import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/common/errors/app-error";
import { ClientsController } from "../src/clients/clients.controller";
import type { ClientsService } from "../src/clients/clients.service";
import type { Actor } from "../src/policy/actor";

const actor: Actor = {
	userId: "commercial-manager1",
	login: "commercial-manager",
	displayName: "Commercial Manager",
	role: "commercial_manager",
	permissions: ["client.read", "client.manage"],
};

const client = {
	id: "client1",
	name: "Иван",
	phone: "+7 (999) 123-45-67",
	phoneNormalized: "79991234567",
	description: null,
	createdByUserId: actor.userId,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
};

describe("ClientsController", () => {
	it("validates create payload before calling service", async () => {
		const clientsService = {
			createClient: vi.fn(),
		} as unknown as ClientsService;
		const controller = new ClientsController(clientsService);

		await expect(
			controller.createClient(actor, {
				name: "Иван",
				phone: "---",
			}),
		).rejects.toThrow(AppError);
		expect(clientsService.createClient).not.toHaveBeenCalled();
	});

	it("requires actor for writes", async () => {
		const clientsService = {
			createClient: vi.fn(),
		} as unknown as ClientsService;
		const controller = new ClientsController(clientsService);

		await expect(
			controller.createClient(undefined, {
				name: "Иван",
				phone: "+7",
			}),
		).rejects.toThrow(AppError);
		expect(clientsService.createClient).not.toHaveBeenCalled();
	});

	it("returns created client", async () => {
		const clientsService = {
			createClient: vi.fn().mockResolvedValue(client),
		} as unknown as ClientsService;
		const controller = new ClientsController(clientsService);

		await expect(
			controller.createClient(actor, {
				name: " Иван ",
				phone: " +7 (999) 123-45-67 ",
				description: "",
			}),
		).resolves.toEqual({ client });
		expect(clientsService.createClient).toHaveBeenCalledWith(actor, {
			name: "Иван",
			phone: "+7 (999) 123-45-67",
			description: null,
		});
	});

	it("validates update payload before calling service", async () => {
		const clientsService = {
			updateClient: vi.fn(),
		} as unknown as ClientsService;
		const controller = new ClientsController(clientsService);

		await expect(controller.updateClient(actor, "client1", {})).rejects.toThrow(AppError);
		expect(clientsService.updateClient).not.toHaveBeenCalled();
	});

	it("returns listed clients and parses query", async () => {
		const clientsService = {
			listClients: vi.fn().mockResolvedValue([client]),
		} as unknown as ClientsService;
		const controller = new ClientsController(clientsService);

		await expect(controller.listClients({ search: " Иван ", limit: "20" })).resolves.toEqual({
			clients: [client],
		});
		expect(clientsService.listClients).toHaveBeenCalledWith({
			search: "Иван",
			limit: 20,
		});
	});
});
