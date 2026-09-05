import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = path.resolve(currentDir, "../../../")

const ALLOWED_FILES = new Set([
	path.join(SRC_ROOT, "features/weather/components/weather-globe.tsx"),
	path.join(
		SRC_ROOT,
		"features/weather/components/weather-globe-error-boundary.tsx",
	),
])

const TEST_FILE_PATTERN = /\.(test|fitness-test)\.tsx?$/
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/

// Só especificadores de import ESTÁTICO: `from "..."` e `require("...")`.
// `dynamic(() => import("..."))` não casa com nenhum dos dois — é justamente o que se permite.
const STATIC_SPECIFIER_PATTERN = /(?:from\s*|require\(\s*)["']([^"']+)["']/g

// Cobre `react-globe.gl` e os módulos do globo, tanto na forma com alias
// (`@/features/weather/components/weather-globe`) quanto na relativa (`./weather-globe`).
// Casamenta raiz do especificador (ex: `react-globe.gl` ou `react-globe.gl/dist/...`).
const FORBIDDEN_SPECIFIER_PATTERN =
	/(?:^|\/)(?:react-globe\.gl|weather-globe(?:-error-boundary)?)(?:\/|$)/

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
