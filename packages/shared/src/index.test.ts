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
	CreateDistributorCashWithdrawalRequestSchema,
	CreateCourierLoadRequestSchema,
	CreateCourierSaleRequestSchema,
	CreateCourierUnloadRequestSchema,
	CreateNotificationRequestSchema,
	CreateUserRequestSchema,
	CompleteNotificationRequestSchema,
	CourierCashBalancesResponseSchema,
	CourierLoadOptionsResponseSchema,
	CourierProductBalancesResponseSchema,
	CourierSaleOptionsResponseSchema,
	CourierSaleResponseSchema,
	CourierUnloadOptionsResponseSchema,
	CourierUnloadResponseSchema,
	CreateProductTemplateRequestSchema,
	CreateRawMaterialTypeRequestSchema,
	CreateRawMaterialIntakeRequestSchema,
	DistributorCashBalancesResponseSchema,
	DistributorCashWithdrawalResponseSchema,
	DistributorInventoryResponseSchema,
	DistributorSaleOptionsResponseSchema,
	LoginSchema,
	NotificationsListQuerySchema,
	NotificationsListResponseSchema,
	NotificationResponseSchema,
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
		expect(permissionsForRole("director")).toContain("courier.stock.read");
		expect(permissionsForRole("director")).toContain("courier.cash.read");
		expect(permissionsForRole("director")).toContain("notification.read");
		expect(permissionsForRole("director")).not.toContain("notification.create");
		expect(permissionsForRole("director")).not.toContain("notification.complete");
		expect(permissionsForRole("director")).not.toContain("courier.stock.load");
		expect(permissionsForRole("director")).not.toContain("courier.sale.create");
		expect(permissionsForRole("director")).not.toContain("courier.unload.create");
		expect(permissionsForRole("director")).toContain("cash.withdraw");
		expect(permissionsForRole("commercial_manager")).toContain("client.read");
		expect(permissionsForRole("commercial_manager")).toContain("client.manage");
		expect(permissionsForRole("commercial_manager")).toContain("courier.stock.read");
		expect(permissionsForRole("commercial_manager")).toContain("courier.cash.read");
		expect(permissionsForRole("commercial_manager")).toContain("notification.read");
		expect(permissionsForRole("commercial_manager")).toContain("notification.create");
		expect(permissionsForRole("commercial_manager")).not.toContain("notification.complete");
		expect(permissionsForRole("commercial_manager")).not.toContain("courier.stock.load");
		expect(permissionsForRole("commercial_manager")).not.toContain("courier.sale.create");
		expect(permissionsForRole("commercial_manager")).not.toContain("courier.unload.create");
		expect(permissionsForRole("distributor_worker")).toContain("client.read");
		expect(permissionsForRole("distributor_worker")).toContain("client.manage");
		expect(permissionsForRole("distributor_worker")).not.toContain("courier.stock.read");
		expect(permissionsForRole("distributor_worker")).not.toContain("courier.cash.read");
		expect(permissionsForRole("distributor_worker")).not.toContain("notification.read");
		expect(permissionsForRole("courier")).toContain("client.read");
		expect(permissionsForRole("courier")).toContain("client.manage");
		expect(permissionsForRole("courier")).toContain("courier.stock.read");
		expect(permissionsForRole("courier")).toContain("courier.stock.load");
		expect(permissionsForRole("courier")).toContain("courier.cash.read");
		expect(permissionsForRole("courier")).toContain("courier.sale.create");
		expect(permissionsForRole("courier")).toContain("courier.unload.create");
		expect(permissionsForRole("courier")).not.toContain("notification.read");
		expect(permissionsForRole("courier")).not.toContain("cash.withdraw");
		expect(permissionsForRole("production_manager")).not.toContain("client.read");
		expect(permissionsForRole("production_manager")).not.toContain("client.manage");
		expect(permissionsForRole("production_manager")).not.toContain("courier.cash.read");
		expect(permissionsForRole("production_manager")).toContain("notification.read");
		expect(permissionsForRole("production_manager")).toContain("notification.complete");
		expect(permissionsForRole("production_manager")).not.toContain("notification.create");
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

	it("validates production notification contracts", () => {
		expect(CreateNotificationRequestSchema.parse({ message: " Сделать партию икры " })).toEqual({
			message: "Сделать партию икры",
		});
		expect(CreateNotificationRequestSchema.safeParse({ message: "" }).success).toBe(false);
		expect(CreateNotificationRequestSchema.safeParse({ message: "x".repeat(1001) }).success).toBe(false);
		expect(CompleteNotificationRequestSchema.parse({})).toEqual({});
		expect(CompleteNotificationRequestSchema.safeParse({ comment: "done" }).success).toBe(false);
		expect(NotificationsListQuerySchema.parse({})).toEqual({});
		expect(NotificationsListQuerySchema.parse({ status: "all" })).toEqual({ status: "all" });
		expect(NotificationsListQuerySchema.safeParse({ status: "archived" }).success).toBe(false);

		const notification = {
			id: "notification-1",
			message: "Сделать партию икры",
			status: "new",
			createdBy: {
				userId: "commercial-1",
				login: "commercial",
				displayName: "Commercial",
			},
			completedBy: null,
			createdAt: new Date(0).toISOString(),
			updatedAt: new Date(0).toISOString(),
			completedAt: null,
		};

		expect(NotificationResponseSchema.safeParse({ notification }).success).toBe(true);
		expect(NotificationsListResponseSchema.safeParse({
			items: [notification],
			summary: {
				newCount: 1,
				completedCount: 0,
			},
		}).success).toBe(true);
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
			CreateDistributorCashWithdrawalRequestSchema.parse({
				distributorId: "dist-1",
				amountCents: 50000,
				comment: " Забрал наличные ",
			}),
		).toEqual({
			distributorId: "dist-1",
			amountCents: 50000,
			comment: "Забрал наличные",
		});
		expect(
			CreateDistributorCashWithdrawalRequestSchema.parse({
				distributorId: "dist-1",
				amountCents: 50000,
			}),
		).toEqual({
			distributorId: "dist-1",
			amountCents: 50000,
		});
		expect(
			CreateDistributorCashWithdrawalRequestSchema.safeParse({
				distributorId: "dist-1",
				amountCents: 0,
			}).success,
		).toBe(false);
		expect(
			CreateDistributorCashWithdrawalRequestSchema.safeParse({
				distributorId: "dist-1",
				amountCents: 1.5,
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
					active: true,
					amountCents: 0,
					updatedAt: null,
				}],
			}).success,
		).toBe(true);
		expect(
			DistributorCashWithdrawalResponseSchema.safeParse({
				withdrawal: {
					id: "withdrawal-1",
					distributorId: "dist-1",
					amountCents: 50000,
					comment: null,
					operationId: "operation-1",
					actorUserId: "director-1",
					createdAt: new Date(0).toISOString(),
				},
				cashBalance: {
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					active: true,
					amountCents: 100000,
					updatedAt: new Date(0).toISOString(),
				},
			}).success,
		).toBe(true);
		expect(
			DistributorCashBalancesResponseSchema.safeParse({
				totalAmountCents: 10.5,
				items: [],
			}).success,
		).toBe(false);
	});

	it("validates courier load and balance contracts", () => {
		expect(
			CreateCourierLoadRequestSchema.parse({
				distributorProductBalanceId: "balance-1",
				quantity: 2,
				comment: " Загрузка курьера ",
			}),
		).toEqual({
			distributorProductBalanceId: "balance-1",
			quantity: 2,
			comment: "Загрузка курьера",
		});
		expect(
			CreateCourierLoadRequestSchema.safeParse({
				distributorProductBalanceId: "balance-1",
				quantity: 0,
			}).success,
		).toBe(false);
		expect(
			CreateCourierLoadRequestSchema.safeParse({
				distributorProductBalanceId: "balance-1",
				quantity: 1.5,
			}).success,
		).toBe(false);
		expect(
			CourierLoadOptionsResponseSchema.safeParse({
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
			CourierProductBalancesResponseSchema.safeParse({
				summary: {
					courierCount: 1,
					stockItemCount: 1,
					totalUnits: 4,
					totalStockValueCents: 500000,
				},
				courierSummaries: [{
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					stockItemCount: 1,
					totalUnits: 4,
					totalStockValueCents: 500000,
				}],
				items: [{
					id: "courier-balance-1",
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					unitPriceCents: 125000,
					quantity: 4,
					stockValueCents: 500000,
					updatedAt: new Date(0).toISOString(),
				}],
			}).success,
		).toBe(true);
		expect(
			CourierProductBalancesResponseSchema.safeParse({
				summary: {
					courierCount: 1,
					stockItemCount: 1,
					totalUnits: -1,
					totalStockValueCents: 500000,
				},
				courierSummaries: [],
				items: [],
			}).success,
		).toBe(false);
	});

	it("validates courier sale and cash balance contracts", () => {
		expect(
			CreateCourierSaleRequestSchema.parse({
				courierProductBalanceId: "courier-balance-1",
				clientId: "client-1",
				quantity: 2,
				paymentMethod: "cash",
				comment: " Продажа курьером ",
			}),
		).toEqual({
			courierProductBalanceId: "courier-balance-1",
			clientId: "client-1",
			quantity: 2,
			paymentMethod: "cash",
			comment: "Продажа курьером",
		});
		expect(
			CreateCourierSaleRequestSchema.safeParse({
				courierProductBalanceId: "courier-balance-1",
				clientId: "client-1",
				quantity: 0,
				paymentMethod: "cash",
			}).success,
		).toBe(false);
		expect(
			CreateCourierSaleRequestSchema.safeParse({
				courierProductBalanceId: "courier-balance-1",
				clientId: "client-1",
				quantity: 1.5,
				paymentMethod: "cash",
			}).success,
		).toBe(false);
		expect(
			CreateCourierSaleRequestSchema.safeParse({
				courierProductBalanceId: "courier-balance-1",
				clientId: "client-1",
				quantity: 1,
				paymentMethod: "card",
			}).success,
		).toBe(false);
		expect(
			CourierSaleOptionsResponseSchema.safeParse({
				items: [{
					courierProductBalanceId: "courier-balance-1",
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
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
			CourierCashBalancesResponseSchema.safeParse({
				totalAmountCents: 0,
				courierCount: 1,
				items: [{
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					amountCents: 0,
					updatedAt: null,
				}],
			}).success,
		).toBe(true);
		expect(
			CourierCashBalancesResponseSchema.safeParse({
				totalAmountCents: 10.5,
				courierCount: 1,
				items: [],
			}).success,
		).toBe(false);
		expect(
			CourierSaleResponseSchema.safeParse({
				sale: {
					id: "sale-1",
					courierProductBalanceId: "courier-balance-1",
					courierUserId: "courier-1",
					productBatchId: "batch-1",
					clientId: "client-1",
					quantity: 2,
					unitPriceCents: 125000,
					totalCents: 250000,
					paymentMethod: "cashless",
					comment: null,
					operationId: "operation-1",
					actorUserId: "courier-1",
					createdAt: new Date(0).toISOString(),
				},
				courierProductBalance: {
					id: "courier-balance-1",
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					unitPriceCents: 125000,
					quantity: 2,
					stockValueCents: 250000,
					updatedAt: new Date(0).toISOString(),
				},
				cashBalance: {
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					amountCents: 0,
					updatedAt: null,
				},
			}).success,
		).toBe(true);
	});

	it("validates courier unload contracts", () => {
		expect(
			CreateCourierUnloadRequestSchema.parse({
				distributorId: "dist-1",
				items: [
					{ courierProductBalanceId: "courier-balance-1", quantity: 2 },
					{ courierProductBalanceId: "courier-balance-2", quantity: 1 },
				],
				cashAmountCents: 125000,
				comment: " Сгрузка смены ",
			}),
		).toEqual({
			distributorId: "dist-1",
			items: [
				{ courierProductBalanceId: "courier-balance-1", quantity: 2 },
				{ courierProductBalanceId: "courier-balance-2", quantity: 1 },
			],
			cashAmountCents: 125000,
			comment: "Сгрузка смены",
		});
		expect(
			CreateCourierUnloadRequestSchema.safeParse({
				distributorId: "dist-1",
				items: [],
				cashAmountCents: 125000,
			}).success,
		).toBe(true);
		expect(
			CreateCourierUnloadRequestSchema.safeParse({
				distributorId: "dist-1",
				items: [],
				cashAmountCents: 0,
			}).success,
		).toBe(false);
		expect(
			CreateCourierUnloadRequestSchema.safeParse({
				distributorId: "dist-1",
				items: [
					{ courierProductBalanceId: "courier-balance-1", quantity: 1 },
					{ courierProductBalanceId: "courier-balance-1", quantity: 1 },
				],
				cashAmountCents: 0,
			}).success,
		).toBe(false);
		expect(
			CreateCourierUnloadRequestSchema.safeParse({
				distributorId: "dist-1",
				items: [{ courierProductBalanceId: "courier-balance-1", quantity: 0 }],
				cashAmountCents: 0,
			}).success,
		).toBe(false);
		expect(
			CourierUnloadOptionsResponseSchema.safeParse({
				distributors: [{ distributorId: "dist-1", distributorName: "Распределитель Центральный" }],
				productItems: [{
					courierProductBalanceId: "courier-balance-1",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					unitPriceCents: 125000,
					availableQuantity: 4,
					stockValueCents: 500000,
					updatedAt: new Date(0).toISOString(),
				}],
				cashBalance: {
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					amountCents: 100000,
					updatedAt: new Date(0).toISOString(),
				},
			}).success,
		).toBe(true);
		expect(
			CourierUnloadResponseSchema.safeParse({
				unload: {
					id: "unload-1",
					courierUserId: "courier-1",
					distributorId: "dist-1",
					cashAmountCents: 125000,
					comment: null,
					operationId: "operation-1",
					actorUserId: "courier-1",
					createdAt: new Date(0).toISOString(),
				},
				items: [{
					id: "unload-item-1",
					courierUnloadId: "unload-1",
					courierProductBalanceId: "courier-balance-1",
					distributorProductBalanceId: "distributor-balance-1",
					productBatchId: "batch-1",
					quantity: 2,
					unitPriceCents: 125000,
					stockValueCents: 250000,
				}],
				courierProductBalances: [{
					id: "courier-balance-1",
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					unitPriceCents: 125000,
					quantity: 2,
					stockValueCents: 250000,
					updatedAt: new Date(0).toISOString(),
				}],
				courierCashBalance: {
					courierUserId: "courier-1",
					courierLogin: "courier",
					courierDisplayName: "Курьер",
					amountCents: 0,
					updatedAt: new Date(0).toISOString(),
				},
				distributorProductBalances: [{
					id: "distributor-balance-1",
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					productBatchId: "batch-1",
					productName: "Икра горбуши",
					priceCents: 125000,
					quantity: 2,
					stockValueCents: 250000,
					updatedAt: new Date(0).toISOString(),
				}],
				distributorCashBalance: {
					distributorId: "dist-1",
					distributorName: "Распределитель Центральный",
					active: true,
					amountCents: 125000,
					updatedAt: new Date(0).toISOString(),
				},
			}).success,
		).toBe(true);
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
