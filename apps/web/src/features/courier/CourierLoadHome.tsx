"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useState } from "react";
import { PackagePlus } from "lucide-react";
import type { CourierLoad, CourierLoadOption } from "@buhta/shared";
import { createCourierLoad, getCourierLoadOptions } from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { OperationProductSelect } from "../operations/OperationProductSelect";
import { PostSubmitResultLayer } from "../operations/PostSubmitResultLayer";
import { getLoadSubmitBlockReason } from "../operations/operation-submit-reasons";
import {
	calculateProductQuantity,
	createDefaultProductQuantityState,
	formatKilograms,
	formatProductQuantityLabel,
	type ProductQuantityCalculation,
	ProductQuantityInputField,
	type ProductQuantityInputState,
} from "../operations/product-quantity-input";

type LoadResultSnapshot = {
	courierQuantityAfter: number;
	createdAt: string;
	distributorName: string;
	productName: string;
	quantity: number;
	stockValueCents: number;
	unitPriceCents: number;
};

export function CourierLoadHome({
	onDone,
	online,
}: {
	onDone: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [selectedBalanceId, setSelectedBalanceId] = useState("");
	const [quantity, setQuantity] = useState<ProductQuantityInputState>(createDefaultProductQuantityState);
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const [loadResult, setLoadResult] = useState<LoadResultSnapshot | null>(null);
	const {
		data: loadOptions,
		error: loadOptionsErrorValue,
		isError: loadOptionsError,
		isLoading: loadOptionsLoading,
	} = useQuery({
		queryKey: ["courier", "load-options"],
		queryFn: getCourierLoadOptions,
	});
	const selectedStock = loadOptions?.items.find((item) =>
		item.distributorProductBalanceId === selectedBalanceId,
	);
	const productQuantity = calculateProductQuantity({
		availableQuantity: selectedStock?.availableQuantity,
		netWeightGrams: selectedStock?.netWeightGrams,
		state: quantity,
	});
	const parsedQuantity = productQuantity.ok ? productQuantity.quantity : 0;
	const loadValueCents = selectedStock && productQuantity.ok
		? selectedStock.unitPriceCents * productQuantity.quantity
		: 0;
	const loadMutation = useMutation({
		mutationFn: () => createCourierLoad({
			distributorProductBalanceId: selectedBalanceId,
			quantityInput: getProductQuantityInput(productQuantity),
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async (response) => {
			setLoadResult(createLoadResultSnapshot({
				courierQuantityAfter: response.courierProductBalance.quantity,
				distributorName: selectedStock?.distributorName,
				load: response.load,
				productName: selectedStock?.productName,
			}));
			setSelectedBalanceId("");
			setQuantity(createDefaultProductQuantityState());
			setComment("");
			setLocalError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "load-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
			]);
		},
	});
	const submitBlockReason = getLoadSubmitBlockReason({
		availableQuantity: selectedStock?.availableQuantity,
		hasProduct: !!selectedStock,
		hasProductOptions: (loadOptions?.items.length ?? 0) > 0,
		loadingOptions: loadOptionsLoading,
		online,
		pending: loadMutation.isPending,
		quantity: parsedQuantity,
	});
	const submitDisabled = !!submitBlockReason;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!selectedStock) {
			setLocalError("Выберите продукцию.");
			return;
		}
		if (!isValidQuantity(parsedQuantity, selectedStock)) {
			setLocalError(productQuantity.ok ? "Количество не должно быть больше доступного остатка." : productQuantity.reason);
			return;
		}

		loadMutation.mutate();
	}

	function handleDone() {
		setLoadResult(null);
		onDone();
	}

	function handleNewLoad() {
		setLoadResult(null);
		loadMutation.reset();
	}

	return (
		<section className="screen-stack production-detail-screen">
			<div className="section-heading compact">
				<h2>Загрузка</h2>
			</div>

			{loadResult ? (
				<LoadResultLayer
					onDone={handleDone}
					onNewLoad={handleNewLoad}
					result={loadResult}
				/>
			) : (
			<form className="form-panel production-action-form" onSubmit={handleSubmit}>
				<LoadFormHeading title="Детали загрузки" />
				<OperationProductSelect
					label="Продукция"
					onValueChange={setSelectedBalanceId}
					options={(loadOptions?.items ?? []).map((item) => ({
						discounted: item.discounted,
						id: item.distributorProductBalanceId,
						label: item.productName,
						meta: `${formatProductQuantityLabel({
							quantity: item.availableQuantity,
							totalNetWeightGrams: item.totalNetWeightGrams,
						})} • ${formatRubles(item.unitPriceCents)} ₽`,
					}))}
					placeholder="Выберите продукцию"
					value={selectedBalanceId}
				/>
				{loadOptionsLoading ? <p className="muted">Загрузка продукции</p> : null}
				{loadOptionsError ? <p className="form-error">{loadOptionsErrorValue.message}</p> : null}
				{!loadOptionsLoading && !loadOptionsError && loadOptions?.items.length === 0 ? (
					<p className="muted">Нет продукции для загрузки.</p>
				) : null}

				{selectedStock ? <SelectedStockInfo stock={selectedStock} /> : null}

				<ProductQuantityInputField
					availableQuantity={selectedStock?.availableQuantity}
					id="courier-load-quantity"
					netWeightGrams={selectedStock?.netWeightGrams}
					onChange={setQuantity}
					state={quantity}
				/>
				<label className="field">
					<span>Комментарий</span>
					<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
				</label>
				<LoadInfoLedger>
					<LoadInfoRow label="Количество" value={formatQuantity(parsedQuantity)} />
					<LoadInfoRow label="Итого" value={`${formatRubles(loadValueCents)} ₽`} />
					<LoadInfoRow label="Операция" value="На баланс курьера" />
				</LoadInfoLedger>
				{localError ? <p className="form-error">{localError}</p> : null}
				{loadMutation.isError ? <p className="form-error">{loadMutation.error.message}</p> : null}
				<LoadSubmitBlock blockReason={submitBlockReason}>
					<button className="primary-button" disabled={submitDisabled} type="submit">
						<PackagePlus aria-hidden size={18} />
						Записать загрузку
					</button>
				</LoadSubmitBlock>
			</form>
			)}
		</section>
	);
}

