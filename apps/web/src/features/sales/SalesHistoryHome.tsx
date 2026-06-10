"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { FormEvent, useReducer } from "react";
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
type SalesHistoryState = {
	cancellingSaleId: string;
	cancelReason: string;
	cancelLocalError: string;
	successNotice: string;
	searchDraft: string;
	search: string;
	status: SalesStatusFilter;
};
type SalesHistoryAction =
	| { type: "patch"; values: Partial<SalesHistoryState> }
	| { type: "openCancel"; saleId: string }
	| { type: "closeCancel" }
	| { type: "cancelSuccess" }
	| { type: "submitSearch" }
	| { type: "clearSearch" };

const SALES_HISTORY_LIMIT = 20;
const INITIAL_SALES_HISTORY_STATE: SalesHistoryState = {
	cancellingSaleId: "",
	cancelReason: "",
	cancelLocalError: "",
	successNotice: "",
	searchDraft: "",
	search: "",
	status: "all",
};
const STATUS_FILTERS: Array<{ id: SalesStatusFilter; label: string }> = [
	{ id: "all", label: "Все" },
	{ id: "active", label: "Активные" },
	{ id: "cancelled", label: "Отмененные" },
];

function salesHistoryReducer(state: SalesHistoryState, action: SalesHistoryAction): SalesHistoryState {
	switch (action.type) {
		case "patch":
			return { ...state, ...action.values };
		case "openCancel":
			return {
				...state,
				cancellingSaleId: action.saleId,
				cancelReason: "",
				cancelLocalError: "",
				successNotice: "",
			};
		case "closeCancel":
			return {
				...state,
				cancellingSaleId: "",
				cancelReason: "",
				cancelLocalError: "",
			};
		case "cancelSuccess":
			return {
				...state,
				cancellingSaleId: "",
				cancelReason: "",
				cancelLocalError: "",
				successNotice: "Продажа отменена",
			};
		case "submitSearch":
			return { ...state, search: state.searchDraft.trim() };
		case "clearSearch":
			return { ...state, searchDraft: "", search: "" };
	}
}

export function SalesHistoryHome({ actor, online }: SalesHistoryHomeProps) {
	const queryClient = useQueryClient();
	const [state, dispatch] = useReducer(salesHistoryReducer, INITIAL_SALES_HISTORY_STATE);
	const { cancellingSaleId, cancelLocalError, cancelReason, search, searchDraft, status, successNotice } = state;
	const source = actor.role === "courier" ? "courier" : "distributor";
	const queryKey = source === "courier"
		? ["courier", "sales", "history", { search, status }]
		: ["distributor", "sales", "history", { search, status }];
	const {
		data: salesHistory,
		error: salesHistoryErrorValue,
		fetchNextPage,
		hasNextPage,
		isError: salesHistoryError,
		isFetching: salesHistoryFetching,
		isFetchingNextPage,
		isPending: salesHistoryPending,
	} = useInfiniteQuery<RecentSalesResponse>({
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
	const items = salesHistory?.pages.flatMap((page) => page.items) ?? [];
	const cancelMutation = useMutation({
		mutationFn: async ({ reason, saleId }: { reason: string; saleId: string }): Promise<void> => {
			if (source === "courier") {
				await cancelCourierSale(saleId, { reason });
				return;
			}

			await cancelDistributorSale(saleId, { reason });
		},
		onSuccess: async () => {
			dispatch({ type: "cancelSuccess" });

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
		dispatch({ type: "openCancel", saleId });
	}

	function handleCancelSubmit(saleId: string, reason: string) {
		dispatch({ type: "patch", values: { cancelLocalError: "" } });
		const trimmedReason = reason.trim();
		if (trimmedReason.length < 3) {
			dispatch({ type: "patch", values: { cancelLocalError: "Укажите причину отмены." } });
			return;
		}
		cancelMutation.mutate({ saleId, reason: trimmedReason });
	}

	function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		dispatch({ type: "submitSearch" });
	}

	function clearSearch() {
		dispatch({ type: "clearSearch" });
	}

	return (
		<section className="screen-stack sales-history-home">
			<div className="section-heading compact">
				<h2>История продаж</h2>
				{salesHistoryFetching && !isFetchingNextPage ? <span>Обновление</span> : null}
			</div>
			<form className="sales-history-filters" onSubmit={handleSearchSubmit}>
				<label className="field">
					<span>Поиск</span>
					<div className="input-shell">
						<input
							onChange={(event) => dispatch({ type: "patch", values: { searchDraft: event.target.value } })}
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
						onClick={() => dispatch({ type: "patch", values: { status: filter.id } })}
						type="button"
					>
						<span>{filter.label}</span>
					</button>
				))}
			</div>
			{successNotice ? (
				<output className="success-notice inline-success" aria-live="polite">
					<Check aria-hidden size={16} />
					{successNotice}
				</output>
			) : null}
			{salesHistoryError ? <p className="form-error">{salesHistoryErrorValue.message}</p> : null}
			<RecentSalesPanel
				cancelError={cancelLocalError || (cancelMutation.isError ? cancelMutation.error.message : undefined)}
				cancelReason={cancelReason}
				emptyText={search || status !== "all" ? "Продаж по выбранным условиям нет." : "Продаж пока нет."}
				hasMore={hasNextPage}
				items={items}
				loading={salesHistoryPending}
				loadingMore={isFetchingNextPage}
				online={online}
				pending={cancelMutation.isPending}
				selectedSaleId={cancellingSaleId}
				onCancelClose={() => dispatch({ type: "closeCancel" })}
				onCancelOpen={handleCancelOpen}
				onCancelReasonChange={(reason) => dispatch({ type: "patch", values: { cancelReason: reason } })}
				onCancelSubmit={handleCancelSubmit}
				onLoadMore={() => void fetchNextPage()}
			/>
		</section>
	);
}
