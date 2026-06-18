"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useReducer, useRef, useState } from "react";
import { Check, Copy, Edit3, Plus, Search, UserPlus, X } from "lucide-react";
import type { Client } from "@buhta/shared";
import {
	createClient,
	listClients,
	updateClient,
	type CurrentActor,
} from "../../lib/api-client";

type ClientsMode = "list" | "create" | "edit";
type SuccessNotice = {
	id: number;
	message: string;
};
type ClientsHomeState = {
	mode: ClientsMode;
	editingClient: Client | null;
	searchDraft: string;
	activeSearch: string;
	successNotice: SuccessNotice | null;
};
type ClientsHomeAction =
	| { type: "patch"; values: Partial<ClientsHomeState> }
	| { type: "showSuccess"; notice: SuccessNotice }
	| { type: "clearSuccess"; noticeId: number }
	| { type: "openCreate" }
	| { type: "openEdit"; client: Client }
	| { type: "closeForm" };

const CLIENT_SEARCH_DEBOUNCE_MS = 250;
const INITIAL_CLIENTS_HOME_STATE: ClientsHomeState = {
	mode: "list",
	editingClient: null,
	searchDraft: "",
	activeSearch: "",
	successNotice: null,
};

function clientsHomeReducer(state: ClientsHomeState, action: ClientsHomeAction): ClientsHomeState {
	switch (action.type) {
		case "patch":
			return { ...state, ...action.values };
		case "showSuccess":
			return {
				...state,
				mode: "list",
				editingClient: null,
				successNotice: action.notice,
			};
		case "clearSuccess":
			return {
				...state,
				successNotice: state.successNotice?.id === action.noticeId ? null : state.successNotice,
			};
		case "openCreate":
			return { ...state, mode: "create", editingClient: null };
		case "openEdit":
			return { ...state, mode: "edit", editingClient: action.client };
		case "closeForm":
			return { ...state, mode: "list", editingClient: null };
	}
}

export function ClientsHome({
	actor,
	online,
}: {
	actor: CurrentActor;
	online: boolean;
}) {
	const [state, dispatch] = useReducer(clientsHomeReducer, INITIAL_CLIENTS_HOME_STATE);
	const { activeSearch, editingClient, mode, searchDraft, successNotice } = state;
	const successNoticeId = useRef(0);
	const canManage = actor.permissions.includes("client.manage");
	const {
		data: clients,
		error: clientsErrorValue,
		isError: clientsError,
		isLoading: clientsLoading,
	} = useQuery({
		queryKey: ["clients", activeSearch],
		queryFn: () => listClients(activeSearch),
	});

	useEffect(() => {
		if (!successNotice) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			dispatch({ type: "clearSuccess", noticeId: successNotice.id });
		}, 3000);

		return () => window.clearTimeout(timeoutId);
	}, [successNotice]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			dispatch({ type: "patch", values: { activeSearch: searchDraft.trim() } });
		}, CLIENT_SEARCH_DEBOUNCE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [searchDraft]);

	function showSuccess(message: string) {
		successNoticeId.current += 1;
		dispatch({
			type: "showSuccess",
			notice: {
			id: successNoticeId.current,
			message,
			},
		});
	}

	const formOpen = canManage && (mode === "create" || (mode === "edit" && editingClient !== null));
	const formTitle = mode === "edit" ? "Редактировать клиента" : "Добавить клиента";

	return (
		<section className="screen-stack clients-home management-surface">
			<div className="section-heading compact clients-heading">
				<h2>Клиенты</h2>
				<div className="clients-heading-side">
					<span>{clientsLoading ? "Загрузка" : formatClientCount(clients?.clients.length ?? 0)}</span>
					{canManage ? (
						<button
							aria-label="Добавить клиента"
							className="secondary-button compact-button client-create-button"
							disabled={!online}
							onClick={() => dispatch({ type: "openCreate" })}
							type="button"
						>
							<UserPlus aria-hidden size={16} />
							Новый
						</button>
					) : null}
				</div>
			</div>

			<div className="client-search">
				<label className="field">
					<span className="sr-only">Поиск</span>
					<div className="input-shell">
						<Search aria-hidden size={18} />
						<input
							aria-label="Поиск"
							onChange={(event) => dispatch({ type: "patch", values: { searchDraft: event.target.value } })}
							placeholder="Имя или телефон"
							type="search"
							value={searchDraft}
						/>
						{searchDraft ? (
							<button
								aria-label="Очистить поиск"
								className="client-combobox-clear"
								onClick={() => dispatch({ type: "patch", values: { searchDraft: "" } })}
								type="button"
							>
								<X aria-hidden size={16} />
							</button>
						) : null}
					</div>
				</label>
			</div>

			{clientsLoading ? <p className="muted">Загрузка клиентов</p> : null}
			{clientsError ? <p className="form-error">{clientsErrorValue.message}</p> : null}
			{!clientsLoading && !clientsError && clients?.clients.length === 0 ? (
				<p className="muted">{activeSearch ? "Клиенты не найдены." : "Клиентов пока нет."}</p>
			) : null}

			<ClientList
				canManage={canManage}
				clients={clients?.clients ?? []}
				onEdit={(client) => dispatch({ type: "openEdit", client })}
			/>

			{canManage ? (
				<Dialog.Root
					open={formOpen}
					onOpenChange={(open) => {
						if (!open) {
							dispatch({ type: "closeForm" });
						}
					}}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="operation-dialog-overlay" />
						<Dialog.Content aria-describedby={undefined} className="operation-dialog">
							<div className="operation-dialog-heading">
								<div>
									<Dialog.Title>{formTitle}</Dialog.Title>
								</div>
								<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
									<X aria-hidden size={18} />
								</Dialog.Close>
							</div>
							<ClientForm
								{...(mode === "edit" && editingClient ? { client: editingClient } : {})}
								onSuccess={() => showSuccess(mode === "edit" ? "Клиент обновлен" : "Клиент добавлен")}
								online={online}
							/>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			) : null}

			{successNotice ? <ClientsSuccessNotice notice={successNotice} /> : null}
		</section>
	);
}

