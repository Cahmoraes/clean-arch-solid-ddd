# Task 8: Guarda de resíduo, documentação e conferência de acessibilidade [FR-013, FR-014, FR-015, FR-018]

**Status:** DONE

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-03, task-04, task-05, task-06, task-07

## Visão Geral

Esta task fecha a feature: uma guarda automatizada final garante que nenhum resíduo de arredondamento ou `corner-shape` escapou das tasks 3-6, a documentação do frontend passa a descrever o sistema visual real (paleta, fontes, tokens de chanfro), e a checagem de acessibilidade (axe nos dois temas) confirma que a troca de forma e tipografia não introduziu violação nova.

## Arquivos

- Create: `apps/frontend/src/test/rounded-residue.test.ts`
- Modify: `apps/frontend/AGENTS.md`

## Interfaces

- **Consome:** o estado de `src/components/**`, `src/features/**` e `src/app/**` já normalizado pelas tasks 3 e 5 (sem `rounded-full`/`rounded-[`) e tipografado pelas tasks 4 e 6; a classe `crt-scanlines` já restrita às 4 superfícies pela task-07 (guarda própria em `crt-scanlines-scope.test.ts`, não duplicada aqui); `listSourceFiles(exts)` de `src/test/source-files.ts` (retorna `{ path, content }`, `path` relativo a `src/`).
- **Produz:** `src/test/rounded-residue.test.ts` (guarda final de resíduo, não consumida por nenhuma task — é o portão de saída da feature); seção `### Design System` de `apps/frontend/AGENTS.md` reescrita.

### Skills a invocar

- `wcag-audit-patterns`: conduzir a checagem axe nos dois temas e a medição de contraste sem scanline (FR-013, FR-014).
- `test-antipatterns`: a guarda final deve comparar a lista real de violações contra `[]`, nunca simplificar para um `expect(true).toBe(true)`.
- `playwright-cli`: rodar `e2e/accessibility.spec.ts`, que sobe backend + dev server.
- `no-workarounds`: se o axe reportar uma violação nova, corrigir a causa raiz no componente afetado (não suprimir a regra do axe nem adicionar `aria-hidden` para escondê-la do teste).

## Passos

- **Step 1: Write the failing test — guarda de resíduo de arredondamento**

```ts
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

const ALLOWED_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-fallback.tsx",
]

const ROUNDED_RESIDUE = /\brounded-(full|\[|2xl|3xl)|\brounded(?![-\w])/

describe("nenhum resíduo de arredondamento ou corner-shape fora dos tokens", () => {
	test("nenhum arquivo de produção fora da allowlist usa rounded-full, rounded-[, rounded-2xl, rounded-3xl ou rounded bare", () => {
		const violations = listSourceFiles([".ts", ".tsx"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => !ALLOWED_FILES.includes(file.path))
			.filter((file) => ROUNDED_RESIDUE.test(file.content))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("nenhum arquivo além de app/globals.css declara corner-shape", () => {
		const violations = listSourceFiles([".ts", ".tsx", ".css"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => file.path !== "app/globals.css")
			.filter((file) => file.content.includes("corner-shape"))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("a allowlist do globo do clima ainda precisa da exceção", () => {
		const stillViolating = listSourceFiles([".ts", ".tsx"])
			.filter((file) => ALLOWED_FILES.includes(file.path))
			.filter((file) => ROUNDED_RESIDUE.test(file.content))
			.map((file) => file.path)
		expect(stillViolating.sort()).toEqual([...ALLOWED_FILES].sort())
	})
})
```

- **Step 2: Run test to verify it fails (ou confirma zero resíduo)**

Run: `pnpm --filter frontend exec vitest run src/test/rounded-residue.test.ts`
Expected: FAIL se alguma ocorrência de `rounded-full`/`rounded-[`/`rounded-2xl`/`rounded-3xl`/`rounded` bare restou fora da allowlist (as tasks 3 e 5 normalizaram a maior parte, mas o checklist delas marcava vários itens como "medir e aplicar regra" sem execução automática — este é o portão que pega o que sobrou); a saída lista cada `path` violador. Se as tasks 3 e 5 deixaram zero resíduo, o teste passa de imediato — nesse caso, pular o Step 3 e seguir para o Step 4.

- **Step 3: Corrigir o resíduo encontrado (se houver)**

