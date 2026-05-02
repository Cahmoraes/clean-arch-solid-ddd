import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
import { WebVitalsReporter } from "./web-vitals"
import "./globals.css"

export const metadata: Metadata = {
	title: "GymPass-like",
	description: "Frontend monocromático inspirado em Ollama",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode
}>) {
	return (
		<html lang="pt-BR">
			<body className="font-sans antialiased bg-pure-white text-pure-black">
				<WebVitalsReporter />
				<Providers>{children}</Providers>
				<Toaster />
			</body>
		</html>
	)
}
