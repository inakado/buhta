"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

type PostSubmitResultRow = {
	label: string;
	value: ReactNode;
};

type PostSubmitResultAction = {
	label: string;
	onClick: () => void;
	icon?: ReactNode;
};

const RESULT_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	month: "2-digit",
});

export function PostSubmitResultLayer({
	createdAt,
	primaryAction,
	rows,
	secondaryAction,
	title = "Записано",
}: {
	createdAt: string;
	primaryAction: PostSubmitResultAction;
	rows: PostSubmitResultRow[];
	secondaryAction: PostSubmitResultAction;
	title?: string;
}) {
	return (
		<section className="form-panel production-action-form post-submit-result-layer" aria-live="polite">
			<div className="post-submit-result-heading">
				<span className="post-submit-result-icon">
					<Check aria-hidden size={18} />
				</span>
				<div>
					<h2>{title}</h2>
					<span>{formatResultDate(createdAt)}</span>
				</div>
			</div>
			<div className="production-form-ledger">
				{rows.map((row) => (
					<div className="production-form-ledger-row" key={row.label}>
						<span>{row.label}</span>
						<strong>{row.value}</strong>
					</div>
				))}
			</div>
			<div className="post-submit-result-actions">
				<button className="primary-button" onClick={primaryAction.onClick} type="button">
					{primaryAction.icon}
					{primaryAction.label}
				</button>
				<button className="secondary-button" onClick={secondaryAction.onClick} type="button">
					{secondaryAction.icon}
					{secondaryAction.label}
				</button>
			</div>
		</section>
	);
}

function formatResultDate(value: string): string {
	return RESULT_DATE_FORMATTER.format(new Date(value));
}
