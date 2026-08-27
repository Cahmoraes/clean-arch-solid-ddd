# Task 1: Tokens globais de acessibilidade em `globals.css` (anel de foco duplo + utility + `font-size` em `rem`) [FR-003, FR-005]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** capable
**Depends on:** N/A

## Visão Geral

Cria, em `apps/frontend/src/app/globals.css`, a fundação de acessibilidade consumida por todas as primitivas de UI e overrides locais das próximas waves: uma utility Tailwind v4 `focus-ring-duplo` que implementa a técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno na cor do texto), substituindo o token global `*:focus-visible` (hoje `outline` sólido com `color-mix`) pela mesma técnica. Além disso, converte o `font-size` do `body` de `px` fixo para `rem`, preservando o tamanho computado atual, para que o zoom de texto do usuário (WCAG 1.4.4) funcione corretamente. Esta task é a base de que 9 outras tasks (12 a 19) dependem para trocar suas classes de foco locais por `focus-ring-duplo`.

**Mudança nesta revisão:** o teste original comparava o conteúdo bruto de `globals.css` com `toContain` sobre a string literal do `box-shadow` (ex.: `"box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground);"`). Esse acoplamento quebra em produção: o CSS é minificado no build do Next.js e nunca chega ao navegador com essa formatação exata (espaçamento, quebras de linha, ordem de declarações). Testar string a string também não prova que o efeito visual funciona — só que uma substring existe no arquivo-fonte. Esta task passa a testar **comportamento renderizado**, via Playwright (e2e), inspecionando `getComputedStyle` de elementos reais no DOM após o build: quantas camadas de `box-shadow` o navegador computa para um elemento em `:focus-visible`, e se o `font-size` do `body` escala quando o `font-size` da raiz muda (prova de unidade relativa, já que `getComputedStyle` sempre resolve `rem`/`px` para o mesmo valor absoluto em `px` — a única forma observável de diferenciar as duas é pelo comportamento de escala).

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/e2e/accessibility.spec.ts`

### Conformidade com as Skills Padrão

- `tailwindcss`: a task cria uma `@utility` Tailwind v4 (`focus-ring-duplo`) dentro de `globals.css` e ajusta o token global `*:focus-visible` — exige conhecimento de sintaxe Tailwind v4 (`@theme`, `@utility`, `@layer base`).
- `wcag-audit-patterns`: a task implementa diretamente dois critérios WCAG 2.2 (1.4.11 contraste de foco não-textual / 2.4.13 aparência de foco, e 1.4.4 redimensionamento de texto) — decisões de contraste e unidade relativa vêm desse domínio.
- `playwright-cli`: o teste desta task é e2e (Playwright), rodando contra a aplicação real (build/dev server) e lendo `getComputedStyle` do DOM — exige conhecimento de navegação, foco via teclado e `page.evaluate` do Playwright.
- `test-antipatterns`: evita acoplar o teste a um detalhe de implementação incidental (a formatação exata da string CSS, destruída pela minificação) — o teste correto verifica o comportamento renderizado (quantas camadas de sombra o navegador computa, se o texto escala com a fonte raiz), não a saída de um transformador de build fora do controle desta task.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code configurada para comparação pixel-a-pixel; a verificação comportamental do anel de foco nesta task usa Playwright (`playwright-cli`) contra a aplicação real.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Leia a fonte de design e as ferramentas de fidelidade já registradas na subseção `### Fidelidade Visual` acima (o autor do plano já descobriu isso em tempo de planejamento). Confirme com o usuário se existe uma fonte de design original (ex.: URL) para o anel de foco — só isso depende do usuário, por isso fica na execução. Neste repositório não há skill/MCP de design-to-code configurada para comparação pixel-a-pixel; a implementação segue manualmente o mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando a técnica de "anel duplo" já validada (não redesenhar), e a verificação comportamental é feita via Playwright contra a página `/login` real.

  Esta etapa nunca bloqueia: "sem fonte / sem ferramenta disponível" é uma resposta válida que direciona para implementação manual a partir do mockup.

