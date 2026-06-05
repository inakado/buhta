import { describe, expect, it } from "vitest";
import type { OperationHistoryItem } from "@buhta/shared";
import { buildOperationDetailPresentation } from "./operation-detail-presenter";

const baseItem: OperationHistoryItem = {
	id: "audit-1",
	operationId: "operation-1",
	operationType: "distributor.sale.create",
	action: "distributor.sale.create",
	status: "succeeded",
	entityType: "distributor_sale",
	entityId: "sale-1",
	createdAt: "2026-06-05T01:16:00.000Z",
	actor: {
		userId: "director-1",
		login: "director",
		displayName: "Director",
		role: "director",
	},
	summary: "Продажа",
	details: {},
};

describe("operation detail presenter", () => {
	it("formats sale details and hides technical ids", () => {
		const text = present({
			operationType: "distributor.sale.create",
			entityType: "distributor_sale",
			amountCents: 250000,
			quantity: 2,
			details: {
				distributorSaleId: "sale-1",
				distributorProductBalanceId: "balance-1",
				distributorName: "Портовая 1",
				productBatchId: "batch-1",
				productName: "Икра горбуши",
				clientId: "client-1",
				clientName: "Иван Петров",
				quantity: 2,
				unitPriceCents: 125000,
				totalCents: 250000,
				paymentMethod: "cash",
				stockBalanceBefore: 5,
				stockBalanceAfter: 3,
				token: "[redacted]",
			},
		});

		expect(text).toContain("Иван Петров");
		expect(text).toContain("Икра горбуши");
		expect(text).toContain("2 шт");
		expect(text).toContain("1 250.00 ₽");
		expect(text).toContain("2 500.00 ₽");
		expect(text).toContain("Наличные");
		expect(text).toContain("5 -> 3");
		expect(text).not.toContain("client-1");
		expect(text).not.toContain("batch-1");
		expect(text).not.toContain("balance-1");
		expect(text).not.toContain("[redacted]");
	});

	it("hides password reset secrets and ids", () => {
		const text = present({
			operationType: "user.password.reset",
			entityType: "user",
			details: {
				targetUserId: "user-1",
				login: "worker",
				password: "Pass123!",
				token: "[redacted]",
				hash: "hash-value",
			},
		});

		expect(text).toContain("worker");
		expect(text).not.toContain("user-1");
		expect(text).not.toContain("Pass123!");
		expect(text).not.toContain("hash-value");
		expect(text).not.toContain("[redacted]");
	});

	it("shows client updates and hides normalized phone and client id", () => {
		const text = present({
			operationType: "client.update",
			entityType: "client",
			details: {
				clientId: "client-1",
				changes: {
					name: "Петр Петров",
					phone: "+7 900 000-00-00",
					phoneNormalized: "79000000000",
					description: "Постоянный клиент",
				},
			},
		});

		expect(text).toContain("Петр Петров");
		expect(text).toContain("+7 900 000-00-00");
		expect(text).toContain("Постоянный клиент");
		expect(text).not.toContain("client-1");
		expect(text).not.toContain("79000000000");
		expect(text).not.toContain("phoneNormalized");
	});

	it("shows catalog archive/update details without ids", () => {
		const archiveText = present({
			operationType: "catalog.product_template.archive",
			entityType: "product_template",
			details: {
				productTemplateId: "template-1",
				name: "Икра А",
				active: false,
			},
		});
		const updateText = present({
			operationType: "catalog.raw_material_type.update",
			entityType: "raw_material_type",
			details: {
				rawMaterialTypeId: "raw-1",
				changes: {
					name: "Сырье А",
					active: true,
				},
			},
		});

		expect(archiveText).toContain("Икра А");
		expect(archiveText).toContain("Нет");
		expect(archiveText).not.toContain("template-1");
		expect(updateText).toContain("Сырье А");
		expect(updateText).toContain("Да");
		expect(updateText).not.toContain("raw-1");
	});

	it("shows production notification text, actors and statuses", () => {
		const createText = present({
			operationType: "production.notification.create",
			entityType: "production_notification",
			details: {
				notificationId: "notification-1",
				message: "Подготовить партию к вечеру",
				createdByName: "Иван Коммерческий",
				recipientRole: "production_manager",
				statusAfter: "new",
			},
		});
		const completeText = present({
			operationType: "production.notification.complete",
			entityType: "production_notification",
			details: {
				notificationId: "notification-1",
				message: "Подготовить партию к вечеру",
				createdByName: "Иван Коммерческий",
				completedByName: "Заведующий производством",
				statusBefore: "new",
				statusAfter: "completed",
			},
		});

		expect(createText).toContain("Подготовить партию к вечеру");
		expect(createText).toContain("Иван Коммерческий");
		expect(createText).toContain("Заведующий производством");
		expect(createText).toContain("Новая");
		expect(createText).not.toContain("notification-1");
		expect(completeText).toContain("Заведующий производством");
		expect(completeText).toContain("Выполнена");
		expect(completeText).not.toContain("notification-1");
	});

	it("renders courier unload item arrays as readable groups without balance ids", () => {
		const text = present({
			operationType: "courier.unload.create",
			entityType: "courier_unload",
			details: {
				courierUnloadId: "unload-1",
				courierLogin: "courier",
				distributorName: "Портовая 1",
				items: [{
					courierProductBalanceId: "courier-balance-1",
					distributorProductBalanceId: "distributor-balance-1",
					productBatchId: "batch-1",
					productName: "Икра А",
					quantity: 2,
					unitPriceCents: 100000,
					stockValueCents: 200000,
					courierBalanceBefore: 5,
					courierBalanceAfter: 3,
					distributorBalanceBefore: 1,
					distributorBalanceAfter: 3,
				}],
				cashAmountCents: 50000,
				courierCashBalanceBefore: 70000,
				courierCashBalanceAfter: 20000,
			},
		});

		expect(text).toContain("courier");
		expect(text).toContain("Портовая 1");
		expect(text).toContain("Икра А");
		expect(text).toContain("2 шт");
		expect(text).toContain("1 000.00 ₽/шт");
		expect(text).toContain("5 -> 3");
		expect(text).toContain("1 -> 3");
		expect(text).not.toContain("courier-balance-1");
		expect(text).not.toContain("distributor-balance-1");
		expect(text).not.toContain("batch-1");
	});

	it("shows sale cancellation reason and reverse balances without original sale ids", () => {
		const text = present({
			operationType: "distributor.sale.cancel",
			entityType: "distributor_sale_cancellation",
			details: {
				distributorSaleCancellationId: "cancel-1",
				distributorSaleId: "sale-1",
				originalSaleOperationId: "operation-sale-1",
				distributorName: "Портовая 1",
				productName: "Икра А",
				clientName: "Иван Петров",
				quantity: 2,
				totalCents: 250000,
				paymentMethod: "cash",
				productBalanceBefore: 3,
				productBalanceAfter: 5,
				cashBalanceBefore: 300000,
				cashBalanceAfter: 50000,
				reason: "Ошибочная продажа",
			},
		});

		expect(text).toContain("Ошибочная продажа");
		expect(text).toContain("Иван Петров");
		expect(text).toContain("3 -> 5");
		expect(text).toContain("3 000.00 ₽ -> 500.00 ₽");
		expect(text).not.toContain("cancel-1");
		expect(text).not.toContain("sale-1");
		expect(text).not.toContain("operation-sale-1");
	});

	it("shows discount price change and hides source and target balance ids", () => {
		const text = present({
			operationType: "distributor.discount.assign",
			entityType: "product_discount_assignment",
			details: {
				productDiscountAssignmentId: "discount-1",
				sourceDistributorProductBalanceId: "source-balance-1",
				discountedDistributorProductBalanceId: "target-balance-1",
				distributorName: "Портовая 1",
				productName: "Икра А",
				quantity: 6,
				baseUnitPriceCents: 125000,
				sourceUnitPriceCents: 125000,
				discountedUnitPriceCents: 100000,
				discountCentsPerUnit: 25000,
				discountTotalCents: 150000,
				sourceQuantityBefore: 10,
				sourceQuantityAfter: 4,
				discountedQuantityBefore: 0,
				discountedQuantityAfter: 6,
			},
		});

		expect(text).toContain("Икра А");
		expect(text).toContain("6 шт");
		expect(text).toContain("1 250.00 ₽");
		expect(text).toContain("1 000.00 ₽");
		expect(text).toContain("250.00 ₽");
		expect(text).toContain("10 -> 4");
		expect(text).toContain("0 -> 6");
		expect(text).not.toContain("source-balance-1");
		expect(text).not.toContain("target-balance-1");
		expect(text).not.toContain("discount-1");
	});

	it("shows production transfer product, distributor and stock movement without ids", () => {
		const text = present({
			operationType: "production.product_transfer.create",
			entityType: "product_transfer",
			details: {
				productBatchId: "batch-1",
				productName: "Икра А",
				distributorId: "distributor-1",
				distributorName: "Портовая 1",
				quantity: 20,
				unitPriceCents: 125000,
				stockValueCents: 2500000,
				workshopBalanceBefore: 50,
				workshopBalanceAfter: 30,
				distributorBalanceBefore: 0,
				distributorBalanceAfter: 20,
			},
		});

		expect(text).toContain("Икра А");
		expect(text).toContain("Портовая 1");
		expect(text).toContain("20 шт");
		expect(text).toContain("25 000.00 ₽");
		expect(text).toContain("50 -> 30");
		expect(text).toContain("0 -> 20");
		expect(text).not.toContain("batch-1");
		expect(text).not.toContain("distributor-1");
	});

	it("formats product creation price instead of showing raw priceCents", () => {
		const text = present({
			operationType: "catalog.product_template.create",
			entityType: "product_template",
			details: {
				productTemplateId: "template-1",
				name: "browser-product",
				priceCents: 125000,
			},
		});

		expect(text).toContain("browser-product");
		expect(text).toContain("1 250.00 ₽");
		expect(text).not.toContain("price Cents");
		expect(text).not.toContain("125000");
		expect(text).not.toContain("template-1");
	});

	it("formats unknown nested details and hides id-like keys case-insensitively", () => {
		const text = present({
			operationType: "unknown.operation",
			entityType: "unknown_entity",
			details: {
				outerID: "outer-1",
				totalCents: 123456,
				statusAfter: "completed",
				lines: [{
					lineId: "line-1",
					name: "Строка А",
					amountCents: 100000,
				}, {
					ID: "line-2",
					name: "Строка Б",
					active: true,
				}],
				nested: {
					childId: "child-1",
					comment: "Видимый комментарий",
				},
			},
		});

		expect(text).toContain("1 234.56 ₽");
		expect(text).toContain("Выполнена");
		expect(text).toContain("Строка А");
		expect(text).toContain("1 000.00 ₽");
		expect(text).toContain("Строка Б");
		expect(text).toContain("Видимый комментарий");
		expect(text).not.toContain("outer-1");
		expect(text).not.toContain("line-1");
		expect(text).not.toContain("line-2");
		expect(text).not.toContain("child-1");
	});
});

function present(overrides: Partial<OperationHistoryItem>): string {
	const presentation = buildOperationDetailPresentation({
		...baseItem,
		...overrides,
		actor: {
			...baseItem.actor,
			...overrides.actor,
		},
	});

	return [
		presentation.title,
		presentation.description,
		...presentation.summary.flatMap((row) => [row.label, row.value]),
		...presentation.sections.flatMap((section) => [
			section.title,
			...section.rows.flatMap((row) => [row.label, row.value]),
		]),
	].join("\n");
}
