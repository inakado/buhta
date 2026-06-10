"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ru } from "react-day-picker/locale";

export type DateRangePickerValue = {
	dateFrom: string;
	dateTo: string;
};

type DateRangePickerPanelProps = {
	ariaLabel: string;
	dateFrom: string;
	dateTo: string;
	error?: string | null;
	maxDays?: number;
	onChange: (value: DateRangePickerValue) => void;
};

export function DateRangePickerPanel({
	ariaLabel,
	dateFrom,
	dateTo,
	error,
	maxDays,
	onChange,
}: DateRangePickerPanelProps) {
	const selectedRange = toCalendarDateRange(dateFrom, dateTo);
	const [defaultMonth] = useState(() => new Date());

	function selectCalendarRange(range: DateRange | undefined) {
		onChange({
			dateFrom: range?.from ? toDateInputValue(range.from) : "",
			dateTo: range?.to ? toDateInputValue(range.to) : "",
		});
	}

	return (
		<div aria-label={ariaLabel} className="date-range-picker-panel">
			<DayPicker
				className="date-range-picker-calendar"
				defaultMonth={selectedRange?.from ?? defaultMonth}
				locale={ru}
				mode="range"
				onSelect={selectCalendarRange}
				selected={selectedRange}
				weekStartsOn={1}
				{...(maxDays ? { max: maxDays } : {})}
			/>
			<div className="date-range-picker-fields">
				<label>
					<span>С</span>
					<input
						onChange={(event) => onChange({ dateFrom: event.target.value, dateTo })}
						placeholder="ГГГГ-ММ-ДД"
						type="text"
						value={dateFrom}
					/>
				</label>
				<label>
					<span>По</span>
					<input
						onChange={(event) => onChange({ dateFrom, dateTo: event.target.value })}
						placeholder="ГГГГ-ММ-ДД"
						type="text"
						value={dateTo}
					/>
				</label>
			</div>
			{error ? <p className="date-range-picker-error">{error}</p> : null}
		</div>
	);
}

function toCalendarDateRange(dateFrom: string, dateTo: string): DateRange | undefined {
	const from = parseDateInputValue(dateFrom);
	if (!from) {
		return undefined;
	}

	return {
		from,
		to: parseDateInputValue(dateTo),
	};
}

function parseDateInputValue(value: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		return undefined;
	}

	const [, year, month, day] = match;
	return new Date(Number(year), Number(month) - 1, Number(day));
}

function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
