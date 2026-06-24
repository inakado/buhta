"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgePercent, Banknote, Box, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
	formatMoneyCents,
	moneyCents,
	rublePriceToCents,
	type DistributorCashWithdrawal,
	type DistributorInventoryItem,
	type ProductDiscountAssignment,
} from "@buhta/shared";
import {
	assignDistributorDiscount,
	createDistributorCashWithdrawal,
	getDistributorCashBalances,
	getDistributorInventory,
} from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";
import { PostSubmitResultLayer } from "../operations/PostSubmitResultLayer";
import {
	calculateProductQuantity,
	createDefaultProductQuantityState,
	formatKilograms,
	formatProductQuantityLabel,
	ProductQuantityDisplay,
	type ProductQuantityCalculation,
	ProductQuantityInputField,
	type ProductQuantityInputState,
} from "../operations/product-quantity-input";
import { DistributorStockList } from "./DistributorStockList";

type DistributorInventoryVariant = "default" | "stock-ledger";

type WithdrawalResultSnapshot = {
	amountCents: number;
	createdAt: string;
	distributorName: string;
	remainingCashCents: number;
};

type DiscountResultSnapshot = {
	createdAt: string;
	discountCentsPerUnit: number;
	discountTotalCents: number;
	discountedUnitPriceCents: number;
	productName: string;
	quantity: number;
	sourceQuantityAfter: number;
	sourceUnitPriceCents: number;
};

