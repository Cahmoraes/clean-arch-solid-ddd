# Task 18: Gate final e entrega por ondas [FR-021, FR-024]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01, task-02, task-03, task-04, task-05, task-06, task-07, task-08, task-09, task-10, task-11, task-12, task-13, task-14, task-15, task-16, task-17

## Visão Geral

Fecha o redesign: confirma por teste que nenhum vestígio do verde antigo restou fora do globo 3D e que a arte pixel aparece só nas superfícies previstas, roda por arquivo os testes acoplados a valores visuais e os specs e2e afetados, corrige o que aparecer sem gambiarras e registra a conferência das três ondas. Os quatro comandos do gate global do repositório (lint com correção, checagem de tipos, testes unitários do monorepo e build) e a suíte completa do frontend não são passos desta tarefa: o checkpoint do lote os executa uma vez, no fim, para as tarefas 1 a 18. Se o checkpoint reportar falha, a correção volta para esta tarefa, sempre na causa (skill `no-workarounds`).

## Arquivos

- Create: `apps/frontend/src/test/legacy-green-residue.test.ts`
- Modify (só se sobrar resíduo): os arquivos que o teste apontar

## Interfaces

- **Consome:** `listSourceFiles(extensions: ReadonlyArray<string>): SourceFile[]` e `interface SourceFile { path: string; content: string }` de `apps/frontend/src/test/source-files.ts` (task-04). Os arquivos de teste e de e2e criados pelas tarefas 1 a 17 (nomes citados no passo 4 e no registro das ondas).
- **Produz:** N/A (nenhum símbolo novo em código de produção).

### Conformidade com as Skills Padrão

- `no-workarounds`: qualquer falha do gate se corrige na causa; nenhuma exceção nova no teste de resíduo sem justificativa, nenhum `biome-ignore` ou `@ts-expect-error` para passar.
- `test-antipatterns`: o teste de resíduo lê arquivos reais e afirma o estado final; nada de mock.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/test/legacy-green-residue.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// O globo 3D do clima (WebGL) mantém a cor da marca antiga como valor literal;
// exceção registrada e justificada na task-04.
const ALLOWED_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-constants.ts",
]

// Verde VOLT antigo: acento #39e58c, primary-strong #22c976 e o rgba equivalente.
const LEGACY_GREEN = /#39e58c|#22c976|rgba?\(\s*57\s*,\s*229\s*,\s*140/i

