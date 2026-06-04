"use client";

import * as Popover from "@radix-ui/react-popover";
import { BadgePercent, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

export type OperationProductSelectOption = {
	discounted?: boolean;
	id: string;
	label: string;
	meta: string;
};

type OperationProductSelectProps = {
	label: string;
	options: OperationProductSelectOption[];
	placeholder: string;
	value: string;
	onValueChange: (value: string) => void;
};

export function OperationProductSelect({
	label,
	options,
	placeholder,
	value,
	onValueChange,
}: OperationProductSelectProps) {
	const labelId = useId();
	const listId = useId();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const selectedOption = options.find((option) => option.id === value);
	const selectedLabel = selectedOption ? `${selectedOption.label} · ${selectedOption.meta}` : "";
	const hasSelection = !!value;
	const showResults = !hasSelection && open;
	const normalizedQuery = query.trim().toLowerCase();
	const visibleOptions = useMemo(() => {
		if (!normalizedQuery) {
			return options.slice(0, 3);
		}

		return options.filter((option) =>
			`${option.label} ${option.meta}`.toLowerCase().includes(normalizedQuery),
		);
	}, [normalizedQuery, options]);

	function handleSelect(optionId: string) {
		onValueChange(optionId);
		setQuery("");
		setOpen(false);
	}

	function handleQueryChange(nextQuery: string) {
		setQuery(nextQuery);
		setOpen(true);
	}

	return (
		<div className="field operation-product-select-field">
			<span id={labelId}>{label}</span>
			<Popover.Root open={showResults} onOpenChange={setOpen}>
				<Popover.Anchor asChild>
					<div className="input-shell client-combobox-input-shell operation-product-combobox-input-shell">
						<Search aria-hidden className="client-combobox-icon" size={18} />
						<input
							aria-autocomplete="list"
							aria-controls={listId}
							aria-expanded={showResults}
							aria-labelledby={labelId}
							onChange={(event) => handleQueryChange(event.target.value)}
							onFocus={() => {
								if (!hasSelection) {
									setOpen(true);
								}
							}}
							placeholder={placeholder}
							readOnly={hasSelection}
							role="combobox"
							type="search"
							value={hasSelection ? selectedLabel : query}
						/>
						{selectedOption?.discounted ? (
							<BadgePercent
								aria-hidden
								className="operation-product-discount-icon"
								size={16}
								strokeWidth={2.2}
							/>
						) : null}
						{hasSelection ? (
							<button
								aria-label="Очистить продукцию"
								className="client-combobox-clear"
								onClick={() => {
									onValueChange("");
									setQuery("");
									setOpen(false);
								}}
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
						className="client-combobox-content operation-product-combobox-content"
						id={listId}
						onOpenAutoFocus={(event) => event.preventDefault()}
						role="listbox"
						sideOffset={6}
					>
						{visibleOptions.map((option) => (
							<button
								aria-label={`${option.label} ${option.meta}`}
								className="client-combobox-option operation-product-combobox-option"
								key={option.id}
								onClick={() => handleSelect(option.id)}
								role="option"
								type="button"
							>
								<span className="operation-product-option-title">
									<strong>{option.label}</strong>
									{option.discounted ? (
										<BadgePercent
											aria-hidden
											className="operation-product-discount-icon"
											size={14}
											strokeWidth={2.2}
										/>
									) : null}
									{option.discounted ? <span className="sr-only">Цена снижена</span> : null}
								</span>
								<span>{option.meta}</span>
							</button>
						))}
						{visibleOptions.length === 0 ? (
							<p className="client-combobox-empty">Продукция не найдена</p>
						) : null}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
}
