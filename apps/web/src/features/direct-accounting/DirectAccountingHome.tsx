"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, Check, ChevronDown, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { type FormEvent, useDeferredValue, useRef, useState } from "react";
import type { DirectAccountingDetailPeriod, DirectAccountingSale, DirectAccountingSaleInput } from "@buhta/shared";
import {
	createDirectAccountingSale,
	deleteDirectAccountingSale,
	listDirectAccountingSales,
	listDirectAccountingSuggestions,
	updateDirectAccountingSale,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { DateRangePickerPanel } from "../../ui/DateRangePickerPanel";
import { SegmentedControl } from "../../ui/SegmentedControl";

const QUANTITY_FORMATTER = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "short",
	timeZone: "Asia/Vladivostok",
});
const BUSINESS_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	day: "2-digit",
	month: "2-digit",
	timeZone: "Asia/Vladivostok",
	year: "numeric",
});
const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_LIST_RANGE_DAYS = 366;
const LIST_PERIOD_OPTIONS: Array<{ value: DirectAccountingDetailPeriod; label: string }> = [
	{ value: "day", label: "Сегодня" },
	{ value: "week", label: "7 дней" },
	{ value: "month", label: "30 дней" },
];

type SalesListSelection =
	| { mode: "preset"; period: DirectAccountingDetailPeriod }
	| { mode: "custom"; dateFrom: string; dateTo: string };

export type SaleDraft = {
	productName: string;
	soldOn: string;
	quantityKg: string;
	unitPriceRubles: string;
};

