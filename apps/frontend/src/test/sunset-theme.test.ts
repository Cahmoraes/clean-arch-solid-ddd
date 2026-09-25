import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css")
const LAYOUT_PATH = join(process.cwd(), "src/app/layout.tsx")

function readGlobalsCss(): string {
	return readFileSync(GLOBALS_CSS_PATH, "utf-8")
}

function readLayout(): string {
	return readFileSync(LAYOUT_PATH, "utf-8")
}

function extractBlock(css: string, escapedSelector: string): string {
	const pattern = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s")
	return css.match(pattern)?.[1] ?? ""
}

function extractColorTokenNames(block: string): string[] {
	return Array.from(block.matchAll(/--color-([a-z0-9-]+)\s*:/g), (m) => m[1])
}

test("o bloco .sunset declara todo token --color-* que o bloco .dark declara", () => {
	const css = readGlobalsCss()
	const darkBlock = extractBlock(css, "\\.dark")
	const sunsetBlock = extractBlock(css, "\\.sunset")
	const darkTokens = extractColorTokenNames(darkBlock)
	const missing = darkTokens.filter(
		(name) => !sunsetBlock.includes(`--color-${name}:`),
	)
	expect(darkTokens.length).toBeGreaterThan(0)
	expect(missing).toEqual([])
})

const TEXT_CONTRAST_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["foreground", "background"],
	["card-foreground", "card"],
	["muted-foreground", "background"],
	["primary-foreground", "primary"],
	["accent-foreground", "accent"],
]

function extractColorTokenValue(block: string, name: string): string | null {
	const pattern = new RegExp(`--color-${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`)
	return block.match(pattern)?.[1] ?? null
}

function hexToRgb(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1, 7), 16)
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function channelLuminance(channel: number): number {
	const c = channel / 255
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(rgb: [number, number, number]): number {
	const [r, g, b] = rgb
	return (
		0.2126 * channelLuminance(r) +
		0.7152 * channelLuminance(g) +
		0.0722 * channelLuminance(b)
	)
}

function contrastRatio(hexA: string, hexB: string): number {
	const lumA = relativeLuminance(hexToRgb(hexA))
	const lumB = relativeLuminance(hexToRgb(hexB))
	const lighter = Math.max(lumA, lumB)
	const darker = Math.min(lumA, lumB)
	return (lighter + 0.05) / (darker + 0.05)
}

test("os pares texto/fundo do tema sunset cumprem contraste AA (>= 4.5:1)", () => {
	const css = readGlobalsCss()
	const sunsetBlock = extractBlock(css, "\\.sunset")
	for (const [fg, bg] of TEXT_CONTRAST_PAIRS) {
		const fgHex = extractColorTokenValue(sunsetBlock, fg)
		const bgHex = extractColorTokenValue(sunsetBlock, bg)
		expect(fgHex, `token --color-${fg} ausente`).not.toBeNull()
		expect(bgHex, `token --color-${bg} ausente`).not.toBeNull()
		if (fgHex && bgHex) {
			expect(
				contrastRatio(fgHex, bgHex),
				`contraste ${fg}/${bg}`,
			).toBeGreaterThanOrEqual(4.5)
		}
	}
})

test("border-strong do sunset cumpre contraste de UI (>= 3:1) contra o background", () => {
	const css = readGlobalsCss()
	const sunsetBlock = extractBlock(css, "\\.sunset")
	const borderHex = extractColorTokenValue(sunsetBlock, "border-strong")
	const bgHex = extractColorTokenValue(sunsetBlock, "background")
	expect(borderHex).not.toBeNull()
	expect(bgHex).not.toBeNull()
	if (borderHex && bgHex) {
		expect(contrastRatio(borderHex, bgHex)).toBeGreaterThanOrEqual(3)
	}
})

test("a variante dark e o seletor de scanlines aceitam .sunset além de .dark", () => {
	const css = readGlobalsCss()
	expect(css).toContain("@custom-variant dark (&:is(.dark *, .sunset *));")
	// Espaço em branco tolerante: o Biome (biome:fix, gate obrigatório) formata
	// seletores múltiplos um por linha, então a vírgula pode ser seguida de
	// quebra de linha em vez de espaço.
	expect(css).toMatch(
		/\.dark \.crt-scanlines::before,\s*\.sunset \.crt-scanlines::before/,
	)
})

test("o ThemeProvider declara os três temas, então o next-themes remove .sunset ao trocar de tema (sem mistura de tokens)", () => {
	const layout = readLayout()
	expect(layout).toContain('themes={["light", "dark", "sunset"]}')
})
