import type { Client } from "@buhta/shared";
import { SearchCombobox } from "../operations/SearchCombobox";

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
	return (
		<SearchCombobox
			ariaLabel="Клиент"
			clearLabel="Очистить клиента"
			emptyLabel="Клиенты не найдены"
			loading={loading}
			loadingLabel="Загрузка клиентов"
			onQueryChange={onQueryChange}
			onValueChange={onClientChange}
			options={clients.map((client) => ({
				ariaLabel: `Выбрать клиента ${client.name}`,
				id: client.id,
				label: client.name,
				meta: client.phone,
				searchText: `${client.name} ${client.phone}`,
				selectedLabel: selectedClient?.id === client.id ? `${client.name} · ${client.phone}` : client.name,
			}))}
			placeholder="Выберите клиента"
			query={query}
			value={selectedClientId}
		/>
	);
}
