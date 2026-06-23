"use client";

import {
	ArrowLeft,
	ArrowRight,
	ArrowRightLeft,
	BadgeCheck,
	Banknote,
	Check,
	ChevronRight,
	CirclePlus,
	ClipboardList,
	Factory,
	FishSymbol,
	Package,
	PackagePlus,
	ReceiptText,
	Search,
	Send,
	UserPlus,
	type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type RoleOnboardingHomeProps = {
	targetRole: "commercial_manager" | "production_manager";
};

type OnboardingStep = {
	body: string;
	focus: CommercialOnboardingFocus | ProductionOnboardingFocus;
	id: string;
};

type ProductionOnboardingFocus = "overview" | "raw-intake" | "packaging-intake" | "release" | "transfer" | "limits";
type CommercialOnboardingFocus = "commercial-overview" | "commercial-sale" | "commercial-clients" | "commercial-couriers" | "commercial-notify";

const PRODUCTION_STEPS: OnboardingStep[] = [
	{
		id: "overview",
		body: "Перед вами сводка цеха: сколько готовой продукции, сырья и тары сейчас есть на остатке. В рабочем экране строки ведут к спискам по категориям, где можно проверить состав и количество.",
		focus: "overview",
	},
	{
		id: "raw-intake",
		body: "Кнопка открывает форму прихода сырья. В рабочем экране здесь выбирают уже заведенный вид сырья, вводят количество и при необходимости комментарий. После записи остаток сырья в цеху увеличивается.",
		focus: "raw-intake",
	},
	{
		id: "packaging-intake",
		body: "Кнопка открывает форму прихода тары. В рабочем экране здесь выбирают уже заведенный вид тары, вводят количество и при необходимости комментарий. После записи остаток тары в цеху увеличивается.",
		focus: "packaging-intake",
	},
	{
		id: "release",
		body: "Кнопка открывает форму выпуска продукции. В рабочем экране здесь выбирают уже заведенный шаблон, вводят количество продукции и расход сырья. После записи готовая продукция появляется в остатках цеха.",
		focus: "release",
	},
	{
		id: "transfer",
		body: "Кнопка открывает форму передачи продукции. В рабочем экране здесь выбирают готовую продукцию, распределитель и количество. После записи остаток в цеху уменьшается, а продукция появляется на выбранном распределителе.",
		focus: "transfer",
	},
	{
		id: "limits",
		body: "Новые виды сырья и тары заведующий производством ведет в справочниках. Шаблоны продукции заводятся директором или администратором. В цеху заведующий принимает, выпускает и передает уже заведенные позиции.",
		focus: "limits",
	},
];

const COMMERCIAL_STEPS: OnboardingStep[] = [
	{
		id: "commercial-overview",
		body: "Перед вами сводка распределителя: сколько продукции сейчас доступно, какая стоимость товара и сколько наличных в кассе. В рабочем экране строка остатка открывает список продукции на распределителе.",
		focus: "commercial-overview",
	},
	{
		id: "commercial-sale",
		body: "Кнопка открывает форму продажи. В рабочем экране здесь выбирают клиента, продукцию, количество и способ оплаты: наличные или безнал. После записи товар автоматически списывается с распределителя. Если оплата наличная, сумма добавляется в кассу. Если оплата безналичная, касса не меняется.",
		focus: "commercial-sale",
	},
	{
		id: "commercial-clients",
		body: "В этом разделе находят покупателя по имени или телефону, добавляют нового клиента и редактируют его карточку. Клиент обязателен для оформления продажи, поэтому базу лучше поддерживать в порядке заранее: до создания заказа.",
		focus: "commercial-clients",
	},
	{
		id: "commercial-couriers",
		body: "Вкладка курьеров показывает, что сейчас находится у каждого курьера: продукцию, стоимость и наличные. Это контрольный экран: коммерческий руководитель видит балансы, но загрузку и возврат курьер оформляет сам.",
		focus: "commercial-couriers",
	},
	{
		id: "commercial-notify",
		body: "Кнопка открывает форму задачи для производства. Здесь можно оставить свободное поручение для цеха: что выпустить, подготовить или проверить. После создания задача появится у заведующего производством.",
		focus: "commercial-notify",
	},
];

export function RoleOnboardingHome({ targetRole }: RoleOnboardingHomeProps) {
	const steps = targetRole === "commercial_manager" ? COMMERCIAL_STEPS : PRODUCTION_STEPS;
	const [stepIndex, setStepIndex] = useState(0);
	const step = steps[stepIndex];
	if (!step) {
		return null;
	}
	const isFirstStep = stepIndex === 0;
	const isLastStep = stepIndex === steps.length - 1;
	const hasVisual = step.focus !== "limits";
	const label = targetRole === "commercial_manager" ? "Подсказки по продажам" : "Подсказки по цеху";

	return (
		<section className="screen-stack onboarding-home" aria-label={label}>
			<div className="onboarding-scroll">
				{hasVisual ? (
					<div className="onboarding-stage" aria-label={`Шаг ${stepIndex + 1} из ${steps.length}`}>
						<RoleStepVisual focus={step.focus} />
					</div>
				) : null}

				<OnboardingStepText step={step} stepIndex={stepIndex} totalSteps={steps.length} />
			</div>

			<div className="onboarding-controls" aria-label="Перелистывание">
				<button className="secondary-button" disabled={isFirstStep} onClick={() => setStepIndex((current) => Math.max(0, current - 1))} type="button">
					<ArrowLeft aria-hidden size={16} />
					Назад
				</button>
				<div className="onboarding-dots" aria-hidden>
					{steps.map((item, index) => (
						<span className={index === stepIndex ? "active" : ""} key={item.id} />
					))}
				</div>
				<button className="secondary-button" disabled={isLastStep} onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))} type="button">
					Вперед
					<ArrowRight aria-hidden size={16} />
				</button>
			</div>
		</section>
	);
}

