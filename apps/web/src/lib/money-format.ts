import { formatMoneyCents, moneyCents } from "@buhta/shared";

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
