"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierUnloadProductOption,
} from "@buhta/shared";
import { createCourierUnload, getCourierUnloadOptions } from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";

export function CourierUnloadHome({
	onUnloadSuccess,
	online,
}: {
	onUnloadSuccess: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [initialized, setInitialized] = useState(false);
	const [selectedDistributorId, setSelectedDistributorId] = useState("");
	const [quantityByBalanceId, setQuantityByBalanceId] = useState<Record<string, string>>({});
	const [cashRubles, setCashRubles] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const unloadOptions = useQuery({
		queryKey: ["courier", "unload-options"],
		queryFn: getCourierUnloadOptions,
	});
	const distributors = unloadOptions.data?.distributors ?? [];
	const productItems = unloadOptions.data?.productItems ?? [];
	const cashBalance = unloadOptions.data?.cashBalance;

	useEffect(() => {
		if (!unloadOptions.data || initialized) {
			return;
		}

		const onlyDistributor = unloadOptions.data.distributors[0];
		if (onlyDistributor && unloadOptions.data.distributors.length === 1) {
			setSelectedDistributorId(onlyDistributor.distributorId);
		}
		setQuantityByBalanceId(Object.fromEntries(
			unloadOptions.data.productItems.map((item) => [item.courierProductBalanceId, String(item.availableQuantity)]),
		));
		setCashRubles(formatMoneyCents(moneyCents(unloadOptions.data.cashBalance.amountCents)));
		setInitialized(true);
	}, [initialized, unloadOptions.data]);

	const selectedDistributor = distributors.find((item) => item.distributorId === selectedDistributorId);
	const parsedItems = useMemo(
		() => productItems
			.map((item) => ({
				item,
				quantity: Number(quantityByBalanceId[item.courierProductBalanceId] ?? "0"),
			}))
			.filter(({ quantity }) => Number.isInteger(quantity) && quantity > 0),
		[productItems, quantityByBalanceId],
	);
	const cashAmountCents = parseCashAmountCents(cashRubles);
	const totalUnits = parsedItems.reduce((sum, item) => sum + item.quantity, 0);
	const totalStockValueCents = parsedItems.reduce(
		(sum, item) => sum + item.quantity * item.item.unitPriceCents,
		0,
	);
	const hasInvalidQuantity = productItems.some((item) => {
		const value = quantityByBalanceId[item.courierProductBalanceId] ?? "0";
		const quantity = Number(value);
		return value.trim() !== ""
			&& (!Number.isInteger(quantity) || quantity < 0 || quantity > item.availableQuantity);
	});
	const cashAvailableCents = cashBalance?.amountCents ?? 0;
	const hasInvalidCash = cashAmountCents === null || cashAmountCents > cashAvailableCents;
	const hasUnloadPayload = parsedItems.length > 0 || (cashAmountCents ?? 0) > 0;
	const unloadMutation = useMutation({
		mutationFn: () => createCourierUnload({
			distributorId: selectedDistributorId,
			items: parsedItems.map(({ item, quantity }) => ({
				courierProductBalanceId: item.courierProductBalanceId,
				quantity,
			})),
			cashAmountCents: cashAmountCents ?? 0,
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			setLocalError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "unload-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "load-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] }),
			]);
			onUnloadSuccess();
		},
	});
	const submitDisabled = !online
		|| unloadMutation.isPending
		|| unloadOptions.isLoading
		|| distributors.length === 0
		|| !selectedDistributorId
		|| hasInvalidQuantity
		|| hasInvalidCash
		|| !hasUnloadPayload;
	const submitBlockReason = submitDisabled
		? getSubmitBlockReason({
			distributorsCount: distributors.length,
			hasInvalidCash,
			hasInvalidQuantity,
			hasPayload: hasUnloadPayload,
			isLoading: unloadOptions.isLoading,
			isPending: unloadMutation.isPending,
			online,
			selectedDistributorId,
		})
		: "";

	function handleQuantityChange(balanceId: string, value: string) {
		setQuantityByBalanceId((current) => ({
			...current,
			[balanceId]: value,
		}));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!selectedDistributor) {
			setLocalError("Выберите распределитель.");
			return;
		}
		if (hasInvalidQuantity) {
			setLocalError("Количество должно быть целым числом от 0 до доступного остатка.");
			return;
		}
		if (hasInvalidCash) {
			setLocalError("Сумма наличных должна быть не больше баланса курьера.");
			return;
		}
		if (!hasUnloadPayload) {
			setLocalError("Укажите товар или наличные для возврата.");
			return;
		}

		unloadMutation.mutate();
	}

	return (
		<section className="screen-stack production-detail-screen">
			<div className="section-heading compact">
				<h2>Возврат</h2>
			</div>

			<form className="screen-stack courier-unload-form" onSubmit={handleSubmit}>
				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Куда вернуть" meta={selectedDistributor?.distributorName} />
					<div className="field">
						<select
							aria-label="Куда вернуть"
							onChange={(event) => setSelectedDistributorId(event.target.value)}
							value={selectedDistributorId}
						>
							<option value="">Выберите место</option>
							{distributors.map((distributor) => (
								<option key={distributor.distributorId} value={distributor.distributorId}>
									{distributor.distributorName}
								</option>
							))}
						</select>
					</div>
					{unloadOptions.isLoading ? <p className="muted">Загрузка баланса</p> : null}
					{unloadOptions.isError ? <p className="form-error">{unloadOptions.error.message}</p> : null}
					{!unloadOptions.isLoading && !unloadOptions.isError && distributors.length === 0 ? (
						<p className="form-error">Нет активного места для возврата.</p>
					) : null}
				</div>

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Товар" meta={formatPositionCount(productItems.length)} />
					{productItems.length > 0 ? (
						<div className="courier-unload-product-list">
							<div className="courier-unload-product-head" aria-hidden>
								<span>Наименование</span>
								<span>Вернуть</span>
							</div>
							{productItems.map((item) => (
								<UnloadProductRow
									item={item}
									key={item.courierProductBalanceId}
									onQuantityChange={handleQuantityChange}
									value={quantityByBalanceId[item.courierProductBalanceId] ?? ""}
								/>
							))}
						</div>
					) : (
						<p className="muted">Товара у курьера нет.</p>
					)}
				</div>

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Наличные" meta={formatRubles(cashAvailableCents)} />
					<label className="field">
						<span>Сумма, ₽</span>
						<input
							inputMode="decimal"
							min="0"
							onChange={(event) => setCashRubles(event.target.value)}
							type="number"
							value={cashRubles}
						/>
					</label>
					<UnloadInfoLedger>
						<UnloadInfoRow label="Доступно" value={formatRubles(cashAvailableCents)} />
					</UnloadInfoLedger>
					<label className="field">
						<span>Комментарий</span>
						<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
					</label>
				</div>

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Итого" />
					<UnloadInfoLedger>
						<UnloadInfoRow label="Место" value={selectedDistributor?.distributorName ?? "Не выбрано"} />
						<UnloadInfoRow label="Товар" value={`${formatPositionCount(parsedItems.length)} · ${totalUnits} шт`} />
						<UnloadInfoRow label="Наличные" value={formatRubles(cashAmountCents ?? 0)} />
						<UnloadInfoRow label="Итого" value={formatRubles(totalStockValueCents + (cashAmountCents ?? 0))} />
					</UnloadInfoLedger>
					{localError ? <p className="form-error">{localError}</p> : null}
					{unloadMutation.isError ? <p className="form-error">{unloadMutation.error.message}</p> : null}
					<UnloadSubmitBlock blockReason={submitBlockReason}>
						<button className="primary-button" disabled={submitDisabled} type="submit">
							<PackageCheck aria-hidden size={18} />
							Записать
						</button>
					</UnloadSubmitBlock>
				</div>
			</form>
		</section>
	);
}