export function DirectAccountingHome({ online }: { online: boolean }) {
	const queryClient = useQueryClient();
	const formRef = useRef<HTMLFormElement>(null);
	const productNameRef = useRef<HTMLInputElement>(null);
	const today = businessDateKey();
	const [listSelection, setListSelection] = useState<SalesListSelection>({ mode: "preset", period: "month" });
	const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
	const [customDateFrom, setCustomDateFrom] = useState(today);
	const [customDateTo, setCustomDateTo] = useState(today);
	const [customPeriodError, setCustomPeriodError] = useState<string | null>(null);
	const [editingSale, setEditingSale] = useState<DirectAccountingSale | null>(null);
	const [draft, setDraft] = useState<SaleDraft>(() => emptyDraft(today));
	const [formError, setFormError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const deferredProductName = useDeferredValue(draft.productName.trim());
	const listRange = listSelection.mode === "custom"
		? { dateFrom: listSelection.dateFrom, dateTo: listSelection.dateTo }
		: trailingDateRange(today, listSelection.period);
	const {
		data: salesData,
		error: salesError,
		isLoading: salesLoading,
	} = useQuery({
		queryKey: ["direct-accounting", "sales", listRange],
		queryFn: () => listDirectAccountingSales(listRange),
		placeholderData: (previousData) => previousData,
	});
	const { data: suggestionsData } = useQuery({
		queryKey: ["direct-accounting", "suggestions", deferredProductName],
		queryFn: () => listDirectAccountingSuggestions(deferredProductName),
	});
	const saveMutation = useMutation({
		mutationFn: (input: DirectAccountingSaleInput) => editingSale
			? updateDirectAccountingSale(editingSale.id, input)
			: createDirectAccountingSale(input),
		onSuccess: async ({ sale }) => {
			setListSelection({ mode: "custom", dateFrom: sale.soldOn, dateTo: sale.soldOn });
			setEditingSale(null);
			setDraft(emptyDraft(sale.soldOn));
			setFormError(null);
			setSuccessMessage(editingSale ? "Продажа обновлена" : "Продажа добавлена");
			await invalidateDirectAccounting(queryClient);
		},
	});
	const deleteMutation = useMutation({
		mutationFn: (saleId: string) => deleteDirectAccountingSale(saleId),
		onSuccess: async () => {
			setEditingSale(null);
			setDraft(emptyDraft(today));
			setSuccessMessage("Продажа удалена");
			await invalidateDirectAccounting(queryClient);
		},
	});

	function updateDraft(values: Partial<SaleDraft>) {
		setDraft((current) => ({ ...current, ...values }));
		setFormError(null);
		setSuccessMessage(null);
	}

	function beginEdit(sale: DirectAccountingSale) {
		setEditingSale(sale);
		setDraft({
			productName: sale.productName,
			soldOn: sale.soldOn,
			quantityKg: String(sale.quantityKg).replace(".", ","),
			unitPriceRubles: centsToInput(sale.unitPriceCents),
		});
		setFormError(null);
		setSuccessMessage(null);
		requestAnimationFrame(() => {
			formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
			productNameRef.current?.focus({ preventScroll: true });
		});
	}

	function cancelEdit() {
		setEditingSale(null);
		setDraft(emptyDraft(today));
		setFormError(null);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsed = parseSaleDraft(draft, today);
		if (typeof parsed === "string") {
			setFormError(parsed);
			return;
		}
		saveMutation.mutate(parsed);
	}

	function removeEditingSale() {
		if (!editingSale || !window.confirm(`Удалить продажу «${editingSale.productName}»?`)) {
			return;
		}
		deleteMutation.mutate(editingSale.id);
	}

	function selectListPreset(period: DirectAccountingDetailPeriod) {
		setListSelection({ mode: "preset", period });
		setPeriodPickerOpen(false);
		setCustomPeriodError(null);
	}

	function changePeriodPickerOpen(open: boolean) {
		if (open) {
			setCustomDateFrom(listRange.dateFrom);
			setCustomDateTo(listRange.dateTo);
			setCustomPeriodError(null);
		}
		setPeriodPickerOpen(open);
	}

	function applyListRange() {
		const effectiveDateTo = customDateTo || customDateFrom;
		const validationError = validateListRange(customDateFrom, effectiveDateTo, today);
		if (validationError) {
			setCustomPeriodError(validationError);
			return;
		}
		setListSelection({ mode: "custom", dateFrom: customDateFrom, dateTo: effectiveDateTo });
		setCustomDateTo(effectiveDateTo);
		setCustomPeriodError(null);
		setPeriodPickerOpen(false);
	}

	const parsedDraft = parseSaleDraft(draft, today);
	const draftTotal = typeof parsedDraft === "string"
		? null
		: Math.round(parsedDraft.quantityKg * parsedDraft.unitPriceCents);
	const pending = saveMutation.isPending || deleteMutation.isPending;
	const mutationError = saveMutation.error ?? deleteMutation.error;

	return (
		<section className="screen-stack direct-accounting-home">
			<header className="direct-accounting-header">
				<h1>Прямой учет</h1>
			</header>

			<form className="direct-accounting-form" onSubmit={submit} ref={formRef}>
				<div className="direct-accounting-form-heading">
					<div>
						<span>{editingSale ? "Исправление записи" : "Новая продажа"}</span>
						<strong>{draftTotal === null ? "—" : `${formatCompactMoneyCents(draftTotal)} ₽`}</strong>
					</div>
					{editingSale ? (
						<button className="direct-accounting-reset" onClick={cancelEdit} type="button">
							<RotateCcw aria-hidden size={15} />
							Отмена
						</button>
					) : null}
				</div>

				<label className="field direct-accounting-name-field">
					<span>Наименование</span>
					<input
						autoComplete="off"
						list="direct-accounting-products"
						maxLength={120}
						onChange={(event) => updateDraft({ productName: event.target.value })}
						placeholder="Например, икра кеты"
						ref={productNameRef}
						value={draft.productName}
					/>
					<datalist id="direct-accounting-products">
						{suggestionsData?.suggestions.map((name) => <option key={name} value={name} />)}
					</datalist>
				</label>

				<div className="direct-accounting-fields">
					<label className="field">
						<span>Дата</span>
						<input
							max={today}
							onClick={(event) => event.currentTarget.showPicker?.()}
							onChange={(event) => updateDraft({ soldOn: event.target.value })}
							required
							type="date"
							value={draft.soldOn}
						/>
					</label>
					<label className="field">
						<span>Количество, кг</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ quantityKg: event.target.value })}
							placeholder="0,000"
							value={draft.quantityKg}
						/>
					</label>
					<label className="field">
						<span>Цена за кг, ₽</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ unitPriceRubles: event.target.value })}
							placeholder="0,00"
							value={draft.unitPriceRubles}
						/>
					</label>
				</div>

				{formError ? <p className="form-error">{formError}</p> : null}
				{mutationError ? <p className="form-error">{mutationError.message}</p> : null}
				{successMessage ? <p className="direct-accounting-success"><Check aria-hidden size={15} />{successMessage}</p> : null}

				<div className="direct-accounting-form-actions">
					{editingSale ? (
						<button
							aria-label="Удалить продажу"
							className="direct-accounting-delete"
							disabled={!online || pending}
							onClick={removeEditingSale}
							type="button"
						>
							<Trash2 aria-hidden size={17} />
							Удалить
						</button>
					) : null}
					<button className="primary-button direct-accounting-submit" disabled={!online || pending} type="submit">
						{editingSale ? <Pencil aria-hidden size={16} /> : <Plus aria-hidden size={17} />}
						{pending ? "Сохраняем…" : editingSale ? "Сохранить изменения" : "Добавить продажу"}
					</button>
				</div>
			</form>

			<section className="direct-accounting-ledger" aria-label="Продажи за выбранный период">
				<div className="direct-accounting-ledger-heading">
					<h2>{formatSalesPeriodTitle(listSelection, listRange)}</h2>
					<span>{formatSaleCount(salesData?.sales.length ?? 0)}</span>
				</div>
				<div className="direct-accounting-list-controls">
					<SegmentedControl
						ariaLabel="Период списка продаж"
						className="direct-accounting-list-period-control"
						items={LIST_PERIOD_OPTIONS}
						onChange={selectListPreset}
						role="group"
						value={listSelection.mode === "preset" ? listSelection.period : null}
					/>
					<Popover.Root open={periodPickerOpen} onOpenChange={changePeriodPickerOpen}>
						<Popover.Trigger asChild>
							<button
								aria-controls="direct-accounting-list-period-picker"
								aria-expanded={periodPickerOpen}
								className={listSelection.mode === "custom" ? "direct-accounting-range-button active" : "direct-accounting-range-button"}
								type="button"
							>
								<CalendarDays aria-hidden size={17} />
								<span>{formatDateRange(listRange.dateFrom, listRange.dateTo)}</span>
								<ChevronDown aria-hidden size={15} />
							</button>
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content
								align="end"
								aria-label="Выбор периода списка продаж"
								className="director-dashboard-period-picker direct-accounting-period-picker"
								collisionPadding={12}
								id="direct-accounting-list-period-picker"
								sideOffset={8}
							>
								<p className="direct-accounting-period-hint">Выберите один день или диапазон</p>
								<DateRangePickerPanel
									ariaLabel="Календарь списка продаж"
									dateFrom={customDateFrom}
									dateTo={customDateTo}
									error={customPeriodError}
									maxDate={today}
									maxDays={MAX_LIST_RANGE_DAYS}
									onChange={({ dateFrom, dateTo }) => {
										setCustomDateFrom(dateFrom);
										setCustomDateTo(dateTo);
										setCustomPeriodError(null);
									}}
								/>
								<div className="director-dashboard-period-actions">
									<Popover.Close asChild><button type="button">Отмена</button></Popover.Close>
									<button type="button" onClick={applyListRange}>Показать</button>
								</div>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>
				{salesLoading ? <p className="muted">Загрузка записей…</p> : null}
				{salesError ? <p className="form-error">{salesError.message}</p> : null}
				{salesData?.sales.length === 0 ? <p className="direct-accounting-empty">Продаж за выбранный период нет.</p> : null}
				{salesData?.sales.length ? (
					<div className="direct-accounting-ledger-columns" aria-hidden>
						<span>Продажа</span>
						<span>Сумма</span>
					</div>
				) : null}
				<div className="direct-accounting-rows">
					{salesData?.sales.map((sale) => (
						<button className="direct-accounting-row" key={sale.id} onClick={() => beginEdit(sale)} type="button">
							<span className="direct-accounting-row-main">
								<strong>{sale.productName}</strong>
								<small>{formatDate(sale.soldOn)} · {formatQuantity(sale.quantityKg)} кг × {formatCompactMoneyCents(sale.unitPriceCents)} ₽</small>
							</span>
							<strong>{formatCompactMoneyCents(sale.totalCents)} ₽</strong>
							<Pencil aria-hidden size={15} />
						</button>
					))}
				</div>
			</section>
		</section>
	);
}

