"use client";

import { BadgePercent } from "lucide-react";
import { useId, useState } from "react";
import { SearchCombobox, type SearchComboboxOption } from "./SearchCombobox";

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
	const [query, setQuery] = useState("");
	const comboboxOptions = options.map((option) => ({
		...option,
		ariaLabel: `${option.label} ${option.meta}${option.discounted ? " цена снижена" : ""}`,
		searchText: `${option.label} ${option.meta}`,
		selectedLabel: `${option.label} · ${option.meta}`,
	}));

	return (
		<div className="field operation-product-select-field">
			<span id={labelId}>{label}</span>
			<SearchCombobox
				clearLabel="Очистить продукцию"
				contentClassName="operation-product-combobox-content"
				emptyLabel="Продукция не найдена"
				inputClassName="operation-product-combobox-input-shell"
				labelledBy={labelId}
				onQueryChange={setQuery}
				onValueChange={onValueChange}
				optionClassName="operation-product-combobox-option"
				options={comboboxOptions}
				placeholder={placeholder}
				query={query}
				renderOptionTitle={renderProductOptionTitle}
				renderSelectedAdornment={renderProductSelectedAdornment}
				value={value}
			/>
		</div>
	);
}

function renderProductOptionTitle(option: SearchComboboxOption) {
	const discounted = "discounted" in option && option.discounted === true;

	return (
		<span className="operation-product-option-title">
			<strong>{option.label}</strong>
			{discounted ? (
				<BadgePercent
					aria-hidden
					className="operation-product-discount-icon"
					size={14}
					strokeWidth={2.2}
				/>
			) : null}
			{discounted ? <span className="sr-only">Цена снижена</span> : null}
		</span>
	);
}

function renderProductSelectedAdornment(option: SearchComboboxOption) {
	const discounted = "discounted" in option && option.discounted === true;

	return discounted ? (
		<BadgePercent
			aria-hidden
			className="operation-product-discount-icon"
			size={16}
			strokeWidth={2.2}
		/>
	) : null;
}
