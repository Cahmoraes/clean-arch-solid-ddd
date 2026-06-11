import { render } from "@testing-library/react"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { describe, expect, test } from "vitest"

describe("Fontes VOLT (mock next/font/google)", () => {
	test("expõe as três variáveis de fonte VOLT", () => {
		const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
		const grotesk = Space_Grotesk({
			subsets: ["latin"],
			variable: "--font-space-grotesk",
		})
		const mono = JetBrains_Mono({
			subsets: ["latin"],
			variable: "--font-jetbrains-mono",
		})
		expect(inter.variable).toBe("--font-inter")
		expect(grotesk.variable).toBe("--font-space-grotesk")
		expect(mono.variable).toBe("--font-jetbrains-mono")
	})
	test("aplica as três variáveis de fonte juntas em um elemento", () => {
		const grotesk = Space_Grotesk({
			subsets: ["latin"],
			variable: "--font-space-grotesk",
		})
		const { container } = render(<div className={grotesk.variable}>volt</div>)
		expect(container.firstChild).toHaveClass("--font-space-grotesk")
	})
})
