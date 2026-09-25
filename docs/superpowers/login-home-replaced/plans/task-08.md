# Task 8: Login imersivo: textos, rastro, boot e hover [FR-005, FR-006, FR-010, FR-012, FR-014]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Aplica a identidade Replaced ao `/login`: novos textos do hero e do formulário, `PixelTrail` na coluna da cena, entrada de terminal (`data-boot`) no eyebrow/título/estatísticas e hover pixelado no botão. A grade de 2 colunas e o hero compacto (≤860px) continuam iguais; o formulário nunca recebe `data-boot` (FR-014).

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Test: `apps/frontend/src/app/(public)/login/login-volt.test.tsx`

## Interfaces

- **Consome:** `PixelTrail({ className?: string; cellSize?: number }): JSX.Element` (task-06); atributos `data-boot="eyebrow"|"title"|"stats"` e classe `pixel-hover` (task-07); `PixelScene({ scene: "login", animated, className? })` já com a camada de sol (task-05).
- **Produz:** N/A.

### Skills a invocar

- `impeccable`: título com glow (`bootGlow`) e sol pixelado convivendo sem ruído visual sobre o formulário.
- `frontend-design`: hierarquia do hero imersivo vs. card sólido do formulário, mantendo o "cinematográfico sem atrapalhar a leitura" da spec.
- `wcag-audit-patterns`: `PixelTrail`/`PixelScene` continuam `aria-hidden`; formulário nunca fica atrás de `data-boot` (foco e digitação livres desde o primeiro frame — FR-014).
- `tailwindcss`: `pixel-hover` no botão, sem `rounded-full`/`rounded-[..]` novos.
- `test-antipatterns`: os testes de texto usam `getAllByText`/`within`, não `container.textContent.includes(...)`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/login-home-replaced-visual.md` (bloco HTML "Login: coluna da cena" e "Login: coluna do formulário").
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o login imersivo além do mockup?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` e MCP `claude-in-chrome` — abrir `/login` (desktop e ≤860px) e comparar com o norte (cena atrás do copy, formulário em card sólido, rastro só na coluna da cena).
- **Decisões visuais já tomadas (não refazer):** grade `grid-cols-[1.05fr_1fr]` / `max-[860px]:grid-cols-1` inalterada; hero mobile (`data-testid="login-hero-mobile"`) continua acima do formulário; `LOGIN_STATS` (312/48k/4.9) inalterado; `dark:` já cobre `.sunset` via `@custom-variant` (task-01), sem precisar de variante `sunset:` própria neste arquivo.

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/app/(public)/login/login-volt.test.tsx (assertões a acrescentar/substituir)
import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import LoginPage from "./page"

