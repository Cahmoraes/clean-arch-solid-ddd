# Task 2: Adicionar bloco hero mobile e ajustar os testes

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/login-hero-mobile-design.md`
**Depends on:** task-01

## Visão Geral

Adicionar o bloco hero mobile (`hidden max-[860px]:flex`) como primeiro filho do wrapper do formulário, reaproveitando o `LOGIN_STATS` criado na Task 1. Como o toggle é CSS puro, no JSDOM (que ignora media queries de viewport) o conteúdo do hero passa a existir **duas vezes** no DOM — uma no `<aside>` desktop e outra no bloco mobile. Por isso a asserção `getByText(/Treine onde/i)` em `login-volt.test.tsx` quebra com "multiple elements" e precisa virar `getAllByText`, além de adicionarmos um teste dedicado ao bloco mobile escopado por `within`.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Test: `apps/frontend/src/app/(public)/login/login-volt.test.tsx`

### Conformidade com as Skills Padrão

- use react: renderização de lista com `key` estável; bloco condicional via classes CSS, sem JS de viewport.
- use tailwindcss: toggle `hidden` / `max-[860px]:flex`; tokens `text-accent`, `border-border`, `font-mono tabular-nums`.
- use test-antipatterns: escopar asserções do bloco mobile com `within` para evitar ambiguidade de múltiplos elementos; asserções intencionais e legíveis.
- use vitest: `test` em PT-BR (nunca `it`), Testing Library queries.

## Passos

> **Convenção do projeto:** indentação com TAB (Biome). Aspas duplas. Os blocos de código abaixo usam tabs.

- **Step 1: Atualizar o import e os testes em `login-volt.test.tsx` (test-first)**

Trocar a primeira linha de import para incluir `within`:

```tsx
import { screen, within } from "@testing-library/react"
```

Substituir o teste `exibe o painel-marca com o hero` (que hoje usa `getByText`) e adicionar o teste do bloco mobile, deixando o bloco `describe("Login VOLT", ...)` assim:

```tsx
describe("Login VOLT", () => {
	test("exibe o hero no painel-marca desktop e no bloco mobile", () => {
		renderWithProviders(<LoginPage />)
		expect(screen.getAllByText(/Treine onde/i)).toHaveLength(2)
	})

	test("exibe o hero compacto no bloco mobile com as estatísticas", () => {
		renderWithProviders(<LoginPage />)
		const mobileHero = screen.getByTestId("login-hero-mobile")
		expect(within(mobileHero).getByText(/Treine onde/i)).toBeInTheDocument()
		expect(within(mobileHero).getByText("312")).toBeInTheDocument()
		expect(within(mobileHero).getByText("48k")).toBeInTheDocument()
		expect(within(mobileHero).getByText("4.9")).toBeInTheDocument()
	})

	test("preserva os campos e o botão de submit", () => {
		renderWithProviders(<LoginPage />)
		expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
		expect(screen.getByTestId("login-submit")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm --filter frontend test -- login-volt`
Expected: FAIL — `getAllByText(/Treine onde/i)` retorna `length 1` (só o aside existe ainda) e `getByTestId("login-hero-mobile")` lança "Unable to find an element by: [data-testid='login-hero-mobile']".

- **Step 3: Inserir o bloco hero mobile em `page.tsx`**

Localizar o wrapper interno da coluna do formulário — `<div className="mx-auto flex w-full max-w-[400px] flex-col gap-8">` (linha 113) — e inserir o bloco abaixo como **primeiro filho**, imediatamente antes do `<header className="flex flex-col gap-2">`:

```tsx
<div
	data-testid="login-hero-mobile"
	className="hidden flex-col gap-4 border-b border-border pb-6 max-[860px]:flex"
>
	<h2 className="font-display text-3xl font-bold leading-[0.95] tracking-[-0.03em]">
		Treine onde <span className="text-accent">você</span> estiver.
	</h2>
	<div className="flex flex-wrap gap-6">
		{LOGIN_STATS.map((stat) => (
			<div key={stat.label} className="flex flex-col gap-0.5">
				<span className="font-mono text-2xl font-bold text-accent tabular-nums">
					{stat.value}
				</span>
				<span className="text-xs text-muted-foreground dark:text-white/55">
					{stat.label}
				</span>
			</div>
		))}
	</div>
</div>
```

O `<aside>` desktop continua com `max-[860px]:hidden`; o novo bloco usa `hidden max-[860px]:flex` — mutuamente exclusivos.

- **Step 4: Rodar os testes do login (devem passar)**

Run: `pnpm --filter frontend test -- login`
Expected: PASS — `login-volt.test.tsx` (3 testes) e `page.test.tsx` (9 testes) todos verdes. `getAllByText(/Treine onde/i)` agora retorna `length 2`; o bloco mobile é encontrado por testid.

- **Step 5: Rodar o gate completo do frontend**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test && pnpm --filter frontend build`
Expected: Biome zero problemas; zero erros de tipo; toda a suíte verde; build de produção concluído sem erros.

- **Step 6: Commit**

```bash
git add apps/frontend/src/app/\(public\)/login/page.tsx apps/frontend/src/app/\(public\)/login/login-volt.test.tsx
git commit -m "feat(login): show adapted hero content on mobile viewports"
```

## Critérios de Sucesso

- O bloco `data-testid="login-hero-mobile"` existe acima do formulário, com título "Treine onde você estiver." e as 3 estatísticas vindas de `LOGIN_STATS`.
- Toggle CSS puro: aside `max-[860px]:hidden` e bloco mobile `hidden max-[860px]:flex` — nunca ambos visíveis nem ambos ocultos.
- `login-volt.test.tsx` usa `getAllByText`/`within` e passa; `page.test.tsx` permanece verde sem alteração.
- `pnpm --filter frontend lint:fix`, `tsc:check`, `test` e `build` passam 100%.