export function parseSaleDraft(draft: SaleDraft, today: string): DirectAccountingSaleInput | string {
	const productName = draft.productName.trim().replace(/\s+/g, " ");
	if (!productName) return "Укажите наименование.";
	if (!draft.soldOn) return "Укажите дату продажи.";
	if (draft.soldOn > today) return "Дата продажи не может быть в будущем.";

	const quantityKg = parseDecimal(draft.quantityKg, 3);
	if (quantityKg === null || quantityKg <= 0) return "Укажите количество больше нуля, максимум 3 знака после запятой.";
	const unitPriceCents = parseRublesToCents(draft.unitPriceRubles);
	if (unitPriceCents === null || unitPriceCents <= 0) return "Укажите цену больше нуля, максимум 2 знака после запятой.";

	return { productName, soldOn: draft.soldOn, quantityKg, unitPriceCents };
}

function parseDecimal(value: string, fractionDigits: number): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!new RegExp(`^\\d+(?:\\.\\d{1,${fractionDigits}})?$`).test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseRublesToCents(value: string): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
	const [rubles = "0", kopecks = ""] = normalized.split(".");
	const cents = Number(rubles) * 100 + Number(kopecks.padEnd(2, "0"));
	return Number.isSafeInteger(cents) ? cents : null;
}

