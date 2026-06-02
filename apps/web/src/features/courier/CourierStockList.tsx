import { formatMoneyCents, moneyCents, type CourierProductBalanceItem } from "@buhta/shared";

export function CourierStockList({
	items,
	showCourier = false,
}: {
	items: CourierProductBalanceItem[];
	showCourier?: boolean;
}) {
	return (
		<div className="inventory-table-list" role="table" aria-label="Продукция курьера" style={tableListStyle}>
			<div className="inventory-table-head" role="row" style={tableHeadStyle}>
				<span>Товар</span>
				<span style={rightAlignStyle}>Количество</span>
				<span style={rightAlignStyle}>Сумма</span>
			</div>
			{items.map((item) => (
				<div className="inventory-table-row" key={item.id} role="row" style={tableRowStyle}>
					<div className="inventory-table-product" role="cell" style={tableCellStyle}>
						<strong style={primaryTextStyle}>{item.productName}</strong>
						<span style={secondaryTextStyle}>{showCourier ? item.courierDisplayName : formatRubles(item.unitPriceCents) + "/шт"}</span>
					</div>
					<div className="inventory-table-quantity" role="cell" style={rightCellStyle}>
						<strong style={primaryTextStyle}>{item.quantity} шт</strong>
						{showCourier ? <span style={secondaryTextStyle}>{formatRubles(item.unitPriceCents)}/шт</span> : null}
					</div>
					<div className="inventory-table-total" role="cell" style={rightCellStyle}>
						<strong style={primaryTextStyle}>{formatRubles(item.stockValueCents)}</strong>
					</div>
				</div>
			))}
		</div>
	);
}

const tableListStyle = {
	display: "flex",
	flexDirection: "column",
	marginInline: 10,
} as const;

const tableGridColumns = "minmax(0, 1.25fr) minmax(68px, .55fr) minmax(78px, .65fr)";

const tableHeadStyle = {
	alignItems: "center",
	borderBottom: "1px solid var(--line)",
	color: "var(--text-muted)",
	columnGap: 10,
	display: "grid",
	fontSize: 11,
	fontWeight: "var(--font-weight-label)",
	gridTemplateColumns: tableGridColumns,
	lineHeight: 1.15,
	padding: "0 0 8px",
} as const;

const tableRowStyle = {
	alignItems: "center",
	borderBottom: "1px solid var(--line)",
	columnGap: 10,
	display: "grid",
	gridTemplateColumns: tableGridColumns,
	minHeight: 64,
	padding: "11px 0",
} as const;

const tableCellStyle = {
	minWidth: 0,
} as const;

const rightAlignStyle = {
	textAlign: "right",
} as const;

const rightCellStyle = {
	...tableCellStyle,
	textAlign: "right",
} as const;

const primaryTextStyle = {
	color: "var(--base-black)",
	display: "block",
	fontSize: 14,
	fontVariantNumeric: "tabular-nums",
	fontWeight: "var(--font-weight-emphasis)",
	lineHeight: 1.15,
	overflowWrap: "anywhere",
	whiteSpace: "nowrap",
} as const;

const secondaryTextStyle = {
	color: "var(--text-muted)",
	display: "block",
	fontSize: 11,
	lineHeight: 1.15,
	marginTop: 5,
	overflowWrap: "anywhere",
} as const;

function formatRubles(priceCents: number): string {
	return `${formatMoneyCents(moneyCents(priceCents))}\u00A0₽`;
}
