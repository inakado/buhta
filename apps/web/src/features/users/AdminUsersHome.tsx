"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, RotateCcw, Search, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ROLES, type Role, type UserSummary } from "@buhta/shared";
import { createUser, listUsers, resetUserPassword, updateUserRole, type CurrentActor } from "../../lib/api-client";
import { ROLE_LABELS } from "../../lib/role-labels";

type RoleFilter = "all" | Role;

type RoleChangeRequest = {
	role: Role;
	user: UserSummary;
};

export function AdminUsersHome({
	actor,
	onActionSuccess,
	online,
}: {
	actor: CurrentActor;
	onActionSuccess: (message: string) => void;
	online: boolean;
}) {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [resetTarget, setResetTarget] = useState<UserSummary | null>(null);
	const [roleChangeRequest, setRoleChangeRequest] = useState<RoleChangeRequest | null>(null);
	const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
	const [searchDraft, setSearchDraft] = useState("");
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
	const {
		data: users,
		error: usersError,
		isError: usersIsError,
		isFetching: usersFetching,
		isLoading: usersLoading,
	} = useQuery({
		queryKey: ["users"],
		queryFn: listUsers,
	});
	const visibleUsers = useMemo(
		() => users?.users.filter((user) => user.id !== actor.userId) ?? [],
		[actor.userId, users],
	);
	const filteredUsers = useMemo(
		() => filterUsers(visibleUsers, searchDraft, roleFilter),
		[roleFilter, searchDraft, visibleUsers],
	);
	const hasActiveFilters = Boolean(searchDraft.trim()) || roleFilter !== "all";
	const resetPassword = useMutation({
		mutationFn: (user: UserSummary) => resetUserPassword(user.id),
		onSuccess: async (data) => {
			setResetTarget(null);
			setTemporaryPassword(data.temporaryPassword);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});
	const updateRole = useMutation({
		mutationFn: ({ role, user }: RoleChangeRequest) => updateUserRole(user.id, role),
		onSuccess: async () => {
			setRoleChangeRequest(null);
			onActionSuccess("Роль изменена");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
	});

	async function copyLogin(login: string) {
		await window.navigator.clipboard?.writeText(login);
		onActionSuccess("Логин скопирован");
	}

	return (
		<section className="screen-stack admin-users-home management-surface">
			<div className="section-heading compact admin-users-heading">
				<h2>Пользователи</h2>
				<div className="admin-users-heading-side">
					<span>{usersFetching ? "Обновление" : formatUsersCount(filteredUsers.length, visibleUsers.length, hasActiveFilters)}</span>
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
			</div>

			<CreateUserDialog
				onOpenChange={setCreateOpen}
				onTemporaryPassword={setTemporaryPassword}
				online={online}
				open={createOpen}
			/>

			<div className="admin-users-toolbar" aria-label="Фильтры пользователей">
				<label className="field admin-users-search">
					<span>Поиск</span>
					<div className="input-shell">
						<Search aria-hidden size={17} />
						<input
							aria-label="Поиск пользователей"
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Имя или login"
							type="search"
							value={searchDraft}
						/>
						{searchDraft ? (
							<button
								aria-label="Очистить поиск пользователей"
								className="secondary-icon-button"
								onClick={() => setSearchDraft("")}
								type="button"
							>
								<X aria-hidden size={15} />
							</button>
						) : null}
					</div>
				</label>
				<label className="field admin-users-role-filter">
					<span>Роль</span>
					<select
						aria-label="Фильтр роли"
						onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
						value={roleFilter}
					>
						<option value="all">Все роли</option>
						{ROLES.map((roleValue) => (
							<option key={roleValue} value={roleValue}>
								{ROLE_LABELS[roleValue]}
							</option>
						))}
					</select>
				</label>
			</div>

			{temporaryPassword ? (
				<TemporaryPasswordNotice
					onClose={() => setTemporaryPassword(null)}
					password={temporaryPassword}
				/>
			) : null}

			<UserAccessList
				loading={usersLoading}
				onCopyLogin={copyLogin}
				onResetPassword={setResetTarget}
				onRoleChangeRequest={setRoleChangeRequest}
				online={online}
				roleChangePending={updateRole.isPending}
				users={filteredUsers}
				error={usersIsError ? usersError.message : ""}
				hasActiveFilters={hasActiveFilters}
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

			<RoleChangeDialog
				error={updateRole.isError ? updateRole.error.message : null}
				onConfirm={() => {
					if (roleChangeRequest) {
						updateRole.mutate(roleChangeRequest);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setRoleChangeRequest(null);
						updateRole.reset();
					}
				}}
				online={online}
				pending={updateRole.isPending}
				request={roleChangeRequest}
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
	hasActiveFilters,
	loading,
	onCopyLogin,
	onResetPassword,
	onRoleChangeRequest,
	online,
	roleChangePending,
	users,
}: {
	error: string;
	hasActiveFilters: boolean;
	loading: boolean;
	onCopyLogin: (login: string) => void;
	onResetPassword: (user: UserSummary) => void;
	onRoleChangeRequest: (request: RoleChangeRequest) => void;
	online: boolean;
	roleChangePending: boolean;
	users: UserSummary[];
}) {
	if (loading) {
		return <p className="muted">Загрузка пользователей</p>;
	}

	if (error) {
		return <p className="form-error">{error}</p>;
	}

	if (users.length === 0) {
		return <p className="muted">{hasActiveFilters ? "Сотрудников по выбранным условиям нет." : "Сотрудников пока нет"}</p>;
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
					onCopyLogin={onCopyLogin}
					onResetPassword={onResetPassword}
					onRoleChangeRequest={onRoleChangeRequest}
					online={online}
					roleChangePending={roleChangePending}
					user={user}
				/>
			))}
		</div>
	);
}

