# Task 15: `field-shell` — anel de foco duplo no campo mascarado (`MASKED_INPUT_CLASS`) [FR-003]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

`apps/frontend/src/components/ui/field-shell.tsx` exporta a constante `MASKED_INPUT_CLASS`, usada pelos campos mascarados (`react-imask`, ex.: `GymCnpjField`, `GymPhoneField`) que não podem reaproveitar o `Input` base. A constante ainda usa as classes de foco antigas (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2`) em vez da utility `focus-ring-duplo` criada pela task-01. Esta task troca essas classes, mantendo o restante de `MASKED_INPUT_CLASS` e o componente `FieldShell` (incluindo o indicador de obrigatoriedade via `showRequiredIndicator`, fora de escopo) intactos.

## Arquivos

- Modify: `apps/frontend/src/components/ui/field-shell.tsx`
- Test: `apps/frontend/src/components/ui/field-shell.test.tsx` (novo — não existe teste dedicado hoje)

### Conformidade com as Skills Padrão

- `shadcn`: `MASKED_INPUT_CLASS`/`FieldShell` espelham o padrão de estilo do `Input` base do shadcn/ui — a mudança precisa manter esse alinhamento visual entre o input mascarado e o input padrão.
- `tailwindcss`: troca de classes de foco antigas por `focus-ring-duplo` (Tailwind v4 `@utility` criada pela task-01), aplicada via string exportada `MASKED_INPUT_CLASS` (não um componente com `className` prop).
- `wcag-audit-patterns`: aplica o critério WCAG 2.2 2.4.7/2.4.11 (indicador de foco visível) aos campos mascarados, fechando a mesma lacuna já corrigida em `input.tsx`/`checkbox.tsx`.
- `test-antipatterns`: o teste deve renderizar um consumidor real de `MASKED_INPUT_CLASS` (ou o próprio `FieldShell` com um filho usando a constante) e checar a classe aplicada no DOM, sem testar a string isoladamente fora de um render.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `field-shell`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual` (the plan author discovered them once, at plan time). Confirm the original design source with the user — only this needs the user and so belongs at execution — and fill any gap the plan left open (re-run tool discovery only if the field was left blank, inspecting the available skills + connected MCP tools; match by capability, never hardcode a tool). If a source URL or a fidelity tool exists, use it; otherwise build to the curated mockup at `../specs/mockups/acessibilidade-frontend-visual.md` manually. The mockup is the *norte* — reuse its decided layout, spacing, and tokens; do not re-derive them.

- **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { FieldShell, MASKED_INPUT_CLASS } from "./field-shell"

describe("FieldShell", () => {
	test("aplica o anel de foco duplo no input mascarado via MASKED_INPUT_CLASS", () => {
		render(
			<FieldShell id="cnpj" label="CNPJ">
				<input id="cnpj" className={MASKED_INPUT_CLASS} />
			</FieldShell>,
		)
		expect(screen.getByLabelText("CNPJ")).toHaveClass("focus-ring-duplo")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/field-shell.test.tsx`
Expected: FAIL — `MASKED_INPUT_CLASS` ainda contém `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2` em vez de `focus-ring-duplo`.

- **Step 3: Write minimal implementation**

```tsx
export const MASKED_INPUT_CLASS = [
	"flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-base text-foreground",
	"placeholder:text-muted-foreground",
	"transition-colors",
	"focus-ring-duplo",
	"disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")
```

(troca apenas a linha 13 de `apps/frontend/src/components/ui/field-shell.tsx`; o restante do arquivo — `FieldShell`, `showRequiredIndicator`, JSDoc — permanece inalterado.)

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/field-shell.test.tsx`
Expected: PASS

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/field-shell.tsx apps/frontend/src/components/ui/field-shell.test.tsx
git commit -m "fix(a11y): anel de foco duplo no MASKED_INPUT_CLASS do field-shell"
```

## Critérios de Sucesso

- `MASKED_INPUT_CLASS` contém a classe `focus-ring-duplo` e não contém mais `focus-visible:outline-none`, `focus-visible:ring-2`, `focus-visible:ring-ring/50` nem `focus-visible:ring-offset-2` (FR-003).
- Um input renderizado dentro de `FieldShell` usando `MASKED_INPUT_CLASS` exibe a classe `focus-ring-duplo` no DOM.
- `showRequiredIndicator` e o restante da API de `FieldShell` permanecem sem alteração de comportamento.
