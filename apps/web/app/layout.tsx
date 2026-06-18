import "./globals.css";
import type { Metadata, Viewport } from "next";
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
	icons: {
		icon: [
			{ url: "/icon.svg", type: "image/svg+xml" },
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru">
			<body>{children}</body>
		</html>
	);
}
