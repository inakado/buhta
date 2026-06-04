"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Box } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatMoneyCents, moneyCents, rublePriceToCents } from "@buhta/shared";
import { createDistributorCashWithdrawal, getDistributorCashBalances, getDistributorInventory } from "../../lib/api-client";
import { DistributorStockList } from "./DistributorStockList";

export function DistributorInventoryHome({
	canWithdrawCash = false,
	online = true,
	showCashBalance = false,
	title = "Остатки",
}: {
	canWithdrawCash?: boolean;
	online?: boolean;
	showCashBalance?: boolean;
	title?: string;
}) {
	const queryClient = useQueryClient();
	const [withdrawalOpen, setWithdrawalOpen] = useState(false);
	const [selectedDistributorId, setSelectedDistributorId] = useState("");
	const [amountRubles, setAmountRubles] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const inventory = useQuery({
		queryKey: ["distributor", "inventory"],
		queryFn: getDistributorInventory,
	});
	const cashBalances = useQuery({
		queryKey: ["distributor", "cash-balances"],
		queryFn: getDistributorCashBalances,
		enabled: showCashBalance,
	});
	const data = inventory.data;
	const cashData = cashBalances.data;
	const totalUnits = data?.summary.totalUnits ?? 0;
	const totalStockValueCents = data?.summary.totalStockValueCents ?? 0;
	const totalCashCents = cashData?.totalAmountCents ?? 0;
	const stockItemCount = data?.summary.stockItemCount ?? 0;
	const activeCashItems = useMemo(
		() => (cashData?.items ?? []).filter((item) => item.active),
		[cashData?.items],
	);
	const selectedCashItem = activeCashItems.find((item) => item.distributorId === selectedDistributorId) ?? null;
	const parsedAmountCents = parseAmountCents(amountRubles);
	const amountCents = parsedAmountCents.ok ? parsedAmountCents.value : 0;
	const availableCashCents = selectedCashItem?.amountCents ?? 0;
	const remainingCashCents = Math.max(availableCashCents - amountCents, 0);
	const showWithdrawalAction = canWithdrawCash && showCashBalance;
	const withdrawal = useMutation({
		mutationFn: () => createDistributorCashWithdrawal({
			distributorId: selectedDistributorId,
			amountCents,
			...(comment.trim() ? { comment } : {}),
		}),
		onSuccess: async () => {
			setAmountRubles("");
			setComment("");
			setLocalError("");
			setSuccessMessage("Наличные списаны");
			setWithdrawalOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] });
		},
	});
	const withdrawDisabled = !online
		|| withdrawal.isPending
		|| !selectedCashItem
		|| !parsedAmountCents.ok
		|| amountCents <= 0
		|| amountCents > availableCashCents;

	useEffect(() => {
		if (activeCashItems.length === 1) {
			setSelectedDistributorId(activeCashItems[0]?.distributorId ?? "");
			return;
		}
		if (selectedDistributorId && !activeCashItems.some((item) => item.distributorId === selectedDistributorId)) {
			setSelectedDistributorId("");
		}
	}, [activeCashItems, selectedDistributorId]);

	function handleWithdrawSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");
		setSuccessMessage("");

		if (!online) {
			setLocalError("Нет соединения.");
			return;
		}
		if (!selectedCashItem) {
			setLocalError("Выберите активный распределитель.");
			return;
		}
		if (!parsedAmountCents.ok || amountCents <= 0) {
			setLocalError("Укажите сумму списания.");
			return;
		}
		if (amountCents > availableCashCents) {
			setLocalError("Сумма больше доступных наличных.");
			return;
		}

		withdrawal.mutate();
	}

	return (
		<section className="screen-stack">
			<div className="section-heading">
				<h2>{title}</h2>
				<span>{stockItemCount} позиций</span>
			</div>

			<div className="inventory-overview-strip">
				<div>
					<span>Товар</span>
					<strong>{inventory.isLoading ? "Загрузка" : `${totalUnits} шт`}</strong>
				</div>
				<div>
					<span>Стоимость</span>
					<MoneyValue valueCents={totalStockValueCents} />
				</div>
				{showCashBalance ? (
					<div>
						<span>Наличные</span>
						{cashBalances.isLoading ? <strong>Загрузка</strong> : <MoneyValue valueCents={totalCashCents} />}
					</div>
				) : null}
			</div>

			{showWithdrawalAction ? (
				<div className="cash-withdrawal-actions">
					<button
						className="action-tile primary-action"
						disabled={cashBalances.isLoading || activeCashItems.length === 0}
						onClick={() => {
							setWithdrawalOpen((current) => !current);
							setLocalError("");
							setSuccessMessage("");
						}}
						type="button"
					>
						<Banknote aria-hidden size={20} />
						<span>Списать наличные</span>
					</button>
				</div>
			) : null}

			{showWithdrawalAction && withdrawalOpen ? (
				<form className="form-panel cash-withdrawal-panel" onSubmit={handleWithdrawSubmit}>
					<div className="section-heading compact">
						<h2>Списать наличные</h2>
					</div>
					<label className="field">
						<span>Распределитель</span>
						<select
							disabled={activeCashItems.length <= 1}
							onChange={(event) => setSelectedDistributorId(event.target.value)}
							value={selectedDistributorId}
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
							rows={2}
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
					<button className="primary-button" disabled={withdrawDisabled} type="submit">
						Списать
					</button>
				</form>
			) : null}

			{successMessage ? <p className="success-inline">{successMessage}</p> : null}

			{inventory.isLoading ? <p className="muted">Загрузка остатков распределителя</p> : null}
			{inventory.isError ? <p className="form-error">{inventory.error.message}</p> : null}
			{cashBalances.isError ? <p className="form-error">Не удалось загрузить наличные распределителя</p> : null}
			{!inventory.isLoading && !inventory.isError && data?.items.length === 0 ? (
				<p className="muted">На распределителе пока нет продукции.</p>
			) : null}

			{data && data.distributorSummaries.length > 1 ? (
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
								<strong>{summary.totalUnits} шт</strong>
								<span>{formatRubles(summary.totalStockValueCents)}</span>
							</div>
						</div>
					))}
				</div>
			) : null}

			<DistributorStockList items={data?.items ?? []} />
		</section>
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
		return "Укажите сумму списания.";
	}
	if (amountCents > availableCashCents) {
		return "Сумма больше доступных наличных.";
	}

	return "";
}

function MoneyValue({ valueCents }: { valueCents: number }) {
	return (
		<strong className="money-value-nowrap">
			{formatRubles(valueCents)}
		</strong>
	);
}

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
