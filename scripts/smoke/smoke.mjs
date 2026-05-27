const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3001";

const checks = [
	["api health", `${apiBaseUrl}/health`],
	["web home", webBaseUrl],
];

for (const [name, url] of checks) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`${name} failed: ${response.status} ${response.statusText}`);
	}
	console.log(`${name} ok`);
}