Para cada `path` listado pela falha do Step 2, abrir o arquivo, localizar a ocorrência e aplicar a mesma regra de mapeamento das tasks 3/5 (lado < 12px → `rounded-none`; ≤ 20px → `rounded-xs`; ≤ 40px → `rounded-sm`; maior → `rounded-md`; badges/pills → `rounded-sm`; barras finas → `rounded-none`; `[Npx]` pela faixa correspondente). Não usar `!important`, comentário de supressão nem adicionar o arquivo à `ALLOWED_FILES` para fazer o teste passar — isso reabriria o FR-015.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/rounded-residue.test.ts`
Expected: PASS — as três asserções (zero resíduo, zero `corner-shape` fora de `globals.css`, allowlist ainda necessária) passam.

- **Step 5: Reescrever `### Design System` em `apps/frontend/AGENTS.md`**

Abrir `apps/frontend/AGENTS.md`, localizar a seção `### Design System` (hoje descreve a paleta "Superhumon" desatualizada, antes de `### Acessibilidade`) e substituir seu conteúdo por:

```markdown
### Design System

Paleta "Noite neon" (`replaced-visual-redesign`): tema escuro — `background` `#0a1424`, `card` `#0d1b2e`, `primary` `#ff3ea5`, `accent` `#3ee0ff`; tema claro — `background` `#f3f6fa`, `primary` `#cc0077`, `accent` `#006c85`.

Fontes: `font-display` = VT323 (peso único 400; títulos, eyebrows, rótulos, botões, KPIs e badges; nunca abaixo de 15px); `font-sans` = Inter (texto corrido, campos, tabelas); `font-mono` = JetBrains Mono (código, ids, coordenadas, timestamps).

Forma: `--radius-xs/sm/md/lg/xl` representam o tamanho do chanfro (2/4/6/10/12px), ativado via `corner-shape: bevel` sob `@supports` em `apps/frontend/src/app/globals.css`; sem suporte do navegador, o canto é reto (0px). `rounded-full` e `rounded-[Npx]` são proibidos em `src/` (guarda `src/test/rounded-residue.test.ts`), exceto a allowlist do globo do clima (`features/weather/components/weather-globe.tsx`, `weather-globe-fallback.tsx`).

Textura: a classe `crt-scanlines` desenha linhas horizontais estáticas atrás do conteúdo, só no tema escuro, restrita a 4 superfícies (`PixelScene`, hero do dashboard, cards de KPI, sidebar) e protegida por `src/test/crt-scanlines-scope.test.ts`.

Regras: nenhum componente declara `corner-shape` por conta própria — só `globals.css`; glow nunca é aplicado a texto.
```

Preservar o restante do arquivo (incluindo `### Acessibilidade`, que não muda) intocado.

- **Step 6: Rodar a checagem de acessibilidade axe nos dois temas**

Run: `pnpm --filter frontend exec playwright test e2e/accessibility.spec.ts`
Expected: PASS, zero violações novas nos temas escuro e claro (FR-014). O `webServer` do `playwright.config.ts` sobe backend e frontend em modo dev e exige os serviços Docker do backend no ar (`pnpm --filter backend docker:up`, se ainda não estiverem rodando). **Se o ambiente não subir** (Docker indisponível, porta ocupada etc.), reportar explicitamente a falha de ambiente na mensagem de conclusão da task — nunca marcar este passo como aprovado sem a execução real.

- **Step 7: Conferir contraste 4,5:1 dos textos em VT323 sem scanline (FR-013)**

Usando a skill `playwright-cli` (ou `claude-in-chrome`) e as ferramentas de acessibilidade do navegador (ex.: painel de contraste do DevTools), abrir uma superfície com `crt-scanlines` (ex.: hero do dashboard) no tema escuro, inspecionar o texto em `font-display` sobre o fundo, e confirmar que o contraste medido é ≥ 4,5:1 considerando só a cor de fundo do elemento (sem a scanline, que é decorativa e fica atrás via `z-index: -1`). Registrar o valor medido na mensagem de commit do Step 8. Se o contraste ficar abaixo de 4,5:1, parar, marcar a task `BLOCKED` e reportar antes de concluir.

- **Step 8: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/test/rounded-residue.test.ts apps/frontend/AGENTS.md
git commit -m "test(frontend): guarda final de resíduo de arredondamento e documentação do design system"
```

## Critérios de Sucesso

- `src/test/rounded-residue.test.ts` passa: zero `rounded-full`/`rounded-[`/`rounded-2xl`/`rounded-3xl`/`rounded` bare fora da allowlist do globo do clima, e zero `corner-shape` fora de `app/globals.css` (FR-015).
- `apps/frontend/AGENTS.md` descreve a paleta "Noite neon", as três fontes, os tokens de chanfro e as regras desta feature, substituindo a descrição desatualizada da paleta "Superhumon" (FR-018).
- `e2e/accessibility.spec.ts` passa sem violações novas nos temas escuro e claro, ou a falha de ambiente foi reportada explicitamente (FR-014).
- O contraste dos textos em VT323, medido sem a scanline, é ≥ 4,5:1 (FR-013).