export function DistributorInventoryHome({
	canAssignDiscount = false,
	canWithdrawCash = false,
	discountActionLabel = "Снизить цену",
	embedded = false,
	hideHeading = false,
	hideOverview = false,
	onBack,
	online = true,
	showCashBalance = false,
	title = "Остатки",
	variant = "default",
}: {
	canAssignDiscount?: boolean;
	canWithdrawCash?: boolean;
	discountActionLabel?: string;
	embedded?: boolean;
	hideHeading?: boolean;
	hideOverview?: boolean;
	onBack?: () => void;
	online?: boolean;
	showCashBalance?: boolean;
	title?: string;
	variant?: DistributorInventoryVariant;
}) {
	const queryClient = useQueryClient();
	const [withdrawalOpen, setWithdrawalOpen] = useState(false);
	const [selectedDistributorId, setSelectedDistributorId] = useState("");
	const [amountRubles, setAmountRubles] = useState("");
	const [comment, setComment] = useState("");
	const [discountItem, setDiscountItem] = useState<DistributorInventoryItem | null>(null);
	const [discountQuantity, setDiscountQuantity] = useState<ProductQuantityInputState>(createDefaultProductQuantityState);
	const [discountPriceRubles, setDiscountPriceRubles] = useState("");
	const [discountComment, setDiscountComment] = useState("");
	const [localError, setLocalError] = useState("");
	const [discountError, setDiscountError] = useState("");
	const [withdrawalResult, setWithdrawalResult] = useState<WithdrawalResultSnapshot | null>(null);
	const [discountResult, setDiscountResult] = useState<DiscountResultSnapshot | null>(null);
	const {
		data,
		error: inventoryErrorValue,
		isError: inventoryError,
		isLoading: inventoryLoading,
	} = useQuery({
		queryKey: ["distributor", "inventory"],
		queryFn: getDistributorInventory,
	});
	const {
		data: cashData,
		isError: cashBalancesError,
		isLoading: cashBalancesLoading,
	} = useQuery({
		queryKey: ["distributor", "cash-balances"],
		queryFn: getDistributorCashBalances,
		enabled: showCashBalance,
	});
	const totalUnits = data?.summary.totalUnits ?? 0;
	const totalNetWeightGrams = data?.summary.totalNetWeightGrams ?? 0;
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;
	const distributorCount = data?.distributorSummaries.length ?? 0;
	const singleDistributorName = distributorCount === 1 ? data?.distributorSummaries[0]?.distributorName : undefined;
	const stockTableTitle = singleDistributorName ?? (distributorCount > 1 ? formatDistributorCount(distributorCount) : "Продукция");
	const stockTableMeta = stockItemCount > 0 ? formatPositionCount(stockItemCount) : undefined;
	const useStockLedger = variant === "stock-ledger";
	const frameClassName = [
		embedded ? "embedded-screen-stack" : "screen-stack",
		useStockLedger ? "stock-ledger-surface" : "",
		hideOverview ? "production-detail-screen" : "",
	].filter(Boolean).join(" ");
	const activeCashItems = useMemo(
		() => (cashData?.items ?? []).filter((item) => item.active),
		[cashData?.items],
	);
	const activeSelectedDistributorId = activeCashItems.length === 1
		? activeCashItems[0]?.distributorId ?? ""
		: activeCashItems.some((item) => item.distributorId === selectedDistributorId)
			? selectedDistributorId
			: "";
	const selectedCashItem = activeCashItems.find((item) => item.distributorId === activeSelectedDistributorId) ?? null;
	const parsedAmountCents = parseAmountCents(amountRubles);
	const amountCents = parsedAmountCents.ok ? parsedAmountCents.value : 0;
	const availableCashCents = selectedCashItem?.amountCents ?? 0;
	const remainingCashCents = Math.max(availableCashCents - amountCents, 0);
	const showWithdrawalAction = canWithdrawCash && showCashBalance;
	const withdrawalActionBlockReason = getWithdrawalActionBlockReason(
		cashBalancesLoading,
		activeCashItems.length > 0,
		totalCashCents,
	);
	const withdrawalActionDisabled = withdrawalActionBlockReason !== "";
	const parsedDiscountQuantity = calculateProductQuantity({
		availableQuantity: discountItem?.quantity,
		netWeightGrams: discountItem?.netWeightGrams,
		state: discountQuantity,
	});
	const parsedDiscountPriceCents = parseAmountCents(discountPriceRubles);
	const discountPriceCents = parsedDiscountPriceCents.ok ? parsedDiscountPriceCents.value : 0;
	const selectedDiscountQuantity = parsedDiscountQuantity.ok ? parsedDiscountQuantity.quantity : 0;
	const withdrawal = useMutation({
		mutationFn: () => createDistributorCashWithdrawal({
			distributorId: activeSelectedDistributorId,
			amountCents,
			...(comment.trim() ? { comment } : {}),
		}),
		onSuccess: async (response) => {
			setWithdrawalResult(createWithdrawalResultSnapshot({
				distributorName: selectedCashItem?.distributorName,
				responseWithdrawal: response.withdrawal,
				remainingCashCents: response.cashBalance.amountCents,
			}));
			setAmountRubles("");
			setComment("");
			setLocalError("");
			await queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] });
		},
	});
	const discountAssignment = useMutation({
		mutationFn: () => {
			if (!discountItem || !parsedDiscountQuantity.ok || !parsedDiscountPriceCents.ok) {
				throw new Error("Заполните параметры дисконта.");
			}

			return assignDistributorDiscount({
				distributorProductBalanceId: discountItem.id,
				quantityInput: getProductQuantityInput(parsedDiscountQuantity),
				discountedUnitPriceCents: parsedDiscountPriceCents.value,
				...(discountComment.trim() ? { comment: discountComment } : {}),
			});
		},
		onSuccess: async (response) => {
			setDiscountResult(createDiscountResultSnapshot({
				discount: response.discount,
				productName: discountItem?.productName,
				sourceQuantityAfter: response.sourceBalance.quantity,
			}));
			setDiscountItem(null);
			setDiscountQuantity(createDefaultProductQuantityState());
			setDiscountPriceRubles("");
			setDiscountComment("");
			setDiscountError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "load-options"] }),
			]);
		},
	});
	const withdrawDisabled = !online
		|| withdrawal.isPending
		|| !selectedCashItem
		|| !parsedAmountCents.ok
		|| amountCents <= 0
		|| amountCents > availableCashCents;
	const discountDisabled = !online
		|| discountAssignment.isPending
		|| !discountItem
		|| !parsedDiscountQuantity.ok
		|| selectedDiscountQuantity <= 0
		|| selectedDiscountQuantity > (discountItem?.quantity ?? 0)
		|| !parsedDiscountPriceCents.ok
		|| discountPriceCents <= 0
		|| discountPriceCents >= (discountItem?.unitPriceCents ?? 0);
	const discountBeforeValueCents = (discountItem?.unitPriceCents ?? 0) * selectedDiscountQuantity;
	const discountStockValueCents = parsedDiscountPriceCents.ok ? selectedDiscountQuantity * discountPriceCents : 0;
	const Frame = embedded ? "div" : "section";

	function handleWithdrawSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");
		setWithdrawalResult(null);

		if (!online) {
			setLocalError("Нет соединения.");
			return;
		}
		if (!selectedCashItem) {
			setLocalError("Выберите активный распределитель.");
			return;
		}
		if (!parsedAmountCents.ok || amountCents <= 0) {
			setLocalError("");
			return;
		}
		if (amountCents > availableCashCents) {
			setLocalError("Сумма больше доступных наличных.");
			return;
		}

		withdrawal.mutate();
	}

	function closeWithdrawalForm() {
		if (withdrawal.isPending) {
			return;
		}
		setWithdrawalOpen(false);
		setAmountRubles("");
		setComment("");
		setLocalError("");
		setWithdrawalResult(null);
	}

	function openDiscountForm(item: DistributorInventoryItem) {
		const suggestedPriceCents = Math.max(item.unitPriceCents - 100, 1);

		setDiscountItem(item);
		setDiscountQuantity({ mode: "net_weight", value: formatKilograms(item.totalNetWeightGrams) });
		setDiscountPriceRubles(formatMoneyCents(moneyCents(suggestedPriceCents)));
		setDiscountComment("");
		setDiscountError("");
		setLocalError("");
		setDiscountResult(null);
	}

	function closeDiscountForm() {
		if (discountAssignment.isPending) {
			return;
		}
		setDiscountItem(null);
		setDiscountResult(null);
		setDiscountQuantity(createDefaultProductQuantityState());
		setDiscountPriceRubles("");
		setDiscountComment("");
		setDiscountError("");
	}

	function handleDiscountSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setDiscountError("");
		setDiscountResult(null);

		if (!online) {
			setDiscountError("Нет соединения.");
			return;
		}
		if (!discountItem) {
			setDiscountError("Выберите строку остатка.");
			return;
		}
		if (!parsedDiscountQuantity.ok || selectedDiscountQuantity <= 0) {
			setDiscountError(parsedDiscountQuantity.ok ? "Укажите количество." : parsedDiscountQuantity.reason);
			return;
		}
		if (selectedDiscountQuantity > discountItem.quantity) {
			setDiscountError("Количество больше остатка.");
			return;
		}
		if (!parsedDiscountPriceCents.ok || discountPriceCents <= 0) {
			setDiscountError("Укажите новую цену.");
			return;
		}
		if (discountPriceCents >= discountItem.unitPriceCents) {
			setDiscountError("Новая цена должна быть ниже текущей.");
			return;
		}

		discountAssignment.mutate();
	}

	return (
		<Frame className={frameClassName}>
			{onBack ? (
				<button className="secondary-button production-back-button" onClick={onBack} type="button">
					<ArrowLeft aria-hidden size={16} />
					Назад
				</button>
			) : null}
			{hideHeading ? null : (
				<div className="section-heading">
					<h2>{title}</h2>
					{useStockLedger ? null : <span>{inventoryLoading ? "Загрузка" : formatPositionCount(stockItemCount)}</span>}
				</div>
			)}

			{hideOverview ? null : (
				<div className="inventory-overview-strip">
					<div>
						<span>Количество</span>
						{inventoryLoading ? <strong>Загрузка</strong> : (
							<ProductQuantityDisplay
								quantity={totalUnits}
								totalNetWeightGrams={totalNetWeightGrams}
								variant="summary"
							/>
						)}
					</div>
					<div>
						<span>Продукция</span>
						<MoneyValue compact valueCents={totalStockValueCents} />
					</div>
					{showCashBalance ? (
						<div>
							<span>Наличные</span>
							{cashBalancesLoading ? <strong>Загрузка</strong> : <MoneyValue compact valueCents={totalCashCents} />}
						</div>
					) : null}
				</div>
			)}

			{showWithdrawalAction ? (
				<div className="cash-withdrawal-actions">
					<button
						className="cash-withdrawal-button"
						disabled={withdrawalActionDisabled}
						onClick={() => {
							if (withdrawalActionDisabled) {
								return;
							}
							setWithdrawalOpen(true);
							setLocalError("");
							setWithdrawalResult(null);
						}}
						type="button"
					>
						<Banknote aria-hidden size={20} />
						<span>Списать наличные</span>
					</button>
					{withdrawalActionBlockReason ? <p className="muted">{withdrawalActionBlockReason}</p> : null}
				</div>
			) : null}

				{showWithdrawalAction ? (
					<Dialog.Root
						open={withdrawalOpen}
						onOpenChange={(open) => {
							if (!open) {
								closeWithdrawalForm();
								return;
							}
							setWithdrawalOpen(true);
						}}
					>
						<Dialog.Portal>
							<Dialog.Overlay className="operation-dialog-overlay" />
							<Dialog.Content aria-describedby={undefined} className="operation-dialog">
								{withdrawalResult ? (
									<WithdrawalResultLayer
										onDone={closeWithdrawalForm}
										onRepeat={() => {
											setWithdrawalResult(null);
											withdrawal.reset();
										}}
										result={withdrawalResult}
									/>
								) : (
								<form className="operation-dialog-form cash-withdrawal-panel" onSubmit={handleWithdrawSubmit}>
									<div className="operation-dialog-heading">
										<div>
											<Dialog.Title>Списать наличные</Dialog.Title>
										</div>
										<Dialog.Close
											aria-label="Закрыть"
											className="icon-button"
											disabled={withdrawal.isPending}
											type="button"
										>
											<X aria-hidden size={18} />
										</Dialog.Close>
									</div>
									<div className="operation-source-card">
										<Banknote aria-hidden size={18} />
										<div>
											<strong>{selectedCashItem?.distributorName ?? "Распределитель"}</strong>
											<span>Наличные {formatRubles(availableCashCents)}</span>
										</div>
									</div>
									<label className="field">
										<span>Распределитель</span>
										<select
											disabled={activeCashItems.length <= 1}
											onChange={(event) => setSelectedDistributorId(event.target.value)}
											value={activeSelectedDistributorId}
										>
											{activeCashItems.length !== 1 ? <option value="">Выберите распределитель</option> : null}
											{activeCashItems.map((item) => (
												<option key={item.distributorId} value={item.distributorId}>
													{item.distributorName}
												</option>
											))}
										</select>
									</label>
									<label className="field">
										<span>Сумма, ₽</span>
										<input
											inputMode="decimal"
											onChange={(event) => setAmountRubles(event.target.value)}
											value={amountRubles}
										/>
									</label>
									<label className="field">
										<span>Комментарий</span>
										<textarea
											onChange={(event) => setComment(event.target.value)}
											rows={1}
											value={comment}
										/>
									</label>
									<div className="cash-withdrawal-summary">
										<div>
											<span>Доступно</span>
											<MoneyValue valueCents={availableCashCents} />
										</div>
										<div>
											<span>Списать</span>
											<MoneyValue valueCents={amountCents} />
										</div>
										<div>
											<span>Остаток</span>
											<MoneyValue valueCents={remainingCashCents} />
										</div>
									</div>
									{localError ? <p className="form-error">{localError}</p> : null}
									{withdrawal.isError ? <p className="form-error">{withdrawal.error.message}</p> : null}
									{withdrawDisabled ? <p className="muted">{getWithdrawalBlockReason(online, selectedCashItem !== null, parsedAmountCents.ok, amountCents, availableCashCents, withdrawal.isPending)}</p> : null}
									<div className="form-actions">
										<button
											className="secondary-button"
											disabled={withdrawal.isPending}
											onClick={closeWithdrawalForm}
											type="button"
										>
											Отмена
										</button>
										<button className="primary-button" disabled={withdrawDisabled} type="submit">
											Подтвердить списание
										</button>
									</div>
								</form>
								)}
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
				) : null}

				{canAssignDiscount ? (
					<Dialog.Root
						open={Boolean(discountItem) || Boolean(discountResult)}
						onOpenChange={(open) => {
							if (!open) {
								closeDiscountForm();
							}
						}}
					>
						<Dialog.Portal>
							<Dialog.Overlay className="operation-dialog-overlay" />
							<Dialog.Content className="operation-dialog">
								{discountResult ? (
									<DiscountResultLayer
										onDone={closeDiscountForm}
										onRepeat={() => {
											setDiscountResult(null);
											discountAssignment.reset();
										}}
										result={discountResult}
									/>
								) : discountItem ? (
									<form className="operation-dialog-form discount-panel" onSubmit={handleDiscountSubmit}>
										<div className="operation-dialog-heading">
											<div>
												<Dialog.Title>Снизить цену</Dialog.Title>
												<Dialog.Description>{discountItem.productName}</Dialog.Description>
											</div>
											<Dialog.Close
												aria-label="Закрыть"
												className="icon-button"
												disabled={discountAssignment.isPending}
												type="button"
											>
												<X aria-hidden size={18} />
											</Dialog.Close>
										</div>
										<div className="operation-source-card">
											<BadgePercent aria-hidden size={18} />
											<div>
												<strong>{formatRubles(discountItem.unitPriceCents)}/шт</strong>
												<span>
													{discountItem.distributorName} • доступно {formatProductQuantityLabel({
														quantity: discountItem.quantity,
														totalNetWeightGrams: discountItem.totalNetWeightGrams,
													})}
												</span>
											</div>
										</div>
										<ProductQuantityInputField
											availableQuantity={discountItem.quantity}
											id="distributor-discount-quantity"
											netWeightGrams={discountItem.netWeightGrams}
											onChange={setDiscountQuantity}
											state={discountQuantity}
										/>
										<label className="field">
											<span>Новая цена, ₽</span>
											<input
												inputMode="decimal"
												onChange={(event) => setDiscountPriceRubles(event.target.value)}
												value={discountPriceRubles}
											/>
										</label>
										<label className="field">
											<span>Комментарий</span>
											<textarea
												onChange={(event) => setDiscountComment(event.target.value)}
												rows={1}
												value={discountComment}
											/>
										</label>
										<div className="cash-withdrawal-summary">
											<div>
												<span>Было</span>
												<MoneyValue valueCents={discountBeforeValueCents} />
											</div>
											<div>
												<span>Станет</span>
												<MoneyValue valueCents={discountStockValueCents} />
											</div>
											<div>
												<span>Скидка</span>
												<MoneyValue valueCents={Math.max(discountBeforeValueCents - discountStockValueCents, 0)} />
											</div>
										</div>
										{discountError ? <p className="form-error">{discountError}</p> : null}
										{discountAssignment.isError ? <p className="form-error">{discountAssignment.error.message}</p> : null}
										{discountDisabled ? (
											<p className="muted">
												{getDiscountBlockReason(
													online,
													discountItem,
													parsedDiscountQuantity,
													parsedDiscountPriceCents.ok,
													discountPriceCents,
													discountAssignment.isPending,
												)}
											</p>
										) : null}
										<div className="form-actions">
											<button
												className="secondary-button"
												disabled={discountAssignment.isPending}
												onClick={closeDiscountForm}
												type="button"
											>
												Отмена
											</button>
											<button className="primary-button" disabled={discountDisabled} type="submit">
												Сохранить цену
											</button>
										</div>
									</form>
								) : null}
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
				) : null}

			{inventoryLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
			{inventoryError ? <p className="form-error">{inventoryErrorValue.message}</p> : null}
			{cashBalancesError ? <p className="form-error">Не удалось загрузить наличные распределителя</p> : null}
			{!inventoryLoading && !inventoryError && data?.items.length === 0 ? (
				<p className="muted">На распределителе пока нет продукции.</p>
			) : null}

			{!useStockLedger && data && data.distributorSummaries.length > 1 ? (
				<div className="production-stock-stack">
					{data.distributorSummaries.map((summary) => (
						<div className="stock-aggregate-card" key={summary.distributorId}>
							<div className="production-row-icon">
								<Box aria-hidden size={18} />
							</div>
							<div className="stock-aggregate-body">
								<strong>{summary.distributorName}</strong>
								<p>{summary.stockItemCount} позиций</p>
							</div>
							<div className="stock-aggregate-value">
								<ProductQuantityDisplay
									quantity={summary.totalUnits}
									totalNetWeightGrams={summary.totalNetWeightGrams}
									variant="summary"
								/>
								<span>{formatRubles(summary.totalStockValueCents)}</span>
							</div>
						</div>
					))}
				</div>
			) : null}

				<DistributorStockList
					discountActionLabel={discountActionLabel}
					groupByDistributor={distributorCount > 1}
					items={data?.items ?? []}
					{...(canAssignDiscount ? { onAssignDiscount: openDiscountForm } : {})}
					showDistributorName={!useStockLedger && !hideHeading}
					{...(hideHeading || useStockLedger
						? {
							tableTitle: stockTableTitle,
							...(stockTableMeta ? { tableMeta: stockTableMeta } : {}),
						}
						: {})}
				/>
		</Frame>
	);
}

