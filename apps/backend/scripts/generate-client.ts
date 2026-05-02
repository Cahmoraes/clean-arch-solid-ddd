import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import openapiTS, { astToString } from "openapi-typescript"

const SPEC_PATH = resolve(process.cwd(), "docs/openapi-spec.json")
const OUTPUT_FILE = resolve(
	import.meta.dirname,
	"../../../packages/api-types/index.d.ts",
)

async function generateClient(): Promise<void> {
	const specUrl = new URL(`file://${SPEC_PATH}`)
	const ast = await openapiTS(specUrl)
	const output = astToString(ast)

	mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
	writeFileSync(OUTPUT_FILE, output)

	console.log(`Types gerados com sucesso: ${OUTPUT_FILE}`)
	console.log(`Tamanho do arquivo: ${(output.length / 1024).toFixed(1)} KB`)
}

generateClient().catch((error) => {
	console.error("Erro ao gerar types do client OpenAPI:", error)
	process.exit(1)
})
