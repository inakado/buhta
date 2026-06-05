"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { PackagePlus } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierLoadOption,
} from "@buhta/shared";
import { createCourierLoad, getCourierLoadOptions } from "../../lib/api-client";
import { OperationProductSelect } from "../operations/OperationProductSelect";
import { getLoadSubmitBlockReason } from "../operations/operation-submit-reasons";

export function CourierLoadHome({
	onLoadSuccess,
	online,
}: {
	onLoadSuccess: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [selectedBalanceId, setSelectedBalanceId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [comment, setComment] = useState("");
	const [localError, setLocalError] = useState("");
	const loadOptions = useQuery({
		queryKey: ["courier", "load-options"],
		queryFn: getCourierLoadOptions,
	});
	const selectedStock = loadOptions.data?.items.find((item) =>
		item.distributorProductBalanceId === selectedBalanceId,
	);
	const parsedQuantity = Number(quantity);
	const loadValueCents = selectedStock && Number.isInteger(parsedQuantity) && parsedQuantity > 0
		? selectedStock.unitPriceCents * parsedQuantity
		: 0;
	const loadMutation = useMutation({
		mutationFn: () => createCourierLoad({
			distributorProductBalanceId: selectedBalanceId,
			quantity: parsedQuantity,
			...(comment.trim() ? { comment: comment.trim() } : {}),
		}),
		onSuccess: async () => {
			setSelectedBalanceId("");
			setQuantity("");
			setComment("");
			setLocalError("");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "load-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
			]);
			onLoadSuccess();
		},
	});
	const submitBlockReason = getLoadSubmitBlockReason({
		availableQuantity: selectedStock?.availableQuantity,
		hasProduct: !!selectedStock,
		hasProductOptions: (loadOptions.data?.items.length ?? 0) > 0,
		loadingOptions: loadOptions.isLoading,
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
			setLocalError("Количество должно быть целым числом не больше доступного количества.");
			return;
		}

		loadMutation.mutate();
	}

	return (
		<section className="screen-stack">
			<div className="section-heading compact">
				<h2>Загрузка</h2>
			</div>

			<form className="form-panel" onSubmit={handleSubmit}>
				<div className="section-heading compact">
					<h2>Детали загрузки</h2>
				</div>
				<OperationProductSelect
					label="Продукция"
					onValueChange={setSelectedBalanceId}
					options={(loadOptions.data?.items ?? []).map((item) => ({
						discounted: item.discounted,
						id: item.distributorProductBalanceId,
						label: item.productName,
						meta: `${item.availableQuantity} шт · ${formatRubles(item.unitPriceCents)} ₽`,
					}))}
					placeholder="Выберите продукцию"
					value={selectedBalanceId}
				/>
				{loadOptions.isLoading ? <p className="muted">Загрузка продукции</p> : null}
				{loadOptions.isError ? <p className="form-error">{loadOptions.error.message}</p> : null}
				{!loadOptions.isLoading && !loadOptions.isError && loadOptions.data?.items.length === 0 ? (
					<p className="muted">Нет продукции для загрузки.</p>
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
					<span>Комментарий</span>
					<textarea onChange={(event) => setComment(event.target.value)} rows={2} value={comment} />
				</label>
				<div className="operation-total">
					<div>
						<span>Итого</span>
						<strong>{formatRubles(loadValueCents)} ₽</strong>
					</div>
					<p>Продукция на балансе курьера</p>
				</div>
				{localError ? <p className="form-error">{localError}</p> : null}
				{loadMutation.isError ? <p className="form-error">{loadMutation.error.message}</p> : null}
				{submitBlockReason ? <p className="muted">{submitBlockReason}</p> : null}
				<button className="primary-button" disabled={submitDisabled} type="submit">
					<PackagePlus aria-hidden size={18} />
					Записать загрузку
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
	stock: CourierLoadOption;
}) {
	const totalCents = Number.isInteger(quantity) && quantity > 0 ? quantity * stock.unitPriceCents : 0;

	return (
		<p className="muted">
			Доступно: {stock.availableQuantity} шт · {formatRubles(stock.unitPriceCents)} ₽/шт
			{totalCents > 0 ? ` · ${formatRubles(totalCents)} ₽` : ""}
		</p>
	);
}

function isValidQuantity(quantity: number, selectedStock: CourierLoadOption | undefined): boolean {
	return Number.isInteger(quantity)
		&& quantity > 0
		&& !!selectedStock
		&& quantity <= selectedStock.availableQuantity;
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}