function WithdrawalResultLayer({
	onDone,
	onRepeat,
	result,
}: {
	onDone: () => void;
	onRepeat: () => void;
	result: WithdrawalResultSnapshot;
}) {
	return (
		<PostSubmitResultLayer
			createdAt={result.createdAt}
			primaryAction={{ label: "Готово", onClick: onDone }}
			rows={[
				{ label: "Распределитель", value: result.distributorName },
				{ label: "Списано", value: formatRubles(result.amountCents) },
				{ label: "Остаток наличных", value: formatRubles(result.remainingCashCents) },
			]}
			secondaryAction={{
				icon: <Banknote aria-hidden size={16} />,
				label: "Списать еще",
				onClick: onRepeat,
			}}
		/>
	);
}

function DiscountResultLayer({
	onDone,
	onRepeat,
	result,
}: {
	onDone: () => void;
	onRepeat: () => void;
	result: DiscountResultSnapshot;
}) {
	const rows = [
		{ label: "Продукция", value: result.productName },
		{ label: "Снижено", value: `${result.quantity} шт • ${formatRubles(result.sourceUnitPriceCents)} → ${formatRubles(result.discountedUnitPriceCents)}/шт` },
		{ label: "Скидка", value: `${formatRubles(result.discountCentsPerUnit)}/шт • всего ${formatRubles(result.discountTotalCents)}` },
		...(result.sourceQuantityAfter > 0
			? [{ label: "Осталось по старой цене", value: `${result.sourceQuantityAfter} шт` }]
			: []),
	];

	return (
		<PostSubmitResultLayer
			createdAt={result.createdAt}
			primaryAction={{ label: "Готово", onClick: onDone }}
			rows={rows}
			secondaryAction={{
				icon: <BadgePercent aria-hidden size={16} />,
				label: "Снизить еще",
				onClick: onRepeat,
			}}
		/>
	);
}

