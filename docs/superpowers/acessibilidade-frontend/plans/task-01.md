# Task 1: Tokens globais de acessibilidade em `globals.css` (anel de foco duplo + utility + `font-size` em `rem`) [FR-003, FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** capable
**Depends on:** N/A

## Visão Geral

Cria, em `apps/frontend/src/app/globals.css`, a fundação de acessibilidade consumida por todas as primitivas de UI e overrides locais das próximas waves: uma utility Tailwind v4 `focus-ring-duplo` que implementa a técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno na cor do texto), substituindo o token global `*:focus-visible` (hoje `outline` sólido com `color-mix`) pela mesma técnica. Além disso, converte o `font-size` do `body` de `px` fixo para `rem`, preservando o tamanho computado atual, para que o zoom de texto do usuário (WCAG 1.4.4) funcione corretamente. Esta task é a base de que 9 outras tasks (12 a 19) dependem para trocar suas classes de foco locais por `focus-ring-duplo`.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Test: `apps/frontend/src/app/globals.css.test.ts`

### Conformidade com as Skills Padrão

- `tailwindcss`: a task cria uma `@utility` Tailwind v4 (`focus-ring-duplo`) dentro de `globals.css` e ajusta o token global `*:focus-visible` — exige conhecimento de sintaxe Tailwind v4 (`@theme`, `@utility`, `@layer base`).
- `wcag-audit-patterns`: a task implementa diretamente dois critérios WCAG 2.2 (1.4.11 contraste de foco não-textual / 2.4.13 aparência de foco, e 1.4.4 redimensionamento de texto) — decisões de contraste e unidade relativa vêm desse domínio.
- `test-antipatterns`: o teste desta task não renderiza um componente (não há consumidor direto no mesmo diff) — é um teste de conteúdo de arquivo; a skill evita armadilhas como testar a string errada ou acoplar o teste a formatação incidental do CSS.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Leia a fonte de design e as ferramentas de fidelidade já registradas na subseção `### Fidelidade Visual` acima (o autor do plano já descobriu isso em tempo de planejamento). Confirme com o usuário se existe uma fonte de design original (ex.: URL) para o anel de foco — só isso depende do usuário, por isso fica na execução. Neste repositório não há skill/MCP de design-to-code ou teste visual configurada; a implementação segue manualmente o mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando a técnica de "anel duplo" já validada (não redesenhar). Esta task não tem componente visual próprio (é um token CSS de fundação) — a fidelidade visual real é verificada quando as tasks 12-19 aplicam a classe `focus-ring-duplo`.

  Esta etapa nunca bloqueia: "sem fonte / sem ferramenta disponível" é uma resposta válida que direciona para implementação manual a partir do mockup.

- **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const currentDir = dirname(fileURLToPath(import.meta.url))

function readGlobalsCss(): string {
	return readFileSync(join(currentDir, "globals.css"), "utf-8")
}

describe("globals.css — tokens de acessibilidade (anel de foco duplo + font-size relativo)", () => {
	test("define a utility focus-ring-duplo com box-shadow de duas camadas e migra o *:focus-visible global para a mesma técnica", () => {
		const css = readGlobalsCss()
		expect(css).toContain("@utility focus-ring-duplo")
		expect(css).toContain(
			"box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground);",
		)
		expect(css).not.toContain(
			"outline: 2px solid color-mix(in srgb, var(--color-ring) 55%, transparent);",
		)
	})

	test("define o font-size do body em rem (0.9375rem) em vez de px fixo", () => {
		const css = readGlobalsCss()
		expect(css).toContain("font-size: 0.9375rem;")
		expect(css).not.toContain("font-size: 15px;")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals.css.test.ts`
Expected: FAIL — as 2 asserções `toContain("@utility focus-ring-duplo")` e `toContain("font-size: 0.9375rem;")` falham porque `globals.css` ainda não tem essas strings.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/app/globals.css`, trocar o `font-size` do `body` (hoje `font-size: 15px;`, dentro do bloco `body { ... }`) por:

```css
body {
	min-height: 100%;
	background-color: var(--color-background);
	color: var(--color-foreground);
	font-family: var(--font-sans);
	font-size: 0.9375rem;
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
```

Adicionar a utility `focus-ring-duplo` logo após o bloco `.dark { ... }` e antes de `@layer base { ... }`:

```css
@utility focus-ring-duplo {
	&:focus-visible {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground);
	}
}
```

Trocar o token global `*:focus-visible` (dentro de `@layer base`, hoje `outline: 2px solid color-mix(in srgb, var(--color-ring) 55%, transparent); outline-offset: 2px;`) pela mesma técnica de anel duplo:

```css
	*:focus-visible {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground);
	}
```

Não alterar `--color-input` nem qualquer outro token de `@theme`/`.dark` — o escopo desta task é só a utility de foco e o `font-size` do `body`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals.css.test.ts`
Expected: PASS — 2 testes passam.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador commita na barreira de integração. Se seu prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/globals.css.test.ts
git commit -m "feat: adiciona utility focus-ring-duplo e font-size relativo em globals.css"
```

## Critérios de Sucesso

- A utility `focus-ring-duplo` está definida em `globals.css` usando `box-shadow` de duas camadas (gap na cor de fundo + contorno na cor do texto), sem depender de `--color-ring`.
- O token global `*:focus-visible` usa a mesma técnica de anel duplo (não mais `outline` sólido com `color-mix`).
- O `font-size` do `body` é `0.9375rem` (equivalente computado a 15px), não mais um valor `px` fixo.
- `--color-input` permanece inalterado (fora do escopo desta task, reservado para a Task 13/14 via `border-subtle`).
- `apps/frontend/src/app/globals.css.test.ts` passa com as 2 asserções descritas.
