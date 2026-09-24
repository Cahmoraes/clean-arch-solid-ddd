import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export interface SourceFile {
	path: string
	content: string
}

const SRC_ROOT = `${resolve(process.cwd(), "src")}/`

function isProductionSource(
	relativePath: string,
	extensions: ReadonlyArray<string>,
): boolean {
	if (relativePath.startsWith("test/")) return false
	if (/\.test\.[a-z]+$/.test(relativePath)) return false
	if (relativePath.endsWith(".d.ts")) return false
	return extensions.some((extension) => relativePath.endsWith(extension))
}

export function listSourceFiles(
	extensions: ReadonlyArray<string>,
): SourceFile[] {
	return readdirSync(SRC_ROOT, { recursive: true, encoding: "utf8" })
		.map((relative) => relative.replaceAll("\\", "/"))
		.filter((relative) => isProductionSource(relative, extensions))
		.map((relative) => ({
			path: relative,
			content: readFileSync(`${SRC_ROOT}${relative}`, "utf8"),
		}))
}
