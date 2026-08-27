# Task 13: `input` — anel de foco duplo + borda com contraste [FR-003, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Troca as classes de foco de `Input` (`apps/frontend/src/components/ui/input.tsx`) pela utility `focus-ring-duplo` (criada pela task-01 em `globals.css`), aplicando a técnica de "anel duplo" com contraste ≥16:1 em qualquer fundo/tema, em vez do `ring`/`outline` atual baseado em `--color-ring`. Também troca a classe de borda de `border-input` para `border-subtle` (decisão D7): o token `--color-subtle` (`#8a8a80` claro / `#6f6f68` escuro), já existente em `@theme`/`.dark` de `globals.css` sem precisar de token novo, mede 3.07:1 (claro) / 3.96:1 (escuro) contra `bg-background` e 3.48:1 / 3.58:1 contra `bg-card` — acima do mínimo 3:1 exigido pelo critério WCAG 1.4.11 (contraste de componentes não-textuais). A variável global `--color-input` permanece inalterada; a troca é local, só neste arquivo.

## Arquivos

- Modify: `apps/frontend/src/components/ui/input.tsx`
- Create: `apps/frontend/src/components/ui/input.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `Input` é um componente shadcn/ui customizado (`forwardRef` + `cn`) — a mudança de classes de borda e foco precisa respeitar o padrão já estabelecido de composição via `className`.
- `tailwindcss`: a troca de `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1` por `focus-ring-duplo` e de `border-input` por `border-subtle` são mudanças de utility Tailwind v4 na string de classes do `<input>`.
- `wcag-audit-patterns`: a task implementa diretamente dois critérios WCAG 2.2 (2.4.13 aparência de foco e 1.4.11 contraste de componentes não-textuais) — as decisões de contraste de borda vêm desse domínio.
- `vercel-react-best-practices`: `Input` é um componente React de UI de base amplamente reutilizado — a mudança precisa preservar `forwardRef`, `displayName` e a API de props sem regressão de comportamento.
- `test-antipatterns`: como não existe teste prévio, o novo `input.test.tsx` deve testar o comportamento observável do elemento renderizado (`toHaveClass` sobre o `<input>` real via `screen.getByRole("textbox")`), não a string interna de `cn(...)`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `Input`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Leia a fonte de design e as ferramentas de fidelidade já registradas na subseção `### Fidelidade Visual` acima (o autor do plano já descobriu isso em tempo de planejamento). Confirme com o usuário se existe uma fonte de design original (ex.: URL) para o anel de foco do componente `Input` — só isso depende do usuário, por isso fica na execução. Neste repositório não há skill/MCP de design-to-code ou teste visual configurada; a implementação segue manualmente o mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando a técnica de "anel duplo" já validada (não redesenhar) e já disponível como classe `focus-ring-duplo` (task-01).

  Esta etapa nunca bloqueia: "sem fonte / sem ferramenta disponível" é uma resposta válida que direciona para implementação manual a partir do mockup.

- **Step 1: Write the failing test**

Criar `apps/frontend/src/components/ui/input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Input } from "./input"

describe("Input", () => {
	test("deve aplicar o anel de foco duplo (focus-ring-duplo) e a borda com contraste (border-subtle)", () => {
		render(<Input placeholder="exemplo" />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveClass("focus-ring-duplo")
		expect(input).toHaveClass("border-subtle")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/input.test.tsx`
Expected: FAIL — o `<input>` ainda tem `border-input` e `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1`, então ambas as asserções `toHaveClass` falham.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/ui/input.tsx`, trocar:

```tsx
					"flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-base text-foreground",
```

por:

```tsx
					"flex h-10 w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground",
```

E trocar:

```tsx
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
```

por:

```tsx
					"focus-ring-duplo",
```

Não alterar a variável global `--color-input` em `globals.css` — o escopo desta task é só a classe local de `input.tsx`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/input.test.tsx`
Expected: PASS

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador commita na barreira de integração. Se seu prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/components/ui/input.tsx apps/frontend/src/components/ui/input.test.tsx
git commit -m "feat: aplica anel de foco duplo e borda com contraste no Input"
```

## Critérios de Sucesso

- `Input` renderiza com a classe `focus-ring-duplo` em vez de `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1` (FR-003).
- `Input` renderiza com a classe `border-subtle` em vez de `border-input`, com contraste ≥3:1 contra `bg-background`/`bg-card` em ambos os temas (FR-011).
- `apps/frontend/src/components/ui/input.test.tsx` existe e passa com o teste `"deve aplicar o anel de foco duplo (focus-ring-duplo) e a borda com contraste (border-subtle)"`.
- A variável global `--color-input` em `globals.css` permanece inalterada — a mudança de borda é local a `input.tsx`.