function UnloadFormHeading({ meta, title }: { meta?: string | undefined; title: string }) {
	return (
		<div className="production-form-heading">
			<h2>{title}</h2>
			{meta ? <span>{meta}</span> : null}
		</div>
	);
}

function UnloadInfoLedger({ children }: { children: ReactNode }) {
	return <div className="production-form-ledger">{children}</div>;
}

function UnloadInfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="production-form-ledger-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function UnloadSubmitBlock({
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

function UnloadProductRow({
	item,
	onQuantityChange,
	value,
}: {
	item: CourierUnloadProductOption;
	onQuantityChange: (balanceId: string, value: string) => void;
	value: string;
}) {
	return (
		<div className="courier-unload-product-row">
			<div>
				<strong>{item.productName}</strong>
				<span>{item.availableQuantity} шт · {formatRubles(item.unitPriceCents)}/шт</span>
			</div>
			<label className="courier-unload-quantity">
				<span>Вернуть</span>
				<input
					inputMode="numeric"
					max={item.availableQuantity}
					min="0"
					onChange={(event) => onQuantityChange(item.courierProductBalanceId, event.target.value)}
					type="number"
					value={value}
				/>
			</label>
		</div>
	);
}

function parseCashAmountCents(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return 0;
	}

	if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) {
		return null;
	}

	const normalized = trimmed.replace(",", ".");
	const [rubles = "0", kopecks = ""] = normalized.split(".");
	return Number(rubles) * 100 + Number(kopecks.padEnd(2, "0"));
}

function formatRubles(priceCents: number): string {
	return formatCompactRubles(priceCents);
}

function formatPositionCount(count: number): string {
	const lastTwoDigits = Math.abs(count) % 100;
	const lastDigit = Math.abs(count) % 10;
	const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
		? "позиций"
		: lastDigit === 1
			? "позиция"
			: lastDigit >= 2 && lastDigit <= 4
				? "позиции"
				: "позиций";

	return `${count} ${word}`;
}

function getSubmitBlockReason({
	distributorsCount,
	hasInvalidCash,
	hasInvalidQuantity,
	hasPayload,
	isLoading,
	isPending,
	online,
	selectedDistributorId,
}: {
	distributorsCount: number;
	hasInvalidCash: boolean;
	hasInvalidQuantity: boolean;
	hasPayload: boolean;
	isLoading: boolean;
	isPending: boolean;
	online: boolean;
	selectedDistributorId: string;
}): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (isPending) {
		return "Записываем возврат.";
	}
	if (isLoading) {
		return "Загружаем баланс.";
	}
	if (distributorsCount === 0) {
		return "Нет активного места для возврата.";
	}
	if (!selectedDistributorId) {
		return "Выберите место возврата.";
	}
	if (hasInvalidQuantity) {
		return "Проверьте количество товара.";
	}
	if (hasInvalidCash) {
		return "Проверьте сумму наличных.";
	}
	if (!hasPayload) {
		return "Укажите товар или наличные для возврата.";
	}

	return "";
}
