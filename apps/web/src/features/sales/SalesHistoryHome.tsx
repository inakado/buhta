"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import type { CourierRecentSaleItem, DistributorRecentSaleItem } from "@buhta/shared";
import {
	cancelCourierSale,
	cancelDistributorSale,
	getCourierRecentSales,
	getDistributorRecentSales,
	type CurrentActor,
} from "../../lib/api-client";
import { RecentSalesPanel } from "./RecentSalesPanel";

type SalesHistoryHomeProps = {
	actor: CurrentActor;
	online: boolean;
};

type RecentSalesResponse = {
	items: Array<CourierRecentSaleItem | DistributorRecentSaleItem>;
};

export function SalesHistoryHome({ actor, online }: SalesHistoryHomeProps) {
	const queryClient = useQueryClient();
	const [cancellingSaleId, setCancellingSaleId] = useState("");
	const [cancelReason, setCancelReason] = useState("");
	const [cancelLocalError, setCancelLocalError] = useState("");
	const [successNotice, setSuccessNotice] = useState("");
	const source = actor.role === "courier" ? "courier" : "distributor";
	const queryKey = source === "courier"
		? ["courier", "sales", "recent"]
		: ["distributor", "sales", "recent"];
	const recentSales = useQuery<RecentSalesResponse>({
		queryKey,
		queryFn: async () => source === "courier" ? getCourierRecentSales(10) : getDistributorRecentSales(10),
	});
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
					queryClient.invalidateQueries({ queryKey: ["courier", "sales", "recent"] }),
				]);
				return;
			}

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["distributor", "inventory"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sale-options"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "cash-balances"] }),
				queryClient.invalidateQueries({ queryKey: ["distributor", "sales", "recent"] }),
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

	return (
		<section className="screen-stack sales-history-home">
			<div className="section-heading compact">
				<h2>История продаж</h2>
				{recentSales.isFetching ? <span>Обновление</span> : null}
			</div>
			{successNotice ? (
				<div className="success-notice inline-success" role="status" aria-live="polite">
					<Check aria-hidden size={16} />
					{successNotice}
				</div>
			) : null}
			{recentSales.isError ? <p className="form-error">{recentSales.error.message}</p> : null}
			<RecentSalesPanel
				cancelError={cancelLocalError || (cancelMutation.isError ? cancelMutation.error.message : undefined)}
				cancelReason={cancelReason}
				items={recentSales.data?.items ?? []}
				loading={recentSales.isLoading}
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
			/>
		</section>
	);
}
