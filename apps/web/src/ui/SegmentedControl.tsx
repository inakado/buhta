"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export type SegmentedControlItem<TValue extends string> = {
	value: TValue;
	label: string;
	icon?: LucideIcon;
	disabled?: boolean;
};

type SegmentedControlProps<TValue extends string> = {
	ariaLabel: string;
	className?: string;
	iconSize?: number;
	items: readonly SegmentedControlItem<TValue>[];
	onChange: (value: TValue) => void;
	role?: "group" | "tablist";
	value: TValue;
};

export function SegmentedControl<TValue extends string>({
	ariaLabel,
	className,
	iconSize = 14,
	items,
	onChange,
	role = "tablist",
	value,
}: SegmentedControlProps<TValue>) {
	const style = {
		"--segmented-control-columns": `repeat(${items.length}, minmax(0, 1fr))`,
	} as CSSProperties;
	const rootClassName = className ? `segmented-control ${className}` : "segmented-control";

	return (
		<div aria-label={ariaLabel} className={rootClassName} role={role} style={style}>
			{items.map((item) => {
				const Icon = item.icon;
				const active = item.value === value;

				return (
					<button
						aria-pressed={role === "group" ? active : undefined}
						aria-selected={role === "tablist" ? active : undefined}
						className={active ? "active" : ""}
						disabled={item.disabled}
						key={item.value}
						onClick={() => onChange(item.value)}
						role={role === "tablist" ? "tab" : undefined}
						type="button"
					>
						{Icon ? <Icon aria-hidden size={iconSize} /> : null}
						<span>{item.label}</span>
					</button>
				);
			})}
		</div>
	);
}
