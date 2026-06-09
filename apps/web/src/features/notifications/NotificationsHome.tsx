"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Send } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Notification } from "@buhta/shared";
import {
	completeNotification,
	createNotification,
	listNotifications,
	type CurrentActor,
} from "../../lib/api-client";

type NotificationsHomeProps = {
	actor: CurrentActor;
	online: boolean;
};

type SuccessNotice = {
	id: number;
	message: string;
};

type NotificationStatusView = "new" | "completed";

export function NotificationsHome({ actor, online }: NotificationsHomeProps) {
	const queryClient = useQueryClient();
	const [message, setMessage] = useState("");
	const [statusView, setStatusView] = useState<NotificationStatusView>("new");
	const [localError, setLocalError] = useState("");
	const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
	const successNoticeId = useRef(0);
	const canCreate = actor.permissions.includes("notification.create");
	const canComplete = actor.permissions.includes("notification.complete");
	const notifications = useQuery({
		queryKey: ["notifications", statusView],
		queryFn: () => listNotifications(statusView),
		refetchInterval: 30_000,
	});
	const createMutation = useMutation({
		mutationFn: () => createNotification({ message }),
		onSuccess: async () => {
			setMessage("");
			setLocalError("");
			showSuccess("Задача записана");
			await queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
	const completeMutation = useMutation({
		mutationFn: (notificationId: string) => completeNotification(notificationId),
		onSuccess: async () => {
			showSuccess("Задача выполнена");
			await queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
	const trimmedMessage = message.trim();
	const createDisabled = !online
		|| createMutation.isPending
		|| trimmedMessage.length === 0
		|| trimmedMessage.length > 1000;
	const showRefreshState = notifications.isFetching && !notifications.isLoading;
	const emptyMessage = statusView === "new"
		? "Новых задач для производства нет."
		: "Выполненных задач пока нет.";

	useEffect(() => {
		if (!successNotice) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setSuccessNotice((current) => current?.id === successNotice.id ? null : current);
		}, 3000);

		return () => window.clearTimeout(timeoutId);
	}, [successNotice]);

	function showSuccess(successMessage: string) {
		successNoticeId.current += 1;
		setSuccessNotice({
			id: successNoticeId.current,
			message: successMessage,
		});
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!online) {
			setLocalError("Нет соединения.");
			return;
		}
		if (!trimmedMessage) {
			setLocalError("Напишите задачу для производства.");
			return;
		}
		if (trimmedMessage.length > 1000) {
			setLocalError("Текст задачи должен быть не длиннее 1000 символов.");
			return;
		}

		createMutation.mutate();
	}

	return (
		<section className="screen-stack notification-screen">
			<div className="section-heading">
				<h2>Задачи производству</h2>
				{showRefreshState ? <span>Обновление</span> : null}
			</div>

			{canCreate ? (
				<form className="form-panel production-action-form notification-create-panel" onSubmit={handleSubmit}>
					<div className="production-form-heading">
						<h2>Новая задача</h2>
						<span>{trimmedMessage.length}/1000</span>
					</div>
					<label className="field">
						<span>Что передать производству</span>
						<textarea
							onChange={(event) => setMessage(event.target.value)}
							placeholder="Например: выпустить 3 тонны икры"
							rows={3}
							value={message}
						/>
					</label>
					{localError ? <p className="form-error">{localError}</p> : null}
					{createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
					<div className="production-submit-block">
						{createDisabled ? (
							<p className="production-submit-reason">{getCreateBlockReason(online, trimmedMessage, createMutation.isPending)}</p>
						) : null}
						<button className="primary-button" disabled={createDisabled} type="submit">
							<Send aria-hidden size={18} />
							Отправить задачу
						</button>
					</div>
				</form>
			) : null}

			<div className="notification-summary-panel" aria-label="Очередь задач" role="tablist">
				<button
					aria-selected={statusView === "new"}
					className={statusView === "new" ? "active" : ""}
					onClick={() => setStatusView("new")}
					role="tab"
					type="button"
				>
					<span>Новые</span>
					<strong>{notifications.data?.summary.newCount ?? 0}</strong>
				</button>
				<button
					aria-selected={statusView === "completed"}
					className={statusView === "completed" ? "active" : ""}
					onClick={() => setStatusView("completed")}
					role="tab"
					type="button"
				>
					<span>Выполненные</span>
					<strong>{notifications.data?.summary.completedCount ?? 0}</strong>
				</button>
			</div>

			{notifications.isLoading ? <p className="muted">Загрузка задач</p> : null}
			{notifications.isError ? <p className="form-error">{notifications.error.message}</p> : null}
			{!notifications.isLoading && !notifications.isError && (notifications.data?.items.length ?? 0) === 0 ? (
				<p className="muted">{emptyMessage}</p>
			) : null}
			<div className="notification-ledger" role="list">
				{notifications.data?.items.map((item) => (
					<NotificationRow
						canComplete={canComplete}
						completeDisabled={!online || completeMutation.isPending}
						item={item}
						key={item.id}
						onComplete={() => completeMutation.mutate(item.id)}
					/>
				))}
			</div>
			{completeMutation.isError ? <p className="form-error">{completeMutation.error.message}</p> : null}
			{successNotice ? (
				<div className="success-notice inline-success" role="status" aria-live="polite">
					<Check aria-hidden size={17} />
					{successNotice.message}
				</div>
			) : null}
		</section>
	);
}

function NotificationRow({
	canComplete,
	completeDisabled,
	item,
	onComplete,
}: {
	canComplete: boolean;
	completeDisabled: boolean;
	item: Notification;
	onComplete: () => void;
}) {
	const completed = item.status === "completed";

	return (
		<div className="notification-ledger-row" role="listitem">
			<div>
				<strong>{item.message}</strong>
				<div className="notification-meta-row">
					<span className={completed ? "notification-state completed" : "notification-state new"}>
						{completed ? "Выполнено" : "Новое"}
					</span>
					<span>{formatDate(item.createdAt)}</span>
					<span>{item.createdBy.displayName}</span>
				</div>
				{completed && item.completedBy ? (
					<p>Закрыл: {item.completedBy.displayName}{item.completedAt ? ` · ${formatDate(item.completedAt)}` : ""}</p>
				) : null}
			</div>
			{canComplete && !completed ? (
				<input
					aria-label="Отметить задачу выполненной"
					checked={false}
					className="notification-complete-checkbox"
					disabled={completeDisabled}
					onChange={onComplete}
					type="checkbox"
				/>
			) : (
				<>
					{completed && canComplete ? (
						<input
							aria-label="Задача выполнена"
							checked
							className="notification-complete-checkbox"
							disabled
							readOnly
							type="checkbox"
						/>
					) : (
						<strong className="notification-status">{completed ? "Готово" : "Новая"}</strong>
					)}
				</>
			)}
		</div>
	);
}

function getCreateBlockReason(online: boolean, message: string, pending: boolean): string {
	if (!online) {
		return "Нет соединения.";
	}
	if (pending) {
		return "Записываем задачу.";
	}
	if (!message) {
		return "Напишите задачу для производства.";
	}
	if (message.length > 1000) {
		return "Текст задачи должен быть не длиннее 1000 символов.";
	}

	return "";
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		month: "2-digit",
	}).format(new Date(value));
}
