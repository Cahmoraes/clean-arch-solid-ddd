import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"

// vitest roda a partir de apps/frontend; import.meta.url não é file: neste ambiente
const css = readFileSync(resolve("src/app/globals.css"), "utf8")

type Tokens = Record<string, string>

function blockOf(selectorSource: string): string {
	const body = css.match(new RegExp(`${selectorSource}\\s*\\{([^}]*)\\}`))?.[1]
	if (body === undefined) {
		throw new Error(`Bloco ${selectorSource} não encontrado em globals.css`)
	}
	return body
}

function parseColorTokens(block: string): Tokens {
	const tokens: Tokens = {}
	for (const match of block.matchAll(
		/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
	)) {
		const [, name, value] = match
		if (name && value) tokens[name] = value
	}
	return tokens
}

const light = parseColorTokens(blockOf("@theme"))
const dark = { ...light, ...parseColorTokens(blockOf("\\.dark")) }

// Tokens *-soft são rgba translúcidos: o fundo efetivo é a composição sobre a superfície.
function parseSoftTokens(block: string): Record<string, string> {
	const tokens: Record<string, string> = {}
	for (const match of block.matchAll(
		/--color-([a-z]+-soft):\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)\s*;/g,
	)) {
		const [, name, r, g, b, a] = match
		if (name && r && g && b && a) tokens[name] = `${r},${g},${b},${a}`
	}
	return tokens
}

const softTokens = parseSoftTokens(blockOf("@theme"))

function compose(softName: string, surface: string): string {
	const raw = softTokens[softName]
	if (raw === undefined) throw new Error(`Token --color-${softName} ausente`)
	const [r = 0, g = 0, b = 0, alpha = 1] = raw.split(",").map(Number)
	const base = surface.replace("#", "")
	const mixed = [r, g, b].map((value, index) => {
		const under = Number.parseInt(base.slice(index * 2, index * 2 + 2), 16)
		return Math.round(value * alpha + under * (1 - alpha))
	})
	return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

function channel(hex: string, start: number): number {
	const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
	const color = hex.replace("#", "")
	return (
		0.2126 * channel(color, 0) +
		0.7152 * channel(color, 2) +
		0.0722 * channel(color, 4)
	)
}

function contrastRatio(foreground: string, background: string): number {
	const a = luminance(foreground)
	const b = luminance(background)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["foreground", "background"],
	["muted-foreground", "background"],
	["muted-foreground", "muted"],
	["subtle", "background"],
	["subtle", "surface-2"],
	["subtle", "surface-3"],
	["accent", "surface-3"],
	["primary-foreground", "primary-strong"],
	["card-foreground", "card"],
	["primary-foreground", "primary"],
	["accent-foreground", "accent"],
	["destructive-foreground", "destructive"],
	["sidebar-foreground", "sidebar"],
	["sidebar-muted", "sidebar"],
	["sidebar-active-foreground", "sidebar-active"],
	["success", "background"],
	["warning", "background"],
	["destructive", "background"],
	["primary", "background"],
	["accent", "background"],
]

const COMPONENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["primary", "background"],
	["ring", "background"],
	["border-strong", "background"],
]

const SOFT_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["success", "success-soft"],
	["warning", "warning-soft"],
	["destructive", "destructive-soft"],
]

const SOFT_SURFACES: readonly string[] = ["background", "card"]

const THEMES: ReadonlyArray<readonly [string, Tokens]> = [
	["claro", light],
	["escuro", dark],
]

function tokenValue(tokens: Tokens, tokenName: string): string {
	const value = tokens[tokenName]
	if (value === undefined) throw new Error(`Token --color-${tokenName} ausente`)
	return value
}

describe("Contraste WCAG dos tokens (calculado a partir de globals.css)", () => {
	test("calcula a razão conhecida: preto sobre branco é 21:1", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
	})

	test("reproduz os números da pesquisa: magenta escuro sobre azul-petróleo", () => {
		expect(contrastRatio("#ff3ea5", "#0a1424")).toBeGreaterThan(5.6)
	})

	for (const [themeName, tokens] of THEMES) {
		test(`tema ${themeName}: pares de texto têm pelo menos 4.5:1`, () => {
			const failures = TEXT_PAIRS.map(([fg, bg]) => ({
				pair: `${fg} sobre ${bg}`,
				ratio: contrastRatio(tokenValue(tokens, fg), tokenValue(tokens, bg)),
			})).filter(({ ratio }) => ratio < 4.5)
			expect(failures).toEqual([])
		})

		test(`tema ${themeName}: texto de status sobre fundos *-soft tem pelo menos 4.5:1`, () => {
			const failures = SOFT_TEXT_PAIRS.flatMap(([fg, soft]) =>
				SOFT_SURFACES.map((surface) => ({
					pair: `${fg} sobre ${soft} em ${surface}`,
					ratio: contrastRatio(
						tokenValue(tokens, fg),
						compose(soft, tokenValue(tokens, surface)),
					),
				})),
			).filter(({ ratio }) => ratio < 4.5)
			expect(failures).toEqual([])
		})

		test(`tema ${themeName}: componentes e bordas relevantes têm pelo menos 3:1`, () => {
			const failures = COMPONENT_PAIRS.map(([fg, bg]) => ({
				pair: `${fg} sobre ${bg}`,
				ratio: contrastRatio(tokenValue(tokens, fg), tokenValue(tokens, bg)),
			})).filter(({ ratio }) => ratio < 3)
			expect(failures).toEqual([])
		})
	}
})
