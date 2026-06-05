"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Copy, Edit3, Plus, Search, UserPlus, X } from "lucide-react";
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

const CLIENT_SEARCH_DEBOUNCE_MS = 250;

export function ClientsHome({
	actor,
	online,
}: {
	actor: CurrentActor;
	online: boolean;
}) {
	const [mode, setMode] = useState<ClientsMode>("list");
	const [editingClient, setEditingClient] = useState<Client | null>(null);
	const [searchDraft, setSearchDraft] = useState("");
	const [activeSearch, setActiveSearch] = useState("");
	const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
	const successNoticeId = useRef(0);
	const canManage = actor.permissions.includes("client.manage");
	const clients = useQuery({
		queryKey: ["clients", activeSearch],
		queryFn: () => listClients(activeSearch),
	});

	useEffect(() => {
		if (!successNotice) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setSuccessNotice((current) => current?.id === successNotice.id ? null : current);
		}, 3000);

		return () => window.clearTimeout(timeoutId);
	}, [successNotice]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setActiveSearch(searchDraft.trim());
		}, CLIENT_SEARCH_DEBOUNCE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [searchDraft]);

	function showSuccess(message: string) {
		successNoticeId.current += 1;
		setMode("list");
		setEditingClient(null);
		setSuccessNotice({
			id: successNoticeId.current,
			message,
		});
	}

	if (mode === "create" && canManage) {
		return (
			<ClientDetailScreen title="Добавить клиента" onBack={() => setMode("list")}>
				<ClientForm
					onSuccess={() => showSuccess("Клиент добавлен")}
					online={online}
				/>
			</ClientDetailScreen>
		);
	}

	if (mode === "edit" && canManage && editingClient) {
		return (
			<ClientDetailScreen title="Редактировать клиента" onBack={() => setMode("list")}>
				<ClientForm
					client={editingClient}
					onSuccess={() => showSuccess("Клиент обновлен")}
					online={online}
				/>
			</ClientDetailScreen>
		);
	}

	return (
		<section className="screen-stack">
			<div className="section-heading compact clients-heading">
				<div>
					<h2>Клиенты</h2>
					<span>{clients.isLoading ? "Загрузка" : `${clients.data?.clients.length ?? 0} клиентов`}</span>
				</div>
				{canManage ? (
					<button
						aria-label="Добавить клиента"
						className="secondary-button compact-button client-create-button"
						onClick={() => setMode("create")}
						type="button"
						disabled={!online}
					>
						<UserPlus aria-hidden size={16} />
						Новый
					</button>
				) : null}
			</div>

			<div className="client-search">
				<label className="field">
					<span>Поиск</span>
					<div className="input-shell">
						<Search aria-hidden size={18} />
						<input
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Имя или телефон"
							type="search"
							value={searchDraft}
						/>
						{searchDraft ? (
							<button
								aria-label="Очистить поиск"
								className="client-combobox-clear"
								onClick={() => setSearchDraft("")}
								type="button"
							>
								<X aria-hidden size={16} />
							</button>
						) : null}
					</div>
				</label>
			</div>

			{clients.isLoading ? <p className="muted">Загрузка клиентов</p> : null}
			{clients.isError ? <p className="form-error">{clients.error.message}</p> : null}
			{!clients.isLoading && !clients.isError && clients.data?.clients.length === 0 ? (
				<p className="muted">{activeSearch ? "Клиенты не найдены." : "Клиентов пока нет."}</p>
			) : null}

			<ClientList
				canManage={canManage}
				clients={clients.data?.clients ?? []}
				onEdit={(client) => {
					setEditingClient(client);
					setMode("edit");
				}}
			/>

			{successNotice ? <ClientsSuccessNotice notice={successNotice} /> : null}
		</section>
	);
}

function ClientDetailScreen({
	children,
	onBack,
	title,
}: {
	children: ReactNode;
	onBack: () => void;
	title: string;
}) {
	return (
		<section className="screen-stack" aria-label={title}>
			<button className="secondary-button production-back-button" onClick={onBack} type="button">
				<ArrowLeft aria-hidden size={20} />
				Назад
			</button>
			{children}
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
		<form className="form-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>{client ? "Редактировать клиента" : "Добавить клиента"}</h2>
			</div>
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
			<button className="primary-button" disabled={!online || mutation.isPending} type="submit">
				<Plus aria-hidden size={18} />
				{client ? "Сохранить" : "Добавить"}
			</button>
		</form>
	);
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

	return (
		<div className="client-list-table" role="list">
			{clients.map((client) => (
				<div className="client-list-row" key={client.id} role="listitem">
					<div className="client-list-main">
						<strong>{client.name}</strong>
						<p>{client.phone}</p>
						{client.description ? <p>{client.description}</p> : null}
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
				</div>
			))}
		</div>
	);
}

function ClientsSuccessNotice({ notice }: { notice: SuccessNotice }) {
	return (
		<div className="success-notice" role="status" aria-live="polite" key={notice.id}>
			<Check aria-hidden size={18} />
			<span>{notice.message}</span>
		</div>
	);
}
