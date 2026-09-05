# Task 7: Fitness function — nenhum import estático dos módulos do globo fora do `next/dynamic` [FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** cheap
**Depends on:** task-03, task-06

## Visão Geral

Cria um teste estrutural (o primeiro fitness test do frontend — hoje só o backend tem
`dependency-cruiser`/`test:fitness`) que impede que uma mudança futura reintroduza o chunk do
globo no bundle inicial da rota `/clima` (regressão do que a Task 6 garante via `next/dynamic`).

O guard cobre **duas** formas da mesma regressão, e as duas juntas (não uma no lugar da outra):

1. import estático de `react-globe.gl` — a forma óbvia;
2. import estático dos próprios módulos do globo
   (`@/features/weather/components/weather-globe` e
   `@/features/weather/components/weather-globe-error-boundary`, ou as formas relativas
   equivalentes) — a regressão **real** que o FR-011 quer impedir: basta um `import { WeatherGlobe }
   from "@/features/weather/components/weather-globe-error-boundary"` em `page.tsx` para arrastar
   `react-globe.gl`/Three.js de volta ao bundle inicial, sem que a string `react-globe.gl` apareça
   em lugar nenhum fora dos módulos permitidos.

A allowlist tem exatamente dois arquivos: `weather-globe.tsx` (importa `react-globe.gl` de fato) e
`weather-globe-error-boundary.tsx` (importa `./weather-globe`). A página **não** entra na
allowlist — se entrasse, o guard deixaria passar justamente a regressão que existe para pegar. Ela
passa naturalmente porque o carregamento é dinâmico: a varredura só considera especificadores de
import **estático** (`from "..."` / `require("...")`), e `dynamic(() => import("..."))` não é
nenhum dos dois.

Não há `fast-glob`/`glob` como dependência no `apps/frontend/package.json` — a varredura de
arquivos usa apenas `node:fs`/`node:path`/`node:url`, sem adicionar nenhuma dependência nova.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/weather-globe-static-import-guard.ts`
- Test: `apps/frontend/src/features/weather/components/weather-globe-import.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: a função de varredura (`findForbiddenStaticGlobeImports`) e o predicado exportado (`hasForbiddenStaticGlobeImport(content: string): boolean`) são tipados sem `any`, e a varredura usa `path.relative` para retornar caminhos legíveis nas falhas.
- `no-workarounds`: a lista de arquivos permitidos (`ALLOWED_FILES`) é uma allowlist explícita e curta (os dois módulos client-only reais) — não um padrão genérico como "qualquer arquivo dentro de `components/weather`" que esconderia uma futura importação indevida de um arquivo vizinho; e a página não é allowlistada só para "fazer o teste passar", já que é exatamente o arquivo que o guard precisa vigiar.
- `test-antipatterns`: o teste roda a varredura real do `apps/frontend/src` (sem mockar `fs`) — é um teste estrutural, seu valor está em ler o código-fonte de verdade, não uma versão simulada dele. Os casos de violação são exercitados pelo predicado puro `hasForbiddenStaticGlobeImport` com trechos de código literais, sem criar arquivos-fixture nem mockar o sistema de arquivos.

## Passos

- **Step 1: Write the failing test**

