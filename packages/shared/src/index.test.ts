import { describe, expect, it } from "vitest";
import {
	addMoneyCents,
	formatMoneyCents,
	HEALTH_RESPONSE_STATUS,
	moneyCents,
	permissionsForRole,
	quantity,
	rublePriceToCents,
	ROLES,
	subtractMoneyCents,
	subtractQuantity,
	CreatePackagingIntakeRequestSchema,
	CreateProductBatchRequestSchema,
	CreateProductTransferRequestSchema,
	CreateDistributorSaleRequestSchema,
	CreateUserRequestSchema,
	CreateProductTemplateRequestSchema,
	CreateRawMaterialTypeRequestSchema,
	CreateRawMaterialIntakeRequestSchema,
	DistributorCashBalancesResponseSchema,
	DistributorInventoryResponseSchema,
	DistributorSaleOptionsResponseSchema,
	LoginSchema,
	ProductionOptionsResponseSchema,
	ProductionTransferOptionsResponseSchema,
	ProductTemplateSchema,
	CreateClientRequestSchema,
	ClientSearchQuerySchema,
	UpdateClientRequestSchema,
	UpdateRawMaterialTypeRequestSchema,
	UpdateUserRoleRequestSchema,
	UserSummarySchema,
	normalizeClientPhone,
} from "./index";

