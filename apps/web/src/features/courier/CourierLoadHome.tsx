"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Calculator, PackagePlus } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierLoadOption,
} from "@buhta/shared";
import { createCourierLoad, getCourierLoadOptions } from "../../lib/api-client";

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
	const submitDisabled = !online
		|| loadMutation.isPending
		|| loadOptions.isLoading
		|| (loadOptions.data?.items.length ?? 0) === 0
		|| !selectedBalanceId
		|| !isValidQuantity(parsedQuantity, selectedStock);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!selectedStock) {
			setLocalError("Выберите продукцию.");
			return;
		}
		if (!isValidQuantity(parsedQuantity, selectedStock)) {
			setLocalError("Количество должно быть целым числом не больше доступного остатка.");
			return;
		}

		loadMutation.mutate();
	}

	return (
		<section className="screen-stack">
			<div className="summary-card compact-summary">
				<div>
					<p className="summary-label">Загрузка</p>
					<strong>{loadValueCents > 0 ? `${formatRubles(loadValueCents)} ₽` : "Новая загрузка"}</strong>
					<p className="summary-note">С распределителя на свой баланс</p>
				</div>
				<PackagePlus aria-hidden size={28} />
			</div>

			<form className="form-panel" onSubmit={handleSubmit}>
				<div className="section-heading compact">
					<h2>Детали загрузки</h2>
				</div>
				<label className="field">
					<span>Продукция</span>
					<select
						onChange={(event) => setSelectedBalanceId(event.target.value)}
						value={selectedBalanceId}
					>
						<option value="">Выберите продукцию</option>
						{loadOptions.data?.items.map((item) => (
							<option key={item.distributorProductBalanceId} value={item.distributorProductBalanceId}>
								{item.productName} · {item.availableQuantity} шт · {formatRubles(item.unitPriceCents)} ₽
							</option>
						))}
					</select>
				</label>
				{loadOptions.isLoading ? <p className="muted">Загрузка остатков</p> : null}
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
				<div className="entity-card sale-total-card">
					<div className="inventory-item-main">
						<div className="production-row-icon">
							<Calculator aria-hidden size={18} />
						</div>
						<div>
							<strong>Итого</strong>
							<p>Товар на балансе курьера</p>
						</div>
					</div>
					<div className="production-history-meta">
						<strong>{formatRubles(loadValueCents)} ₽</strong>
					</div>
				</div>
				{localError ? <p className="form-error">{localError}</p> : null}
				{loadMutation.isError ? <p className="form-error">{loadMutation.error.message}</p> : null}
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
