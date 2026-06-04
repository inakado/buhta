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

export function NotificationsHome({ actor, online }: NotificationsHomeProps) {
	const queryClient = useQueryClient();
	const [message, setMessage] = useState("");
	const [localError, setLocalError] = useState("");
	const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
	const successNoticeId = useRef(0);
	const canCreate = actor.permissions.includes("notification.create");
	const canComplete = actor.permissions.includes("notification.complete");
	const notifications = useQuery({
		queryKey: ["notifications", "all"],
		queryFn: () => listNotifications("all"),
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
		<section className="screen-stack">
			<h2 className="sr-only">Задачи производству</h2>
			{notifications.isFetching ? <p className="muted">Обновление</p> : null}

			{canCreate ? (
				<form className="form-panel" onSubmit={handleSubmit}>
					<label className="field">
						<span className="sr-only">Что передать производству</span>
						<textarea
							onChange={(event) => setMessage(event.target.value)}
							rows={3}
							value={message}
						/>
					</label>
					{localError ? <p className="form-error">{localError}</p> : null}
					{createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
					{createDisabled ? <p className="muted">{getCreateBlockReason(online, trimmedMessage, createMutation.isPending)}</p> : null}
					<button className="primary-button" disabled={createDisabled} type="submit">
						<Send aria-hidden size={18} />
						Записать
					</button>
				</form>
			) : null}

			<p className="notification-summary-line" aria-label="Статистика задач">
				<span>Новые: <strong>{notifications.data?.summary.newCount ?? 0}</strong></span>
				<span>Выполнено: <strong>{notifications.data?.summary.completedCount ?? 0}</strong></span>
			</p>

			{notifications.isLoading ? <p className="muted">Загрузка задач</p> : null}
			{notifications.isError ? <p className="form-error">{notifications.error.message}</p> : null}
			{!notifications.isLoading && !notifications.isError && (notifications.data?.items.length ?? 0) === 0 ? (
				<p className="muted">Задач для производства пока нет.</p>
			) : null}
			<div className="list-stack">
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
		<div className="flat-balance-row notification-row">
			<div>
				<strong>{item.message}</strong>
				<p>
					{completed ? "Выполнено" : "Новое"}
					{" · "}
					{formatDate(item.createdAt)}
					{" · "}
					{item.createdBy.displayName}
				</p>
				{completed && item.completedBy ? (
					<p>Закрыл: {item.completedBy.displayName}{item.completedAt ? ` · ${formatDate(item.completedAt)}` : ""}</p>
				) : null}
			</div>
			{canComplete && !completed ? (
				<button className="secondary-button" disabled={completeDisabled} onClick={onComplete} type="button">
					<Check aria-hidden size={16} />
					Выполнено
				</button>
			) : (
				<strong>{completed ? "Готово" : "Новая"}</strong>
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
