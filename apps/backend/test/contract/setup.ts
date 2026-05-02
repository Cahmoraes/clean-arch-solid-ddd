import { join } from "node:path"
import { cwd } from "node:process"
import vitestOpenAPI from "vitest-openapi"

const specPath = join(cwd(), "docs", "openapi-spec.json")
vitestOpenAPI(specPath)
