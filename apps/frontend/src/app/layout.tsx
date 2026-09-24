import type { Metadata } from "next"
import { Inter, JetBrains_Mono, VT323 } from "next/font/google"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
import { WebVitalsReporter } from "./web-vitals"
import "./globals.css"

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
})

const vt323 = VT323({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-vt323",
	display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
})

export const metadata: Metadata = {
	title: "VOLT — Plataforma de acesso a academias",
	description:
		"VOLT — treine onde você estiver. Acesso a academias e check-ins.",
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
			className={`${inter.variable} ${vt323.variable} ${jetbrainsMono.variable}`}
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
				</ThemeProvider>
			</body>
		</html>
	)
}
