"use client";

import * as Popover from "@radix-ui/react-popover";
import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { Client } from "@buhta/shared";

type ClientComboboxProps = {
	clients: Client[];
	loading?: boolean;
	query: string;
	selectedClient: Client | undefined;
	selectedClientId: string;
	onClientChange: (clientId: string) => void;
	onQueryChange: (query: string) => void;
};

export function ClientCombobox({
	clients,
	loading = false,
	query,
	selectedClient,
	selectedClientId,
	onClientChange,
	onQueryChange,
}: ClientComboboxProps) {
	const listId = useId();
	const [open, setOpen] = useState(false);
	const selectedLabel = selectedClient?.name ?? (selectedClientId ? "Клиент выбран" : "");
	const hasSelection = !!selectedClientId;
	const hasQuery = query.trim().length > 0;
	const showResults = !hasSelection && open;
	const visibleClients = useMemo(() => (hasQuery ? clients : clients.slice(0, 3)), [clients, hasQuery]);

	function handleQueryChange(value: string) {
		onQueryChange(value);
		setOpen(true);
	}

	function handleClientSelect(clientId: string) {
		onClientChange(clientId);
		setOpen(false);
	}

	function handleClientClear() {
		onClientChange("");
		onQueryChange("");
		setOpen(false);
	}

	return (
		<Popover.Root open={showResults} onOpenChange={setOpen}>
			<div className="client-combobox">
				<Popover.Anchor asChild>
					<div className="input-shell client-combobox-input-shell">
						<Search aria-hidden className="client-combobox-icon" size={18} />
						<input
							aria-autocomplete="list"
							aria-controls={listId}
							aria-expanded={showResults}
							aria-label="Клиент"
							onChange={(event) => handleQueryChange(event.target.value)}
							onFocus={() => {
								if (!hasSelection) {
									setOpen(true);
								}
							}}
							placeholder="Выберите клиента"
							readOnly={hasSelection}
							role="combobox"
							type="search"
							value={hasSelection ? selectedLabel : query}
						/>
						{hasSelection ? (
							<button
								aria-label="Очистить клиента"
								className="client-combobox-clear"
								onClick={handleClientClear}
								type="button"
							>
								<X aria-hidden size={16} />
							</button>
						) : null}
					</div>
				</Popover.Anchor>

				<Popover.Portal>
					<Popover.Content
						align="start"
						className="client-combobox-content"
						id={listId}
						onOpenAutoFocus={(event) => event.preventDefault()}
						role="listbox"
						sideOffset={6}
					>
						{visibleClients.map((client) => (
							<button
								aria-label={`Выбрать клиента ${client.name}`}
								className="client-combobox-option"
								key={client.id}
								onClick={() => handleClientSelect(client.id)}
								type="button"
							>
								<strong>{client.name}</strong>
								<span>{client.phone}</span>
							</button>
						))}
						{loading ? <p className="client-combobox-empty">Загрузка клиентов</p> : null}
						{!loading && visibleClients.length === 0 ? <p className="client-combobox-empty">Клиенты не найдены</p> : null}
					</Popover.Content>
				</Popover.Portal>
			</div>
		</Popover.Root>
	);
}