function centsToInput(cents: number): string {
	const rubles = Math.floor(cents / 100);
	const kopecks = cents % 100;
	return kopecks ? `${rubles},${String(kopecks).padStart(2, "0")}` : String(rubles);
}

function emptyDraft(soldOn: string): SaleDraft {
	return { productName: "", soldOn, quantityKg: "", unitPriceRubles: "" };
}

function businessDateKey(date = new Date()): string {
	const parts = Object.fromEntries(BUSINESS_DATE_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatQuantity(value: number): string {
	return QUANTITY_FORMATTER.format(value);
}

function formatSaleCount(count: number): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	const noun = mod100 >= 11 && mod100 <= 14
		? "продаж"
		: mod10 === 1
			? "продажа"
			: mod10 >= 2 && mod10 <= 4
				? "продажи"
				: "продаж";
	return `${count} ${noun}`;
}

function trailingDateRange(anchorDate: string, period: DirectAccountingDetailPeriod) {
	const days = period === "day" ? 1 : period === "week" ? 7 : 30;
	const anchor = new Date(`${anchorDate}T00:00:00.000Z`);
	const from = new Date(anchor.getTime() - (days - 1) * DAY_MS);
	return { dateFrom: from.toISOString().slice(0, 10), dateTo: anchorDate };
}

function validateListRange(dateFrom: string, dateTo: string, today: string): string | null {
	if (!dateFrom || !dateTo) return "Выберите дату или диапазон.";
	if (dateFrom > dateTo) return "Дата окончания должна быть не раньше даты начала.";
	if (dateTo > today) return "Будущую дату выбрать нельзя.";
	const from = new Date(`${dateFrom}T00:00:00.000Z`);
	const to = new Date(`${dateTo}T00:00:00.000Z`);
	if (Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1 > MAX_LIST_RANGE_DAYS) {
		return "Период не должен быть больше 366 дней.";
	}
	return null;
}

function formatSalesPeriodTitle(selection: SalesListSelection, range: { dateFrom: string; dateTo: string }): string {
	if (selection.mode === "preset") {
		if (selection.period === "day") return "Продажи сегодня";
		if (selection.period === "week") return "Продажи за 7 дней";
		return "Продажи за 30 дней";
	}
	return range.dateFrom === range.dateTo
		? `Продажи за ${formatDate(range.dateFrom)}`
		: `Продажи: ${formatDateRange(range.dateFrom, range.dateTo)}`;
}

function formatDateRange(dateFrom: string, dateTo: string): string {
	if (dateFrom === dateTo) return formatDate(dateFrom);
	return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

function formatDate(value: string): string {
	return SHORT_DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}

async function invalidateDirectAccounting(queryClient: QueryClient) {
	await queryClient.invalidateQueries({ queryKey: ["direct-accounting"] });
}
