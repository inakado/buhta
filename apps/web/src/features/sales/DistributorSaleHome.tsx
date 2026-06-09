"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useState } from "react";
import { ArrowLeft, ReceiptText, UserPlus } from "lucide-react";
import type { DistributorSaleStockItem, PaymentMethod } from "@buhta/shared";
import {
	createClient,
	createDistributorSale,
	getDistributorSaleOptions,
	listClients,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { ClientCombobox } from "../clients/ClientCombobox";
import { PaymentMethodSegmentedControl } from "../operations/PaymentMethodSegmentedControl";
import { OperationProductSelect } from "../operations/OperationProductSelect";
import { getSaleSubmitBlockReason } from "../operations/operation-submit-reasons";

export function DistributorSaleHome({
	onBack,
	onSaleSuccess,
	online,
}: {
	onBack?: () => void;
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
	const [clientError, setClientError] = useState("");
	const [saleError, setSaleError] = useState("");
	const [showNewClientForm, setShowNewClientForm] = useState(false);
	const [newClientName, setNewClientName] = useState("");
	const [newClientPhone, setNewClientPhone] = useState("");
	const [newClientDescription, setNewClientDescription] = useState("");
	const clients = useQuery({
		queryKey: ["clients", activeClientSearch],
		queryFn: () => listClients(activeClientSearch),
	});
	const saleOptions = useQuery({
		queryKey: ["distributor", "sale-options"],
		queryFn: getDistributorSaleOptions,
	});
	const selectedClient = clients.data?.clients.find((client) => client.id === selectedClientId);
	const selectedStock = saleOptions.data?.items.find((item) =>
		item.distributorProductBalanceId === selectedBalanceId,
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
			setClientError("");
			setShowNewClientForm(false);
			await queryClient.invalidateQueries({ queryKey: ["clients"] });
		},
	});
	const saleMutation = useMutation({
		mutationFn: () => createDistributorSale({
			distributorProductBalanceId: selectedBalanceId,
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
			setSaleError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sales", "recent"] }),
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
		setClientError("");

		if (!newClientName.trim()) {
			setClientError("Введите имя нового клиента.");
			return;
		}
		if (!newClientPhone.trim()) {
			setClientError("Введите телефон нового клиента.");
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
		setSaleError("");

		if (!selectedClientId) {
			setSaleError("Выберите клиента.");
			return;
		}
		if (!selectedStock) {
			setSaleError("Выберите продукцию.");
			return;
		}
		if (!isValidQuantity(parsedQuantity, selectedStock)) {
			setSaleError("Количество должно быть целым числом не больше доступного количества.");
			return;
		}

		saleMutation.mutate();
	}

	return (
		<section className="screen-stack production-detail-screen">
			{onBack ? (
				<div className="section-heading action-heading">
					<button className="secondary-button production-back-button" onClick={onBack} type="button">
						<ArrowLeft aria-hidden size={16} />
						<span>Назад</span>
					</button>
				</div>
			) : null}
			<div className="section-heading compact">
				<h2>Продажа</h2>
			</div>

			<div className="form-panel production-action-form">
				<SaleFormHeading title="Клиент" meta={selectedClient?.name} />
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
						{clientError ? <p className="form-error">{clientError}</p> : null}
						<button className="secondary-button" disabled={!online || createClientMutation.isPending} type="submit">
							Создать клиента
						</button>
					</form>
				) : null}
			</div>

			<form className="form-panel production-action-form" onSubmit={handleSaleSubmit}>
				<SaleFormHeading title="Детали продажи" meta={selectedStock?.distributorName} />
				<OperationProductSelect
					label="Продукция"
					onValueChange={setSelectedBalanceId}
					options={(saleOptions.data?.items ?? []).map((item) => ({
						discounted: item.discounted,
						id: item.distributorProductBalanceId,
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

				{selectedStock ? <SelectedStockInfo stock={selectedStock} /> : null}

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
					id="distributor-payment-method-label"
					onChange={setPaymentMethod}
					value={paymentMethod}
				/>
				<label className="field">
					<span>Комментарий</span>
					<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
				</label>
				<SaleInfoLedger>
					<SaleInfoRow label="Клиент" value={selectedClient?.name ?? (selectedClientId ? "Клиент выбран" : "Не выбран")} />
					<SaleInfoRow label="Количество" value={summaryQuantity} />
					<SaleInfoRow label="Оплата" value={paymentMethod === "cash" ? "Наличные" : "Безнал"} />
					<SaleInfoRow label="Итого" value={`${formatRubles(saleTotalCents)} ₽`} />
				</SaleInfoLedger>
				{saleError ? <p className="form-error">{saleError}</p> : null}
				{saleMutation.isError ? <p className="form-error">{saleMutation.error.message}</p> : null}
				<SaleSubmitBlock blockReason={submitBlockReason}>
					<button className="primary-button" disabled={submitDisabled} type="submit">
						<ReceiptText aria-hidden size={18} />
						Записать продажу
					</button>
				</SaleSubmitBlock>
			</form>
		</section>
	);
}

function SaleFormHeading({ meta, title }: { meta?: string | undefined; title: string }) {
	return (
		<div className="production-form-heading">
			<h2>{title}</h2>
			{meta ? <span>{meta}</span> : null}
		</div>
	);
}

function SaleInfoLedger({ children }: { children: ReactNode }) {
	return <div className="production-form-ledger">{children}</div>;
}

function SaleInfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="production-form-ledger-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function SaleSubmitBlock({
	blockReason,
	children,
}: {
	blockReason: string;
	children: ReactNode;
}) {
	return (
		<div className="production-submit-block">
			{blockReason ? <p className="production-submit-reason">{blockReason}</p> : null}
			{children}
		</div>
	);
}

function SelectedStockInfo({
	stock,
}: {
	stock: DistributorSaleStockItem;
}) {
	return (
		<SaleInfoLedger>
			<SaleInfoRow label="Доступно" value={`${stock.availableQuantity} шт`} />
			<SaleInfoRow label="Цена" value={`${formatRubles(stock.unitPriceCents)} ₽/шт`} />
		</SaleInfoLedger>
	);
}

function isValidQuantity(quantity: number, stock: DistributorSaleStockItem | undefined): boolean {
	if (!stock) {
		return false;
	}

	return Number.isInteger(quantity) && quantity > 0 && quantity <= stock.availableQuantity;
}

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}
