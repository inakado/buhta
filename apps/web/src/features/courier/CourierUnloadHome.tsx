"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PackageCheck } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierUnload,
	type CourierUnloadProductOption,
} from "@buhta/shared";
import { createCourierUnload, getCourierUnloadOptions } from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";
import { PostSubmitResultLayer } from "../operations/PostSubmitResultLayer";
import {
	calculateProductQuantity,
	formatKilograms,
	formatProductQuantityLabel,
	type ProductQuantityInputState,
	ProductQuantityInputField,
} from "../operations/product-quantity-input";

type CourierUnloadFormState = {
	selectedDistributorId: string;
	quantityByBalanceId: Record<string, ProductQuantityInputState>;
	cashRubles: string;
	comment: string;
};

const EMPTY_FORM: CourierUnloadFormState = {
	selectedDistributorId: "",
	quantityByBalanceId: {},
	cashRubles: "",
	comment: "",
};

type UnloadResultSnapshot = {
	cashAmountCents: number;
	courierCashAfterCents: number;
	createdAt: string;
	distributorCashAfterCents: number;
	distributorName: string;
	productLines: string;
	totalStockValueCents: number;
	totalUnits: number;
};

export function CourierUnloadHome({
	onDone,
	online,
}: {
	onDone: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const initializedRef = useRef(false);
	const [form, setForm] = useState<CourierUnloadFormState>(EMPTY_FORM);
	const [localError, setLocalError] = useState("");
	const [unloadResult, setUnloadResult] = useState<UnloadResultSnapshot | null>(null);
	const { cashRubles, comment, quantityByBalanceId, selectedDistributorId } = form;
	const {
		data: unloadOptions,
		error: unloadOptionsErrorValue,
		isError: unloadOptionsError,
		isLoading: unloadOptionsLoading,
	} = useQuery({
		queryKey: ["courier", "unload-options"],
		queryFn: getCourierUnloadOptions,
	});
	const distributors = useMemo(() => unloadOptions?.distributors ?? [], [unloadOptions?.distributors]);
	const productItems = useMemo(() => unloadOptions?.productItems ?? [], [unloadOptions?.productItems]);
	const cashBalance = unloadOptions?.cashBalance;

	useEffect(() => {
		if (!unloadOptions || initializedRef.current) {
			return;
		}

		const onlyDistributor = unloadOptions.distributors[0];
		initializedRef.current = true;
		setForm((current) => ({
			...current,
			selectedDistributorId: onlyDistributor && unloadOptions.distributors.length === 1
				? onlyDistributor.distributorId
				: current.selectedDistributorId,
			quantityByBalanceId: Object.fromEntries(
				unloadOptions.productItems.map((item) => [
					item.courierProductBalanceId,
					{ mode: "net_weight", value: formatKilograms(item.totalNetWeightGrams) },
				]),
			),
			cashRubles: formatMoneyCents(moneyCents(unloadOptions.cashBalance.amountCents)),
		}));
	}, [unloadOptions]);

	const selectedDistributor = distributors.find((item) => item.distributorId === selectedDistributorId);
	const parsedItems = useMemo(() => {
		const nextItems: Array<{ item: CourierUnloadProductOption; quantity: number; quantityInput: ProductQuantityInputState }> = [];
		for (const item of productItems) {
			const quantityInput = quantityByBalanceId[item.courierProductBalanceId];
			if (!quantityInput) {
				continue;
			}
			const calculation = calculateProductQuantity({
				availableQuantity: item.availableQuantity,
				netWeightGrams: item.netWeightGrams,
				state: quantityInput,
			});
			if (calculation.ok) {
				nextItems.push({ item, quantity: calculation.quantity, quantityInput });
			}
		}

		return nextItems;
	}, [productItems, quantityByBalanceId]);
	const cashAmountCents = parseCashAmountCents(cashRubles);
	const totalUnits = parsedItems.reduce((sum, item) => sum + item.quantity, 0);
	const totalStockValueCents = parsedItems.reduce(
		(sum, item) => sum + item.quantity * item.item.unitPriceCents,
		0,
	);
	const hasInvalidQuantity = productItems.some((item) => {
		const value = quantityByBalanceId[item.courierProductBalanceId];
		if (!value || value.value.trim() === "") {
			return false;
		}
		return !calculateProductQuantity({
			availableQuantity: item.availableQuantity,
			netWeightGrams: item.netWeightGrams,
			state: value,
		}).ok;
	});
	const cashAvailableCents = cashBalance?.amountCents ?? 0;
	const hasInvalidCash = cashAmountCents === null || cashAmountCents > cashAvailableCents;
	const hasUnloadPayload = parsedItems.length > 0 || (cashAmountCents ?? 0) > 0;
	const shouldShowDistributorPanel = unloadOptionsLoading || unloadOptionsError || distributors.length !== 1;
	const unloadMutation = useMutation({
		mutationFn: () => createCourierUnload({
			distributorId: selectedDistributorId,
			items: parsedItems.map(({ item }) => ({
				courierProductBalanceId: item.courierProductBalanceId,
				quantityInput: getUnloadQuantityInput(item, quantityByBalanceId[item.courierProductBalanceId]),
			})),
			cashAmountCents: cashAmountCents ?? 0,
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async (response) => {
			setUnloadResult(createUnloadResultSnapshot({
				cashAmountCents: cashAmountCents ?? 0,
				courierCashAfterCents: response.courierCashBalance.amountCents,
				distributorCashAfterCents: response.distributorCashBalance.amountCents,
				distributorName: selectedDistributor?.distributorName,
				parsedItems,
				totalStockValueCents,
				totalUnits,
				unload: response.unload,
			}));
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
		},
	});
	const submitDisabled = !online
		|| unloadMutation.isPending
		|| unloadOptionsLoading
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
			isLoading: unloadOptionsLoading,
			isPending: unloadMutation.isPending,
			online,
			selectedDistributorId,
		})
		: "";

	function handleQuantityChange(balanceId: string, value: ProductQuantityInputState) {
		setForm((current) => ({
			...current,
			quantityByBalanceId: {
				...current.quantityByBalanceId,
				[balanceId]: value,
			},
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

	function handleDone() {
		setUnloadResult(null);
		onDone();
	}

	function handleNewUnload() {
		setUnloadResult(null);
		unloadMutation.reset();
	}

	return (
		<section className="screen-stack production-detail-screen">
			<div className="section-heading compact">
				<h2>Возврат</h2>
			</div>

			{unloadResult ? (
				<UnloadResultLayer
					onDone={handleDone}
					onNewUnload={handleNewUnload}
					result={unloadResult}
				/>
			) : (
			<form className="screen-stack courier-unload-form" onSubmit={handleSubmit}>
				{shouldShowDistributorPanel ? (
					<div className="form-panel production-action-form">
						<UnloadFormHeading title="Куда вернуть" />
						<div className="field">
							<select
								aria-label="Куда вернуть"
								onChange={(event) => setForm((current) => ({
									...current,
									selectedDistributorId: event.target.value,
								}))}
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
						{unloadOptionsLoading ? <p className="muted">Загрузка баланса</p> : null}
						{unloadOptionsError ? <p className="form-error">{unloadOptionsErrorValue.message}</p> : null}
						{!unloadOptionsLoading && !unloadOptionsError && distributors.length === 0 ? (
							<p className="form-error">Нет активного места для возврата.</p>
						) : null}
					</div>
				) : null}

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Товар" />
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
										value={quantityByBalanceId[item.courierProductBalanceId]}
									/>
							))}
						</div>
					) : (
						<p className="muted">Товара у курьера нет.</p>
					)}
				</div>

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Наличные" />
					<label className="field">
						<span>Вернуть, ₽</span>
						<input
							aria-label="Вернуть, ₽"
							inputMode="decimal"
							min="0"
							onChange={(event) => setForm((current) => ({
								...current,
								cashRubles: event.target.value,
							}))}
							type="number"
							value={cashRubles}
						/>
						<span aria-hidden className="courier-unload-cash-note">Доступно {formatRubles(cashAvailableCents)}</span>
					</label>
					<label className="field">
						<span>Комментарий, если нужно</span>
						<textarea
							className="courier-unload-comment"
							onChange={(event) => setForm((current) => ({
								...current,
								comment: event.target.value,
							}))}
							rows={1}
							value={comment}
						/>
					</label>
				</div>

				<div className="form-panel production-action-form">
					<UnloadFormHeading title="Итого" />
					<UnloadInfoLedger>
						<UnloadInfoRow label="Место" value={selectedDistributor?.distributorName ?? "Не выбрано"} />
						<UnloadInfoRow label="Товар" value={`${formatPositionCount(parsedItems.length)} • ${totalUnits} шт`} />
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
			)}
		</section>
	);
}

