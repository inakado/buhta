"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, RotateCcw, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { ROLES, type Role, type UserSummary } from "@buhta/shared";
import { createUser, listUsers, resetUserPassword, updateUserRole, type CurrentActor } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";

export function AdminUsersHome({ actor, online }: { actor: CurrentActor; online: boolean }) {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [resetTarget, setResetTarget] = useState<UserSummary | null>(null);
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
	const users = useQuery({
		queryKey: ["users"],
		queryFn: listUsers,
	});
	const visibleUsers = users.data?.users.filter((user) => user.id !== actor.userId) ?? [];
	const resetPassword = useMutation({
		mutationFn: (user: UserSummary) => resetUserPassword(user.id),
		onSuccess: async (data) => {
			setResetTarget(null);
			setTemporaryPassword(data.temporaryPassword);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	return (
		<section className="screen-stack admin-users-home management-surface">
			<div className="section-heading admin-users-heading">
				<div>
					<h2>Пользователи</h2>
					<span>{users.isFetching ? "Обновление" : `${visibleUsers.length} сотрудников`}</span>
				</div>
				<button
					className="secondary-button compact-button admin-create-button"
					disabled={!online}
					onClick={() => setCreateOpen(true)}
					title={online ? undefined : "Нет сети: создание недоступно"}
					type="button"
				>
					<Plus aria-hidden size={16} />
					Новый
				</button>
			</div>

			<CreateUserDialog
				onOpenChange={setCreateOpen}
				onTemporaryPassword={setTemporaryPassword}
				online={online}
				open={createOpen}
			/>

			{temporaryPassword ? (
				<TemporaryPasswordNotice
					onClose={() => setTemporaryPassword(null)}
					password={temporaryPassword}
				/>
			) : null}

			<UserAccessList
				loading={users.isLoading}
				onResetPassword={setResetTarget}
				online={online}
				users={visibleUsers}
				error={users.isError ? users.error.message : ""}
			/>

			<ResetPasswordDialog
				error={resetPassword.isError ? resetPassword.error.message : null}
				onConfirm={() => {
					if (resetTarget) {
						resetPassword.mutate(resetTarget);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setResetTarget(null);
						resetPassword.reset();
					}
				}}
				online={online}
				pending={resetPassword.isPending}
				user={resetTarget}
			/>
		</section>
	);
}

function CreateUserDialog({
	onOpenChange,
	onTemporaryPassword,
	online,
	open,
}: {
	onOpenChange: (open: boolean) => void;
	onTemporaryPassword: (password: string) => void;
	online: boolean;
	open: boolean;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [login, setLogin] = useState("");
	const [role, setRole] = useState<Role>("courier");
	const mutation = useMutation({
		mutationFn: createUser,
		onSuccess: async (data) => {
			onTemporaryPassword(data.temporaryPassword);
			setName("");
			setLogin("");
			setRole("courier");
			onOpenChange(false);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		mutation.mutate({
			name,
			role,
			...(login.trim() ? { login } : {}),
		});
	}

	function resetForm() {
		setName("");
		setLogin("");
		setRole("courier");
	}

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					mutation.reset();
					resetForm();
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content aria-describedby={undefined} className="operation-dialog admin-user-dialog">
					<div className="operation-dialog-heading">
						<Dialog.Title>Новый сотрудник</Dialog.Title>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<form className="operation-dialog-form" onSubmit={handleSubmit}>
						<label className="field">
							<span>Имя</span>
							<input onChange={(event) => setName(event.target.value)} required type="text" value={name} />
						</label>
						<label className="field">
							<span>Логин</span>
							<input
								onChange={(event) => setLogin(event.target.value)}
								placeholder="можно оставить пустым"
								type="text"
								value={login}
							/>
						</label>
						<label className="field">
							<span>Роль</span>
							<select onChange={(event) => setRole(event.target.value as Role)} value={role}>
								{ROLES.map((roleValue) => (
									<option key={roleValue} value={roleValue}>
										{ROLE_LABELS[roleValue]}
									</option>
								))}
							</select>
						</label>
						{!online ? <p className="muted">Нет сети: создание недоступно.</p> : null}
						{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
						<div className="form-actions">
							<Dialog.Close className="secondary-button" disabled={mutation.isPending} type="button">
								Отмена
							</Dialog.Close>
							<button className="primary-button" disabled={!online || mutation.isPending} type="submit">
								<Plus aria-hidden size={18} />
								Создать
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function TemporaryPasswordNotice({
	onClose,
	password,
}: {
	onClose: () => void;
	password: string;
}) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard?.writeText(password);
		setCopied(true);
	}

	return (
		<div className="admin-password-notice">
			<KeyRound aria-hidden size={18} />
			<div>
				<p>Временный пароль</p>
				<strong>{password}</strong>
			</div>
			<button className="secondary-button compact-button" onClick={handleCopy} type="button">
				<Copy aria-hidden size={15} />
				{copied ? "Скопирован" : "Копировать"}
			</button>
			<button
				aria-label="Скрыть временный пароль"
				className="secondary-icon-button"
				onClick={onClose}
				type="button"
			>
				<X aria-hidden size={16} />
			</button>
		</div>
	);
}

function UserAccessList({
	error,
	loading,
	onResetPassword,
	online,
	users,
}: {
	error: string;
	loading: boolean;
	onResetPassword: (user: UserSummary) => void;
	online: boolean;
	users: UserSummary[];
}) {
	if (loading) {
		return <p className="muted">Загрузка пользователей</p>;
	}

	if (error) {
		return <p className="form-error">{error}</p>;
	}

	if (users.length === 0) {
		return <p className="muted">Сотрудников пока нет</p>;
	}

	return (
		<div className="admin-access-list">
			<div className="admin-access-head" aria-hidden>
				<span>Сотрудник</span>
				<span>Доступ</span>
			</div>
			{users.map((user) => (
				<UserAccessRow
					key={user.id}
					onResetPassword={onResetPassword}
					online={online}
					user={user}
				/>
			))}
		</div>
	);
}

function UserAccessRow({
	user,
	onResetPassword,
	online,
}: {
	user: UserSummary;
	onResetPassword: (user: UserSummary) => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const updateRole = useMutation({
		mutationFn: (role: Role) => updateUserRole(user.id, role),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	return (
		<div className="admin-access-row">
			<div className="admin-user-identity">
				<strong>{user.name}</strong>
				<span>@{user.login}</span>
			</div>
			<div className="admin-user-controls">
				<select
					aria-label={`Роль ${user.name}`}
					disabled={!online || updateRole.isPending}
					onChange={(event) => updateRole.mutate(event.target.value as Role)}
					value={user.role}
				>
					{ROLES.map((roleValue) => (
						<option key={roleValue} value={roleValue}>
							{ROLE_LABELS[roleValue]}
						</option>
					))}
				</select>
				<button
					aria-label={`Сбросить пароль ${user.name}`}
					className="secondary-icon-button"
					disabled={!online}
					onClick={() => onResetPassword(user)}
					title={online ? "Сбросить пароль" : "Нет сети: сброс недоступен"}
					type="button"
				>
					<RotateCcw aria-hidden size={18} />
				</button>
			</div>
			{updateRole.isError ? <p className="form-error admin-row-error">{updateRole.error.message}</p> : null}
		</div>
	);
}

function ResetPasswordDialog({
	error,
	onConfirm,
	onOpenChange,
	online,
	pending,
	user,
}: {
	error: string | null;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	online: boolean;
	pending: boolean;
	user: UserSummary | null;
}) {
	return (
		<Dialog.Root open={Boolean(user)} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog admin-user-dialog">
					<div className="operation-dialog-heading">
						<div>
							<Dialog.Title>Сбросить пароль</Dialog.Title>
							{user ? (
								<Dialog.Description>
									{user.name} · @{user.login}
								</Dialog.Description>
							) : null}
						</div>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					{!online ? <p className="muted">Нет сети: сброс недоступен.</p> : null}
					{error ? <p className="form-error">{error}</p> : null}
					<div className="form-actions">
						<Dialog.Close className="secondary-button" disabled={pending} type="button">
							Отмена
						</Dialog.Close>
						<button className="primary-button" disabled={!online || pending || !user} onClick={onConfirm} type="button">
							<RotateCcw aria-hidden size={18} />
							Сбросить
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