describe("Resíduo do verde VOLT antigo e escopo da arte", () => {
	test("nenhum arquivo de produção (ts, tsx, css) fora do globo 3D usa o verde antigo", () => {
		const violations = listSourceFiles([".ts", ".tsx", ".css"])
			.filter((file) => !ALLOWED_FILES.includes(file.path))
			.filter((file) => LEGACY_GREEN.test(file.content))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("PixelScene só aparece nas superfícies de destaque (login, hero, estado vazio, capa de academia)", () => {
		const SCENE_SURFACES = [
			"app/(public)/login/page.tsx",
			"components/ui/empty-state.tsx",
			"features/dashboard/components/profile-hero-card.tsx",
			"features/gyms/components/gym-image.tsx",
		]
		const users = listSourceFiles([".tsx"])
			.filter(
				(file) =>
					file.path !== "components/ui/pixel-scene.tsx" &&
					/<PixelScene\b/.test(file.content),
			)
			.map((file) => file.path)
			.sort()
		expect(users).toEqual(SCENE_SURFACES)
	})

	test("as exceções do globo ainda precisam da exceção", () => {
		const files = listSourceFiles([".ts", ".tsx"])
		for (const allowed of ALLOWED_FILES) {
			const file = files.find((candidate) => candidate.path === allowed)
			expect(file, `${allowed} não existe mais`).toBeDefined()
			expect(
				LEGACY_GREEN.test(file?.content ?? ""),
				`${allowed} não usa mais o verde antigo: remova da lista`,
			).toBe(true)
		}
	})
})
```

- **Step 2: Run test to verify it fails or confirms the migration**

Run: `pnpm --filter frontend test src/test/legacy-green-residue.test.ts`
Expected: PASS se as tarefas 1 a 17 removeram todo o verde antigo e limitaram a arte às quatro superfícies (o primeiro teste devolve `[]`, o segundo lista exatamente os quatro arquivos e o terceiro confirma o globo). Se sobrar resíduo, o primeiro teste falha com a lista de caminhos (por exemplo `expected [ 'features/.../arquivo.tsx' ] to deeply equal []`) e, se a cena aparecer em outra tela, o segundo falha com a diferença entre os arquivos; o resultado exato só a execução revela.

- **Step 3: Write minimal implementation**

Só se o passo 2 listar arquivos: para resíduo de verde, em cada um, trocar a cor por token semântico conforme o papel (verde de sucesso por `success`, acento por `accent`, ação primária por `primary`), sem tocar nas exceções do globo. Não acrescentar arquivo à lista `ALLOWED_FILES` para passar. Para `PixelScene` fora das superfícies previstas, remover o uso (a arte só vale nas superfícies previstas, tarefa 7). Se nada for listado, nenhuma mudança de código neste passo.

- **Step 4: Run the coupled visual tests per file**

Estes são os testes acoplados a valores visuais que a spec cita (globals-tokens, layout, motion, `*-volt`, stat-card, status-badge, brand-mark) mais o toggle de tema:

Run: `pnpm --filter frontend test src/app/globals-tokens.test.tsx src/app/layout.test.tsx src/app/motion.test.tsx src/components/ui/stat-card.test.tsx src/components/ui/status-badge.test.tsx src/components/ui/brand-mark.test.tsx src/components/ui/theme-toggle.test.tsx "src/app/(public)/login/login-volt.test.tsx" "src/app/(authenticated)/perfil/perfil-volt.test.tsx" "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"`
Expected: PASS

- **Step 5: Run the token and scene guards**

Run: `pnpm --filter frontend test src/app/contrast-tokens.test.tsx src/app/scene-animation.test.tsx src/test/no-literal-colors.test.ts src/test/palette-assumptions.test.ts src/test/legacy-green-residue.test.ts src/components/ui/pixel-scene.test.tsx src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS

- **Step 6: Run the e2e specs the redesign touches, one spec at a time**

Run: `pnpm --filter frontend e2e e2e/accessibility.spec.ts`
Expected: PASS

Run: `pnpm --filter frontend e2e e2e/scene-performance.spec.ts`
Expected: PASS

Run: `pnpm --filter frontend e2e e2e/smoke.spec.ts`
Expected: PASS

- **Step 7: Record the wave check**

Confirmar, contra o estado do repositório e dos passos anteriores, e registrar no relatório da tarefa (não em arquivo novo) que cada onda deixa o app funcional:

| Onda | Tarefas | Entrega | Conferência |
|---|---|---|---|
| 1 | 1 a 4 | tokens Noite neon nos dois temas, contraste calculado, `BrandMark` em pixel com sidebar escura, cores literais por tokens | `globals-tokens`, `contrast-tokens`, `brand-mark`, `no-literal-colors` verdes; app abre nos dois temas |
| 2 | 5 a 11 | `useSceneMotion`, `MotionToggle` nos shells, `PixelScene` (estática e animada), cenas no login, hero, estados vazios e capa de academia | `use-scene-motion`, `motion-toggle`, `pixel-scene`, `scene-animation`, `gym-image` verdes; login e dashboard com a arte |
| 3 | 12 a 18 | Usuários, Check-ins e Academias na nova direção, passada nas demais telas, axe nos dois temas, medição de paint, gate | specs `accessibility` e `scene-performance` verdes; `palette-assumptions` e `legacy-green-residue` verdes |

Cada onda termina com o app funcional: nenhuma tarefa da onda deixa símbolo importado que só uma tarefa posterior cria, e os testes de cada onda passam sem depender da seguinte.

- **Step 8: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/test/legacy-green-residue.test.ts
git commit -m "test(frontend): guarda de resíduo do verde antigo e conferência final por ondas"
```

## Critérios de Sucesso

- Nenhum arquivo de produção fora do globo 3D contém o verde VOLT antigo; a exceção do globo continua justificada (FR-021).
- `PixelScene` é usado somente por login, hero do dashboard, `EmptyState` e capa de academia.
- Os testes acoplados a valores visuais, os guardas de tokens e de cena e os specs e2e `accessibility`, `scene-performance` e `smoke` passam (FR-021).
- A conferência das três ondas está registrada, cada onda deixando o app funcional (FR-024).
