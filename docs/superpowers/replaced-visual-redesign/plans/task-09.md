# Task 9: Cenas no login e no hero do dashboard [FR-008]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-05, task-07

## Visão Geral

Coloca a arte pixel nas duas primeiras superfícies de destaque: a coluna de marca do login e o card de perfil do topo do dashboard. A cena fica atrás do conteúdo, `aria-hidden`, sem alterar campos, textos nem o fluxo de login. O `ProfileHeroCard` ganha o primeiro teste próprio.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Test: `apps/frontend/src/app/(public)/login/login-volt.test.tsx`
- Create: `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx`

## Interfaces

- **Consome:** de task-07, `apps/frontend/src/components/ui/pixel-scene.tsx`: `export function PixelScene({ scene, animated = false, className }: PixelSceneProps)`, com `type PixelSceneName = "login" | "hero" | "empty"`; o SVG renderizado tem `data-scene`, `data-paused` e `aria-hidden="true"`. Nos testes, de task-05: `mockMatchMedia(initialMatches: boolean)` e `mockIntersectionObserver()` de `@/test/browser-mocks`.
- **Produz:** `LoginPage` e `ProfileHeroCard` (assinaturas inalteradas: `export default function LoginPage()`, `export function ProfileHeroCard({ thisMonth, streak }: { thisMonth: number; streak: number })`) exibindo `<PixelScene scene="login" animated />` e `<PixelScene scene="hero" animated />`.

### Conformidade com as Skills Padrão

- `frontend-design`: cena como fundo da coluna e do card, com texto legível por cima; movimento sutil.
- `vercel-composition-patterns`: a cena entra como filho decorativo posicionado; nenhum prop novo nos componentes de página.
- `vercel-react-best-practices`: nenhuma nova dependência de dados; o card mantém `useMe`/`useMetrics`.
- `tailwindcss`: camada da cena com `absolute inset-x-0 bottom-0 -z-10` dentro de um contêiner `isolate`, conteúdo sem mudança de posicionamento, só tokens.
- `wcag-audit-patterns`: cena `aria-hidden`; texto sobre a arte mantém contraste (a arte fica na faixa inferior e com opacidade reduzida).
- `test-antipatterns`: testes por papéis e atributos visíveis; hooks de dados mockados na fronteira do módulo.
- `no-workarounds`: contexto de empilhamento por `isolate`, sem `z-index` arbitrário; nada de esconder a cena para passar teste.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-visual.md` (seção "Cena" e "Estrutura do dashboard (KPI + hero)")
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o login e o dashboard? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** arte só em login, hero do dashboard e estados vazios; skyline em duas camadas com feixes ciano e magenta e movimento sutil; tela de login sem alterar campos; o card do hero mantém avatar, nome, e-mail, badge de conta e estatísticas

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote (login em 1280px de largura e em 390px, tema escuro e claro).

- **Step 1: Write the failing test**

Acrescentar dentro do `describe("Login VOLT", ...)` de `apps/frontend/src/app/(public)/login/login-volt.test.tsx`, depois do último teste:

```tsx
	test("exibe a cena pixel decorativa na coluna de marca sem alterar o formulário", () => {
		const { container } = renderWithProviders(<LoginPage />)
		const scene = container.querySelector('svg[data-scene="login"]')
		expect(scene).toBeInTheDocument()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
		expect(screen.getByTestId("login-submit")).toBeInTheDocument()
		expect(screen.getAllByText(/Treine onde/i)).toHaveLength(2)
	})

	test("a cena de login anima (data-paused false) quando nada a pausa", () => {
		const { container } = renderWithProviders(<LoginPage />)
		expect(container.querySelector('svg[data-scene="login"]')).toHaveAttribute(
			"data-paused",
			"false",
		)
	})
```

Criar `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { mockIntersectionObserver, mockMatchMedia } from "@/test/browser-mocks"

let meState: {
	data?: {
		name: string
		email: string
		createdAt: string
		status: string
	}
	isLoading: boolean
} = {
	data: {
		name: "Ana Souza",
		email: "ana@example.com",
		createdAt: "2025-01-12T08:00:00.000Z",
		status: "activated",
	},
	isLoading: false,
}

vi.mock("@/features/profile/api", () => ({
	useMe: () => meState,
	useMetrics: () => ({ data: { checkInsCount: 12 } }),
}))

import { ProfileHeroCard } from "./profile-hero-card"