function ClientForm({
	client,
	onSuccess,
	online,
}: {
	client?: Client;
	onSuccess: () => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(client?.name ?? "");
	const [phone, setPhone] = useState(client?.phone ?? "");
	const [description, setDescription] = useState(client?.description ?? "");
	const [localError, setLocalError] = useState("");
	const mutation = useMutation({
		mutationFn: () => client
			? updateClient(client.id, { name, phone, description })
			: createClient({ name, phone, description }),
		onSuccess: async () => {
			setName("");
			setPhone("");
			setDescription("");
			setLocalError("");
			await queryClient.invalidateQueries({ queryKey: ["clients"] });
			onSuccess();
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLocalError("");

		if (!name.trim()) {
			setLocalError("Введите имя клиента.");
			return;
		}

		if (!phone.trim()) {
			setLocalError("Введите телефон клиента.");
			return;
		}

		mutation.mutate();
	}

	return (
		<form className="operation-dialog-form" onSubmit={handleSubmit}>
			<label className="field">
				<span>Имя</span>
				<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
			</label>
			<label className="field">
				<span>Телефон</span>
				<input onChange={(event) => setPhone(event.target.value)} required type="tel" value={phone} />
			</label>
			<label className="field">
				<span>Описание</span>
				<textarea onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
			</label>
			{localError ? <p className="form-error">{localError}</p> : null}
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<div className="form-actions">
				<Dialog.Close className="secondary-button" disabled={mutation.isPending} type="button">
					Отмена
				</Dialog.Close>
				<button className="primary-button" disabled={!online || mutation.isPending} type="submit">
					{client ? <Check aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
					{client ? "Сохранить" : "Добавить"}
				</button>
			</div>
		</form>
	);
}

function formatClientCount(count: number): string {
	const lastTwoDigits = Math.abs(count) % 100;
	const lastDigit = Math.abs(count) % 10;
	const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
		? "клиентов"
		: lastDigit === 1
			? "клиент"
			: lastDigit >= 2 && lastDigit <= 4
				? "клиента"
				: "клиентов";

	return `${count} ${word}`;
}

function ClientList({
	canManage,
	clients,
	onEdit,
}: {
	canManage: boolean;
	clients: Client[];
	onEdit: (client: Client) => void;
}) {
	const [copiedClientId, setCopiedClientId] = useState("");

	async function handleCopyPhone(client: Client) {
		await navigator.clipboard?.writeText(client.phone);
		setCopiedClientId(client.id);
	}

	if (clients.length === 0) {
		return null;
	}

	return (
		<ul className="client-list-table">
			{clients.map((client) => (
				<li className="client-list-row" key={client.id}>
					<div className="client-list-main">
						<strong>{client.name}</strong>
						<p className="client-list-phone">{client.phone}</p>
						{client.description ? <p className="client-list-description">{client.description}</p> : null}
					</div>
					<div className="client-list-actions">
						<button
							aria-label={`Скопировать телефон ${client.name}`}
							className="secondary-icon-button"
							onClick={() => void handleCopyPhone(client)}
							title={copiedClientId === client.id ? "Телефон скопирован" : "Скопировать телефон"}
							type="button"
						>
							{copiedClientId === client.id ? <Check aria-hidden size={17} /> : <Copy aria-hidden size={17} />}
						</button>
						{canManage ? (
							<button
								aria-label={`Редактировать ${client.name}`}
								className="secondary-icon-button"
								onClick={() => onEdit(client)}
								type="button"
							>
								<Edit3 aria-hidden size={17} />
							</button>
						) : null}
					</div>
				</li>
			))}
		</ul>
	);
}

function ClientsSuccessNotice({ notice }: { notice: SuccessNotice }) {
	return (
		<output className="success-notice" aria-live="polite" key={notice.id}>
			<Check aria-hidden size={18} />
			<span>{notice.message}</span>
		</output>
	);
}