- **Step 1: Write the failing test**

Em `apps/frontend/e2e/accessibility.spec.ts`, adicionar um novo `test.describe` (após o describe `"Acessibilidade — telas públicas"` existente):

```ts
test.describe("Acessibilidade — tokens globais (anel de foco duplo + zoom de texto)", () => {
	test("o anel de foco do primeiro elemento focável no login usa duas camadas de box-shadow, não outline sólido", async ({
		page,
	}) => {
		await page.goto("/login")
		await page.keyboard.press("Tab")
		const boxShadow = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			if (!el) return null
			return window.getComputedStyle(el).boxShadow
		})
		expect(boxShadow).not.toBeNull()
		expect(boxShadow).not.toBe("none")
		// A técnica de "anel duplo" produz exatamente 2 camadas de box-shadow
		// (gap na cor de fundo + contorno na cor do texto); cada camada tem sua
		// própria cor "rgb(...)" — contar ocorrências prova a estrutura de 2
		// camadas sem depender da formatação exata (minificada ou não) do CSS-fonte.
		const layerCount = (boxShadow?.match(/rgba?\(/g) ?? []).length
		expect(layerCount).toBe(2)
	})

	test("o font-size do body escala quando o font-size da raiz aumenta (unidade relativa, não px fixo)", async ({
		page,
	}) => {
		await page.goto("/login")
		const baselinePx = await page.evaluate(() =>
			Number.parseFloat(window.getComputedStyle(document.body).fontSize),
		)
		await page.evaluate(() => {
			document.documentElement.style.fontSize = "32px"
		})
		const scaledPx = await page.evaluate(() =>
			Number.parseFloat(window.getComputedStyle(document.body).fontSize),
		)
		// Dobrar o font-size da raiz (16px → 32px) deve dobrar proporcionalmente
		// o font-size computado do body SE ele estiver em rem. Um valor em px fixo
		// permaneceria igual a baselinePx independente da raiz — é o único jeito
		// observável de provar a unidade relativa via getComputedStyle, que sempre
		// resolve para px absoluto e não expõe a unidade de origem.
		expect(scaledPx).toBeCloseTo(baselinePx * 2, 1)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec playwright test e2e/accessibility.spec.ts -g "tokens globais"`
Expected: FAIL — o teste `"o anel de foco do primeiro elemento focável no login usa duas camadas de box-shadow, não outline sólido"` falha porque `*:focus-visible` hoje usa `outline: 2px solid color-mix(...)` sem `box-shadow` (0 camadas, não 2). O teste de `font-size` também falha porque `body` hoje usa `font-size: 15px` fixo — `scaledPx` permanece igual a `baselinePx` em vez de dobrar.

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

Run: `pnpm --filter frontend exec playwright test e2e/accessibility.spec.ts -g "tokens globais"`
Expected: PASS — os 2 testes novos passam.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador commita na barreira de integração. Se seu prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/e2e/accessibility.spec.ts
git commit -m "feat: adiciona utility focus-ring-duplo e font-size relativo em globals.css"
```

## Critérios de Sucesso

- A utility `focus-ring-duplo` está definida em `globals.css` usando `box-shadow` de duas camadas (gap na cor de fundo + contorno na cor do texto), sem depender de `--color-ring`.
- O token global `*:focus-visible` usa a mesma técnica de anel duplo (não mais `outline` sólido com `color-mix`) — verificado pelo `getComputedStyle` de um elemento focado via teclado renderizando 2 camadas de `box-shadow`, não pela string-fonte do CSS.
- O `font-size` do `body` é relativo (`rem`), não mais um valor `px` fixo — verificado pelo comportamento de escala: dobrar o `font-size` da raiz dobra o `font-size` computado do `body`.
- `--color-input` permanece inalterado (fora do escopo desta task, reservado para a Task 13/14 via `border-subtle`).
- `apps/frontend/e2e/accessibility.spec.ts` passa com os 2 testes novos descritos no describe `"Acessibilidade — tokens globais (anel de foco duplo + zoom de texto)"`.
