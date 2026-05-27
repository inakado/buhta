import { HEALTH_RESPONSE_STATUS } from "@buhta/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default async function HomePage() {
	let apiStatus = "unknown";

	try {
		const response = await fetch(`${apiBaseUrl}/health`, {
			cache: "no-store",
		});
		const data = (await response.json()) as { status?: string };
		apiStatus = data.status ?? "invalid";
	} catch {
		apiStatus = "unreachable";
	}

	const isHealthy = apiStatus === HEALTH_RESPONSE_STATUS;

	return (
		<main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
			<section className="mx-auto flex max-w-5xl flex-col gap-6">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
						Foundation
					</p>
					<h1 className="mt-2 text-3xl font-semibold">Бухта CRM</h1>
					<p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
						Минимальный каркас приложения поднят: Next.js web, NestJS API,
						shared contracts и Postgres-ready backend.
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					<Status label="Web" value="ok" positive />
					<Status label="API" value={apiStatus} positive={isHealthy} />
					<Status label="Shared" value={HEALTH_RESPONSE_STATUS} positive />
				</div>
			</section>
		</main>
	);
}

function Status({
	label,
	value,
	positive,
}: {
	label: string;
	value: string;
	positive: boolean;
}) {
	return (
		<div className="rounded border border-slate-200 bg-white p-4">
			<div className="text-sm text-slate-500">{label}</div>
			<div className={positive ? "text-lg font-semibold text-emerald-700" : "text-lg font-semibold text-rose-700"}>
				{value}
			</div>
		</div>
	);
}
