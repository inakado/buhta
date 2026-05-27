import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";

export default [
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"**/dist/**",
			".next/**",
			"**/.next/**",
			"**/.turbo/**",
			"apps/api/src/generated/**",
			"coverage/**"
		]
	},
	{
		files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: {
			"@typescript-eslint": tseslint,
			boundaries
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
			]
		}
	}
];
