"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, RotateCcw, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { ROLES, type Role, type UserSummary } from "@buhta/shared";
import { createUser, listUsers, resetUserPassword, updateUserRole, type CurrentActor } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";

export function AdminUsersHome({ actor }: { actor: CurrentActor }) {
	const [createOpen, setCreateOpen] = useState(false);
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
	const users = useQuery({
		queryKey: ["users"],
		queryFn: listUsers,
	});
	const visibleUsers = users.data?.users.filter((user) => user.id !== actor.userId) ?? [];

	return (
		<section className="screen-stack admin-users-home">
			<div className="section-heading admin-users-heading">
				<div>
					<h2>Пользователи</h2>
					<span>{users.isFetching ? "Обновление" : `${visibleUsers.length} сотрудников`}</span>
				</div>
				<button
					className="secondary-button compact-button admin-create-button"
					onClick={() => setCreateOpen((current) => !current)}
					type="button"
				>
					{createOpen ? <X aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
					{createOpen ? "Закрыть" : "Новый"}
				</button>
			</div>

			{createOpen ? (
				<CreateUserPanel
					onCreated={() => setCreateOpen(false)}
					onTemporaryPassword={setTemporaryPassword}
				/>
			) : null}

			{temporaryPassword ? (
				<TemporaryPasswordNotice
					onClose={() => setTemporaryPassword(null)}
					password={temporaryPassword}
				/>
			) : null}

			<UserAccessList
				loading={users.isLoading}
				onTemporaryPassword={setTemporaryPassword}
				users={visibleUsers}
				error={users.isError ? users.error.message : ""}
			/>
		</section>
	);
}

function CreateUserPanel({
	onCreated,
	onTemporaryPassword,
}: {
	onCreated: () => void;
	onTemporaryPassword: (password: string) => void;
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
			onCreated();
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

	return (
		<form className="form-panel admin-create-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>Новый сотрудник</h2>
			</div>
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
			{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}
			<button className="primary-button" disabled={mutation.isPending} type="submit">
				<Plus aria-hidden size={18} />
				Создать
			</button>
		</form>
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
	onTemporaryPassword,
	users,
}: {
	error: string;
	loading: boolean;
	onTemporaryPassword: (password: string) => void;
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
					onTemporaryPassword={onTemporaryPassword}
					user={user}
				/>
			))}
		</div>
	);
}

function UserAccessRow({
	user,
	onTemporaryPassword,
}: {
	user: UserSummary;
	onTemporaryPassword: (password: string) => void;
}) {
	const queryClient = useQueryClient();
	const [confirmReset, setConfirmReset] = useState(false);
	const updateRole = useMutation({
		mutationFn: (role: Role) => updateUserRole(user.id, role),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});
	const resetPassword = useMutation({
		mutationFn: () => resetUserPassword(user.id),
		onSuccess: async (data) => {
			setConfirmReset(false);
			onTemporaryPassword(data.temporaryPassword);
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
					disabled={updateRole.isPending}
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
					disabled={resetPassword.isPending}
					onClick={() => setConfirmReset((current) => !current)}
					title="Сбросить пароль"
					type="button"
				>
					<RotateCcw aria-hidden size={18} />
				</button>
			</div>
			{confirmReset ? (
				<div className="admin-reset-confirm">
					<span>Сбросить пароль?</span>
					<button
						className="secondary-button compact-button"
						disabled={resetPassword.isPending}
						onClick={() => resetPassword.mutate()}
						type="button"
					>
						Подтвердить
					</button>
				</div>
			) : null}
		</div>
	);
}
