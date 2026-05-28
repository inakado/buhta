"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { KeyRound, Plus, RotateCcw, Users } from "lucide-react";
import { ROLES, type Role } from "@buhta/shared";
import { createUser, listUsers, resetUserPassword, updateUserRole, type CurrentActor } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";

export function AdminHome({ actor }: { actor: CurrentActor }) {
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
	const users = useQuery({
		queryKey: ["users"],
		queryFn: listUsers,
	});
	const visibleUsers = users.data?.users.filter((user) => user.id !== actor.userId) ?? [];

	return (
		<section className="screen-stack">
			<div className="summary-card">
				<div>
					<p className="summary-label">Администрирование</p>
					<strong>Пользователи и доступы</strong>
				</div>
				<Users aria-hidden size={28} />
			</div>

			<CreateUserPanel onTemporaryPassword={setTemporaryPassword} />

			{temporaryPassword ? (
				<div className="notice-card">
					<KeyRound aria-hidden size={18} />
					<div>
						<p>Временный пароль</p>
						<strong>{temporaryPassword}</strong>
					</div>
				</div>
			) : null}

			<div className="section-heading">
				<h2>Сотрудники</h2>
				{users.isFetching ? <span>Обновление</span> : null}
			</div>

			<div className="list-stack">
				{visibleUsers.map((user) => (
					<UserListItem
						key={user.id}
						onTemporaryPassword={setTemporaryPassword}
						user={user}
					/>
				))}
				{users.isLoading ? <p className="muted">Загрузка пользователей</p> : null}
				{!users.isLoading && !users.isError && visibleUsers.length === 0 ? (
					<p className="muted">Сотрудников пока нет</p>
				) : null}
				{users.isError ? <p className="form-error">{users.error.message}</p> : null}
			</div>
		</section>
	);
}

function CreateUserPanel({ onTemporaryPassword }: { onTemporaryPassword: (password: string) => void }) {
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
		<form className="form-panel" onSubmit={handleSubmit}>
			<div className="section-heading compact">
				<h2>Новый сотрудник</h2>
				<Plus aria-hidden size={18} />
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

function UserListItem({
	user,
	onTemporaryPassword,
}: {
	user: Awaited<ReturnType<typeof listUsers>>["users"][number];
	onTemporaryPassword: (password: string) => void;
}) {
	const queryClient = useQueryClient();
	const updateRole = useMutation({
		mutationFn: (role: Role) => updateUserRole(user.id, role),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});
	const resetPassword = useMutation({
		mutationFn: () => resetUserPassword(user.id),
		onSuccess: async (data) => {
			onTemporaryPassword(data.temporaryPassword);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	return (
		<article className="entity-card">
			<div>
				<strong>{user.name}</strong>
				<p>@{user.login}</p>
			</div>
			<div className="entity-actions">
				<select
					aria-label={`Роль ${user.name}`}
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
					className="secondary-icon-button"
					disabled={resetPassword.isPending}
					onClick={() => resetPassword.mutate()}
					type="button"
					aria-label={`Сбросить пароль ${user.name}`}
					title="Сбросить пароль"
				>
					<RotateCcw aria-hidden size={18} />
				</button>
			</div>
		</article>
	);
}
