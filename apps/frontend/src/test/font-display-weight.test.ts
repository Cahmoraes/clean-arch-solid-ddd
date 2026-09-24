import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

const FONT_WEIGHT_RESIDUE = /\bfont-(bold|semibold|medium|black|extrabold)\b/
const SMALL_TEXT_RESIDUE = /\btext-(xs|sm)\b/
const ARBITRARY_SMALL_TEXT = /text-\[(\d+(?:\.\d+)?)px\]/g

function hasArbitrarySizeBelow15px(line: string): boolean {
	ARBITRARY_SMALL_TEXT.lastIndex = 0
	let match: RegExpExecArray | null
	// biome-ignore lint/suspicious/noAssignInExpressions: laço de varredura de regex global
	while ((match = ARBITRARY_SMALL_TEXT.exec(line))) {
		if (Number.parseFloat(match[1]) < 15) return true
	}
	return false
}

function lineViolatesFontDisplayRestriction(line: string): boolean {
	if (!line.includes("font-display")) return false
	if (FONT_WEIGHT_RESIDUE.test(line)) return true
	if (SMALL_TEXT_RESIDUE.test(line)) return true
	return hasArbitrarySizeBelow15px(line)
}

describe("font-display nunca combina com peso sintético ou tamanho abaixo de 15px", () => {
	test("nenhum arquivo de produção usa font-display junto de font-bold/semibold/medium/black/extrabold ou de text-xs/text-sm/text-[<15px]", () => {
		const violations = listSourceFiles([".tsx"])
			.flatMap((file) =>
				file.content
					.split("\n")
					.map((line, index) => ({
						path: file.path,
						line: index + 1,
						text: line,
					}))
					.filter((entry) => lineViolatesFontDisplayRestriction(entry.text)),
			)
			.map((entry) => `${entry.path}:${entry.line}`)
		expect(violations).toEqual([])
	})
})
