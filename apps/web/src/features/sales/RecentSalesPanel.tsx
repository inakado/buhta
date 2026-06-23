"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BadgePercent, CheckCircle2, RotateCcw, X } from "lucide-react";
import {
	formatMoneyCents,
	moneyCents,
	type CourierRecentSaleItem,
	type DistributorRecentSaleItem,
} from "@buhta/shared";

type RecentSaleItem = CourierRecentSaleItem | DistributorRecentSaleItem;

const SALE_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	month: "short",
});

type RecentSalesPanelProps = {
	cancelError: string | undefined;
	cancelReason: string;
	emptyText?: string;
	hasMore: boolean;
	items: RecentSaleItem[];
	loading: boolean;
	loadingMore: boolean;
	online: boolean;
	pending: boolean;
	selectedSaleId: string;
	onCancelClose: () => void;
	onCancelOpen: (saleId: string) => void;
	onCancelReasonChange: (reason: string) => void;
	onCancelSubmit: (saleId: string, reason: string) => void;
	onLoadMore: () => void;
};

export function RecentSalesPanel({
	cancelError,
	cancelReason,
	emptyText = "Продаж пока нет.",
	hasMore,
	items,
	loading,
	loadingMore,
	online,
	pending,
	selectedSaleId,
	onCancelClose,
	onCancelOpen,
	onCancelReasonChange,
	onCancelSubmit,
	onLoadMore,
}: RecentSalesPanelProps) {
	const selectedSale = items.find((item) => item.id === selectedSaleId);
	const canSubmit = !!selectedSale && online && !pending && cancelReason.trim().length >= 3;

	return (
		<section className="recent-sales-panel" aria-label="Список продаж">
			{loading ? <p className="muted">Загрузка продаж</p> : null}
			{!loading && items.length === 0 ? <p className="muted">{emptyText}</p> : null}
			{items.length > 0 ? (
				<div className="recent-sales-list">
					{items.map((item) => {
						return (
							<article className={item.cancelled ? "recent-sale-card cancelled" : "recent-sale-card"} key={item.id}>
								<div className="recent-sale-main">
									<div className="recent-sale-title">
										<span>
											{item.productName}
											{item.discountCentsPerUnit > 0 ? (
												<BadgePercent aria-hidden className="recent-sale-discount-icon" size={14} strokeWidth={2.2} />
											) : null}
										</span>
									</div>
									<p>
										{item.clientName} • {item.quantity} шт • {formatRubles(item.unitPriceCents)} ₽/шт •{" "}
										{item.paymentMethod === "cash" ? "наличные" : "безнал"}
									</p>
									<p>{formatSaleDate(item.createdAt)} · {item.saleActorDisplayName}</p>
								</div>
								<div className="recent-sale-side">
									<strong>{formatRubles(item.totalCents)} ₽</strong>
									{item.cancelled ? (
										<div className="recent-sale-status">
											<CheckCircle2 aria-hidden size={16} />
											<span>
												Отменено{item.cancelledByActorDisplayName ? ` · ${item.cancelledByActorDisplayName}` : ""}
											</span>
										</div>
									) : (
										<button
											className="recent-sale-cancel-button"
											disabled={!online || pending}
											onClick={() => onCancelOpen(item.id)}
											type="button"
										>
											<RotateCcw aria-hidden size={16} />
											Отменить
										</button>
									)}
								</div>
							</article>
						);
					})}
				</div>
			) : null}
			{hasMore ? (
				<button
					className="secondary-button operation-history-more"
					disabled={loadingMore}
					onClick={onLoadMore}
					type="button"
				>
					{loadingMore ? "Загрузка" : "Показать еще"}
				</button>
			) : null}
			<Dialog.Root
				open={!!selectedSale && !selectedSale.cancelled}
				onOpenChange={(open) => {
					if (!open) {
						onCancelClose();
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="operation-dialog-overlay" />
					<Dialog.Content aria-describedby={undefined} className="operation-dialog sale-cancel-dialog">
						<div className="operation-dialog-form">
							<div className="operation-dialog-heading">
								<div>
									<Dialog.Title>Отмена продажи</Dialog.Title>
								</div>
								<Dialog.Close
									aria-label="Закрыть"
									className="icon-button"
									disabled={pending}
									type="button"
								>
									<X aria-hidden size={18} />
								</Dialog.Close>
							</div>
							{selectedSale ? (
								<div className="recent-sale-cancel-summary">
									<strong>{selectedSale.productName}</strong>
									<span>
										{selectedSale.clientName} • {selectedSale.quantity} шт •{" "}
										{formatRubles(selectedSale.totalCents)} ₽
									</span>
								</div>
							) : null}
							<label className="field">
								<span>Причина отмены</span>
								<textarea
									onChange={(event) => onCancelReasonChange(event.target.value)}
									rows={3}
									value={cancelReason}
								/>
							</label>
							{cancelError ? <p className="form-error">{cancelError}</p> : null}
							<div className="form-actions">
								<Dialog.Close asChild>
									<button className="secondary-button" disabled={pending} type="button">
										Закрыть
									</button>
								</Dialog.Close>
								<button
									className="primary-button"
									disabled={!canSubmit}
									onClick={() => {
										if (selectedSale) {
											onCancelSubmit(selectedSale.id, cancelReason);
										}
									}}
									type="button"
								>
									<RotateCcw aria-hidden size={16} />
									Отменить продажу
								</button>
							</div>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</section>
	);
}

function formatRubles(priceCents: number): string {
	return formatMoneyCents(moneyCents(priceCents));
}

function formatSaleDate(value: string): string {
	return SALE_DATE_FORMATTER.format(new Date(value));
}
