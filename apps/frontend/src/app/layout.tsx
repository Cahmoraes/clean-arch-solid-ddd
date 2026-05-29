import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { ThemeToggleFAB } from "@/components/ui/theme-toggle-fab"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
import { WebVitalsReporter } from "./web-vitals"
import "./globals.css"

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
})

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
	display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
})

export const metadata: Metadata = {
	title: "GymPass-like",
	description: "Plataforma de acesso a academias",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode
}>) {
	return (
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
		>
			<body className="font-sans antialiased bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
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
