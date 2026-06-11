"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, Eye, EyeOff, KeyRound, LogOut, X, type LucideIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { changeOwnPassword, type CurrentActor } from "../../lib/api-client";
import { toUserErrorMessage } from "../../lib/error-messages";
import { ROLE_LABELS } from "../../lib/role-labels";

type AccountMoreSectionProps = {
	actor: CurrentActor;
	logout: () => void;
	logoutPending: boolean;
	onActionSuccess: (message: string) => void;
	online: boolean;
	sectionId: string;
};

type MenuRow = {
	detail: string;
	disabled?: boolean;
	icon: LucideIcon;
	id: string;
	label: string;
	onSelect?: () => void;
	tone?: "default" | "danger";
	trailing?: string;
};

export function AccountMoreSection({
	actor,
	logout,
	logoutPending,
	onActionSuccess,
	online,
	sectionId,
}: AccountMoreSectionProps) {
	const [passwordOpen, setPasswordOpen] = useState(false);
	const accountRows: MenuRow[] = [
		{
			id: "change-password",
			label: "Сменить пароль",
			detail: "Безопасность входа",
			disabled: !online,
			icon: KeyRound,
			onSelect: () => setPasswordOpen(true),
			...(online ? {} : { trailing: "Нет сети" }),
		},
		{
			id: "logout",
			label: logoutPending ? "Выходим" : "Выйти",
			detail: "Завершить текущую сессию",
			disabled: logoutPending,
			icon: LogOut,
			onSelect: logout,
			tone: "danger",
		},
	];

	return (
		<section className="director-more-section" aria-labelledby={`${sectionId}-account`}>
			<h3 className="director-more-section-label" id={`${sectionId}-account`}>Аккаунт</h3>
			<div className="director-more-account-identity">
				<strong>{actor.displayName}</strong>
				<span>
					{ROLE_LABELS[actor.role]} · @{actor.login}
				</span>
			</div>
			<div className="director-more-section-list">
				{accountRows.map((row) => (
					<AccountMoreRow key={row.id} row={row} />
				))}
			</div>
			<ChangePasswordDialog
				onOpenChange={setPasswordOpen}
				onSuccess={() => onActionSuccess("Пароль изменен")}
				online={online}
				open={passwordOpen}
			/>
		</section>
	);
}

function AccountMoreRow({ row }: { row: MenuRow }) {
	const Icon = row.icon;

	return (
		<button
			type="button"
			aria-label={row.label}
			className={row.tone === "danger" ? "director-more-menu-row danger" : "director-more-menu-row"}
			disabled={row.disabled}
			onClick={row.onSelect}
		>
			<span className="director-more-menu-icon">
				<Icon aria-hidden size={17} />
			</span>
			<span className="director-more-menu-copy">
				<strong>{row.label}</strong>
				<small>{row.detail}</small>
			</span>
			{row.trailing ? (
				<span className="director-more-menu-status">{row.trailing}</span>
			) : (
				<ChevronRight aria-hidden className="director-more-menu-chevron" size={17} />
			)}
		</button>
	);
}

function ChangePasswordDialog({
	onOpenChange,
	onSuccess,
	online,
	open,
}: {
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
	online: boolean;
	open: boolean;
}) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
	const [visiblePasswords, setVisiblePasswords] = useState({
		current: false,
		next: false,
		confirmation: false,
	});
	const mutation = useMutation({
		mutationFn: changeOwnPassword,
		onSuccess: () => {
			resetForm();
			onOpenChange(false);
			onSuccess();
		},
	});
	const localError = passwordFormError(currentPassword, newPassword, newPasswordConfirmation);
	const submitDisabled = !online
		|| mutation.isPending
		|| !currentPassword
		|| !newPassword
		|| !newPasswordConfirmation
		|| Boolean(localError);

	function resetForm() {
		setCurrentPassword("");
		setNewPassword("");
		setNewPasswordConfirmation("");
		setVisiblePasswords({
			current: false,
			next: false,
			confirmation: false,
		});
		mutation.reset();
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (submitDisabled) {
			return;
		}

		mutation.mutate({
			currentPassword,
			newPassword,
			newPasswordConfirmation,
		});
	}

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					resetForm();
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog account-password-dialog">
					<div className="operation-dialog-heading">
						<div>
							<Dialog.Title>Сменить пароль</Dialog.Title>
						</div>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<form className="operation-dialog-form" onSubmit={handleSubmit}>
						<PasswordField
							autoComplete="current-password"
							label="Текущий пароль"
							onChange={setCurrentPassword}
							onToggleVisibility={() => setVisiblePasswords((value) => ({ ...value, current: !value.current }))}
							value={currentPassword}
							visible={visiblePasswords.current}
						/>
						<PasswordField
							autoComplete="new-password"
							label="Новый пароль"
							onChange={setNewPassword}
							onToggleVisibility={() => setVisiblePasswords((value) => ({ ...value, next: !value.next }))}
							value={newPassword}
							visible={visiblePasswords.next}
						/>
						<PasswordField
							autoComplete="new-password"
							label="Повторите новый пароль"
							onChange={setNewPasswordConfirmation}
							onToggleVisibility={() => setVisiblePasswords((value) => ({
								...value,
								confirmation: !value.confirmation,
							}))}
							value={newPasswordConfirmation}
							visible={visiblePasswords.confirmation}
						/>
						<p className="muted account-password-rules">
							Минимум 8 символов, строчная и заглавная буква, цифра.
						</p>
						{!online ? <p className="muted">Нет сети: смена пароля недоступна.</p> : null}
						{localError ? <p className="form-error">{localError}</p> : null}
						{mutation.isError ? <p className="form-error">{toUserErrorMessage(mutation.error.message)}</p> : null}
						<div className="form-actions">
							<Dialog.Close className="secondary-button" disabled={mutation.isPending} type="button">
								Отмена
							</Dialog.Close>
							<button className="primary-button" disabled={submitDisabled} type="submit">
								Сохранить
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function PasswordField({
	autoComplete,
	label,
	onChange,
	onToggleVisibility,
	value,
	visible,
}: {
	autoComplete: "current-password" | "new-password";
	label: string;
	onChange: (value: string) => void;
	onToggleVisibility: () => void;
	value: string;
	visible: boolean;
}) {
	return (
		<label className="field">
			<span>{label}</span>
			<div className="input-shell password-input-shell">
				<input
					autoComplete={autoComplete}
					onChange={(event) => onChange(event.target.value)}
					required
					type={visible ? "text" : "password"}
					value={value}
				/>
				<button
					aria-label={visible ? `Скрыть поле: ${label}` : `Показать поле: ${label}`}
					className="password-toggle"
					onClick={onToggleVisibility}
					type="button"
				>
					{visible ? <EyeOff aria-hidden size={17} /> : <Eye aria-hidden size={17} />}
				</button>
			</div>
		</label>
	);
}

function passwordFormError(currentPassword: string, newPassword: string, confirmation: string): string {
	if (!currentPassword || !newPassword || !confirmation) {
		return "";
	}

	if (newPassword.length < 8) {
		return "Новый пароль должен быть не короче 8 символов.";
	}

	if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
		return "Добавьте строчную и заглавную букву, а также цифру.";
	}

	if (currentPassword === newPassword) {
		return "Новый пароль должен отличаться от текущего.";
	}

	if (newPassword !== confirmation) {
		return "Пароли не совпадают.";
	}

	return "";
}