describe("LoginPage — identidade Replaced", () => {
	test("exibe o novo título do hero no desktop e no mobile", async () => {
		render(<LoginPage />)
		const titles = await screen.findAllByText(/Sua cidade inteira/i)
		expect(titles).toHaveLength(2)
		const mobileHero = screen.getByTestId("login-hero-mobile")
		expect(within(mobileHero).getByText(/Sua cidade inteira/i)).toBeInTheDocument()
	})

	test("exibe o eyebrow do hero e o eyebrow do formulário novos", async () => {
		render(<LoginPage />)
		expect(await screen.findByText("> VOLT // ONLINE")).toBeInTheDocument()
		expect(screen.getByText("Acesso autorizado")).toBeInTheDocument()
	})

	test("o botão de envio usa o texto novo e pixel-hover", async () => {
		render(<LoginPage />)
		const button = await screen.findByTestId("login-submit")
		expect(button).toHaveTextContent("> Entrar")
		expect(button).toHaveClass("pixel-hover")
	})

	test("a cena login roda animada e o rastro de pixels existe na coluna da cena", async () => {
		const { container } = render(<LoginPage />)
		await screen.findByText(/Sua cidade inteira/i)
		const scene = container.querySelector('[data-scene="login"]')
		expect(scene).not.toBeNull()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(scene).toHaveAttribute("data-paused", "false")
		expect(container.querySelector("aside canvas[aria-hidden='true']")).not.toBeNull()
	})

	test("o eyebrow e o título carregam data-boot; o formulário não tem nenhum ancestral [data-boot]", async () => {
		render(<LoginPage />)
		const emailField = await screen.findByLabelText(/E-mail/i)
		expect(emailField.closest("[data-boot]")).toBeNull()
		const submitButton = screen.getByTestId("login-submit")
		expect(submitButton.closest("[data-boot]")).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/\(public\)/login/login-volt.test.tsx`
Expected: FAIL — a página atual exibe "Treine onde você estiver.", "Acesse sua conta" e o botão "Entrar" sem `pixel-hover`; nenhum elemento tem `data-boot`; `getAllByText(/Sua cidade inteira/i)` retorna lista vazia.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/app/(public)/login/page.tsx`, importar `PixelTrail`:

```tsx
import { PixelTrail } from "@/components/ui/pixel-trail"
```

Substituir o `<aside>` (grade desktop) por:

```tsx
<aside className="relative isolate flex flex-col justify-between overflow-hidden bg-surface-3 p-12 dark:bg-background max-[860px]:hidden">
	<div
		aria-hidden="true"
		className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2"
	>
		<PixelScene scene="login" animated />
	</div>
	<PixelTrail />
	<div className="flex flex-col gap-6">
		<p
			data-boot="eyebrow"
			className="font-display text-base tracking-widest text-accent"
		>
			&gt; VOLT // ONLINE
		</p>
		<h2
			data-boot="title"
			className="font-display text-[clamp(48px,7vw,92px)] leading-[0.92] tracking-[-0.03em]"
		>
			Sua cidade inteira é
			<br />
			<span className="text-accent">sua academia</span>.
		</h2>
	</div>
	<div data-boot="stats" className="flex flex-wrap gap-9">
		{LOGIN_STATS.map((stat) => (
			<div key={stat.label} className="flex flex-col gap-0.5">
				<span className="font-display text-4xl text-accent tabular-nums">
					{stat.value}
				</span>
				<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
					{stat.label}
				</span>
			</div>
		))}
	</div>
</aside>
```

Substituir o bloco `data-testid="login-hero-mobile"`:

```tsx
<div
	data-testid="login-hero-mobile"
	className="hidden flex-col gap-4 border-b border-border pb-6 max-[860px]:flex"
>
	<h2
		data-boot="title"
		className="font-display text-3xl leading-[0.95] tracking-[-0.03em]"
	>
		Sua cidade inteira é <span className="text-accent">sua academia</span>.
	</h2>
	<div data-boot="stats" className="flex flex-wrap gap-6">
		{LOGIN_STATS.map((stat) => (
			<div key={stat.label} className="flex flex-col gap-0.5">
				<span className="font-display text-3xl text-accent tabular-nums">
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

Substituir o `<header>` do formulário:

```tsx
<header className="flex flex-col gap-2">
	<Eyebrow>Acesso autorizado</Eyebrow>
	<h1 className="font-display text-[30px] tracking-tight text-foreground">
		Entrar
	</h1>
</header>
```

Substituir o botão de envio:

```tsx
<Button
	type="submit"
	disabled={isPending || isGooglePending}
	data-testid="login-submit"
	className="pixel-hover"
>
	{isPending ? "Entrando…" : "> Entrar"}
</Button>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/\(public\)/login/login-volt.test.tsx`
Expected: PASS — 2 ocorrências de "Sua cidade inteira", eyebrows novos, botão com `pixel-hover` e texto `> Entrar`, e o formulário (campo de e-mail, botão) sem nenhum ancestral `[data-boot]`.

- **Step 5: Commit**

```bash
git add apps/frontend/src/app/\(public\)/login/page.tsx apps/frontend/src/app/\(public\)/login/login-volt.test.tsx
git commit -m "feat(login): identidade Replaced no hero e no formulario"
```

## Critérios de Sucesso

- H1 "Sua cidade inteira é **sua academia**." aparece no desktop e no mobile (FR-006).
- Eyebrow do hero `> VOLT // ONLINE`, eyebrow do formulário "Acesso autorizado", botão `> Entrar`/"Entrando…" (FR-006).
- `PixelTrail` está dentro do `<aside>` da cena, atrás do copy (FR-005, FR-010 herdado da task-06).
- Eyebrow, título e estatísticas têm `data-boot`; nenhum campo ou botão do formulário tem ancestral `[data-boot]` (FR-014).
- Botão de envio tem a classe `pixel-hover` (FR-012).
- Grade de 2 colunas e hero mobile (`data-testid="login-hero-mobile"`) inalterados na estrutura.
