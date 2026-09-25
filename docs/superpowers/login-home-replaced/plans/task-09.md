# Task 9: Home pública: hero sunset, textos e features [FR-007, FR-008, FR-009, FR-010, FR-012]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Reescreve o hero da home `/` sobre a cena `sunset` (skyline sutil, rastro de pixels), com os textos novos e a remoção definitiva de "Demo monocromática"/"Inspirado em Ollama". Os 3 cards de features passam a ser "Encontre", "Faça check-in" e "Mantenha a sequência". As seções Planos e Contato continuam intactas.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/page.tsx`
- Test: `apps/frontend/src/app/(public)/page.test.tsx`

## Interfaces

- **Consome:** `PixelTrail({ className?: string; cellSize?: number }): JSX.Element` (task-06); atributos `data-boot="eyebrow"|"title"` e classe `pixel-hover` (task-07); `PixelScene({ scene: "sunset", animated, className? })` (task-05).
- **Produz:** N/A.

### Skills a invocar

- `impeccable`: hero sutil sobre a cena (skyline a ~60% já resolvida na task-05), sem competir com o H1.
- `frontend-design`: hierarquia badge → H1 → descrição → CTAs mantendo o "hero atual, porém mais discreto" do mockup.
- `wcag-audit-patterns`: `PixelScene`/`PixelTrail` continuam `aria-hidden`; CTAs mantêm contraste e foco visível com `pixel-hover`.
- `vercel-react-best-practices`: `LandingPage` continua RSC; `PixelScene`/`PixelTrail` (client) entram como filhos sem exigir `"use client"` na página.
- `test-antipatterns`: usar `renderWithProviders(await LandingPage())` e MSW (`server.use`) para o caso de falha da API, como já feito no arquivo.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/login-home-replaced-visual.md` (bloco HTML "Home /").
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a home além do mockup?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` e MCP `claude-in-chrome` — abrir `/` e comparar a opacidade da skyline e a posição dos CTAs com o norte.
- **Decisões visuais já tomadas (não refazer):** CTA primário sólido, CTA secundário com contorno `accent` (ambos `pixel-hover`); seções Planos e Contato variam só pelas cores do tema ativo (FR-009), sem mudança de estrutura.

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/app/(public)/page.test.tsx
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"
import { SERVER_API_URL } from "@/lib/server-api-url"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import LandingPage from "./page"

