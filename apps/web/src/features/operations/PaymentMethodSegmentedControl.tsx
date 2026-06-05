"use client";

import { Banknote, CreditCard } from "lucide-react";
import type { PaymentMethod } from "@buhta/shared";

type PaymentMethodSegmentedControlProps = {
	id: string;
	value: PaymentMethod;
	onChange: (value: PaymentMethod) => void;
};

const PAYMENT_OPTIONS = [
	{ icon: Banknote, label: "Наличные", value: "cash" as const },
	{ icon: CreditCard, label: "Безнал", value: "cashless" as const },
];

export function PaymentMethodSegmentedControl({
	id,
	value,
	onChange,
}: PaymentMethodSegmentedControlProps) {
	return (
		<div aria-labelledby={id} className="payment-segmented" role="group">
			<span id={id}>Способ оплаты</span>
			{PAYMENT_OPTIONS.map((option) => {
				const Icon = option.icon;
				const active = value === option.value;
				return (
					<button
						aria-pressed={active}
						className={active ? "active" : ""}
						key={option.value}
						onClick={() => onChange(option.value)}
						type="button"
					>
						<Icon aria-hidden size={17} />
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
