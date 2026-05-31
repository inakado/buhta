"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Calculator, ReceiptText, Search, UserPlus } from "lucide-react";
import { formatMoneyCents, moneyCents, type CourierSaleOption } from "@buhta/shared";
import {
	createClient,
	createCourierSale,
	getCourierSaleOptions,
	listClients,
} from "../../lib/api-client";

export function CourierSaleHome({
	onSaleSuccess,
	online,
}: {
	onSaleSuccess: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [clientSearchDraft, setClientSearchDraft] = useState("");
	const [activeClientSearch, setActiveClientSearch] = useState("");
	const [selectedClientId, setSelectedClientId] = useState("");
	const [selectedBalanceId, setSelectedBalanceId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<"cash" | "cashless">("cash");
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
	const selectedStock = saleOptions.data?.items.find((item) =>
		item.courierProductBalanceId === selectedBalanceId,
	);
	const parsedQuantity = Number(quantity);
	const saleTotalCents = selectedStock && Number.isInteger(parsedQuantity) && parsedQuantity > 0
		? selectedStock.unitPriceCents * parsedQuantity
		: 0;
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
				queryClient.invalidateQueries({ queryKey: ["clients"] }),
			]);
			onSaleSuccess();
		},
	});
	const submitDisabled = !online
		|| saleMutation.isPending
		|| saleOptions.isLoading
		|| (saleOptions.data?.items.length ?? 0) === 0
		|| !selectedClientId
		|| !selectedBalanceId
		|| !isValidQuantity(parsedQuantity, selectedStock);

	function handleClientSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setActiveClientSearch(clientSearchDraft.trim());
	}

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
			setLocalError("Количество должно быть целым числом не больше доступного остатка.");
			return;
		}

		saleMutation.mutate();
	}

	return (
		<section className="screen-stack">
			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Продажа курьера</p>
					<strong>{saleTotalCents > 0 ? `${formatRubles(saleTotalCents)} ₽` : "Новая продажа"}</strong>
					<p className="summary-note">Со своего баланса клиенту</p>
				</div>
				<ReceiptText aria-hidden size={28} />
			</div>

			<div className="form-panel">
				<form className="client-search" onSubmit={handleClientSearch}>
					<label className="field">
						<span>Поиск клиента</span>
						<div className="input-shell">
							<Search aria-hidden size={18} />
							<input
								onChange={(event) => setClientSearchDraft(event.target.value)}
								placeholder="Имя или телефон"
								type="search"
								value={clientSearchDraft}
							/>
						</div>
					</label>
					<button className="secondary-button compact-button" type="submit">
						Найти
					</button>
				</form>

				<label className="field">
					<span>Клиент</span>
					<select
						onChange={(event) => setSelectedClientId(event.target.value)}
						value={selectedClientId}
					>
						<option value="">Выберите клиента</option>
						{clients.data?.clients.map((client) => (
							<option key={client.id} value={client.id}>
								{client.name} · {client.phone}
							</option>
						))}
					</select>
				</label>
				{clients.isLoading ? <p className="muted">Загрузка клиентов</p> : null}
				{clients.isError ? <p className="form-error">{clients.error.message}</p> : null}

				<button
					className="secondary-button compact-button"
					disabled={!online}
					onClick={() => setShowNewClientForm((current) => !current)}
					type="button"
				>
					<UserPlus aria-hidden size={16} />
					Новый клиент
				</button>

				{showNewClientForm ? (
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
				<label className="field">
					<span>Продукция</span>
					<select
						onChange={(event) => setSelectedBalanceId(event.target.value)}
						value={selectedBalanceId}
					>
						<option value="">Выберите продукцию</option>
						{saleOptions.data?.items.map((item) => (
							<option key={item.courierProductBalanceId} value={item.courierProductBalanceId}>
								{item.productName} · {item.availableQuantity} шт · {formatRubles(item.unitPriceCents)} ₽
							</option>
						))}
					</select>
				</label>
				{saleOptions.isLoading ? <p className="muted">Загрузка остатков</p> : null}
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
				<label className="field">
					<span>Способ оплаты</span>
					<select
						onChange={(event) => setPaymentMethod(event.target.value === "cashless" ? "cashless" : "cash")}
						value={paymentMethod}
					>
						<option value="cash">Наличные</option>
						<option value="cashless">Безнал</option>
					</select>
				</label>
				<label className="field">
					<span>Комментарий</span>
					<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
				</label>
				<div className="entity-card sale-total-card">
					<div className="inventory-item-main">
						<div className="production-row-icon">
							<Calculator aria-hidden size={18} />
						</div>
						<div>
							<strong>Итого</strong>
							<p>{paymentMethod === "cash" ? "Наличные" : "Безнал"}</p>
						</div>
					</div>
					<div className="production-history-meta">
						<strong>{formatRubles(saleTotalCents)} ₽</strong>
					</div>
				</div>
				{localError ? <p className="form-error">{localError}</p> : null}
				{saleMutation.isError ? <p className="form-error">{saleMutation.error.message}</p> : null}
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
	return formatMoneyCents(moneyCents(priceCents));
}
