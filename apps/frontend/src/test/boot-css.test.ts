import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css")

function readGlobalsCss(): string {
	return readFileSync(GLOBALS_CSS_PATH, "utf-8")
}

function extractKeyframes(css: string, name: string): string {
	const pattern = new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m")
	return css.match(pattern)?.[1] ?? ""
}

test("bootGlow (título) nunca usa opacity: 0 nem clip-path: inset(0 100% — o H1 nunca fica oculto", () => {
	const css = readGlobalsCss()
	const bootGlow = extractKeyframes(css, "bootGlow")
	expect(bootGlow).not.toBe("")
	expect(bootGlow).not.toMatch(/opacity:\s*0(?!\.)/)
	expect(bootGlow).not.toMatch(/clip-path:\s*inset\(0 100%/)
})

test("as regras de data-boot só animam sob :not([data-motion-paused]) e prefers-reduced-motion: no-preference", () => {
	const css = readGlobalsCss()
	expect(css).toContain("@media (prefers-reduced-motion: no-preference)")
	expect(css).toContain(":not([data-motion-paused])")
	expect(css).toContain('[data-boot="eyebrow"]')
	expect(css).toContain('[data-boot="title"]')
	expect(css).toContain('[data-boot="stats"]')
})

test("nenhuma animação boot* anima width ou outra propriedade de layout", () => {
	const css = readGlobalsCss()
	for (const name of ["bootType", "bootGlow", "bootRise"]) {
		const keyframes = extractKeyframes(css, name)
		expect(keyframes).not.toBe("")
		expect(keyframes).not.toMatch(
			/\b(width|height|top|left|right|bottom|margin|padding)\s*:/,
		)
	}
})

test("bootType, bootGlow e bootRise usam steps() em vez de ease-out", () => {
	const css = readGlobalsCss()
	for (const name of ["bootType", "bootGlow", "bootRise"]) {
		const pattern = new RegExp(`animation:\\s*${name}[^;]*steps\\(`)
		expect(css).toMatch(pattern)
	}
})

test("pixel-hover anima em steps() e não se aplica com data-motion-paused ou reduced motion", () => {
	const css = readGlobalsCss()
	const utilityIndex = css.indexOf("@utility pixel-hover")
	expect(utilityIndex).toBeGreaterThan(-1)
	const snippet = css.slice(utilityIndex, utilityIndex + 500)
	expect(snippet).toContain("steps(3)")
})
