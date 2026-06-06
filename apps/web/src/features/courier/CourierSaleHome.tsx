"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { ReceiptText, UserPlus } from "lucide-react";
import type { CourierSaleOption, PaymentMethod } from "@buhta/shared";
import {
	createClient,
	createCourierSale,
	getCourierSaleOptions,
	listClients,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { ClientCombobox } from "../clients/ClientCombobox";
import { PaymentMethodSegmentedControl } from "../operations/PaymentMethodSegmentedControl";
import { OperationProductSelect } from "../operations/OperationProductSelect";
import { getSaleSubmitBlockReason } from "../operations/operation-submit-reasons";

export function CourierSaleHome({
	onSaleSuccess,
	online,
}: {
	onSaleSuccess: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [activeClientSearch, setActiveClientSearch] = useState("");
	const [selectedClientId, setSelectedClientId] = useState("");
	const [selectedBalanceId, setSelectedBalanceId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const [showNewClientForm, setShowNewClientForm] = useState(false);
	const [newClientName, setNewClientName] = useState("");
	const [newClientPhone, setNewClientPhone] = useState("");
	const [newClientDescription, setNewClientDescription] = useState("");
	const clients = useQuery({
		queryKey: ["clients", activeClientSearch],
		queryFn: () => listClients(activeClientSearch),
	});
	const saleOptions = useQuery({
		queryKey: ["courier", "sale-options"],
		queryFn: getCourierSaleOptions,
	});
	const selectedClient = clients.data?.clients.find((client) => client.id === selectedClientId);
	const selectedStock = saleOptions.data?.items.find((item) =>
		item.courierProductBalanceId === selectedBalanceId,
	);
	const parsedQuantity = Number(quantity);
	const saleTotalCents = selectedStock && Number.isInteger(parsedQuantity) && parsedQuantity > 0
		? selectedStock.unitPriceCents * parsedQuantity
		: 0;
	const summaryQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0
		? `${parsedQuantity} шт`
		: "Количество не задано";
	const createClientMutation = useMutation({
		mutationFn: () => createClient({
			name: newClientName,
			phone: newClientPhone,
			description: newClientDescription,
		}),
		onSuccess: async (response) => {
			setSelectedClientId(response.client.id);
			setNewClientName("");
			setNewClientPhone("");
			setNewClientDescription("");
			setShowNewClientForm(false);
			await queryClient.invalidateQueries({ queryKey: ["clients"] });
		},
	});
	const saleMutation = useMutation({
		mutationFn: () => createCourierSale({
			courierProductBalanceId: selectedBalanceId,
			clientId: selectedClientId,
			quantity: parsedQuantity,
			paymentMethod,
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			setSelectedClientId("");
			setSelectedBalanceId("");
			setQuantity("");
			setPaymentMethod("cash");
			setComment("");
			setLocalError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "sales", "recent"] }),
				queryClient.invalidateQueries({ queryKey: ["clients"] }),
			]);
			onSaleSuccess();
		},
	});
	const submitBlockReason = getSaleSubmitBlockReason({
		availableQuantity: selectedStock?.availableQuantity,
		hasClient: !!selectedClientId,
		hasProduct: !!selectedStock,
		hasProductOptions: (saleOptions.data?.items.length ?? 0) > 0,
		loadingOptions: saleOptions.isLoading,
		online,
		pending: saleMutation.isPending,
		quantity: parsedQuantity,
	});
	const submitDisabled = !!submitBlockReason;

	function handleCreateClient(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!newClientName.trim()) {
			setLocalError("Введите имя нового клиента.");
			return;
		}
		if (!newClientPhone.trim()) {
			setLocalError("Введите телефон нового клиента.");
			return;
		}

		createClientMutation.mutate();
	}

	function handleClientChange(clientId: string) {
		setSelectedClientId(clientId);
		if (clientId) {
			setShowNewClientForm(false);
		}
	}

	function handleSaleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!selectedClientId) {
			setLocalError("Выберите клиента.");
			return;
		}
		if (!selectedStock) {
			setLocalError("Выберите продукцию.");
			return;
		}
		if (!isValidQuantity(parsedQuantity, selectedStock)) {
			setLocalError("Количество должно быть целым числом не больше доступного количества.");
			return;
		}

		saleMutation.mutate();
	}

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Продажа</h2>
			</div>

			<div className="form-panel">
				<div className="section-heading compact">
					<h2>Клиент</h2>
				</div>
				<ClientCombobox
					clients={clients.data?.clients ?? []}
					loading={clients.isLoading}
					onClientChange={handleClientChange}
					onQueryChange={setActiveClientSearch}
					query={activeClientSearch}
					selectedClient={selectedClient}
					selectedClientId={selectedClientId}
				/>
				{clients.isLoading ? <p className="muted">Загрузка клиентов</p> : null}
				{clients.isError ? <p className="form-error">{clients.error.message}</p> : null}

				{selectedClientId ? null : (
					<button
						className="secondary-button compact-button"
						disabled={!online}
						onClick={() => setShowNewClientForm((current) => !current)}
						type="button"
					>
						<UserPlus aria-hidden size={16} />
						Новый клиент
					</button>
				)}

				{showNewClientForm && !selectedClientId ? (
					<form className="nested-form" onSubmit={handleCreateClient}>
						<label className="field">
							<span>Имя нового клиента</span>
							<input
								onChange={(event) => setNewClientName(event.target.value)}
								type="text"
								value={newClientName}
							/>
						</label>
						<label className="field">
							<span>Телефон нового клиента</span>
							<input
								onChange={(event) => setNewClientPhone(event.target.value)}
								type="tel"
								value={newClientPhone}
							/>
						</label>
						<label className="field">
							<span>Описание нового клиента</span>
							<textarea
								onChange={(event) => setNewClientDescription(event.target.value)}
								rows={2}
								value={newClientDescription}
							/>
						</label>
						{createClientMutation.isError ? (
							<p className="form-error">{createClientMutation.error.message}</p>
						) : null}
						<button className="secondary-button" disabled={!online || createClientMutation.isPending} type="submit">
							Создать клиента
						</button>
					</form>
				) : null}
			</div>

			<form className="form-panel" onSubmit={handleSaleSubmit}>
				<div className="section-heading compact">
					<h2>Детали продажи</h2>
				</div>
				<OperationProductSelect
					label="Продукция"
					onValueChange={setSelectedBalanceId}
					options={(saleOptions.data?.items ?? []).map((item) => ({
						discounted: item.discounted,
						id: item.courierProductBalanceId,
						label: item.productName,
						meta: `${item.availableQuantity} шт · ${formatRubles(item.unitPriceCents)} ₽`,
					}))}
					placeholder="Выберите продукцию"
					value={selectedBalanceId}
				/>
				{saleOptions.isLoading ? <p className="muted">Загрузка продукции</p> : null}
				{saleOptions.isError ? <p className="form-error">{saleOptions.error.message}</p> : null}
				{!saleOptions.isLoading && !saleOptions.isError && saleOptions.data?.items.length === 0 ? (
					<p className="muted">Нет продукции для продажи.</p>
				) : null}

				{selectedStock ? <SelectedStockInfo stock={selectedStock} quantity={parsedQuantity} /> : null}

				<label className="field">
					<span>Количество, шт</span>
					<input
						inputMode="numeric"
						min="1"
						onChange={(event) => setQuantity(event.target.value)}
						type="number"
						value={quantity}
					/>
				</label>
				<PaymentMethodSegmentedControl
					id="courier-payment-method-label"
					onChange={setPaymentMethod}
					value={paymentMethod}
				/>
				<label className="field">
					<span>Комментарий</span>
					<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
				</label>
				<div className="operation-total">
					<div>
						<span>Итого</span>
						<strong>{formatRubles(saleTotalCents)} ₽</strong>
					</div>
					<p>
						{selectedClient?.name ?? (selectedClientId ? "Клиент выбран" : "Клиент не выбран")}
						{" · "}
						{selectedStock?.productName ?? "Товар не выбран"}
						{" · "}
						{summaryQuantity}
						{" · "}
						{paymentMethod === "cash" ? "Наличные" : "Безнал"}
					</p>
				</div>
				{localError ? <p className="form-error">{localError}</p> : null}
				{saleMutation.isError ? <p className="form-error">{saleMutation.error.message}</p> : null}
				{submitBlockReason ? <p className="muted">{submitBlockReason}</p> : null}
				<button className="primary-button" disabled={submitDisabled} type="submit">
					<ReceiptText aria-hidden size={18} />
					Записать продажу
				</button>
			</form>
		</section>
	);
}

function SelectedStockInfo({
	quantity,
	stock,
}: {
	quantity: number;
	stock: CourierSaleOption;
}) {
	const totalCents = Number.isInteger(quantity) && quantity > 0 ? quantity * stock.unitPriceCents : 0;

	return (
		<p className="muted">
			Доступно: {stock.availableQuantity} шт · {formatRubles(stock.unitPriceCents)} ₽/шт
			{totalCents > 0 ? ` · ${formatRubles(totalCents)} ₽` : ""}
		</p>
	);
}

function isValidQuantity(quantity: number, stock: CourierSaleOption | undefined): boolean {
	if (!stock) {
		return false;
	}

	return Number.isInteger(quantity) && quantity > 0 && quantity <= stock.availableQuantity;
}

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}
