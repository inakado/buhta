"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DistributorInventoryItem, DistributorStockCorrection } from "@buhta/shared";
import { PackageMinus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { createDistributorStockCorrection } from "../../lib/api-client";
import { formatCompactRubles } from "../../lib/money-format";
import { PostSubmitResultLayer } from "../operations/PostSubmitResultLayer";
import {
	calculateProductQuantity,
	formatKilograms,
	formatProductQuantityLabel,
	ProductQuantityInputField,
	type ProductQuantityInputState,
} from "../operations/product-quantity-input";

type CorrectionState = {
	quantity: ProductQuantityInputState;
	reason: string;
	localError: string;
	result: DistributorStockCorrection | null;
};

export function DistributorStockCorrectionDialog({
	item,
	onClose,
	online,
}: {
	item: DistributorInventoryItem;
	onClose: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [state, setState] = useState<CorrectionState>(() => createInitialState(item));
	const parsedQuantity = calculateProductQuantity({
		availableQuantity: item.quantity,
		netWeightGrams: item.netWeightGrams,
		state: state.quantity,
	});
	const quantity = parsedQuantity.ok ? parsedQuantity.quantity : 0;
	const balanceAfter = Math.max(item.quantity - quantity, 0);
	const stockValueAfterCents = balanceAfter * item.unitPriceCents;
	const correction = useMutation({
		mutationFn: createDistributorStockCorrection,
		onSuccess: async (response) => {
			setState((current) => ({ ...current, result: response.correction }));
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["courier", "load-options"] }),
				queryClient.invalidateQueries({ queryKey: ["analytics", "director"] }),
				queryClient.invalidateQueries({ queryKey: ["operations", "history"] }),
			]);
		},
	});
	const reason = state.reason.trim();
	const disabled = !online
		|| correction.isPending
		|| !parsedQuantity.ok
		|| quantity <= 0
		|| quantity > item.quantity
		|| reason.length < 3;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!online) {
			setState((current) => ({ ...current, localError: "Нет соединения." }));
			return;
		}
		if (!parsedQuantity.ok || parsedQuantity.quantity <= 0) {
			setState((current) => ({
				...current,
				localError: parsedQuantity.ok ? "Укажите количество." : parsedQuantity.reason,
			}));
			return;
		}
		if (parsedQuantity.quantity > item.quantity) {
			setState((current) => ({ ...current, localError: "Количество больше остатка." }));
			return;
		}
		if (reason.length < 3) {
			setState((current) => ({ ...current, localError: "Укажите причину корректировки." }));
			return;
		}

		setState((current) => ({ ...current, localError: "" }));
		correction.mutate({
			distributorProductBalanceId: item.id,
			quantityInput: parsedQuantity.input,
			reason,
		});
	}

	function handleOpenChange(open: boolean) {
		if (!open && !correction.isPending) {
			onClose();
		}
	}

	function resetForm() {
		setState(createInitialState(item));
		correction.reset();
	}

	return (
		<Dialog.Root onOpenChange={handleOpenChange} open>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog">
					{state.result ? (
						<PostSubmitResultLayer
							createdAt={state.result.createdAt}
							primaryAction={{ label: "Готово", onClick: onClose }}
							rows={[
								{ label: "Продукция", value: state.result.productName },
								{ label: "Распределитель", value: state.result.distributorName },
								{ label: "Списано", value: formatProductQuantityLabel(state.result) },
								{ label: "Стоимость списания", value: formatRubles(state.result.stockValueBeforeCents - state.result.stockValueAfterCents) },
								{ label: "Остаток", value: formatProductQuantityLabel({ quantity: state.result.balanceAfter, totalNetWeightGrams: state.result.balanceAfter * state.result.netWeightGrams }) },
								{ label: "Причина", value: state.result.reason },
							]}
							secondaryAction={state.result.balanceAfter > 0 ? {
								icon: <PackageMinus aria-hidden size={16} />,
								label: "Скорректировать еще",
								onClick: resetForm,
							} : undefined}
							title="Остаток скорректирован"
						/>
					) : (
						<form className="operation-dialog-form production-action-form" onSubmit={handleSubmit}>
							<div className="operation-dialog-heading">
								<div>
									<Dialog.Title>Корректировка остатка</Dialog.Title>
									<Dialog.Description>Списание ошибочной или тестовой продукции</Dialog.Description>
								</div>
								<Dialog.Close aria-label="Закрыть" className="icon-button" disabled={correction.isPending} type="button">
									<X aria-hidden size={18} />
								</Dialog.Close>
							</div>
							<div className="operation-source-card">
								<PackageMinus aria-hidden size={18} />
								<div>
									<strong>{item.productName}</strong>
									<span>{item.distributorName} • {formatRubles(item.unitPriceCents)}/шт • доступно {formatProductQuantityLabel(item)}</span>
								</div>
							</div>
							<ProductQuantityInputField
								availableQuantity={item.quantity}
								id="distributor-stock-correction-quantity"
								netWeightGrams={item.netWeightGrams}
								onChange={(quantityState) => setState((current) => ({ ...current, quantity: quantityState }))}
								state={state.quantity}
							/>
							<label className="field">
								<span>Причина</span>
								<textarea
									onChange={(event) => setState((current) => ({ ...current, reason: event.target.value }))}
									placeholder="Например, удаление тестовой продукции"
									rows={2}
									value={state.reason}
								/>
							</label>
							<div className="cash-withdrawal-summary">
								<div><span>Было</span><strong>{formatProductQuantityLabel(item)}</strong></div>
								<div><span>Списать</span><strong>{parsedQuantity.ok ? formatProductQuantityLabel(parsedQuantity) : "—"}</strong></div>
								<div><span>Остаток</span><strong>{formatProductQuantityLabel({ quantity: balanceAfter, totalNetWeightGrams: balanceAfter * item.netWeightGrams })}</strong></div>
							</div>
							<div className="correction-value-line">
								<span>Стоимость остатка</span>
								<strong>{formatRubles(item.stockValueCents)} → {formatRubles(stockValueAfterCents)}</strong>
							</div>
							{state.localError ? <p className="form-error">{state.localError}</p> : null}
							{correction.isError ? <p className="form-error">{correction.error.message}</p> : null}
							<div className="form-actions">
								<button className="secondary-button" disabled={correction.isPending} onClick={onClose} type="button">Отмена</button>
								<button className="primary-button" disabled={disabled} type="submit">Списать продукцию</button>
							</div>
						</form>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function createInitialState(item: DistributorInventoryItem): CorrectionState {
	return {
		quantity: { mode: "net_weight", value: formatKilograms(item.totalNetWeightGrams) },
		reason: "",
		localError: "",
		result: null,
	};
}

function formatRubles(priceCents: number): string {
	return formatCompactRubles(priceCents);
}
