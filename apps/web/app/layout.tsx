import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Бухта CRM",
	description: "Внутренняя CRM для учета продукции, продаж и наличных.",
	applicationName: "Бухта",
	appleWebApp: {
		capable: true,
		title: "Бухта",
		statusBarStyle: "default",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru">
			<body>{children}</body>
		</html>
	);
}