function UnloadResultLayer({
	onDone,
	onNewUnload,
	result,
}: {
	onDone: () => void;
	onNewUnload: () => void;
	result: UnloadResultSnapshot;
}) {
	const rows = [
		{ label: "Место", value: result.distributorName },
		...(result.totalUnits > 0
			? [
				{ label: "Товар", value: result.productLines },
				{ label: "Стоимость", value: formatRubles(result.totalStockValueCents) },
			]
			: []),
		...(result.cashAmountCents > 0
			? [
				{ label: "Наличные", value: formatRubles(result.cashAmountCents) },
				{
					label: "После возврата",
					value: `курьер ${formatRubles(result.courierCashAfterCents)} · место ${formatRubles(result.distributorCashAfterCents)}`,
				},
			]
			: []),
	];

	return (
		<PostSubmitResultLayer
			createdAt={result.createdAt}
			primaryAction={{ label: "Готово", onClick: onDone }}
			rows={rows}
			secondaryAction={{
				icon: <PackageCheck aria-hidden size={16} />,
				label: "Новый возврат",
				onClick: onNewUnload,
			}}
		/>
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
	onQuantityChange: (balanceId: string, value: ProductQuantityInputState) => void;
	value: ProductQuantityInputState | undefined;
}) {
	return (
		<div className="courier-unload-product-row">
			<div>
				<strong>{item.productName}</strong>
				<span>{formatProductQuantityLabel({
					quantity: item.availableQuantity,
					totalNetWeightGrams: item.totalNetWeightGrams,
				})} • {formatRubles(item.unitPriceCents)}/шт</span>
			</div>
			<ProductQuantityInputField
				availableQuantity={item.availableQuantity}
				id={`courier-unload-${item.courierProductBalanceId}`}
				label="Вернуть"
				netWeightGrams={item.netWeightGrams}
				onChange={(nextValue) => onQuantityChange(item.courierProductBalanceId, nextValue)}
				state={value ?? { mode: "net_weight", value: "" }}
			/>
		</div>
	);
}