function parseAmountCents(value: string): { ok: true; value: number } | { ok: false } {
	const normalized = value.trim();
	if (!normalized) {
		return { ok: false };
	}
	try {
		return { ok: true, value: rublePriceToCents(normalized) };
	} catch {
		return { ok: false };
	}
}

function getWithdrawalBlockReason(
	online: boolean,
	hasDistributor: boolean,
	validAmount: boolean,
	amountCents: number,
	availableCashCents: number,
	pending: boolean,
): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (pending) {
		return "Списываем наличные.";
	}
	if (!hasDistributor) {
		return "Нет активного распределителя.";
	}
	if (availableCashCents <= 0) {
		return "Нет наличных для списания.";
	}
	if (!validAmount || amountCents <= 0) {
		return "";
	}
	if (amountCents > availableCashCents) {
		return "Сумма больше доступных наличных.";
	}

	return "";
}

function getWithdrawalActionBlockReason(
	loading: boolean,
	hasActiveDistributor: boolean,
	totalCashCents: number,
): string {
	if (loading) {
		return "Загружаем наличные.";
	}
	if (!hasActiveDistributor) {
		return "Нет активного распределителя.";
	}
	if (totalCashCents <= 0) {
		return "Нет наличных для списания.";
	}

	return "";
}

function getDiscountBlockReason(
	online: boolean,
	item: DistributorInventoryItem | null,
	quantityValue: ProductQuantityCalculation,
	validPrice: boolean,
	priceCents: number,
	pending: boolean,
): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (pending) {
		return "Назначаем дисконт.";
	}
	if (!item) {
		return "Выберите строку остатка.";
	}
	if (!quantityValue.ok || quantityValue.quantity <= 0) {
		return quantityValue.ok ? "Укажите количество." : quantityValue.reason;
	}
	if (quantityValue.quantity > item.quantity) {
		return "Количество больше остатка.";
	}
	if (!validPrice || priceCents <= 0) {
		return "Укажите новую цену.";
	}
	if (priceCents >= item.unitPriceCents) {
		return "Новая цена должна быть ниже текущей.";
	}

	return "";
}

