# Task 1: Tokens de chanfro com corner-shape e validação do anel de foco [FR-001, FR-002, FR-012, FR-017]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** capable

**Depends on:** N/A

## Visão Geral

Esta task reinterpreta os tokens `--radius-*` de `globals.css` como tamanho de chanfro em vez de raio de arredondamento, com fallback reto (0px) e ativação condicional via `@supports (corner-shape: bevel)`. É a base de toda a feature: nenhuma outra task normaliza componentes antes de confirmar, num spike manual no Chrome, que o anel de foco duplo e as bordas acompanham o chanfro sem cortes.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Test: `apps/frontend/src/app/globals-tokens.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** tokens CSS `--radius-xs` (0px / 2px), `--radius-sm` (0px / 4px), `--radius-md` (0px / 6px), `--radius-lg` (0px / 10px), `--radius-xl` (0px / 12px) — valor base no `@theme`, sobrescrito dentro de `@supports (corner-shape: bevel) { :root { ... } }`; token `--radius-full` removido; regra `*, ::before, ::after { corner-shape: bevel; }` dentro do mesmo bloco `@supports`. `@utility focus-ring-duplo` permanece com a mesma assinatura (box-shadow duplo), consumida sem alteração pelas tasks 3-7. Todas as tasks seguintes (3, 5, 7) consomem esses tokens só via classes `rounded-xs/sm/md/lg/xl` do Tailwind — nunca leem `--radius-*` diretamente.

### Skills a invocar

- `tailwindcss`: confirmar se as classes `rounded-*` do Tailwind v4 leem `var(--radius-*)` em runtime (para o `@supports` sobrescrever) ou embutem o valor no CSS gerado em build (exigindo `@theme inline` ou equivalente).
- `wcag-audit-patterns`: validar que o anel de foco duplo continua visível e completo após a mudança de forma (FR-012).
- `no-workarounds`: se o Biome não reconhecer `corner-shape` como propriedade CSS válida, resolver a causa raiz (atualizar parser/config documentado), nunca suprimir o lint genericamente.
- `test-antipatterns`: manter os testes de `globals-tokens.test.tsx` asserindo o CSS real (texto), sem mockar ou simplificar a asserção a ponto de não detectar regressão.
- `playwright-cli`: conduzir o spike manual no Chrome (abrir `/login`, navegar por Tab, capturar screenshot do anel de foco sobre o campo/botão chanfrado).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-retro-shapes-visual.md` (variante B · Chanfrado: `corner-shape: bevel` nos quatro cantos, tamanho vindo de `--radius-*`, fallback reto).
- **Fonte de design original:** nenhuma; decidido no companion visual do brainstorming (2026-09-24).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? Caso não, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `playwright-cli` e `claude-in-chrome` (screenshot no navegador); não há visual regression automatizado neste ambiente.
- **Decisões visuais já tomadas (não refazer):** chanfro variante B nos quatro cantos via `corner-shape: bevel`; tamanhos 2/4/6/10/12px (xs/sm/md/lg/xl); sem suporte do navegador, canto reto (variante A); borda, fundo, sombra e contorno seguem a forma do elemento (a confirmar no spike).

## Passos

- **Step 1: Review Focus: "Navegador sem `corner-shape` (Firefox/Safari) → cantos retos (raio 0), nunca arredondados" — Write the failing test**

