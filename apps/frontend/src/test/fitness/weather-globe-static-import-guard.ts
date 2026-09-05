import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.resolve(currentDir, "../../")

// Único módulo autorizado a importar o globo 3D estaticamente. O
// `weather-globe-error-boundary.tsx` NÃO entra aqui: ele carrega o globo por
// `dynamic(() => import(...))`, e por isso pode ser importado estaticamente pela
// página sem puxar o chunk pesado.
const ALLOWED_FILES = new Set([
	path.join(SRC_ROOT, "features/weather/components/weather-globe.tsx"),
])

const TEST_FILE_PATTERN = /\.(test|fitness-test)\.tsx?$/
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/

// Só especificadores de import ESTÁTICO: `from "..."`, `require("...")` e
// `import "..."` (side-effect, sem `from`).
// `dynamic(() => import("..."))` não casa com nenhum dos três — é justamente o que se permite.
const STATIC_SPECIFIER_PATTERN =
	/(?:from\s*|require\(\s*|import\s+)["']([^"']+)["']/g

// Cobre `react-globe.gl`, o módulo do globo (tanto com alias
// `@/features/weather/components/weather-globe` quanto relativo `./weather-globe`)
// e as libs 3D subjacentes (`three`, `three-globe`, `globe.gl`).
// Casa na raiz do especificador, cobrindo subpaths (ex: `three/examples/jsm/...`).
// Módulos leves (`weather-globe-constants`, `weather-globe-fallback`,
// `weather-globe-error-boundary`) não casam: exigem `/` ou fim após a raiz.
const FORBIDDEN_SPECIFIER_PATTERN =
	/(?:^|\/)(?:react-globe\.gl|three-globe|globe\.gl|weather-globe|three)(?:\/|$)/

export function hasForbiddenStaticGlobeImport(content: string): boolean {
	const specifiers = [...content.matchAll(STATIC_SPECIFIER_PATTERN)]
	return specifiers.some((match) => FORBIDDEN_SPECIFIER_PATTERN.test(match[1]))
}

function processEntry(
	entry: fs.Dirent,
	dirPath: string,
	files: string[],
): void {
	const fullPath = path.join(dirPath, entry.name)
	if (entry.isDirectory() && entry.name !== "node_modules") {
		files.push(...listSourceFiles(fullPath))
		return
	}
	if (entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name)) {
		files.push(fullPath)
	}
}

function listSourceFiles(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	const files: string[] = []
	for (const entry of entries) {
		processEntry(entry, dir, files)
	}
	return files
}

function shouldCheckFile(filePath: string): boolean {
	return !ALLOWED_FILES.has(filePath) && !TEST_FILE_PATTERN.test(filePath)
}

export function findForbiddenStaticGlobeImports(): string[] {
	const violations: string[] = []
	for (const filePath of listSourceFiles(SRC_ROOT)) {
		if (!shouldCheckFile(filePath)) continue
		const content = fs.readFileSync(filePath, "utf-8")
		if (hasForbiddenStaticGlobeImport(content)) {
			violations.push(path.relative(SRC_ROOT, filePath))
		}
	}
	return violations
}