function UserAccessRow({
	user,
	onCopyLogin,
	onResetPassword,
	onRoleChangeRequest,
	online,
	roleChangePending,
}: {
	user: UserSummary;
	onCopyLogin: (login: string) => void;
	onResetPassword: (user: UserSummary) => void;
	onRoleChangeRequest: (request: RoleChangeRequest) => void;
	online: boolean;
	roleChangePending: boolean;
}) {
	return (
		<div className="admin-access-row">
			<div className="admin-user-identity">
				<strong>{user.name}</strong>
				<span>@{user.login}</span>
			</div>
			<div className="admin-user-controls">
				<select
					aria-label={`Роль ${user.name}`}
					disabled={!online || roleChangePending}
					onChange={(event) => {
						const role = event.target.value as Role;

						if (role !== user.role) {
							onRoleChangeRequest({ role, user });
						}
					}}
					value={user.role}
				>
					{ROLES.map((roleValue) => (
						<option key={roleValue} value={roleValue}>
							{ROLE_LABELS[roleValue]}
						</option>
					))}
				</select>
				<button
					aria-label={`Скопировать логин ${user.name}`}
					className="secondary-icon-button"
					onClick={() => onCopyLogin(user.login)}
					title="Скопировать login"
					type="button"
				>
					<Copy aria-hidden size={18} />
				</button>
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
		</div>
	);
}

function RoleChangeDialog({
	error,
	onConfirm,
	onOpenChange,
	online,
	pending,
	request,
}: {
	error: string | null;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	online: boolean;
	pending: boolean;
	request: RoleChangeRequest | null;
}) {
	return (
		<Dialog.Root open={Boolean(request)} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="operation-dialog-overlay" />
				<Dialog.Content className="operation-dialog admin-user-dialog">
					<div className="operation-dialog-heading">
						<div>
							<Dialog.Title>Изменить роль</Dialog.Title>
							{request ? (
								<Dialog.Description>
									{request.user.name} · {ROLE_LABELS[request.user.role]} → {ROLE_LABELS[request.role]}
								</Dialog.Description>
							) : null}
						</div>
						<Dialog.Close aria-label="Закрыть" className="icon-button" type="button">
							<X aria-hidden size={18} />
						</Dialog.Close>
					</div>
					<p className="muted">
						После изменения сотрудник получит доступы новой роли.
					</p>
					{!online ? <p className="muted">Нет сети: изменение роли недоступно.</p> : null}
					{error ? <p className="form-error">{error}</p> : null}
					<div className="form-actions">
						<Dialog.Close className="secondary-button" disabled={pending} type="button">
							Отмена
						</Dialog.Close>
						<button className="primary-button" disabled={!online || pending || !request} onClick={onConfirm} type="button">
							Изменить
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
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

function filterUsers(users: UserSummary[], searchDraft: string, roleFilter: RoleFilter): UserSummary[] {
	const search = searchDraft.trim().toLowerCase();

	return users.filter((user) => {
		const matchesRole = roleFilter === "all" || user.role === roleFilter;
		const matchesSearch = !search || `${user.name} ${user.login}`.toLowerCase().includes(search);

		return matchesRole && matchesSearch;
	});
}

function formatUsersCount(count: number, total: number, filtered: boolean): string {
	if (filtered) {
		return `${count} из ${total}`;
	}

	return `${total} сотрудников`;
}
