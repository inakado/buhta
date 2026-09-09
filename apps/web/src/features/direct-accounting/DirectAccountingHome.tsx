"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, Check, ChevronDown, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { type FormEvent, useDeferredValue, useRef, useState } from "react";
import type {
	DirectAccountingDetailPeriod,
	DirectAccountingEntry,
	DirectAccountingReceiptInput,
	DirectAccountingSaleInput,
} from "@buhta/shared";
import {
	createDirectAccountingReceipt,
	createDirectAccountingSale,
	deleteDirectAccountingReceipt,
	deleteDirectAccountingSale,
	listDirectAccountingEntries,
	listDirectAccountingSuggestions,
	updateDirectAccountingReceipt,
	updateDirectAccountingSale,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { DateRangePickerPanel } from "../../ui/DateRangePickerPanel";
import { SegmentedControl } from "../../ui/SegmentedControl";
import {
	parseReceiptDraft,
	parseSaleDraft,
	type DirectAccountingDraft,
} from "./direct-accounting-input";

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

type EntriesListSelection =
	| { mode: "preset"; period: DirectAccountingDetailPeriod }
	| { mode: "custom"; dateFrom: string; dateTo: string };

type EntryKind = DirectAccountingEntry["kind"];

type SaveInput =
	| { kind: "sale"; input: DirectAccountingSaleInput }
	| { kind: "receipt"; input: DirectAccountingReceiptInput };

export function DirectAccountingHome({ online }: { online: boolean }) {
	const queryClient = useQueryClient();
	const formRef = useRef<HTMLFormElement>(null);
	const productNameRef = useRef<HTMLInputElement>(null);
	const today = businessDateKey();
	const [listSelection, setListSelection] = useState<EntriesListSelection>({ mode: "preset", period: "month" });
	const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
	const [customDateFrom, setCustomDateFrom] = useState(today);
	const [customDateTo, setCustomDateTo] = useState(today);
	const [customPeriodError, setCustomPeriodError] = useState<string | null>(null);
	const [entryKind, setEntryKind] = useState<EntryKind>("sale");
	const [editingEntry, setEditingEntry] = useState<DirectAccountingEntry | null>(null);
	const [draft, setDraft] = useState<DirectAccountingDraft>(() => emptyDraft(today));
	const [formError, setFormError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const deferredProductName = useDeferredValue(draft.productName.trim());
	const listRange = listSelection.mode === "custom"
		? { dateFrom: listSelection.dateFrom, dateTo: listSelection.dateTo }
		: trailingDateRange(today, listSelection.period);
	const {
		data: entriesData,
		error: entriesError,
		isLoading: entriesLoading,
	} = useQuery({
		queryKey: ["direct-accounting", "entries", listRange],
		queryFn: () => listDirectAccountingEntries(listRange),
		placeholderData: (previousData) => previousData,
	});
	const { data: suggestionsData } = useQuery({
		queryKey: ["direct-accounting", "suggestions", deferredProductName],
		queryFn: () => listDirectAccountingSuggestions(deferredProductName),
	});
	const saveMutation = useMutation({
		mutationFn: async (save: SaveInput) => {
			if (save.kind === "receipt") {
				const { receipt } = await (editingEntry
					? updateDirectAccountingReceipt(editingEntry.id, save.input)
					: createDirectAccountingReceipt(save.input));
				return { kind: save.kind, occurredOn: receipt.receivedOn };
			}
			const { sale } = await (editingEntry
				? updateDirectAccountingSale(editingEntry.id, save.input)
				: createDirectAccountingSale(save.input));
			return { kind: save.kind, occurredOn: sale.soldOn };
		},
		onSuccess: async (response, variables) => {
			const wasEditing = Boolean(editingEntry);
			setListSelection({ mode: "custom", dateFrom: response.occurredOn, dateTo: response.occurredOn });
			setEditingEntry(null);
			setDraft(emptyDraft(response.occurredOn));
			setFormError(null);
			setSuccessMessage(wasEditing
				? "Запись обновлена"
				: variables.kind === "sale" ? "Продажа добавлена" : "Приход добавлен");
			await invalidateDirectAccounting(queryClient);
		},
	});
	const deleteMutation = useMutation({
		mutationFn: (entry: DirectAccountingEntry) => entry.kind === "sale"
			? deleteDirectAccountingSale(entry.id)
			: deleteDirectAccountingReceipt(entry.id),
		onSuccess: async () => {
			setEditingEntry(null);
			setDraft(emptyDraft(today));
			setSuccessMessage("Запись удалена");
			await invalidateDirectAccounting(queryClient);
		},
	});

	function updateDraft(values: Partial<DirectAccountingDraft>) {
		setDraft((current) => ({ ...current, ...values }));
		setFormError(null);
		setSuccessMessage(null);
	}

	function beginEdit(entry: DirectAccountingEntry) {
		setEditingEntry(entry);
		setEntryKind(entry.kind);
		setDraft({
			productName: entry.productName,
			occurredOn: entry.occurredOn,
			quantityKg: String(entry.quantityKg).replace(".", ","),
			unitPriceRubles: entry.kind === "sale" ? centsToInput(entry.unitPriceCents) : "",
		});
		setFormError(null);
		setSuccessMessage(null);
		requestAnimationFrame(() => {
			formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
			productNameRef.current?.focus({ preventScroll: true });
		});
	}

	function cancelEdit() {
		setEditingEntry(null);
		setDraft(emptyDraft(today));
		setFormError(null);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (entryKind === "sale") {
			const parsed = parseSaleDraft(draft, today);
			if (typeof parsed === "string") return setFormError(parsed);
			saveMutation.mutate({ kind: entryKind, input: parsed });
			return;
		}
		const parsed = parseReceiptDraft(draft, today);
		if (typeof parsed === "string") return setFormError(parsed);
		saveMutation.mutate({ kind: entryKind, input: parsed });
	}

	function removeEditingEntry() {
		if (!editingEntry || !window.confirm(`Удалить ${editingEntry.kind === "sale" ? "продажу" : "приход"} «${editingEntry.productName}»?`)) {
			return;
		}
		deleteMutation.mutate(editingEntry);
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

	const parsedSaleDraft = parseSaleDraft(draft, today);
	const draftTotal = entryKind === "receipt" || typeof parsedSaleDraft === "string"
		? null
		: Math.round(parsedSaleDraft.quantityKg * parsedSaleDraft.unitPriceCents);
	const visibleEntries = entriesData?.entries.filter((entry) => entry.kind === entryKind) ?? [];
	const pending = saveMutation.isPending || deleteMutation.isPending;
	const mutationError = saveMutation.error ?? deleteMutation.error;

	return (
		<section className="screen-stack direct-accounting-home">
			<header className="direct-accounting-header">
				<h1>Прямой учет</h1>
			</header>

			<SegmentedControl
				ariaLabel="Режим прямого учета"
				className="direct-accounting-entry-type"
				items={[
					{ value: "sale", label: "Продажа", disabled: Boolean(editingEntry) },
					{ value: "receipt", label: "Приход", disabled: Boolean(editingEntry) },
				]}
				onChange={(kind) => {
					setEntryKind(kind as EntryKind);
					setDraft(emptyDraft(today));
					setFormError(null);
					setSuccessMessage(null);
				}}
				role="group"
				value={entryKind}
			/>

			<form className="direct-accounting-form" onSubmit={submit} ref={formRef}>
				<div className="direct-accounting-form-heading">
					<div>
						<span>{formatEntryFormTitle(entryKind, Boolean(editingEntry))}</span>
						{draftTotal !== null ? <strong>{formatCompactMoneyCents(draftTotal)} ₽</strong> : null}
					</div>
					{editingEntry ? (
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
						{suggestionsData?.suggestions.map((name) => <option aria-label={name} key={name} value={name} />)}
					</datalist>
				</label>

				<div className={entryKind === "receipt" ? "direct-accounting-fields receipt" : "direct-accounting-fields"}>
					<label className="field">
						<span>Дата</span>
						<span className="direct-accounting-date-control">
							<span>{formatNumericDate(draft.occurredOn)}</span>
							<CalendarDays aria-hidden size={14} />
							<input
								aria-label="Дата"
								max={today}
								onChange={(event) => updateDraft({ occurredOn: event.target.value })}
								required
								type="date"
								value={draft.occurredOn}
							/>
						</span>
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
					{entryKind === "sale" ? <label className="field">
						<span>Цена за кг, ₽</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ unitPriceRubles: event.target.value })}
							placeholder="0,00"
							value={draft.unitPriceRubles}
						/>
					</label> : null}
				</div>

				{formError ? <p className="form-error">{formError}</p> : null}
				{mutationError ? <p className="form-error">{mutationError.message}</p> : null}
				{successMessage ? <p className="direct-accounting-success"><Check aria-hidden size={15} />{successMessage}</p> : null}

				<div className="direct-accounting-form-actions">
					{editingEntry ? (
						<button
							aria-label={`Удалить ${entryKind === "sale" ? "продажу" : "приход"}`}
							className="direct-accounting-delete"
							disabled={!online || pending}
							onClick={removeEditingEntry}
							type="button"
						>
							<Trash2 aria-hidden size={17} />
							Удалить
						</button>
					) : null}
					<button className="primary-button direct-accounting-submit" disabled={!online || pending} type="submit">
						{editingEntry ? <Pencil aria-hidden size={16} /> : <Plus aria-hidden size={17} />}
						{pending ? "Сохраняем…" : editingEntry ? "Сохранить изменения" : entryKind === "sale" ? "Добавить продажу" : "Добавить приход"}
					</button>
				</div>
			</form>

			<section className="direct-accounting-ledger" aria-label={`${entryKind === "sale" ? "Продажи" : "Приходы"} за выбранный период`}>
				<div className="direct-accounting-ledger-heading">
					<h2>{formatEntriesPeriodTitle(entryKind, listSelection, listRange)}</h2>
					<span>{formatEntryCount(visibleEntries.length, entryKind)}</span>
				</div>
				<div className="direct-accounting-list-controls">
					<SegmentedControl
						ariaLabel="Период списка операций"
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
								aria-label="Выбор периода списка операций"
								className="director-dashboard-period-picker direct-accounting-period-picker"
								collisionPadding={12}
								id="direct-accounting-list-period-picker"
								sideOffset={8}
							>
								<p className="direct-accounting-period-hint">Выберите один день или диапазон</p>
								<DateRangePickerPanel
									ariaLabel="Календарь списка операций"
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
				{entriesLoading ? <p className="muted">Загрузка записей…</p> : null}
				{entriesError ? <p className="form-error">{entriesError.message}</p> : null}
				{!entriesLoading && visibleEntries.length === 0 ? <p className="direct-accounting-empty">{entryKind === "sale" ? "Продаж" : "Приходов"} за выбранный период нет.</p> : null}
				{visibleEntries.length ? (
					<div className="direct-accounting-ledger-columns" aria-hidden>
						<span>{entryKind === "sale" ? "Продажа" : "Приход"}</span>
						<span>{entryKind === "sale" ? "Сумма" : "Количество"}</span>
					</div>
				) : null}
				<div className="direct-accounting-rows">
					{visibleEntries.map((entry) => (
						<button className={`direct-accounting-row ${entry.kind}`} key={`${entry.kind}-${entry.id}`} onClick={() => beginEdit(entry)} type="button">
							<span className="direct-accounting-row-main">
								<strong>{entry.productName}</strong>
								<small>
									{formatDate(entry.occurredOn)} · {formatQuantity(entry.quantityKg)} кг
									{entry.kind === "sale" ? ` × ${formatCompactMoneyCents(entry.unitPriceCents)} ₽` : ""}
								</small>
							</span>
							<strong>{entry.kind === "sale" ? `${formatCompactMoneyCents(entry.totalCents)} ₽` : `+${formatQuantity(entry.quantityKg)} кг`}</strong>
							<Pencil aria-hidden size={15} />
						</button>
					))}
				</div>
			</section>
		</section>
	);
}

function centsToInput(cents: number): string {
	const rubles = Math.floor(cents / 100);
	const kopecks = cents % 100;
	return kopecks ? `${rubles},${String(kopecks).padStart(2, "0")}` : String(rubles);
}

function emptyDraft(occurredOn: string): DirectAccountingDraft {
	return { productName: "", occurredOn, quantityKg: "", unitPriceRubles: "" };
}

function businessDateKey(date = new Date()): string {
	const parts = Object.fromEntries(BUSINESS_DATE_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatQuantity(value: number): string {
	return QUANTITY_FORMATTER.format(value);
}

function formatEntryCount(count: number, kind: EntryKind): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	const forms = kind === "sale"
		? ["продажа", "продажи", "продаж"]
		: ["приход", "прихода", "приходов"];
	const noun = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
	return `${count} ${noun}`;
}

function formatEntryFormTitle(kind: EntryKind, editing: boolean): string {
	if (kind === "sale") return editing ? "Исправление продажи" : "Новая продажа";
	return editing ? "Исправление прихода" : "Новый приход";
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

function formatEntriesPeriodTitle(
	kind: EntryKind,
	selection: EntriesListSelection,
	range: { dateFrom: string; dateTo: string },
): string {
	const subject = kind === "sale" ? "Продажи" : "Приходы";
	if (selection.mode === "preset") {
		if (selection.period === "day") return `${subject} сегодня`;
		if (selection.period === "week") return `${subject} за 7 дней`;
		return `${subject} за 30 дней`;
	}
	return range.dateFrom === range.dateTo
		? `${subject} за ${formatDate(range.dateFrom)}`
		: `${subject}: ${formatDateRange(range.dateFrom, range.dateTo)}`;
}

function formatNumericDate(value: string): string {
	const [year, month, day] = value.split("-");
	return year && month && day ? `${day}.${month}.${year}` : "Выберите дату";
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