function RoleStepVisual({ focus }: { focus: OnboardingStep["focus"] }) {
	if (focus === "overview") {
		return <DemoSummary />;
	}

	if (focus === "raw-intake") {
		return <DemoIntakeActions kind="raw" />;
	}

	if (focus === "packaging-intake") {
		return <DemoIntakeActions kind="packaging" />;
	}

	if (focus === "release") {
		return <DemoReleaseActions />;
	}

	if (focus === "transfer") {
		return <DemoTransferActions />;
	}

	if (focus === "commercial-overview") {
		return <DemoCommercialSummary />;
	}

	if (focus === "commercial-sale") {
		return <DemoCommercialSale />;
	}

	if (focus === "commercial-clients") {
		return <DemoCommercialClients />;
	}

	if (focus === "commercial-couriers") {
		return <DemoCommercialCouriers />;
	}

	if (focus === "commercial-notify") {
		return <DemoCommercialNotify />;
	}

	return null;
}

function OnboardingStepText({
	step,
	stepIndex,
	totalSteps,
}: {
	step: OnboardingStep;
	stepIndex: number;
	totalSteps: number;
}) {
	return (
		<section className="onboarding-step-text" aria-label={`Пояснение ${stepIndex + 1} из ${totalSteps}`}>
			<div className="onboarding-step-meta">
				<span>{stepIndex + 1} / {totalSteps}</span>
			</div>
			<p>{step.body}</p>
		</section>
	);
}

function DemoSummary() {
	return (
		<section className="production-home-surface onboarding-fragment" aria-label="Сводка цеха">
			<div className="production-home-heading">
				<h3>Цех</h3>
				<span>Остатки</span>
			</div>
			<div className="production-summary-ledger">
				<DemoSummaryRow icon={BadgeCheck} label="Продукция" value="18 шт" meta="В цеху" />
				<DemoSummaryRow icon={FishSymbol} label="Сырье" value="42 кг" meta="2 вида" />
				<DemoSummaryRow icon={Package} label="Тара" value="120 шт" meta="3 вида" />
			</div>
		</section>
	);
}