function LoadResultLayer({
	onDone,
	onNewLoad,
	result,
}: {
	onDone: () => void;
	onNewLoad: () => void;
	result: LoadResultSnapshot;
}) {
	return (
		<PostSubmitResultLayer
			createdAt={result.createdAt}
			primaryAction={{ label: "Готово", onClick: onDone }}
			rows={[
				{ label: "Продукция", value: result.productName },
				{ label: "Откуда", value: result.distributorName },
				{ label: "Загружено", value: `${result.quantity} шт • ${formatRubles(result.unitPriceCents)} ₽/шт` },
				{ label: "Итого", value: `${formatRubles(result.stockValueCents)} ₽` },
				...(result.courierQuantityAfter === result.quantity
					? []
					: [{ label: "Остаток курьера", value: `${result.courierQuantityAfter} шт` }]),
			]}
			secondaryAction={{
				icon: <PackagePlus aria-hidden size={16} />,
				label: "Новая загрузка",
				onClick: onNewLoad,
			}}
		/>
	);
}

function LoadFormHeading({ meta, title }: { meta?: string | undefined; title: string }) {
	return (
		<div className="production-form-heading">
			<h2>{title}</h2>
			{meta ? <span>{meta}</span> : null}
		</div>
	);
}

function LoadInfoLedger({ children }: { children: ReactNode }) {
	return <div className="production-form-ledger">{children}</div>;
}

function LoadInfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="production-form-ledger-row">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function LoadSubmitBlock({
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

function SelectedStockInfo({ stock }: { stock: CourierLoadOption }) {
	return (
		<LoadInfoLedger>
			<LoadInfoRow label="Доступно" value={formatProductQuantityLabel({
				quantity: stock.availableQuantity,
				totalNetWeightGrams: stock.totalNetWeightGrams,
			})} />
			<LoadInfoRow label="Масса нетто" value={`${formatKilograms(stock.netWeightGrams)} кг/шт`} />
			<LoadInfoRow label="Цена" value={`${formatRubles(stock.unitPriceCents)} ₽/шт`} />
		</LoadInfoLedger>
	);
}

function isValidQuantity(quantity: number, selectedStock: CourierLoadOption | undefined): boolean {
	return Number.isInteger(quantity)
		&& quantity > 0
		&& !!selectedStock
		&& quantity <= selectedStock.availableQuantity;
}

function getProductQuantityInput(calculation: ProductQuantityCalculation) {
	if (!calculation.ok) {
		throw new Error(calculation.reason);
	}

	return calculation.input;
}

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}

function formatQuantity(quantity: number): string {
	return Number.isInteger(quantity) && quantity > 0 ? `${quantity} шт` : "Количество не задано";
}

function createLoadResultSnapshot({
	courierQuantityAfter,
	distributorName,
	load,
	productName,
}: {
	courierQuantityAfter: number;
	distributorName: string | undefined;
	load: CourierLoad;
	productName: string | undefined;
}): LoadResultSnapshot {
	return {
		courierQuantityAfter,
		createdAt: load.createdAt,
		distributorName: distributorName ?? "Распределитель",
		productName: productName ?? "Продукция",
		quantity: load.quantity,
		stockValueCents: load.stockValueCents,
		unitPriceCents: load.unitPriceCents,
	};
}