Crie `apps/frontend/src/features/weather/components/weather-globe-import.test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import {
	findForbiddenStaticGlobeImports,
	hasForbiddenStaticGlobeImport,
} from "./weather-globe-static-import-guard"

describe("Fitness: módulos do globo não são importados estaticamente fora do next/dynamic", () => {
	test("nenhum arquivo além de weather-globe.tsx e weather-globe-error-boundary.tsx importa os módulos do globo estaticamente", () => {
		const violations = findForbiddenStaticGlobeImports()

		expect(violations).toEqual([])
	})

	test("detecta import estático de react-globe.gl", () => {
		const content = `import Globe from "react-globe.gl"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("detecta import estático do próprio WeatherGlobe fora do next/dynamic", () => {
		const content = `import { WeatherGlobe } from "@/features/weather/components/weather-globe-error-boundary"`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(true)
	})

	test("permite o carregamento via dynamic(() => import(...))", () => {
		const content = `const WeatherGlobe = dynamic(
	() =>
		import("@/features/weather/components/weather-globe-error-boundary").then(
			(mod) => ({ default: mod.WeatherGlobe }),
		),
	{ ssr: false },
)`

		expect(hasForbiddenStaticGlobeImport(content)).toBe(false)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-import.test.ts`
Expected: FAIL — `Failed to resolve import "./weather-globe-static-import-guard"` (o módulo ainda
não existe).

- **Step 3: Write minimal implementation**

```typescript
// apps/frontend/src/features/weather/components/weather-globe-static-import-guard.ts
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
const FORBIDDEN_SPECIFIER_PATTERN =
	/(?:react-globe\.gl|weather-globe(?:-error-boundary)?)$/

export function hasForbiddenStaticGlobeImport(content: string): boolean {
	const specifiers = [...content.matchAll(STATIC_SPECIFIER_PATTERN)]
	return specifiers.some((match) =>
		FORBIDDEN_SPECIFIER_PATTERN.test(match[1]),
	)
}

function listSourceFiles(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	const files: string[] = []
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue
			files.push(...listSourceFiles(fullPath))
			continue
		}
		if (SOURCE_FILE_PATTERN.test(entry.name)) {
			files.push(fullPath)
		}
	}
	return files
}

export function findForbiddenStaticGlobeImports(): string[] {
	const violations: string[] = []
	for (const filePath of listSourceFiles(SRC_ROOT)) {
		if (ALLOWED_FILES.has(filePath)) continue
		if (TEST_FILE_PATTERN.test(filePath)) continue
		const content = fs.readFileSync(filePath, "utf-8")
		if (hasForbiddenStaticGlobeImport(content)) {
			violations.push(path.relative(SRC_ROOT, filePath))
		}
	}
	return violations
}
```

Detalhes que fazem a varredura passar hoje: o próprio arquivo do guard cita os nomes proibidos só
dentro de expressões regulares (nunca em `from "..."`), os arquivos `*.test.ts(x)` são pulados
(eles importam os módulos do globo legitimamente), `use-globe-capability.ts` não importa nenhum
dos módulos vigiados, e `page.tsx` só referencia o módulo dentro de `dynamic(() => import(...))`.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-import.test.ts`
Expected: PASS (os 4 testes) — `findForbiddenStaticGlobeImports()` retorna `[]`, porque só
`weather-globe.tsx` importa `react-globe.gl` estaticamente e só
`weather-globe-error-boundary.tsx` importa `./weather-globe` (ambos na allowlist), enquanto
`page.tsx` carrega o módulo via `dynamic(() => import(...))`.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/weather/components/weather-globe-static-import-guard.ts apps/frontend/src/features/weather/components/weather-globe-import.test.ts
git commit -m "test(weather): adiciona fitness function contra import estático de react-globe.gl"
```

## Critérios de Sucesso

- `findForbiddenStaticGlobeImports()` varre todo `apps/frontend/src` e retorna, hoje, uma lista
  vazia [FR-011].
- Se um arquivo fora da allowlist (`weather-globe.tsx`, `weather-globe-error-boundary.tsx`) passar
  a importar `react-globe.gl` estaticamente (`from "react-globe.gl"` ou
  `require("react-globe.gl")`), o teste falha apontando o caminho relativo do arquivo violador.
- Se qualquer arquivo fora da allowlist passar a importar estaticamente
  `@/features/weather/components/weather-globe` ou
  `@/features/weather/components/weather-globe-error-boundary` (ou a forma relativa equivalente) —
  inclusive `page.tsx`, que **não** é allowlistada —, o teste também falha [FR-011].
- Um carregamento via `dynamic(() => import("@/features/weather/components/weather-globe-error-boundary"))`
  continua passando: o predicado só considera `from "..."`/`require("...")`.
- O teste cobre explicitamente os três casos acima (dois de violação, um de permissão) via o
  predicado puro `hasForbiddenStaticGlobeImport`, além da varredura real do `src`.
- O teste não depende de nenhuma dependência nova — usa apenas `node:fs`, `node:path` e
  `node:url`, já disponíveis no runtime Node do monorepo.