function DemoSummaryRow({
	icon: Icon,
	label,
	meta,
	showChevron = true,
	value,
}: {
	icon: LucideIcon;
	label: string;
	meta: string;
	showChevron?: boolean;
	value: string;
}) {
	return (
		<div className="production-summary-row onboarding-static-row">
			<span className="production-summary-icon" aria-hidden>
				<Icon size={17} />
			</span>
			<span className="production-summary-main">
				<span>{label}</span>
				<strong>{value}</strong>
			</span>
			<span className="production-summary-meta">
				<span>{meta}</span>
				{showChevron ? <ChevronRight aria-hidden size={16} /> : null}
			</span>
		</div>
	);
}

function DemoIntakeActions({ kind }: { kind: "raw" | "packaging" }) {
	const isRaw = kind === "raw";
	const entryIcon = isRaw ? CirclePlus : PackagePlus;
	const entryLabel = isRaw ? "Добавить сырье" : "Добавить тару";
	const fieldLabel = isRaw ? "Вид сырья" : "Вид тары";
	const optionValue = isRaw ? "salmon-raw" : "jar-250";
	const optionLabel = isRaw ? "Сырье лосося" : "Банка 250 мл";
	const quantity = isRaw ? "12,5" : "240";
	const comment = isRaw ? "Приход от поставщика" : "Партия для Икры А";

	return (
		<section className="onboarding-operation-demo" aria-label={entryLabel}>
			<div className="production-command-panel onboarding-fragment onboarding-demo-actions onboarding-intake-entry">
				<div className="production-command-group supporting">
					<DemoCommandButton icon={entryIcon} label={entryLabel} />
				</div>
			</div>
			<form className="form-panel production-action-form onboarding-fragment onboarding-operation-form">
				<label className="field">
					<span>{fieldLabel}</span>
					<select value={optionValue} onChange={() => undefined} disabled>
						<option value={optionValue}>{optionLabel}</option>
					</select>
				</label>
				<label className="field">
					<span>Количество</span>
					<input readOnly type="text" value={quantity} />
				</label>
				<label className="field">
					<span>Комментарий</span>
					<input readOnly type="text" value={comment} />
				</label>
				<div className="production-submit-block">
					<button className="primary-button" type="button">
						<Check aria-hidden size={18} />
						Записать приход
					</button>
				</div>
			</form>
		</section>
	);
}

function DemoCommandButton({
	icon: Icon,
	label,
}: {
	icon: LucideIcon;
	label: string;
}) {
	return (
		<button className="production-command-button" onClick={(event) => event.preventDefault()} type="button">
			<Icon aria-hidden size={18} />
			<span>{label}</span>
		</button>
	);
}

function DemoReleaseActions() {
	return (
		<section className="onboarding-operation-demo" aria-label="Выпуск продукции">
			<div className="production-command-panel onboarding-fragment onboarding-demo-actions onboarding-intake-entry">
				<div className="production-command-group frequent">
					<DemoCommandButton icon={Factory} label="Выпустить" />
				</div>
			</div>
			<form className="form-panel production-action-form onboarding-fragment onboarding-operation-form">
				<label className="field">
					<span>Шаблон продукции</span>
					<select value="roe-a" onChange={() => undefined} disabled>
						<option value="roe-a">Икра А</option>
					</select>
				</label>
				<div className="production-form-ledger">
					<div className="production-form-ledger-row">
						<span>Сырье</span>
						<strong>Сырье лосося</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Тара</span>
						<strong>Банка 250 мл</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Доступно</span>
						<strong>42 кг сырья, 240 шт тары</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Цена</span>
						<strong>1250 ₽</strong>
					</div>
				</div>
				<label className="field">
					<span>Количество продукции, шт</span>
					<input readOnly type="text" value="6" />
				</label>
				<label className="field">
					<span>Расход сырья, кг</span>
					<input readOnly type="text" value="12" />
				</label>
				<label className="field">
					<span>Комментарий</span>
					<input readOnly type="text" value="Утренняя партия" />
				</label>
				<div className="production-submit-block">
					<button className="primary-button" type="button">
						<Factory aria-hidden size={18} />
						Выпустить
					</button>
				</div>
			</form>
		</section>
	);
}

