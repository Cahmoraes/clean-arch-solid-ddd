# Task 8: Remoção do lucide-react, guardas e documentação

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** standard

**Depends on:** task-02, task-03, task-04, task-05, task-06, task-07

## Visão Geral

Fecha a migração: cria a guarda `src/test/no-lucide.test.ts` (nenhum arquivo de `src/` cita `lucide-react`, nenhum arquivo que importa ícone pixel usa tamanho fora da grade, e o `package.json` não declara mais a dependência), remove `lucide-react` de `apps/frontend/package.json` e do `pnpm-lock.yaml`, e documenta os ícones no `### Design System` de `apps/frontend/AGENTS.md`. `components.json` (`iconLibrary: "lucide"`) permanece: só afeta o CLI do shadcn, e a guarda pega ícones lucide trazidos por componentes novos.

## Arquivos

- Create: `apps/frontend/src/test/no-lucide.test.ts`
- Modify: `apps/frontend/package.json` (remover a linha `"lucide-react": "1.14.0",`)
- Modify: `pnpm-lock.yaml` (atualizado por `pnpm install`, nunca à mão)
- Modify: `apps/frontend/AGENTS.md` (parágrafo "Ícones" em `### Design System`)
- Test: `apps/frontend/src/test/no-lucide.test.ts`

## Interfaces

- **Consome:** `listSourceFiles(extensions: ReadonlyArray<string>): SourceFile[]` de `apps/frontend/src/test/source-files.ts` (já existente), com `interface SourceFile { path: string; content: string }`; `path` é relativo a `src/`, e a função pula `test/`, `*.test.*` e `.d.ts`. Também consome, das tasks 2 a 7, o estado migrado: nenhum arquivo de `src/` importa `lucide-react`, e todos os arquivos que importam `@/components/ui/pixel-icons` já usam só tamanhos 12/16/20/24.
- **Produz:** N/A (a guarda não exporta nada).

### Skills a invocar

- `test-antipatterns`: a guarda tem teste do próprio padrão (casos positivos e negativos), para não ser vacuosa.
- `no-workarounds`: se a guarda acusar um arquivo, corrija o arquivo (troque import ou tamanho); nunca amplie allowlist nem afrouxe o padrão.
- `typescript-advanced`: leitura tipada do `package.json` sem `any` solto.

## Passos

- **Step 1: Review Focus: Classe de tamanho fora da lista (`h-3.5`, `w-3.5`, `size-3.5`, `h-4.5`, `w-4.5`) em arquivo que importa ícone pixel → falha no teste de guarda, não passa despercebida — Write the failing test**

Crie `apps/frontend/src/test/no-lucide.test.ts`:

```ts
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
	return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"))
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
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/test/no-lucide.test.ts`
Expected: FAIL somente em `o package.json do frontend não declara lucide-react` (a dependência ainda está declarada); os demais testes passam porque as tasks 2 a 7 já migraram os arquivos. Se `nenhum arquivo de produção em src/ cita lucide-react` ou `nenhum arquivo que importa ícone pixel usa ...` falhar, a saída lista os caminhos: volte ao arquivo listado, troque o import para `@/components/ui/pixel-icons` ou o tamanho para `h-4`/`h-6` conforme a regra do design (`h-3.5` para `h-4`, `h-4.5` para `h-6` no menu), sem tocar na guarda.

- **Step 3: Write minimal implementation (remover a dependência)**

Em `apps/frontend/package.json`, remova a linha 36. Antes:

```json
		"leaflet": "1.9.4",
		"lucide-react": "1.14.0",
		"motion": "^12.40.0",
```

Depois:

```json
		"leaflet": "1.9.4",
		"motion": "^12.40.0",
```

- **Step 4: Atualizar o lockfile**

Run: `pnpm install`
Expected: código de saída 0; `pnpm-lock.yaml` deixa de listar `lucide-react` (o importer de `apps/frontend` e as entradas `lucide-react@1.14.0`).

Run: `rg -n "lucide" pnpm-lock.yaml`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 5: Documentar os ícones no Design System**

Em `apps/frontend/AGENTS.md`, na seção `### Design System`, logo após o parágrafo que começa com `Regras: nenhum componente declara` e antes de `### Acessibilidade`, acrescente:

```markdown
Ícones: pixel-art vendorizados de `pixelarticons` 2.4.1 (MIT) em `src/components/ui/pixel-icons.tsx`, com os mesmos nomes do antigo `lucide-react` (`import { Users } from "@/components/ui/pixel-icons"`; tipo `PixelIcon` no lugar de `LucideIcon`). Tamanhos só 12, 16, 20 ou 24px (`h-3`, `h-4`, `h-5`, `h-6`); `h-3.5` e `h-4.5` (e `w-`/`size-`) são proibidos em arquivo que importa ícone. Para atualizar a versão ou adicionar ícone, edite o mapa de `scripts/generate-pixel-icons.mjs` e rode `node scripts/generate-pixel-icons.mjs` em `apps/frontend`; nunca edite o `.tsx` gerado à mão. `lucide-react` é proibido em `src/` e no `package.json` (guarda `src/test/no-lucide.test.ts`); `components.json` mantém `iconLibrary: "lucide"` porque só afeta o CLI do shadcn.
```

- **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/test/no-lucide.test.ts`
Expected: PASS (5 testes).

- **Step 7: Verificações finais de resíduo**

Run: `rg -n "lucide-react" apps/frontend/src apps/frontend/package.json -g "!*.test.*"`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

Run: `rg -n "^Ícones: " apps/frontend/AGENTS.md`
Expected: exatamente uma linha de saída (o parágrafo novo).

- **Step 8: Conferência visual final (manual, sem bloquear)**

Abra o app autenticado (ferramenta de navegador descoberta no ambiente ou o navegador do usuário) e confira contra `../specs/mockups/pixel-art-icons-visual.md`: menu expandido e recolhido, item ativo, hover, tema claro e escuro, paleta de comandos, notificações, e as telas cujos tamanhos mudaram (checkbox, alternador de tema, cards e linhas de academia, resumo de horários, plano admin). Glifos nítidos, sem glow, contraste inalterado. Registre desvios no relatório da task.

- **Step 9: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/test/no-lucide.test.ts apps/frontend/package.json pnpm-lock.yaml apps/frontend/AGENTS.md
git commit -m "chore(frontend): remove lucide-react e adiciona guarda contra reintrodução

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Nenhum arquivo de produção em `apps/frontend/src` cita `lucide-react`, e `apps/frontend/package.json` e `pnpm-lock.yaml` não a listam mais.
- A guarda falha se um arquivo que importa `@/components/ui/pixel-icons` (ou `./pixel-icons`) usar `h-3.5`, `w-3.5`, `size-3.5`, `h-4.5`, `w-4.5` ou `size-4.5`.
- `apps/frontend/AGENTS.md` documenta origem, tamanhos, regeneração e a proibição de `lucide-react` em `### Design System`.
- `components.json` permanece inalterado.
