"use client";

import * as Popover from "@radix-ui/react-popover";
import { Search, X } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";

export type SearchComboboxOption = {
	ariaLabel?: string;
	discounted?: boolean;
	id: string;
	label: string;
	meta?: string;
	searchText?: string;
	selectedLabel?: string;
};

type SearchComboboxProps = {
	ariaLabel?: string;
	className?: string;
	clearLabel: string;
	contentClassName?: string;
	emptyLabel: string;
	inputClassName?: string;
	labelledBy?: string;
	loading?: boolean;
	loadingLabel?: string;
	optionClassName?: string;
	options: SearchComboboxOption[];
	placeholder: string;
	query: string;
	value: string;
	onQueryChange: (query: string) => void;
	onValueChange: (value: string) => void;
	previewLimit?: number;
	renderOptionTitle?: (option: SearchComboboxOption) => ReactNode;
	renderSelectedAdornment?: (option: SearchComboboxOption) => ReactNode;
};

export function SearchCombobox({
	ariaLabel,
	className = "",
	clearLabel,
	contentClassName = "",
	emptyLabel,
	inputClassName = "",
	labelledBy,
	loading = false,
	loadingLabel = "Загрузка",
	optionClassName = "",
	options,
	placeholder,
	previewLimit = 3,
	query,
	renderOptionTitle,
	renderSelectedAdornment,
	value,
	onQueryChange,
	onValueChange,
}: SearchComboboxProps) {
	const listId = useId();
	const [open, setOpen] = useState(false);
	const selectedOption = options.find((option) => option.id === value);
	const hasSelection = !!value;
	const showResults = !hasSelection && open;
	const normalizedQuery = query.trim().toLowerCase();
	const visibleOptions = useMemo(() => {
		if (!normalizedQuery) {
			return options.slice(0, previewLimit);
		}

		return options.filter((option) =>
			(option.searchText ?? `${option.label} ${option.meta ?? ""}`).toLowerCase().includes(normalizedQuery),
		);
	}, [normalizedQuery, options, previewLimit]);
	const selectedLabel = selectedOption?.selectedLabel
		?? (selectedOption ? [selectedOption.label, selectedOption.meta].filter(Boolean).join(" · ") : "");

	function handleSelect(optionId: string) {
		onValueChange(optionId);
		onQueryChange("");
		setOpen(false);
	}

	function handleClear() {
		onValueChange("");
		onQueryChange("");
		setOpen(false);
	}

	return (
		<Popover.Root open={showResults} onOpenChange={setOpen}>
			<div className={`client-combobox ${className}`.trim()}>
				<Popover.Anchor asChild>
					<div className={`input-shell client-combobox-input-shell ${inputClassName}`.trim()}>
						<Search aria-hidden className="client-combobox-icon" size={18} />
						<input
							aria-autocomplete="list"
							aria-controls={listId}
							aria-expanded={showResults}
							aria-haspopup="listbox"
							{...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": ariaLabel ?? "Выберите значение" })}
							onChange={(event) => {
								onQueryChange(event.target.value);
								setOpen(true);
							}}
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
						{selectedOption && renderSelectedAdornment ? renderSelectedAdornment(selectedOption) : null}
						{hasSelection ? (
							<button
								aria-label={clearLabel}
								className="client-combobox-clear"
								onClick={handleClear}
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
						className={`client-combobox-content ${contentClassName}`.trim()}
						id={listId}
						onOpenAutoFocus={(event) => event.preventDefault()}
						role="listbox"
						sideOffset={6}
					>
						{visibleOptions.map((option) => (
							<button
								aria-label={option.ariaLabel ?? option.label}
								aria-selected={option.id === value}
								className={`client-combobox-option ${optionClassName}`.trim()}
								key={option.id}
								onClick={() => handleSelect(option.id)}
								role="option"
								type="button"
							>
								{renderOptionTitle ? renderOptionTitle(option) : <strong>{option.label}</strong>}
								{option.meta ? <span>{option.meta}</span> : null}
							</button>
						))}
						{loading ? <p className="client-combobox-empty">{loadingLabel}</p> : null}
						{!loading && visibleOptions.length === 0 ? <p className="client-combobox-empty">{emptyLabel}</p> : null}
					</Popover.Content>
				</Popover.Portal>
			</div>
		</Popover.Root>
	);
}