describe("LandingPage — identidade Replaced", () => {
	test("CTAs levam a cadastro e login, ambos com pixel-hover", async () => {
		const { getByTestId } = renderWithProviders(await LandingPage())
		const signup = getByTestId("cta-signup")
		const login = getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(signup).toHaveClass("pixel-hover")
		expect(login).toHaveAttribute("href", "/login")
		expect(login).toHaveClass("pixel-hover")
	})

	test("exibe o hero novo e não exibe os textos da identidade antiga", async () => {
		const { getByRole, getByText, queryByText } = renderWithProviders(
			await LandingPage(),
		)
		expect(
			getByRole("heading", { level: 1, name: /qualquer academia/i }),
		).toBeInTheDocument()
		expect(getByText(/um plano, centenas de academias/i)).toBeInTheDocument()
		expect(queryByText(/Ollama/i)).toBeNull()
		expect(queryByText("Demo monocromática")).toBeNull()
	})

	test("exibe os 3 cards de features novos", async () => {
		const { getByText } = renderWithProviders(await LandingPage())
		expect(getByText("Encontre")).toBeInTheDocument()
		expect(getByText("Faça check-in")).toBeInTheDocument()
		expect(getByText("Mantenha a sequência")).toBeInTheDocument()
	})

	test("exibe a cena sunset no hero", async () => {
		const { container } = renderWithProviders(await LandingPage())
		expect(container.querySelector('[data-scene="sunset"]')).not.toBeNull()
	})

	test("quando a API de planos falha, a seção Escolha seu plano some", async () => {
		server.use(http.get(`${SERVER_API_URL}/plans`, () => HttpResponse.error()))
		const { queryByText } = renderWithProviders(await LandingPage())
		expect(queryByText("Escolha seu plano")).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/\(public\)/page.test.tsx`
Expected: FAIL — a página atual exibe "Acesso a academias, sem fricção.", "Demo monocromática" e o texto com "Inspirado em Ollama"; não há `[data-scene="sunset"]`; os CTAs não têm `pixel-hover`; os cards de features são "Check-in em segundos"/"Histórico transparente"/"Administração simples".

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/app/(public)/page.tsx`, importar as camadas visuais:

```tsx
import { PixelScene } from "@/components/ui/pixel-scene"
import { PixelTrail } from "@/components/ui/pixel-trail"
```

Substituir a seção do hero:

```tsx
<section
	aria-labelledby="hero-title"
	className="relative flex flex-col items-start gap-8 overflow-hidden rounded-md p-8 sm:p-12"
>
	<PixelScene scene="sunset" animated className="absolute inset-0 -z-10" />
	<PixelTrail />
	<span
		data-boot="eyebrow"
		className="font-display text-base tracking-widest text-accent"
	>
		&gt; REDE VOLT ONLINE
	</span>
	<h1
		id="hero-title"
		data-boot="title"
		className="font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
	>
		Qualquer academia. Um{" "}
		<em className="text-accent not-italic">check-in</em>.
	</h1>
	<p className="max-w-2xl text-lg text-muted-foreground">
		Um plano, centenas de academias parceiras. Chegou, fez check-in, treinou.
	</p>
	<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
		<Link
			href="/cadastro"
			data-testid="cta-signup"
			className="pixel-hover inline-flex items-center justify-center rounded-md border border-primary bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
		>
			&gt; Começar agora
		</Link>
		<Link
			href="/login"
			data-testid="cta-login"
			className="pixel-hover inline-flex items-center justify-center rounded-md border border-accent px-6 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
		>
			Já tenho conta
		</Link>
	</div>
</section>
```

Substituir os 3 `<li>` da grade de features:

```tsx
<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	<li className="rounded-md border border-border bg-card p-6">
		<h3 className="font-display text-xl text-foreground">Encontre</h3>
		<p className="mt-2 text-sm text-muted-foreground">
			academias parceiras perto de você, no mapa.
		</p>
	</li>
	<li className="rounded-md border border-border bg-card p-6">
		<h3 className="font-display text-xl text-foreground">Faça check-in</h3>
		<p className="mt-2 text-sm text-muted-foreground">
			validação na hora, sem catraca de papel.
		</p>
	</li>
	<li className="rounded-md border border-border bg-card p-6">
		<h3 className="font-display text-xl text-foreground">
			Mantenha a sequência
		</h3>
		<p className="mt-2 text-sm text-muted-foreground">
			acompanhe dias, semanas e metas.
		</p>
	</li>
</ul>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/\(public\)/page.test.tsx`
Expected: PASS — os 5 testes do arquivo, incluindo a ausência de "Demo monocromática"/"Ollama" e o caso de falha da API de planos (FR-009, mantido).

- **Step 5: Commit**

```bash
git add apps/frontend/src/app/\(public\)/page.tsx apps/frontend/src/app/\(public\)/page.test.tsx
git commit -m "feat(home): hero sunset e textos novos na home publica"
```

## Critérios de Sucesso

- H1 "Qualquer academia. Um **check-in**." e descrição novos substituem os textos antigos (FR-007).
- "Demo monocromática" e "Inspirado em Ollama" não aparecem em nenhum lugar da página (FR-008).
- Os 3 cards de features são "Encontre", "Faça check-in", "Mantenha a sequência" (FR-008).
- `PixelScene scene="sunset"` e `PixelTrail` aparecem no hero (FR-007).
- CTAs `cta-signup`/`cta-login` mantêm `href` e ganham `pixel-hover` (FR-012).
- Seções Planos e Contato continuam renderizando via `PlansSectionHero`/`ContactSection`, inclusive o caso de falha da API (FR-009).
