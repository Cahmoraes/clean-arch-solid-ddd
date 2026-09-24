import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render } from "@testing-library/react"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { describe, expect, test } from "vitest"

// vitest roda a partir de apps/frontend; import.meta.url não é file: neste ambiente
const css = readFileSync(resolve("src/app/globals.css"), "utf8")
const designDoc = readFileSync(resolve("DESIGN.md"), "utf8")

const REQUIRED_COLOR_TOKENS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-strong",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"highlight-foreground",
	"subtle",
	"accent",
	"accent-foreground",
	"surface",
	"surface-2",
	"surface-3",
	"selected-tint",
	"success",
	"warning",
	"destructive",
	"destructive-foreground",
	"border",
	"border-strong",
	"input",
	"ring",
	"sidebar",
	"sidebar-foreground",
	"sidebar-muted",
	"sidebar-border",
	"sidebar-active",
	"sidebar-active-foreground",
] as const

function blockOf(selectorSource: string): string {
	const body = css.match(new RegExp(`${selectorSource}\\s*\\{([^}]*)\\}`))?.[1]
	if (body === undefined) {
		throw new Error(`Bloco ${selectorSource} não encontrado em globals.css`)
	}
	return body
}

function tokenOf(block: string, name: string): string | undefined {
	return block.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim()
}

const lightBlock = blockOf("@theme")
const darkBlock = blockOf("\\.dark")

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

describe("Tokens Noite neon (globals.css)", () => {
	test("define todos os tokens de cor obrigatórios no tema claro", () => {
		for (const name of REQUIRED_COLOR_TOKENS) {
			expect(tokenOf(lightBlock, name), `claro: --color-${name}`).toBeDefined()
		}
	})

	test("define todos os tokens de cor obrigatórios no tema escuro", () => {
		for (const name of REQUIRED_COLOR_TOKENS) {
			expect(tokenOf(darkBlock, name), `escuro: --color-${name}`).toBeDefined()
		}
	})

	test("tema escuro: fundo azul-petróleo, primary magenta, acento ciano e texto off-white frio", () => {
		expect(tokenOf(darkBlock, "background")).toBe("#0a1424")
		expect(tokenOf(darkBlock, "primary")).toBe("#ff3ea5")
		expect(tokenOf(darkBlock, "primary-foreground")).toBe("#0a1424")
		expect(tokenOf(darkBlock, "accent")).toBe("#3ee0ff")
		expect(tokenOf(darkBlock, "foreground")).toBe("#dbe9f7")
	})

	test("tema claro dia de neblina: fundo frio claro com magenta e ciano escurecidos", () => {
		expect(tokenOf(lightBlock, "background")).toBe("#f3f6fa")
		expect(tokenOf(lightBlock, "primary")).toBe("#cc0077")
		expect(tokenOf(lightBlock, "accent")).toBe("#00708a")
	})

	test("a barra lateral é escura nos dois temas", () => {
		expect(tokenOf(lightBlock, "sidebar")).toBe("#0b1626")
		expect(tokenOf(darkBlock, "sidebar")).toBe("#0b1626")
	})

	test("nenhum text-shadow: glow nunca em texto", () => {
		expect(css).not.toContain("text-shadow")
	})

	test("glow existe só como sombra de forma (--shadow-glow)", () => {
		expect(lightBlock).toContain("--shadow-glow:")
	})

	test("mantém o anel de foco duplo e as três fontes", () => {
		expect(css).toContain("@utility focus-ring-duplo")
		expect(lightBlock).toContain("--font-display:")
		expect(lightBlock).toContain("--font-sans:")
		expect(lightBlock).toContain("--font-mono:")
	})

	test("não restou o verde VOLT antigo em globals.css", () => {
		expect(css).not.toContain("#39e58c")
		expect(css).not.toContain("verde-esmeralda")
	})
})

describe("DESIGN.md sincronizado com os tokens", () => {
	test("documenta os valores novos e não o verde antigo", () => {
		for (const hex of [
			"#0a1424",
			"#ff3ea5",
			"#3ee0ff",
			"#f3f6fa",
			"#cc0077",
			"#00708a",
		]) {
			expect(designDoc).toContain(hex)
		}
		expect(designDoc).not.toContain("#39e58c")
	})
})