function DemoTransferActions() {
	return (
		<section className="onboarding-operation-demo" aria-label="Передача продукции">
			<div className="production-command-panel onboarding-fragment onboarding-demo-actions onboarding-intake-entry">
				<div className="production-command-group frequent">
					<DemoCommandButton icon={ArrowRightLeft} label="Передать" />
				</div>
			</div>
			<form className="form-panel production-action-form onboarding-fragment onboarding-operation-form">
				<label className="field">
					<span>Продукция</span>
					<select value="roe-a-batch" onChange={() => undefined} disabled>
						<option value="roe-a-batch">Икра А • 18 шт</option>
					</select>
				</label>
				<div className="production-form-ledger">
					<div className="production-form-ledger-row">
						<span>Доступно</span>
						<strong>18 шт</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Цена</span>
						<strong>1250 ₽</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Выпуск</span>
						<strong>18.06, 14:20</strong>
					</div>
				</div>
				<label className="field">
					<span>Распределитель</span>
					<select value="portovaya-1" onChange={() => undefined} disabled>
						<option value="portovaya-1">Портовая 1</option>
					</select>
				</label>
				<label className="field">
					<span>Количество, шт</span>
					<input readOnly type="text" value="5" />
				</label>
				<label className="field">
					<span>Комментарий</span>
					<input readOnly type="text" value="На распределитель" />
				</label>
				<div className="production-submit-block">
					<button className="primary-button" type="button">
						<ArrowRightLeft aria-hidden size={18} />
						Передать
					</button>
				</div>
			</form>
		</section>
	);
}

function DemoCommercialSummary() {
	return (
		<section className="onboarding-operation-demo" aria-label="Сводка продаж">
			<section className="production-home-surface commercial-home-surface summary-stacked onboarding-fragment" aria-label="Сводка распределителя">
				<div className="production-home-heading">
					<h3>Распределитель</h3>
					<span>Сводка</span>
				</div>
				<div className="production-summary-ledger summary-stacked">
					<DemoSummaryRow icon={BadgeCheck} label="Остаток распределителя" value="18 шт" meta="2 позиции" />
					<DemoSummaryRow icon={ClipboardList} label="Стоимость продукции" value="22,5 тыс ₽" meta="По текущей цене" showChevron={false} />
					<DemoSummaryRow icon={Banknote} label="Наличные" value="8,2 тыс ₽" meta="В кассе" showChevron={false} />
				</div>
			</section>
		</section>
	);
}

function DemoCommercialSale() {
	return (
		<section className="onboarding-operation-demo" aria-label="Продажа с распределителя">
			<div className="production-command-panel onboarding-fragment onboarding-demo-actions onboarding-intake-entry">
				<div className="production-command-group frequent">
					<DemoCommandButton icon={ReceiptText} label="Продать" />
				</div>
			</div>
			<form className="form-panel production-action-form onboarding-fragment onboarding-operation-form">
				<label className="field">
					<span>Клиент</span>
					<select value="petrov" onChange={() => undefined} disabled>
						<option value="petrov">Петр Петров · 79998887766</option>
					</select>
				</label>
				<label className="field">
					<span>Продукция</span>
					<select value="roe-a" onChange={() => undefined} disabled>
						<option value="roe-a">Икра А • 18 шт</option>
					</select>
				</label>
				<div className="production-form-ledger">
					<div className="production-form-ledger-row">
						<span>Доступно</span>
						<strong>18 шт</strong>
					</div>
					<div className="production-form-ledger-row">
						<span>Цена</span>
						<strong>1250 ₽/шт</strong>
					</div>
				</div>
				<label className="field">
					<span>Количество, шт</span>
					<input readOnly type="text" value="2" />
				</label>
				<div className="payment-segmented">
					<span>Оплата</span>
					<button className="active" type="button">Наличные</button>
					<button type="button">Безнал</button>
				</div>
				<div className="production-form-ledger">
					<div className="production-form-ledger-row">
						<span>Итого</span>
						<strong>2500 ₽</strong>
					</div>
				</div>
				<div className="production-submit-block">
					<button className="primary-button" type="button">
						<ReceiptText aria-hidden size={18} />
						Записать продажу
					</button>
				</div>
			</form>
		</section>
	);
}

