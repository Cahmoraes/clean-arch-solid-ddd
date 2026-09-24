import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render } from "@testing-library/react"
import { Inter, JetBrains_Mono, VT323 } from "next/font/google"
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

function balancedBlockFrom(source: string, start: number): string {
	const openIndex = source.indexOf("{", start)
	let depth = 0
	const closeOffset = [...source.slice(openIndex)].findIndex((char) => {
		if (char === "{") depth++
		if (char === "}") depth--
		return depth === 0
	})
	if (closeOffset === -1) {
		throw new Error(`Bloco balanceado não fechado a partir de ${start}`)
	}
	return source.slice(start, openIndex + closeOffset + 1)
}

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
		const vt323 = VT323({
			weight: "400",
			subsets: ["latin"],
			variable: "--font-vt323",
		})
		const mono = JetBrains_Mono({
			subsets: ["latin"],
			variable: "--font-jetbrains-mono",
		})
		expect(inter.variable).toBe("--font-inter")
		expect(vt323.variable).toBe("--font-vt323")
		expect(mono.variable).toBe("--font-jetbrains-mono")
	})
	test("aplica as três variáveis de fonte juntas em um elemento", () => {
		const vt323 = VT323({
			weight: "400",
			subsets: ["latin"],
			variable: "--font-vt323",
		})
		const { container } = render(<div className={vt323.variable}>volt</div>)
		expect(container.firstChild).toHaveClass("--font-vt323")
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
		expect(tokenOf(lightBlock, "accent")).toBe("#006c85")
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

	test("--font-display referencia VT323 com fallback monoespaçado, e --font-space-grotesk não existe mais no CSS", () => {
		expect(lightBlock).toMatch(
			/--font-display:\s*var\(--font-vt323\),\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*monospace;/,
		)
		expect(lightBlock).toContain("--font-sans:")
		expect(lightBlock).toContain("var(--font-inter)")
		expect(css).not.toContain("--font-space-grotesk")
	})

	test("não restou o verde VOLT antigo em globals.css", () => {
		expect(css).not.toContain("#39e58c")
		expect(css).not.toContain("verde-esmeralda")
	})

	test("os cinco tokens de chanfro valem 0px no @theme e --radius-full não existe (fallback reto)", () => {
		expect(lightBlock).toMatch(/--radius-xs:\s*0px;/)
		expect(lightBlock).toMatch(/--radius-sm:\s*0px;/)
		expect(lightBlock).toMatch(/--radius-md:\s*0px;/)
		expect(lightBlock).toMatch(/--radius-lg:\s*0px;/)
		expect(lightBlock).toMatch(/--radius-xl:\s*0px;/)
		expect(lightBlock).not.toContain("--radius-full")
	})

	test("o bloco @supports (corner-shape: bevel) existe com os cinco tamanhos, e o anel de foco duplo continua sem recorte", () => {
		expect(css).toContain("@utility focus-ring-duplo")
		expect(css).not.toMatch(/clip-path/)
		const start = css.indexOf("@supports (corner-shape: bevel)")
		expect(start).toBeGreaterThan(-1)
		const supportsBlock = balancedBlockFrom(css, start)
		expect(supportsBlock).toContain("--radius-xs: 2px;")
		expect(supportsBlock).toContain("--radius-sm: 4px;")
		expect(supportsBlock).toContain("--radius-md: 6px;")
		expect(supportsBlock).toContain("--radius-lg: 10px;")
		expect(supportsBlock).toContain("--radius-xl: 12px;")
		expect(supportsBlock).toMatch(
			/\*,\s*::before,\s*::after\s*\{\s*corner-shape:\s*bevel;/,
		)
	})
})

describe("Scanlines de CRT e caret de terminal (globals.css)", () => {
	test("crt-scanlines só desenha o ::before sob .dark, sem animação e atrás do conteúdo", () => {
		expect(css).toContain("@utility crt-scanlines")
		const start = css.indexOf(".dark .crt-scanlines::before")
		expect(start).toBeGreaterThan(-1)
		const rule = balancedBlockFrom(css, start)
		expect(rule).toContain("z-index: -1")
		expect(rule).toContain("pointer-events: none")
		expect(rule).not.toMatch(/animation/)
		expect(css).not.toMatch(/^\.crt-scanlines::before/m)
	})

	test("input e textarea têm caret na cor de acento, em bloco quando suportado", () => {
		const baseLayer = css.slice(css.indexOf("@layer base"))
		expect(baseLayer).toMatch(
			/input,\s*textarea\s*\{[^}]*caret-color:\s*var\(--color-accent\);/,
		)
		expect(baseLayer).toContain("@supports (caret-shape: block)")
		expect(baseLayer).toMatch(
			/@supports \(caret-shape: block\)\s*\{\s*input,\s*textarea\s*\{\s*caret-shape:\s*block;/,
		)
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
			"#006c85",
		]) {
			expect(designDoc).toContain(hex)
		}
		expect(designDoc).not.toContain("#39e58c")
	})
})