```tsx
test("os cinco tokens de chanfro valem 0px no @theme e --radius-full não existe (fallback reto)", () => {
	expect(lightBlock).toMatch(/--radius-xs:\s*0px;/)
	expect(lightBlock).toMatch(/--radius-sm:\s*0px;/)
	expect(lightBlock).toMatch(/--radius-md:\s*0px;/)
	expect(lightBlock).toMatch(/--radius-lg:\s*0px;/)
	expect(lightBlock).toMatch(/--radius-xl:\s*0px;/)
	expect(lightBlock).not.toContain("--radius-full")
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: FAIL — `--radius-xs` (e os demais) ainda valem `6px`/`8px`/`14px`/`22px`/`22px` no `@theme` atual, e `--radius-full` ainda existe.

- **Step 3: Investigar o binding do Tailwind v4 antes de implementar**

Usando a skill `tailwindcss` (e `context7` se necessário), confirmar se as utilidades `rounded-xs/sm/md/lg/xl` geradas pelo Tailwind v4 referenciam `var(--radius-*)` diretamente no CSS de saída (então a sobrescrita em `@supports` funciona em runtime) ou se o valor é embutido no build. Se embutido, adicionar a diretiva equivalente documentada pelo Tailwind v4 (ex.: `@theme inline`) para os cinco tokens de raio antes do Step 5. Registrar a conclusão na mensagem de commit do Step 8.

- **Step 4: Review Focus: "Anel de foco duplo num botão ou campo chanfrado → aparece completo, sem corte nos cantos" — Write the failing test**

```tsx
test("o bloco @supports (corner-shape: bevel) existe com os cinco tamanhos, e o anel de foco duplo continua sem recorte", () => {
	expect(css).toContain("@utility focus-ring-duplo")
	expect(css).not.toMatch(/clip-path/)
	const start = css.indexOf("@supports (corner-shape: bevel)")
	expect(start).toBeGreaterThan(-1)
	let depth = 0
	let end = start
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++
		if (css[i] === "}") depth--
		if (depth === 0) {
			end = i
			break
		}
	}
	const supportsBlock = css.slice(start, end + 1)
	expect(supportsBlock).toContain("--radius-xs: 2px;")
	expect(supportsBlock).toContain("--radius-sm: 4px;")
	expect(supportsBlock).toContain("--radius-md: 6px;")
	expect(supportsBlock).toContain("--radius-lg: 10px;")
	expect(supportsBlock).toContain("--radius-xl: 12px;")
	expect(supportsBlock).toMatch(/\*,\s*::before,\s*::after\s*\{\s*corner-shape:\s*bevel;/)
})
```

- **Step 5: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: FAIL — `css.indexOf("@supports (corner-shape: bevel)")` retorna `-1` porque o bloco ainda não existe.

- **Step 6: Implementação mínima em `globals.css`**

No `@theme` (linhas 68-73 atuais), trocar os cinco valores por `0px` e remover `--radius-full`:

```css
--radius-xs: 0px;
--radius-sm: 0px;
--radius-md: 0px;
--radius-lg: 0px;
--radius-xl: 0px;
```

Após o `@theme`, adicionar o novo bloco:

```css
@supports (corner-shape: bevel) {
	:root {
		--radius-xs: 2px;
		--radius-sm: 4px;
		--radius-md: 6px;
		--radius-lg: 10px;
		--radius-xl: 12px;
	}
	*,
	::before,
	::after {
		corner-shape: bevel;
	}
}
```

Se o Step 3 concluiu que o Tailwind v4 embute o valor em build, aplicar aqui a diretiva equivalente (`@theme inline` ou a forma documentada) para os cinco tokens de raio, mantendo o restante do `@theme` intocado.

- **Step 7: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: PASS — os dois novos testes e os 12 testes já existentes em `globals-tokens.test.tsx` passam.

- **Step 8: Spike manual — validar chanfro e anel de foco no Chrome (obrigatório antes de concluir)**

1. Rodar `pnpm --filter frontend dev`.
2. Usando a skill `playwright-cli` (ou `claude-in-chrome`), abrir `/login` no Chrome, navegar por Tab até o campo de e-mail e até o botão de submit, e capturar screenshot de cada um focado.
3. Critério de aprovação: o chanfro é visível no canto do campo/botão e o anel de foco duplo (`focus-ring-duplo`) acompanha o contorno chanfrado, completo, sem corte em nenhum dos quatro cantos.
4. **Se o anel de foco for cortado ou não acompanhar o chanfro:** parar imediatamente, marcar esta task como `BLOCKED` (alterar o `Status:` no topo deste arquivo), reportar que a Decisão D1 da spec precisa ser reaberta, e não prosseguir para as tasks 3, 5 e 7 (que dependem desta).
5. Se aprovado, registrar na mensagem de commit do Step 9: o resultado do spike ("anel de foco acompanha o chanfro sem corte") e a versão do Chrome usada.

- **Step 9: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/globals-tokens.test.tsx
git commit -m "feat(frontend): tokens de chanfro com corner-shape e fallback reto"
```

## Critérios de Sucesso

- `--radius-xs/sm/md/lg/xl` valem `0px` no `@theme` e `--radius-full` não existe mais em `globals.css` (FR-001, FR-017).
- O bloco `@supports (corner-shape: bevel)` define os cinco tamanhos (2/4/6/10/12px) e aplica `corner-shape: bevel` a `*, ::before, ::after` (FR-002, FR-017).
- `@utility focus-ring-duplo` continua usando `box-shadow` duplo e nenhuma regra `clip-path` existe em `globals.css` (FR-012).
- O spike manual no Chrome confirma que o anel de foco duplo acompanha o chanfro sem corte, ou a task foi marcada `BLOCKED` com D1 reaberta.