function DemoCommercialClients() {
	return (
		<section className="onboarding-operation-demo" aria-label="Клиенты">
			<div className="section-heading compact clients-heading onboarding-fragment onboarding-intake-entry">
				<h3>Клиенты</h3>
				<div className="clients-heading-side">
					<span>2 клиента</span>
					<button className="secondary-button compact-button client-create-button" type="button">
						<UserPlus aria-hidden size={16} />
						Новый
					</button>
				</div>
			</div>
			<div className="client-search onboarding-fragment onboarding-intake-entry">
				<label className="field">
					<span className="sr-only">Поиск</span>
					<div className="input-shell">
						<Search aria-hidden size={18} />
						<input aria-label="Поиск" readOnly type="search" value="Петр" />
					</div>
				</label>
			</div>
			<div className="client-list-table onboarding-fragment onboarding-client-list">
				<div className="client-list-row">
					<div className="client-list-main">
						<strong>Петр Петров</strong>
						<span className="client-list-phone">79998887766</span>
						<p className="client-list-description">Постоянный клиент</p>
					</div>
				</div>
				<div className="client-list-row">
					<div className="client-list-main">
						<strong>Мария Иванова</strong>
						<span className="client-list-phone">79997776655</span>
						<p className="client-list-description">Самовывоз</p>
					</div>
				</div>
			</div>
		</section>
	);
}

function DemoCommercialCouriers() {
	return (
		<section className="onboarding-operation-demo" aria-label="Балансы курьеров">
			<div className="inventory-overview-strip onboarding-fragment">
				<div>
					<span>Количество</span>
					<strong>7 шт</strong>
				</div>
				<div>
					<span>Продукция</span>
					<strong>8,8 тыс ₽</strong>
				</div>
				<div>
					<span>Наличные</span>
					<strong>3,5 тыс ₽</strong>
				</div>
			</div>
			<div className="courier-ledger-surface onboarding-fragment">
				<div className="director-courier-table-head">
					<span>Курьер</span>
					<span>Остаток</span>
					<span>Наличные</span>
				</div>
				<div className="courier-balance-list">
					<div className="courier-balance-card">
						<div className="courier-balance-head">
							<div>
								<strong>Антон</strong>
								<p>1 позиция</p>
							</div>
							<div className="courier-balance-metrics">
								<strong>6250 ₽</strong>
								<strong>3500 ₽</strong>
							</div>
						</div>
						<table className="courier-product-table" aria-label="Продукция курьера Антон">
							<tbody>
								<tr className="courier-product-row">
									<td>
										<strong>Икра А</strong>
									</td>
									<td>
										<strong>5 шт</strong>
										<span>1250 ₽/шт</span>
									</td>
									<td>
										<strong>6250 ₽</strong>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	);
}

function DemoCommercialNotify() {
	return (
		<section className="onboarding-operation-demo" aria-label="Задача производству">
			<div className="production-command-panel onboarding-fragment onboarding-demo-actions onboarding-intake-entry">
				<div className="production-command-group frequent">
					<DemoCommandButton icon={Send} label="Уведомить" />
				</div>
			</div>
			<form className="form-panel production-action-form notification-create-panel onboarding-fragment onboarding-operation-form">
				<label className="field">
					<span>Что передать производству</span>
					<textarea readOnly rows={3} value="К завтра подготовить 10 шт Икры А для распределителя." />
				</label>
				<div className="production-submit-block">
					<button className="primary-button" type="button">
						<Send aria-hidden size={18} />
						Отправить задачу
					</button>
				</div>
			</form>
			<ul className="notification-ledger onboarding-fragment">
				<li className="notification-ledger-row">
					<div>
						<strong>К завтра подготовить 10 шт Икры А для распределителя.</strong>
						<div className="notification-meta-row">
							<span className="notification-state new">Новое</span>
							<span>19.06, 09:20</span>
							<span>Коммерческий руководитель</span>
						</div>
					</div>
					<strong className="notification-status">Новая</strong>
				</li>
			</ul>
		</section>
	);
}
