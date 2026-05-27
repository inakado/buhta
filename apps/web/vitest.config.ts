import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		include: ["app/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"]
	}
});
