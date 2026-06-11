import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Бухта CRM",
		short_name: "Бухта",
		description: "Внутренняя CRM для учета продукции, продаж и наличных.",
		start_url: "/",
		display: "standalone",
		background_color: "#FFFFFF",
		theme_color: "#4AB855",
		icons: [
			{
				src: "/icon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "maskable",
			},
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
