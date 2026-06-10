"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, type ReactNode, useState } from "react";
import { PackagePlus } from "lucide-react";
import type { CourierLoadOption } from "@buhta/shared";
import { createCourierLoad, getCourierLoadOptions } from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
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
		<section className="screen-stack production-detail-screen">
			<div className="section-heading compact">
				<h2>Загрузка</h2>
			</div>

			<form className="form-panel production-action-form" onSubmit={handleSubmit}>
				<LoadFormHeading title="Детали загрузки" />
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
		</section>
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
			<LoadInfoRow label="Доступно" value={`${stock.availableQuantity} шт`} />
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

function formatRubles(priceCents: number): string {
	return formatCompactMoneyCents(priceCents);
}

function formatQuantity(quantity: number): string {
	return Number.isInteger(quantity) && quantity > 0 ? `${quantity} шт` : "Количество не задано";
}
