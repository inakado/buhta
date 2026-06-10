"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { FormEvent, useState } from "react";
import type { CourierRecentSaleItem, DistributorRecentSaleItem } from "@buhta/shared";
import {
	cancelCourierSale,
	cancelDistributorSale,
	getCourierSalesHistory,
	getDistributorSalesHistory,
	type CurrentActor,
} from "../../lib/api-client";
import { RecentSalesPanel } from "./RecentSalesPanel";

type SalesHistoryHomeProps = {
	actor: CurrentActor;
	online: boolean;
};

type RecentSalesResponse = {
	items: Array<CourierRecentSaleItem | DistributorRecentSaleItem>;
	nextCursor: string | null;
};

type SalesStatusFilter = "all" | "active" | "cancelled";

const SALES_HISTORY_LIMIT = 20;
const STATUS_FILTERS: Array<{ id: SalesStatusFilter; label: string }> = [
	{ id: "all", label: "Все" },
	{ id: "active", label: "Активные" },
	{ id: "cancelled", label: "Отмененные" },
];

export function SalesHistoryHome({ actor, online }: SalesHistoryHomeProps) {
	const queryClient = useQueryClient();
	const [cancellingSaleId, setCancellingSaleId] = useState("");
	const [cancelReason, setCancelReason] = useState("");
	const [cancelLocalError, setCancelLocalError] = useState("");
	const [successNotice, setSuccessNotice] = useState("");
	const [searchDraft, setSearchDraft] = useState("");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<SalesStatusFilter>("all");
	const source = actor.role === "courier" ? "courier" : "distributor";
	const queryKey = source === "courier"
		? ["courier", "sales", "history", { search, status }]
		: ["distributor", "sales", "history", { search, status }];
	const salesHistory = useInfiniteQuery<RecentSalesResponse>({
		queryKey,
		initialPageParam: undefined as string | undefined,
		queryFn: async ({ pageParam }) => source === "courier"
			? getCourierSalesHistory({
				cursor: typeof pageParam === "string" ? pageParam : undefined,
				limit: SALES_HISTORY_LIMIT,
				search: search || undefined,
				status,
			})
			: getDistributorSalesHistory({
				cursor: typeof pageParam === "string" ? pageParam : undefined,
				limit: SALES_HISTORY_LIMIT,
				search: search || undefined,
				status,
			}),
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
	const items = salesHistory.data?.pages.flatMap((page) => page.items) ?? [];
	const cancelMutation = useMutation({
		mutationFn: async ({ reason, saleId }: { reason: string; saleId: string }): Promise<void> => {
			if (source === "courier") {
				await cancelCourierSale(saleId, { reason });
				return;
			}

			await cancelDistributorSale(saleId, { reason });
		},
		onSuccess: async () => {
			setCancellingSaleId("");
			setCancelReason("");
			setCancelLocalError("");
			setSuccessNotice("Продажа отменена");

			if (source === "courier") {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ["courier", "product-balances"] }),
					queryClient.invalidateQueries({ queryKey: ["courier", "sale-options"] }),
					queryClient.invalidateQueries({ queryKey: ["courier", "cash-balances"] }),
					queryClient.invalidateQueries({ queryKey: ["courier", "sales"] }),
				]);
				return;
			}

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sales"] }),
			]);
		},
	});

	function handleCancelOpen(saleId: string) {
		setCancellingSaleId(saleId);
		setCancelReason("");
		setCancelLocalError("");
		setSuccessNotice("");
	}

	function handleCancelSubmit(saleId: string, reason: string) {
		setCancelLocalError("");
		const trimmedReason = reason.trim();
		if (trimmedReason.length < 3) {
			setCancelLocalError("Укажите причину отмены.");
			return;
		}
		cancelMutation.mutate({ saleId, reason: trimmedReason });
	}

	function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSearch(searchDraft.trim());
	}

	function clearSearch() {
		setSearchDraft("");
		setSearch("");
	}

	return (
		<section className="screen-stack sales-history-home">
			<div className="section-heading compact">
				<h2>История продаж</h2>
				{salesHistory.isFetching && !salesHistory.isFetchingNextPage ? <span>Обновление</span> : null}
			</div>
			<form className="sales-history-filters" onSubmit={handleSearchSubmit}>
				<label className="field">
					<span>Поиск</span>
					<div className="input-shell">
						<input
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Клиент, телефон или товар"
							type="search"
							value={searchDraft}
						/>
					</div>
				</label>
				<div className="sales-history-filter-actions">
					<button className="secondary-button compact-button" type="submit">
						Найти
					</button>
					{search || searchDraft ? (
						<button className="secondary-button compact-button" onClick={clearSearch} type="button">
							Сбросить
						</button>
					) : null}
				</div>
			</form>
			<div className="segmented-control sales-history-status" aria-label="Статус продаж">
				{STATUS_FILTERS.map((filter) => (
					<button
						className={status === filter.id ? "active" : undefined}
						key={filter.id}
						onClick={() => setStatus(filter.id)}
						type="button"
					>
						<span>{filter.label}</span>
					</button>
				))}
			</div>
			{successNotice ? (
				<div className="success-notice inline-success" role="status" aria-live="polite">
					<Check aria-hidden size={16} />
					{successNotice}
				</div>
			) : null}
			{salesHistory.isError ? <p className="form-error">{salesHistory.error.message}</p> : null}
			<RecentSalesPanel
				cancelError={cancelLocalError || (cancelMutation.isError ? cancelMutation.error.message : undefined)}
				cancelReason={cancelReason}
				emptyText={search || status !== "all" ? "Продаж по выбранным условиям нет." : "Продаж пока нет."}
				hasMore={salesHistory.hasNextPage}
				items={items}
				loading={salesHistory.isPending}
				loadingMore={salesHistory.isFetchingNextPage}
				online={online}
				pending={cancelMutation.isPending}
				selectedSaleId={cancellingSaleId}
				onCancelClose={() => {
					setCancellingSaleId("");
					setCancelReason("");
					setCancelLocalError("");
				}}
				onCancelOpen={handleCancelOpen}
				onCancelReasonChange={setCancelReason}
				onCancelSubmit={handleCancelSubmit}
				onLoadMore={() => void salesHistory.fetchNextPage()}
			/>
		</section>
	);
}
