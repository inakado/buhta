import { formatMoneyCents, moneyCents } from "@buhta/shared";

const GROUPED_RUBLES_FORMATTER = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}

export function formatCompactMoneyCents(priceCents: number): string {
	const formatted = formatMoneyCents(moneyCents(priceCents));

	return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
}

export function formatCompactRubles(priceCents: number): string {
	return `${formatCompactMoneyCents(priceCents)}\u00A0₽`;
}

export function formatGroupedRubles(priceCents: number): string {
	return `${GROUPED_RUBLES_FORMATTER.format(priceCents / 100)}\u00A0₽`;
}
