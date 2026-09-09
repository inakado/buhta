"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import {
	CalendarDays,
	Check,
	ChevronDown,
	HandCoins,
	PackagePlus,
	Pencil,
	Plus,
	ReceiptText,
	RotateCcw,
	ShoppingCart,
	Trash2,
} from "lucide-react";
import { type FormEvent, useDeferredValue, useRef, useState } from "react";
import type {
	DirectAccountingDetailPeriod,
	DirectAccountingEntry,
	DirectAccountingExpenseInput,
	DirectAccountingReceiptInput,
	DirectAccountingSaleInput,
	DirectAccountingTransferInput,
} from "@buhta/shared";
import {
	createDirectAccountingExpense,
	createDirectAccountingReceipt,
	createDirectAccountingSale,
	createDirectAccountingTransfer,
	deleteDirectAccountingExpense,
	deleteDirectAccountingReceipt,
	deleteDirectAccountingSale,
	deleteDirectAccountingTransfer,
	listDirectAccountingEntries,
	listDirectAccountingSuggestions,
	updateDirectAccountingExpense,
	updateDirectAccountingReceipt,
	updateDirectAccountingSale,
	updateDirectAccountingTransfer,
} from "../../lib/api-client";
import { formatCompactMoneyCents } from "../../lib/money-format";
import { DateRangePickerPanel } from "../../ui/DateRangePickerPanel";
import { SegmentedControl } from "../../ui/SegmentedControl";
import {
	parseExpenseDraft,
	parseReceiptDraft,
	parseSaleDraft,
	parseTransferDraft,
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
	| { kind: "receipt"; input: DirectAccountingReceiptInput }
	| { kind: "expense"; input: DirectAccountingExpenseInput }
	| { kind: "transfer"; input: DirectAccountingTransferInput };

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
		queryKey: ["direct-accounting", "suggestions", entryKind, deferredProductName],
		queryFn: () => listDirectAccountingSuggestions(deferredProductName, entryKind === "expense" ? "expense" : "stock"),
		enabled: entryKind !== "transfer",
	});
	const saveMutation = useMutation({
		mutationFn: async (save: SaveInput) => {
			if (save.kind === "transfer") {
				const { transfer } = await (editingEntry
					? updateDirectAccountingTransfer(editingEntry.id, save.input)
					: createDirectAccountingTransfer(save.input));
				return { kind: save.kind, occurredOn: transfer.transferredOn };
			}
			if (save.kind === "expense") {
				const { expense } = await (editingEntry
					? updateDirectAccountingExpense(editingEntry.id, save.input)
					: createDirectAccountingExpense(save.input));
				return { kind: save.kind, occurredOn: expense.spentOn };
			}
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
				: variables.kind === "sale"
					? "Продажа добавлена"
					: variables.kind === "receipt" ? "Приход добавлен" : variables.kind === "expense" ? "Затрата добавлена" : "Передача добавлена");
			await invalidateDirectAccounting(queryClient);
		},
	});
	const deleteMutation = useMutation({
		mutationFn: (entry: DirectAccountingEntry) => entry.kind === "sale"
			? deleteDirectAccountingSale(entry.id)
			: entry.kind === "receipt"
				? deleteDirectAccountingReceipt(entry.id)
				: entry.kind === "expense" ? deleteDirectAccountingExpense(entry.id) : deleteDirectAccountingTransfer(entry.id),
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
			productName: entryName(entry),
			occurredOn: entry.occurredOn,
			quantityKg: entry.kind === "sale" || entry.kind === "receipt" ? String(entry.quantityKg).replace(".", ",") : "",
			unitPriceRubles: entry.kind === "sale" ? centsToInput(entry.unitPriceCents) : "",
			amountRubles: entry.kind === "expense" || entry.kind === "transfer" ? centsToInput(entry.amountCents) : "",
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
		if (entryKind === "expense") {
			const parsed = parseExpenseDraft(draft, today);
			if (typeof parsed === "string") return setFormError(parsed);
			saveMutation.mutate({ kind: entryKind, input: parsed });
			return;
		}
		if (entryKind === "transfer") {
			const parsed = parseTransferDraft(draft, today);
			if (typeof parsed === "string") return setFormError(parsed);
			saveMutation.mutate({ kind: entryKind, input: parsed });
			return;
		}
		const parsed = parseReceiptDraft(draft, today);
		if (typeof parsed === "string") return setFormError(parsed);
		saveMutation.mutate({ kind: entryKind, input: parsed });
	}

	function removeEditingEntry() {
		if (!editingEntry || !window.confirm(`Удалить ${entryKindAccusative(editingEntry.kind)} «${entryName(editingEntry)}»?`)) {
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
	const draftTotal = entryKind === "sale" && typeof parsedSaleDraft !== "string"
		? Math.round(parsedSaleDraft.quantityKg * parsedSaleDraft.unitPriceCents)
		: null;
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
				iconSize={17}
				items={[
					{ value: "sale", label: "Продажа", icon: ShoppingCart, disabled: Boolean(editingEntry) },
					{ value: "receipt", label: "Приход", icon: PackagePlus, disabled: Boolean(editingEntry) },
					{ value: "expense", label: "Затраты", icon: ReceiptText, disabled: Boolean(editingEntry) },
					{ value: "transfer", label: "Передача", icon: HandCoins, disabled: Boolean(editingEntry) },
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
					<span>{entryKind === "transfer" ? "Кому / комментарий" : "Наименование"}</span>
					<input
						autoComplete="off"
						list={entryKind === "transfer" ? undefined : "direct-accounting-products"}
						maxLength={entryKind === "transfer" ? 240 : 120}
						onChange={(event) => updateDraft({ productName: event.target.value })}
						placeholder={entryKind === "transfer" ? "Например, Ивану на закупку" : entryKind === "expense" ? "Например, доставка" : "Например, икра кеты"}
						ref={productNameRef}
						value={draft.productName}
					/>
					<datalist id="direct-accounting-products">
						{suggestionsData?.suggestions.map((name) => <option aria-label={name} key={name} value={name} />)}
					</datalist>
				</label>

				<div className={entryKind === "sale" ? "direct-accounting-fields" : "direct-accounting-fields compact"}>
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
					{entryKind === "sale" || entryKind === "receipt" ? <label className="field">
						<span>Количество, кг</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ quantityKg: event.target.value })}
							placeholder="0,000"
							value={draft.quantityKg}
						/>
					</label> : null}
					{entryKind === "sale" ? <label className="field">
						<span>Цена за кг, ₽</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ unitPriceRubles: event.target.value })}
							placeholder="0,00"
							value={draft.unitPriceRubles}
						/>
					</label> : entryKind === "expense" || entryKind === "transfer" ? <label className="field">
						<span>Сумма, ₽</span>
						<input
							inputMode="decimal"
							onChange={(event) => updateDraft({ amountRubles: event.target.value })}
							placeholder="0,00"
							value={draft.amountRubles}
						/>
					</label> : null}
				</div>

				{formError ? <p className="form-error">{formError}</p> : null}
				{mutationError ? <p className="form-error">{mutationError.message}</p> : null}
				{successMessage ? <p className="direct-accounting-success"><Check aria-hidden size={15} />{successMessage}</p> : null}

				<div className="direct-accounting-form-actions">
					{editingEntry ? (
						<button
							aria-label={`Удалить ${entryKindAccusative(entryKind)}`}
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
						{pending ? "Сохраняем…" : editingEntry ? "Сохранить изменения" : formatCreateLabel(entryKind)}
					</button>
				</div>
			</form>

			<section className="direct-accounting-ledger" aria-label={`${entryKindSubject(entryKind)} за выбранный период`}>
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
				{!entriesLoading && visibleEntries.length === 0 ? <p className="direct-accounting-empty">{entryKindEmpty(entryKind)} за выбранный период нет.</p> : null}
				{visibleEntries.length ? (
					<div className="direct-accounting-ledger-columns" aria-hidden>
						<span>{entryKind === "sale" ? "Продажа" : entryKind === "receipt" ? "Приход" : entryKind === "expense" ? "Затрата" : "Передача"}</span>
						<span>{entryKind === "receipt" ? "Количество" : "Сумма"}</span>
					</div>
				) : null}
				<div className="direct-accounting-rows">
					{visibleEntries.map((entry) => (
						<button className={`direct-accounting-row ${entry.kind}`} key={`${entry.kind}-${entry.id}`} onClick={() => beginEdit(entry)} type="button">
							<span className="direct-accounting-row-main">
								<strong>{entryName(entry)}</strong>
								<small>{formatEntryMeta(entry)}</small>
							</span>
							<strong>{entry.kind === "sale" ? `${formatCompactMoneyCents(entry.totalCents)} ₽` : entry.kind === "receipt" ? `+${formatQuantity(entry.quantityKg)} кг` : `${formatCompactMoneyCents(entry.amountCents)} ₽`}</strong>
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
	return { productName: "", occurredOn, quantityKg: "", unitPriceRubles: "", amountRubles: "" };
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
		: kind === "receipt"
			? ["приход", "прихода", "приходов"]
			: kind === "expense" ? ["затрата", "затраты", "затрат"] : ["передача", "передачи", "передач"];
	const noun = mod100 >= 11 && mod100 <= 14 ? forms[2] : mod10 === 1 ? forms[0] : mod10 >= 2 && mod10 <= 4 ? forms[1] : forms[2];
	return `${count} ${noun}`;
}

function formatEntryFormTitle(kind: EntryKind, editing: boolean): string {
	if (kind === "sale") return editing ? "Исправление продажи" : "Новая продажа";
	if (kind === "receipt") return editing ? "Исправление прихода" : "Новый приход";
	if (kind === "expense") return editing ? "Исправление затраты" : "Новая затрата";
	return editing ? "Исправление передачи средств" : "Новая передача средств";
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
	const subject = entryKindSubject(kind);
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

function entryName(entry: DirectAccountingEntry): string {
	return entry.kind === "expense" ? entry.name : entry.kind === "transfer" ? entry.comment : entry.productName;
}

function formatEntryMeta(entry: DirectAccountingEntry): string {
	if (entry.kind === "expense" || entry.kind === "transfer") return formatDate(entry.occurredOn);
	return `${formatDate(entry.occurredOn)} · ${formatQuantity(entry.quantityKg)} кг${entry.kind === "sale" ? ` × ${formatCompactMoneyCents(entry.unitPriceCents)} ₽` : ""}`;
}

function entryKindSubject(kind: EntryKind): string {
	return kind === "sale" ? "Продажи" : kind === "receipt" ? "Приходы" : kind === "expense" ? "Затраты" : "Передачи";
}

function entryKindEmpty(kind: EntryKind): string {
	return kind === "sale" ? "Продаж" : kind === "receipt" ? "Приходов" : kind === "expense" ? "Затрат" : "Передач";
}

function entryKindAccusative(kind: EntryKind): string {
	return kind === "sale" ? "продажу" : kind === "receipt" ? "приход" : kind === "expense" ? "затрату" : "передачу";
}

function formatCreateLabel(kind: EntryKind): string {
	return kind === "sale" ? "Добавить продажу" : kind === "receipt" ? "Добавить приход" : kind === "expense" ? "Добавить затрату" : "Добавить передачу";
}