describe("shared contracts", () => {
	it("keeps health status and CRM roles available", () => {
		expect(HEALTH_RESPONSE_STATUS).toBe("ok");
		expect(ROLES).toContain("courier");
		expect(ROLES).toContain("distributor_worker");
	});

	it("keeps baseline permissions explicit by role", () => {
		expect(permissionsForRole("admin")).toContain("users.manage");
		expect(permissionsForRole("director")).toContain("catalog.manage");
		expect(permissionsForRole("director")).toContain("client.read");
		expect(permissionsForRole("director")).not.toContain("client.manage");
		expect(permissionsForRole("director")).toContain("cash.withdraw");
		expect(permissionsForRole("commercial_manager")).toContain("client.read");
		expect(permissionsForRole("commercial_manager")).toContain("client.manage");
		expect(permissionsForRole("distributor_worker")).toContain("client.read");
		expect(permissionsForRole("distributor_worker")).toContain("client.manage");
		expect(permissionsForRole("courier")).toContain("client.read");
		expect(permissionsForRole("courier")).toContain("client.manage");
		expect(permissionsForRole("courier")).not.toContain("cash.withdraw");
		expect(permissionsForRole("production_manager")).not.toContain("client.read");
		expect(permissionsForRole("production_manager")).not.toContain("client.manage");
	});

	it("handles money only as integer cents", () => {
		const left = moneyCents(10_50);
		const right = moneyCents(250);

		expect(addMoneyCents(left, right)).toBe(1300);
		expect(subtractMoneyCents(left, right)).toBe(800);
		expect(formatMoneyCents(left)).toBe("10.50");
		expect(rublePriceToCents("1200")).toBe(120000);
		expect(rublePriceToCents("950.50")).toBe(95050);
		expect(rublePriceToCents("950,5")).toBe(95050);
		expect(() => moneyCents(10.5)).toThrow();
		expect(() => rublePriceToCents("10.999")).toThrow();
		expect(() => rublePriceToCents("-1")).toThrow();
		expect(() => subtractMoneyCents(right, left)).toThrow();
	});

	it("handles quantities with explicit units", () => {
		expect(subtractQuantity(quantity(10, "kg"), quantity(3, "kg"))).toEqual({
			value: 7,
			unit: "kg",
		});
		expect(() => quantity(-1, "kg")).toThrow();
		expect(() => subtractQuantity(quantity(1, "kg"), quantity(1, "piece"))).toThrow();
	});

	it("validates user management contracts", () => {
		expect(LoginSchema.parse("Director-1")).toBe("director-1");
		expect(LoginSchema.safeParse("bad login").success).toBe(false);
		expect(CreateUserRequestSchema.safeParse({ name: "Nikita", role: "director" }).success).toBe(true);
		expect(
			CreateUserRequestSchema.safeParse({ name: "Nikita", role: "director", login: "director-1" }).success,
		).toBe(true);
		expect(UpdateUserRoleRequestSchema.safeParse({ role: "director" }).success).toBe(true);
		expect(UpdateUserRoleRequestSchema.safeParse({ role: "owner" }).success).toBe(false);
		expect(
			UserSummarySchema.safeParse({
				id: "u1",
				name: "Nikita",
				login: "director",
				role: "director",
				createdAt: new Date(0).toISOString(),
				updatedAt: new Date(0).toISOString(),
			}).success,
		).toBe(true);
	});

	it("validates catalog contracts", () => {
		expect(CreateRawMaterialTypeRequestSchema.parse({ name: " Горбуша ", unit: " кг " })).toEqual({
			name: "Горбуша",
			unit: "кг",
		});
		expect(CreateRawMaterialTypeRequestSchema.safeParse({ name: "", unit: "кг" }).success).toBe(false);
		expect(UpdateRawMaterialTypeRequestSchema.safeParse({ active: false }).success).toBe(true);
		expect(
			CreateProductTemplateRequestSchema.safeParse({
				name: "Икра горбуши",
				rawMaterialTypeId: "raw-1",
				packagingTypeId: "pack-1",
				priceCents: 125000,
			}).success,
		).toBe(true);
		expect(
			ProductTemplateSchema.safeParse({
				id: "template-1",
				name: "Икра горбуши",
				rawMaterialTypeId: "raw-1",
				packagingTypeId: "pack-1",
				priceCents: 125000,
				active: true,
				createdAt: new Date(0).toISOString(),
				updatedAt: new Date(0).toISOString(),
				rawMaterialType: {
					id: "raw-1",
					name: "Горбуша",
					unit: "кг",
					active: true,
				},
				packagingType: {
					id: "pack-1",
					name: "Банка",
					unit: "шт",
					active: true,
				},
			}).success,
		).toBe(true);
	});

	it("validates production contracts", () => {
		expect(
			CreateRawMaterialIntakeRequestSchema.safeParse({
				rawMaterialTypeId: "raw-1",
				quantity: 12.5,
			}).success,
		).toBe(true);
		expect(
			CreatePackagingIntakeRequestSchema.safeParse({
				packagingTypeId: "pack-1",
				quantity: 12,
			}).success,
		).toBe(true);
		expect(
			CreateProductBatchRequestSchema.safeParse({
				productTemplateId: "template-1",
				quantity: 10,
				consumedRawMaterialQuantity: 2.5,
			}).success,
		).toBe(true);
		expect(
			ProductionOptionsResponseSchema.safeParse({
				rawMaterialTypes: [],
				packagingTypes: [],
				productTemplates: [],
			}).success,
		).toBe(true);
		expect(
			CreateProductBatchRequestSchema.safeParse({
				productTemplateId: "template-1",
				quantity: 0,
				consumedRawMaterialQuantity: 2.5,
			}).success,
		).toBe(false);
		expect(
			CreateProductTransferRequestSchema.parse({
				productBatchId: "batch-1",
				distributorId: "dist-1",
				quantity: 4,
				comment: " Перемещение на Центральный ",
			}),
		).toEqual({
			productBatchId: "batch-1",
			distributorId: "dist-1",
			quantity: 4,
			comment: "Перемещение на Центральный",
		});
		expect(
			CreateProductTransferRequestSchema.safeParse({
				productBatchId: "batch-1",
				distributorId: "dist-1",
				quantity: 0,
			}).success,
		).toBe(false);
		expect(
			CreateProductTransferRequestSchema.safeParse({
				productBatchId: "batch-1",
				distributorId: "dist-1",
				quantity: 1.5,
			}).success,
		).toBe(false);
		expect(
			ProductionTransferOptionsResponseSchema.safeParse({
				distributors: [],
				workshopProductBalances: [],
			}).success,
		).toBe(true);
	});

	it("validates distributor inventory contracts", () => {
		expect(
			DistributorInventoryResponseSchema.safeParse({
				summary: {
					distributorCount: 0,
					stockItemCount: 0,
					totalUnits: 0,
					totalStockValueCents: 0,
				},
				distributorSummaries: [],
				items: [],
			}).success,
		).toBe(true);
		expect(
			DistributorInventoryResponseSchema.safeParse({
				summary: {
					distributorCount: 1,
					stockItemCount: 1,
					totalUnits: 4,
					totalStockValueCents: 500000,
				},
				distributorSummaries: [{
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					stockItemCount: 1,
					totalUnits: 4,
					totalStockValueCents: 500000,
				}],
				items: [{
					id: "balance-1",
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					priceCents: 125000,
					quantity: 4,
					stockValueCents: 500000,
					updatedAt: new Date(0).toISOString(),
				}],
			}).success,
		).toBe(true);
		expect(
			DistributorInventoryResponseSchema.safeParse({
				summary: {
					distributorCount: 1,
					stockItemCount: 1,
					totalUnits: -1,
					totalStockValueCents: 500000,
				},
				distributorSummaries: [],
				items: [],
			}).success,
		).toBe(false);
		expect(
			DistributorInventoryResponseSchema.safeParse({
				summary: {
					distributorCount: 1,
					stockItemCount: 1,
					totalUnits: 1,
					totalStockValueCents: 10.5,
				},
				distributorSummaries: [],
				items: [],
			}).success,
		).toBe(false);
	});

	it("validates distributor sale contracts", () => {
		expect(
			CreateDistributorSaleRequestSchema.parse({
				distributorProductBalanceId: "balance-1",
				clientId: "client-1",
				quantity: 2,
				paymentMethod: "cash",
				comment: " Продажа клиенту ",
			}),
		).toEqual({
			distributorProductBalanceId: "balance-1",
			clientId: "client-1",
			quantity: 2,
			paymentMethod: "cash",
			comment: "Продажа клиенту",
		});
		expect(
			CreateDistributorSaleRequestSchema.safeParse({
				distributorProductBalanceId: "balance-1",
				clientId: "client-1",
				quantity: 0,
				paymentMethod: "cash",
			}).success,
		).toBe(false);
		expect(
			CreateDistributorSaleRequestSchema.safeParse({
				distributorProductBalanceId: "balance-1",
				clientId: "client-1",
				quantity: 1.5,
				paymentMethod: "cash",
			}).success,
		).toBe(false);
		expect(
			CreateDistributorSaleRequestSchema.safeParse({
				distributorProductBalanceId: "balance-1",
				clientId: "client-1",
				quantity: 1,
				paymentMethod: "card",
			}).success,
		).toBe(false);
		expect(
			DistributorSaleOptionsResponseSchema.safeParse({
				items: [{
					distributorProductBalanceId: "balance-1",
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					unitPriceCents: 125000,
					availableQuantity: 4,
					stockValueCents: 500000,
					updatedAt: new Date(0).toISOString(),
				}],
			}).success,
		).toBe(true);
		expect(
			DistributorCashBalancesResponseSchema.safeParse({
				totalAmountCents: 0,
				items: [{
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					amountCents: 0,
					updatedAt: null,
				}],
			}).success,
		).toBe(true);
		expect(
			DistributorCashBalancesResponseSchema.safeParse({
				totalAmountCents: 10.5,
				items: [],
			}).success,
		).toBe(false);
	});

	it("validates client contracts", () => {
		expect(normalizeClientPhone("+7 (999) 123-45-67")).toBe("79991234567");
		expect(
			CreateClientRequestSchema.parse({
				name: " Иван ",
				phone: " +7 (999) 123-45-67 ",
				description: " Покупает икру ",
			}),
		).toEqual({
			name: "Иван",
			phone: "+7 (999) 123-45-67",
			description: "Покупает икру",
		});
		expect(
			CreateClientRequestSchema.parse({
				name: "Иван",
				phone: "+7 (999) 123-45-67",
				description: "",
			}),
		).toEqual({
			name: "Иван",
			phone: "+7 (999) 123-45-67",
			description: null,
		});
		expect(CreateClientRequestSchema.safeParse({ name: "", phone: "+7" }).success).toBe(false);
		expect(CreateClientRequestSchema.safeParse({ name: "Иван", phone: "" }).success).toBe(false);
		expect(CreateClientRequestSchema.safeParse({ name: "Иван", phone: "---" }).success).toBe(false);
		expect(UpdateClientRequestSchema.safeParse({}).success).toBe(false);
		expect(UpdateClientRequestSchema.safeParse({ name: "" }).success).toBe(false);
		expect(UpdateClientRequestSchema.safeParse({ phone: "---" }).success).toBe(false);
		expect(UpdateClientRequestSchema.safeParse({ description: "" }).success).toBe(true);
		expect(ClientSearchQuerySchema.parse({ search: " Иван ", limit: "20" })).toEqual({
			search: "Иван",
			limit: 20,
		});
		expect(ClientSearchQuerySchema.safeParse({ search: "x".repeat(101) }).success).toBe(false);
	});
});
