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
	CreateUserRequestSchema,
	CreateProductTemplateRequestSchema,
	CreateRawMaterialTypeRequestSchema,
	CreateRawMaterialIntakeRequestSchema,
	LoginSchema,
	ProductionOptionsResponseSchema,
	ProductTemplateSchema,
	UpdateRawMaterialTypeRequestSchema,
	UpdateUserRoleRequestSchema,
	UserSummarySchema,
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
		expect(permissionsForRole("director")).toContain("cash.withdraw");
		expect(permissionsForRole("courier")).not.toContain("cash.withdraw");
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
	});
});
