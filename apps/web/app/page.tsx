import type { Metadata } from "next";
import { AppRoot } from "../src/app-shell/AppRoot";

export const metadata: Metadata = {
	title: "Бухта CRM",
	description: "Рабочий контур учета продаж, остатков, производства и возвратов.",
};

export default function HomePage() {
	return <AppRoot />;
}
