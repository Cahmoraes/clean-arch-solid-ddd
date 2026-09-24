import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8")

const BRACE_DELTA: Record<string, number> = { "{": 1, "}": -1 }

function blockAt(source: string, openBraceIndex: number): string {
	let depth = 0
	for (let index = openBraceIndex; index < source.length; index += 1) {
		depth += BRACE_DELTA[source.charAt(index)] ?? 0
		if (depth === 0) return source.slice(openBraceIndex + 1, index)
	}
	throw new Error("Chaves desbalanceadas em globals.css")
}

function keyframesBody(name: string): string {
	const start = css.indexOf(`@keyframes ${name}`)
	if (start === -1) throw new Error(`@keyframes ${name} ausente`)
	return blockAt(css, css.indexOf("{", start))
}

function declaredProperties(body: string): string[] {
	return Array.from(body.matchAll(/([a-z-]+)\s*:/g), (match) => match[1] ?? "")
}

const SCENE_KEYFRAMES = ["sceneBeamDrift", "sceneWindowTwinkle"] as const

function reducedMotionBlock(): string {
	const start = css.indexOf("@media (prefers-reduced-motion: reduce)")
	if (start === -1) throw new Error("bloco reduce ausente")
	return blockAt(css, css.indexOf("{", start))
}

describe("Animação das cenas (globals.css)", () => {
	test("os keyframes das cenas existem", () => {
		for (const name of SCENE_KEYFRAMES) {
			expect(css).toContain(`@keyframes ${name}`)
		}
	})

	test("os keyframes das cenas animam só transform e opacity", () => {
		for (const name of SCENE_KEYFRAMES) {
			const properties = declaredProperties(keyframesBody(name)).filter(
				(property) => property !== "",
			)
			const disallowed = properties.filter(
				(property) => property !== "transform" && property !== "opacity",
			)
			expect(disallowed, `${name} anima propriedades caras`).toEqual([])
		}
	})

	test("nenhum keyframe de cena parte de opacity 0", () => {
		for (const name of SCENE_KEYFRAMES) {
			expect(keyframesBody(name)).not.toMatch(/opacity:\s*0\s*[;}]/)
		}
	})

	test("nenhuma regra de cena usa animation-fill-mode persistente", () => {
		expect(css).not.toMatch(/animation:[^;]*\b(forwards|both)\b/)
		expect(css).not.toMatch(/animation-fill-mode:\s*(forwards|both)/)
	})

	test("o cintilar das janelas dura pelo menos 1s por ciclo (no máximo 1 flash por segundo, abaixo do limite de 3)", () => {
		const match = css.match(/animation:\s*sceneWindowTwinkle\s+([\d.]+)s/)
		expect(match, "regra que usa sceneWindowTwinkle").not.toBeNull()
		expect(Number(match?.[1])).toBeGreaterThanOrEqual(1)
	})

	test("a deriva dos feixes é lenta (pelo menos 4s por ciclo)", () => {
		const match = css.match(/animation:\s*sceneBeamDrift\s+([\d.]+)s/)
		expect(match, "regra que usa sceneBeamDrift").not.toBeNull()
		expect(Number(match?.[1])).toBeGreaterThanOrEqual(4)
	})

	test("cena com data-paused true pausa as animações", () => {
		expect(css).toMatch(
			/\.pixel-scene\[data-paused="true"\][^{]*\{[^}]*animation-play-state:\s*paused/,
		)
	})

	test("movimento reduzido desliga as animações das cenas", () => {
		const block = reducedMotionBlock()
		expect(block).toContain(".pixel-scene-beam")
		expect(block).toContain(".pixel-scene-window")
		expect(block).toMatch(/animation:\s*none/)
	})
})
