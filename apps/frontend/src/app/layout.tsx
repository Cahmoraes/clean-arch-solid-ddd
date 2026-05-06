import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { ThemeToggleFAB } from "@/components/ui/theme-toggle-fab"
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
		<html lang="pt-BR" suppressHydrationWarning>
			<body className="font-sans antialiased bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					disableTransitionOnChange
				>
					<WebVitalsReporter />
					<Providers>{children}</Providers>
					<Toaster />
					<ThemeToggleFAB />
				</ThemeProvider>
			</body>
		</html>
	)
}
