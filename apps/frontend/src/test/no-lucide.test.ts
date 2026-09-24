import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

const LUCIDE_PACKAGE = "lucide-react"

const PIXEL_ICONS_IMPORT =
	/from\s+["'](?:@\/components\/ui\/pixel-icons|\.\/pixel-icons)["']/

const OFF_GRID_SIZE = /(?<![\w-])(?:h|w|size)-(?:3|4)\.5(?![\w.])/

interface PackageManifest {
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
}

function readManifest(): PackageManifest {
	return JSON.parse(
		readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
	)
}

describe("ícones pixel-art: nenhum resíduo do lucide-react", () => {
	test("nenhum arquivo de produção em src/ cita lucide-react", () => {
		const violations = listSourceFiles([".ts", ".tsx"])
			.filter((file) => file.content.includes(LUCIDE_PACKAGE))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("o package.json do frontend não declara lucide-react", () => {
		const manifest = readManifest()
		const declared = [
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.devDependencies ?? {}),
		]
		expect(declared).not.toContain(LUCIDE_PACKAGE)
	})
})

describe("ícones pixel-art: tamanhos só na grade 12/16/20/24", () => {
	test("nenhum arquivo que importa ícone pixel usa h-3.5, w-3.5, size-3.5, h-4.5, w-4.5 ou size-4.5", () => {
		const violations = listSourceFiles([".ts", ".tsx"])
			.filter((file) => PIXEL_ICONS_IMPORT.test(file.content))
			.filter((file) => OFF_GRID_SIZE.test(file.content))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("o padrão detecta as classes fora da grade e ignora as válidas", () => {
		const forbidden = [
			"h-3.5",
			"w-3.5",
			"size-3.5",
			"h-4.5",
			"w-4.5",
			"size-4.5",
			"sm:h-3.5",
		]
		const allowed = ["h-3", "h-4", "h-5", "h-6", "size-4", "h-0.5", "min-w-4.5"]

		expect(forbidden.filter((cls) => !OFF_GRID_SIZE.test(cls))).toEqual([])
		expect(allowed.filter((cls) => OFF_GRID_SIZE.test(cls))).toEqual([])
	})

	test("o padrão de import reconhece os dois caminhos do módulo de ícones", () => {
		expect(
			PIXEL_ICONS_IMPORT.test(
				'import { Users } from "@/components/ui/pixel-icons"',
			),
		).toBe(true)
		expect(
			PIXEL_ICONS_IMPORT.test('import { Users } from "./pixel-icons"'),
		).toBe(true)
		expect(PIXEL_ICONS_IMPORT.test('import { cn } from "@/lib/cn"')).toBe(false)
	})
})