function getUnloadQuantityInput(item: CourierUnloadProductOption, value: ProductQuantityInputState | undefined) {
	const calculation = value
		? calculateProductQuantity({
			availableQuantity: item.availableQuantity,
			netWeightGrams: item.netWeightGrams,
			state: value,
		})
		: { ok: false as const, reason: "Укажите количество." };
	if (!calculation.ok) {
		throw new Error(calculation.reason);
	}

	return calculation.input;
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

function createUnloadResultSnapshot({
	cashAmountCents,
	courierCashAfterCents,
	distributorCashAfterCents,
	distributorName,
	parsedItems,
	totalStockValueCents,
	totalUnits,
	unload,
}: {
	cashAmountCents: number;
	courierCashAfterCents: number;
	distributorCashAfterCents: number;
	distributorName: string | undefined;
	parsedItems: Array<{ item: CourierUnloadProductOption; quantity: number }>;
	totalStockValueCents: number;
	totalUnits: number;
	unload: CourierUnload;
}): UnloadResultSnapshot {
	return {
		cashAmountCents,
		courierCashAfterCents,
		createdAt: unload.createdAt,
		distributorCashAfterCents,
		distributorName: distributorName ?? "Распределитель",
		productLines: parsedItems.length
			? parsedItems.map(({ item, quantity }) => `${item.productName} • ${quantity} шт`).join(", ")
			: "Без товара",
		totalStockValueCents,
		totalUnits,
	};
}
