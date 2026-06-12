"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useState } from "react";
import { ReceiptText, UserPlus, X } from "lucide-react";
import type { CourierSale, CourierSaleOption, PaymentMethod } from "@buhta/shared";
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
import { PostSubmitResultLayer } from "../operations/PostSubmitResultLayer";
import { getSaleSubmitBlockReason } from "../operations/operation-submit-reasons";

type SaleResultSnapshot = {
	clientLabel: string;
	createdAt: string;
	paymentMethod: PaymentMethod;
	productName: string;
	quantity: number;
	totalCents: number;
};

export function CourierSaleHome({
	onDone,
	online,
}: {
	onDone: () => void;
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
	const [saleResult, setSaleResult] = useState<SaleResultSnapshot | null>(null);
	const {
		data: clients,
		error: clientsErrorValue,
		isError: clientsError,
		isLoading: clientsLoading,
	} = useQuery({
		queryKey: ["clients", activeClientSearch],
		queryFn: () => listClients(activeClientSearch),
	});
	const {
		data: saleOptions,
		error: saleOptionsErrorValue,
		isError: saleOptionsError,
		isLoading: saleOptionsLoading,
	} = useQuery({
		queryKey: ["courier", "sale-options"],
		queryFn: getCourierSaleOptions,
	});
	const selectedClient = clients?.clients.find((client) => client.id === selectedClientId);
	const selectedStock = saleOptions?.items.find((item) =>
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
			setClientError("");
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
		onSuccess: async (response) => {
			setSaleResult(createSaleResultSnapshot({
				clientName: selectedClient?.name,
				clientPhone: selectedClient?.phone,
				paymentMethod,
				productName: selectedStock?.productName,
				sale: response.sale,
			}));
			setSelectedClientId("");
			setSelectedBalanceId("");
			setQuantity("");
			setPaymentMethod("cash");
			setComment("");
			setSaleError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "sales", "recent"] }),
				queryClient.invalidateQueries({ queryKey: ["clients"] }),
			]);
		},
	});
	const submitBlockReason = getSaleSubmitBlockReason({
		availableQuantity: selectedStock?.availableQuantity,
		hasClient: !!selectedClientId,
		hasProduct: !!selectedStock,
		hasProductOptions: (saleOptions?.items.length ?? 0) > 0,
		loadingOptions: saleOptionsLoading,
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
			closeNewClientDialog();
		}
	}

	function openNewClientDialog() {
		createClientMutation.reset();
		setClientError("");
		setShowNewClientForm(true);
	}

	function closeNewClientDialog() {
		if (createClientMutation.isPending) {
			return;
		}

		setShowNewClientForm(false);
		setNewClientName("");
		setNewClientPhone("");
		setNewClientDescription("");
		setClientError("");
		createClientMutation.reset();
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

	function handleDone() {
		setSaleResult(null);
		onDone();
	}

	function handleNewSale() {
		setSaleResult(null);
		saleMutation.reset();
	}

	return (
		<section className="screen-stack production-detail-screen">
			<div className="section-heading compact">
				<h2>Продажа</h2>
			</div>

			{saleResult ? (
				<SaleResultLayer
					onDone={handleDone}
					onNewSale={handleNewSale}
					result={saleResult}
				/>
			) : (
				<>
					<div className="form-panel production-action-form">
						<SaleFormHeading title="Клиент" meta={selectedClient?.name} />
						<ClientCombobox
							clients={clients?.clients ?? []}
							loading={clientsLoading}
							onClientChange={handleClientChange}
							onQueryChange={setActiveClientSearch}
							query={activeClientSearch}
							selectedClient={selectedClient}
							selectedClientId={selectedClientId}
						/>
						{clientsLoading ? <p className="muted">Загрузка клиентов</p> : null}
						{clientsError ? <p className="form-error">{clientsErrorValue.message}</p> : null}

						{selectedClientId ? null : (
							<button
								className="secondary-button compact-button"
								disabled={!online}
								onClick={openNewClientDialog}
								type="button"
							>
								<UserPlus aria-hidden size={16} />
								Новый клиент
							</button>
						)}
					</div>

					<Dialog.Root
						open={showNewClientForm && !selectedClientId}
						onOpenChange={(open) => {
							if (open) {
								openNewClientDialog();
								return;
							}

							closeNewClientDialog();
						}}
					>
						<Dialog.Portal>
							<Dialog.Overlay className="operation-dialog-overlay" />
							<Dialog.Content aria-describedby={undefined} className="operation-dialog">
								<form className="operation-dialog-form" onSubmit={handleCreateClient}>
									<div className="operation-dialog-heading">
										<div>
											<Dialog.Title>Новый клиент</Dialog.Title>
										</div>
										<Dialog.Close
											aria-label="Закрыть"
											className="icon-button"
											disabled={createClientMutation.isPending}
											type="button"
										>
											<X aria-hidden size={18} />
										</Dialog.Close>
									</div>
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
									<div className="form-actions">
										<button
											className="secondary-button"
											disabled={createClientMutation.isPending}
											onClick={closeNewClientDialog}
											type="button"
										>
											Отмена
										</button>
										<button className="primary-button" disabled={!online || createClientMutation.isPending} type="submit">
											Создать клиента
										</button>
									</div>
								</form>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>

					<form className="form-panel production-action-form" onSubmit={handleSaleSubmit}>
						<SaleFormHeading title="Детали продажи" />
						<OperationProductSelect
							label="Продукция"
							onValueChange={setSelectedBalanceId}
							options={(saleOptions?.items ?? []).map((item) => ({
								discounted: item.discounted,
								id: item.courierProductBalanceId,
								label: item.productName,
								meta: `${item.availableQuantity} шт · ${formatRubles(item.unitPriceCents)} ₽`,
							}))}
							placeholder="Выберите продукцию"
							value={selectedBalanceId}
						/>
						{saleOptionsLoading ? <p className="muted">Загрузка продукции</p> : null}
						{saleOptionsError ? <p className="form-error">{saleOptionsErrorValue.message}</p> : null}
						{!saleOptionsLoading && !saleOptionsError && saleOptions?.items.length === 0 ? (
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
							id="courier-payment-method-label"
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
				</>
			)}
		</section>
	);
}

function SaleResultLayer({
	onDone,
	onNewSale,
	result,
}: {
	onDone: () => void;
	onNewSale: () => void;
	result: SaleResultSnapshot;
}) {
	return (
		<PostSubmitResultLayer
			createdAt={result.createdAt}
			primaryAction={{ label: "Готово", onClick: onDone }}
			rows={[
				{ label: "Клиент", value: result.clientLabel },
				{ label: "Продано", value: `${result.productName} · ${result.quantity} шт` },
				{ label: "Оплата", value: result.paymentMethod === "cash" ? "Наличные" : "Безнал" },
				{ label: "Итого", value: `${formatRubles(result.totalCents)} ₽` },
			]}
			secondaryAction={{
				icon: <ReceiptText aria-hidden size={16} />,
				label: "Новая продажа",
				onClick: onNewSale,
			}}
		/>
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

function SelectedStockInfo({ stock }: { stock: CourierSaleOption }) {
	return (
		<SaleInfoLedger>
			<SaleInfoRow label="Доступно" value={`${stock.availableQuantity} шт`} />
			<SaleInfoRow label="Цена" value={`${formatRubles(stock.unitPriceCents)} ₽/шт`} />
		</SaleInfoLedger>
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

function createSaleResultSnapshot({
	clientName,
	clientPhone,
	paymentMethod,
	productName,
	sale,
}: {
	clientName: string | undefined;
	clientPhone: string | undefined;
	paymentMethod: PaymentMethod;
	productName: string | undefined;
	sale: CourierSale;
}): SaleResultSnapshot {
	const clientParts = [clientName ?? "Клиент", clientPhone].filter(Boolean);

	return {
		clientLabel: clientParts.join(" · "),
		createdAt: sale.createdAt,
		paymentMethod,
		productName: productName ?? "Продукция",
		quantity: sale.quantity,
		totalCents: sale.totalCents,
	};
}