afterEach(() => {
	vi.unstubAllGlobals()
	meState = {
		data: {
			name: "Ana Souza",
			email: "ana@example.com",
			createdAt: "2025-01-12T08:00:00.000Z",
			status: "activated",
		},
		isLoading: false,
	}
})

describe("ProfileHeroCard", () => {
	test("exibe a cena pixel do hero, decorativa, atrás do conteúdo", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { container } = render(<ProfileHeroCard thisMonth={4} streak={2} />)
		const scene = container.querySelector('svg[data-scene="hero"]')
		expect(scene).toBeInTheDocument()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(scene).toHaveAttribute("data-paused", "false")
	})

	test("o texto do card continua acessível com a cena presente", () => {
		render(<ProfileHeroCard thisMonth={4} streak={2} />)
		expect(screen.getByText("Ana Souza")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByText(/Membro desde/)).toBeInTheDocument()
		expect(screen.getByText("Conta ativa")).toBeInTheDocument()
		expect(screen.getByText("Total")).toBeInTheDocument()
		expect(screen.getByText("Este mês")).toBeInTheDocument()
		expect(screen.getByText("Sequência")).toBeInTheDocument()
		expect(screen.getByText("12")).toBeInTheDocument()
	})

	test("durante o carregamento mostra o esqueleto e nenhuma cena", () => {
		meState = { data: undefined, isLoading: true }
		const { container } = render(<ProfileHeroCard thisMonth={0} streak={0} />)
		expect(container.querySelector("[data-scene]")).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test "src/app/(public)/login/login-volt.test.tsx" src/features/dashboard/components/profile-hero-card.test.tsx`
Expected: FAIL. Os testes de cena falham com `expect(element).toBeInTheDocument()` sobre `null` (nenhum `svg[data-scene="login"]` nem `svg[data-scene="hero"]`); o teste de carregamento e o de texto do hero passam.

- **Step 3: Write minimal implementation**

3a. `apps/frontend/src/app/(public)/login/page.tsx`: adicionar `import { PixelScene } from "@/components/ui/pixel-scene"` (respeitando a ordenação de imports do Biome) e, no `<aside ...>` desktop, acrescentar `isolate` às classes e inserir a cena como primeiro filho, atrás do conteúdo (`-z-10` dentro do contexto de empilhamento criado por `isolate`; título e estatísticas ficam intactos):

```tsx
				<aside className="relative isolate flex flex-col justify-between overflow-hidden bg-surface-3 p-12 dark:bg-background max-[860px]:hidden">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2"
					>
						<PixelScene scene="login" animated />
					</div>
					<h2 className="font-display text-[clamp(48px,7vw,92px)] font-bold leading-[0.92] tracking-[-0.03em]">
```

Se a linha do `<aside>` ainda tiver `dark:bg-[#0a0a0a]` (a tarefa 4 troca por `dark:bg-background`), manter as classes que estiverem no arquivo e apenas acrescentar `isolate` e o primeiro filho acima. O restante do `<aside>` (título e estatísticas) não muda.

3b. `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`: importar `import { PixelScene } from "@/components/ui/pixel-scene"` e, no `return` final de `ProfileHeroCard`, acrescentar `relative isolate overflow-hidden` ao contêiner e inserir a cena como primeiro filho; o restante do JSX não muda:

```tsx
	return (
		<div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:flex-wrap md:items-center">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 opacity-60"
			>
				<PixelScene scene="hero" animated />
			</div>
			<div className="flex items-center gap-4">
				<Avatar name={me?.name} />
				<UserInfo me={me} />
			</div>
			<InlineStats
				total={metrics?.checkInsCount ?? 0}
				thisMonth={thisMonth}
				streak={streak}
			/>
		</div>
	)
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test "src/app/(public)/login/login-volt.test.tsx" "src/app/(public)/login/page.test.tsx" src/features/dashboard/components/profile-hero-card.test.tsx src/features/dashboard/components/dashboard-page.test.tsx`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add "apps/frontend/src/app/(public)/login/page.tsx" "apps/frontend/src/app/(public)/login/login-volt.test.tsx" apps/frontend/src/features/dashboard/components/profile-hero-card.tsx apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx
git commit -m "feat(frontend): cenas pixel no login e no hero do dashboard"
```

## Critérios de Sucesso

- O login exibe a cena `login` animada, `aria-hidden`, na coluna de marca; campos, botão e textos permanecem (FR-008).
- O topo do dashboard exibe a cena `hero` animada, `aria-hidden`, atrás do card de perfil, com o texto intacto (FR-008).
- Durante o carregamento do card não há cena; nenhuma outra tela ganhou a cena nesta tarefa.