function getProductQuantityInput(calculation: ProductQuantityCalculation) {
	if (!calculation.ok) {
		throw new Error(calculation.reason);
	}

	return calculation.input;
}

function MoneyValue({ compact = false, valueCents }: { compact?: boolean; valueCents: number }) {
	return (
		<strong className="money-value-nowrap">
			{compact ? formatCompactRubles(valueCents) : formatRubles(valueCents)}
		</strong>
	);
}

function formatRubles(priceCents: number): string {
	return formatCompactRubles(priceCents);
}

function formatDistributorCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) {
		return `${count} распределитель`;
	}
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return `${count} распределителя`;
	}
	return `${count} распределителей`;
}

function formatPositionCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) {
		return `${count} позиция`;
	}
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return `${count} позиции`;
	}
	return `${count} позиций`;
}

function createWithdrawalResultSnapshot({
	distributorName,
	remainingCashCents,
	responseWithdrawal,
}: {
	distributorName: string | undefined;
	remainingCashCents: number;
	responseWithdrawal: DistributorCashWithdrawal;
}): WithdrawalResultSnapshot {
	return {
		amountCents: responseWithdrawal.amountCents,
		createdAt: responseWithdrawal.createdAt,
		distributorName: distributorName ?? "Распределитель",
		remainingCashCents,
	};
}

function createDiscountResultSnapshot({
	discount,
	productName,
	sourceQuantityAfter,
}: {
	discount: ProductDiscountAssignment;
	productName: string | undefined;
	sourceQuantityAfter: number;
}): DiscountResultSnapshot {
	return {
		createdAt: discount.createdAt,
		discountCentsPerUnit: discount.discountCentsPerUnit,
		discountTotalCents: discount.discountTotalCents,
		discountedUnitPriceCents: discount.discountedUnitPriceCents,
		productName: productName ?? "Продукция",
		quantity: discount.quantity,
		sourceQuantityAfter,
		sourceUnitPriceCents: discount.sourceUnitPriceCents,
	};
}
