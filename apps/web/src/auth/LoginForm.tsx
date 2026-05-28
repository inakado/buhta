"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { signIn } from "../lib/api-client";

export function LoginForm() {
	const queryClient = useQueryClient();
	const [login, setLogin] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const mutation = useMutation({
		mutationFn: signIn,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["current-actor"] });
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		mutation.mutate({ login, password });
	}

	return (
		<main className="login-page">
			<section className="login-panel" aria-label="Вход в Бухта CRM">
				<p className="eyebrow">Бухта CRM</p>

				<form className="form-stack" onSubmit={handleSubmit}>
					<label className="field">
						<span>Логин</span>
						<div className="input-shell">
							<UserRound aria-hidden size={18} />
							<input
								autoComplete="username"
								name="username"
								onChange={(event) => setLogin(event.target.value)}
								required
								type="text"
								value={login}
							/>
						</div>
					</label>

					<label className="field">
						<span>Пароль</span>
						<div className="input-shell">
							<LockKeyhole aria-hidden size={18} />
							<input
								autoComplete="current-password"
								name="password"
								onChange={(event) => setPassword(event.target.value)}
								required
								type={showPassword ? "text" : "password"}
								value={password}
							/>
							<button
								aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
								className="password-toggle"
								onClick={() => setShowPassword((value) => !value)}
								type="button"
							>
								{showPassword ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
							</button>
						</div>
					</label>

					{mutation.isError ? <p className="form-error">{mutation.error.message}</p> : null}

					<button className="primary-button" disabled={mutation.isPending} type="submit">
						<LogIn aria-hidden size={18} />
						{mutation.isPending ? "Входим" : "Войти"}
					</button>
				</form>
			</section>
		</main>
	);
}
