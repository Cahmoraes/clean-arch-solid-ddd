# Task 10: Cena no estado vazio [FR-008]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-07

## Visão Geral

O `EmptyState` ganha a prop opcional `scene` que mostra a cena pixel `empty` ao lado do texto. A cena é aplicada nos estados vazios de lista de academias sem resultado, de usuários e de check-ins (membro e admin). Sem a prop, o componente se comporta como hoje; os estados de erro e os demais usos não mudam.

## Arquivos

- Modify: `apps/frontend/src/components/ui/empty-state.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Test: `apps/frontend/src/components/ui/empty-state.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

## Interfaces

- **Consome:** de task-07, `apps/frontend/src/components/ui/pixel-scene.tsx`: `export function PixelScene({ scene, animated = false, className }: PixelSceneProps)`, `export type PixelSceneName = "login" | "hero" | "empty"`; o SVG tem `data-scene` e `aria-hidden="true"`.
- **Produz:** `apps/frontend/src/components/ui/empty-state.tsx`:
  - `EmptyStateProps` ganha `scene?: Extract<PixelSceneName, "empty">`
  - `export function EmptyState({ icon: Icon, title, description, action, scene, className }: EmptyStateProps)`; sem `scene`, o DOM atual não muda.

### Conformidade com as Skills Padrão

- `frontend-design`: cena `empty` (feixes ciano e magenta) ao lado do texto, layout do mockup de Academias.
- `vercel-composition-patterns`: prop opcional e tipada em vez de variante booleana; o consumidor decide onde usar a arte.
- `vercel-react-best-practices`: sem estado novo; a cena é filho estático.
- `tailwindcss`: layout responsivo por `sm:flex-row`, só tokens.
- `wcag-audit-patterns`: `role="status"` e o título continuam; a cena é `aria-hidden`.
- `test-antipatterns`: os testes assertam o que o usuário e as tecnologias assistivas veem.
- `no-workarounds`: nenhuma alteração nos estados de erro para "combinar" visualmente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-visual.md` (seção "Cena"); estado vazio de Academias em `../specs/mockups/replaced-visual-redesign-academias-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para os estados vazios? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** o estado vazio usa `PixelScene` com cena `empty`, com feixes ciano e magenta, ao lado do texto; arte só em login, hero, estados vazios e capas de academia sem imagem

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote.

- **Step 1: Write the failing test**

Em `apps/frontend/src/components/ui/empty-state.test.tsx`, acrescentar `test` à lista de nomes já importados do pacote de testes no topo do arquivo (mantendo os nomes existentes) e acrescentar ao final do arquivo:

```tsx
describe("EmptyState com cena", () => {
	test("sem a prop scene não renderiza cena (comportamento atual)", () => {
		const { container } = render(<EmptyState title="Vazio" />)
		expect(container.querySelector("[data-scene]")).toBeNull()
	})

	test("com scene empty renderiza a cena decorativa ao lado do texto", () => {
		const { container } = render(
			<EmptyState
				scene="empty"
				title="Nenhuma academia encontrada"
				description="Tente outro termo."
			/>,
		)
		const scene = container.querySelector('svg[data-scene="empty"]')
		expect(scene).toBeInTheDocument()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(
			screen.getByRole("heading", { name: "Nenhuma academia encontrada" }),
		).toBeInTheDocument()
		expect(screen.getByText("Tente outro termo.")).toBeInTheDocument()
	})

	test("com scene continua havendo uma única região de status", () => {
		render(<EmptyState scene="empty" title="Vazio" />)
		expect(screen.getAllByRole("status")).toHaveLength(1)
	})

	test("com scene, ação e ícone continuam sendo exibidos", () => {
		render(
			<EmptyState
				scene="empty"
				icon={Bell}
				title="Vazio"
				action={<Button>Criar</Button>}
			/>,
		)
		expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument()
	})
})
```

Acrescentar ao `describe("GymResults", ...)` de `apps/frontend/src/features/gyms/components/gym-results.test.tsx` (usa `baseProps()` e `renderWithProviders` já importados):

```tsx
	test("lista vazia com busca mostra a cena pixel de estado vazio", () => {
		const { container } = renderWithProviders(
			<GymResults {...baseProps()} isBrowseMode={false} query="xyz" items={[]} />,
		)
		expect(screen.getByText("Nenhuma academia encontrada")).toBeInTheDocument()
		expect(container.querySelector('svg[data-scene="empty"]')).toBeInTheDocument()
	})

	test("lista vazia no modo navegação mostra a cena pixel de estado vazio", () => {
		const { container } = renderWithProviders(
			<GymResults {...baseProps()} items={[]} />,
		)
		expect(screen.getByText("Nenhuma academia cadastrada")).toBeInTheDocument()
		expect(container.querySelector('svg[data-scene="empty"]')).toBeInTheDocument()
	})

	test("o estado de erro não usa a cena", () => {
		const { container } = renderWithProviders(
			<GymResults {...baseProps()} isError items={[]} />,
		)
		expect(screen.getByTestId("gym-results-retry")).toBeInTheDocument()
		expect(container.querySelector("[data-scene]")).toBeNull()
	})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/empty-state.test.tsx`
Run: `pnpm --filter frontend test src/features/gyms/components/gym-results.test.tsx`
Expected: FAIL. Os testes com `scene` falham com `expect(element).toBeInTheDocument()` sobre `null` (nenhum `svg[data-scene="empty"]`); o erro de tipo de `scene` inexistente em `EmptyStateProps` também aparece no typecheck do editor, mas o Vitest executa. Os testes "sem a prop" e "estado de erro" passam.

- **Step 3: Write minimal implementation**

3a. Substituir `apps/frontend/src/components/ui/empty-state.tsx` por:

```tsx
import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/cn"
import { PixelScene, type PixelSceneName } from "@/components/ui/pixel-scene"

export interface EmptyStateProps {
	icon?: ComponentType<{ className?: string }>
	title: string
	description?: string
	action?: ReactNode
	scene?: Extract<PixelSceneName, "empty">
	className?: string
}

/**
 * EmptyState — container radius (12px), no shadows.
 * Used when a list/section has no data to render.
 * `scene` opcional adiciona a cena pixel decorativa ao lado do texto.
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	scene,
	className,
}: EmptyStateProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex flex-col items-center justify-center text-center gap-3 px-6 py-12 rounded-[12px] border border-border bg-card",
				scene && "sm:flex-row sm:gap-8 sm:text-left",
				className,
			)}
		>
			{scene ? (
				<div
					aria-hidden="true"
					className="h-28 w-56 shrink-0 overflow-hidden rounded-md border border-border"
				>
					<PixelScene scene={scene} animated />
				</div>
			) : null}
			{Icon ? (
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Icon className="h-6 w-6" />
				</div>
			) : null}
			<div className="flex flex-col gap-1">
				<h3 className="text-xl font-medium text-foreground font-display">
					{title}
				</h3>
				{description ? (
					<p className="text-sm text-muted-foreground max-w-sm">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}
```

(Se o Biome reordenar os dois imports, aceitar a ordem dele.)

3b. `apps/frontend/src/features/gyms/components/gym-results.tsx`: em `ResultsEmpty` e `ResultsEmptyBrowse`, acrescentar a prop `scene="empty"` ao `<EmptyState ... />` (não em `ResultsError` nem em `ResultsNoQuery`).

3c. `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`: em `UsersEmpty`, acrescentar `scene="empty"` ao `<EmptyState icon={Users} ... />`.

3d. `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`: em `HistoryEmpty`, acrescentar `scene="empty"` aos dois `<EmptyState ... />`. `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`: em `AdminCheckInsEmpty`, o mesmo nos dois. Não alterar os estados de erro.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/empty-state.test.tsx`
Run: `pnpm --filter frontend test src/features/gyms/components/gym-results.test.tsx`
Run: `pnpm --filter frontend test "src/app/(authenticated)/academias/page.test.tsx"`
Run: `pnpm --filter frontend test "src/app/(authenticated)/admin/usuarios/page.test.tsx"`
Run: `pnpm --filter frontend test "src/app/(public)/clima/page.test.tsx"`
Run: `pnpm --filter frontend test src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: PASS (as páginas que já usam `EmptyState` só mudam se receberem `scene`; o título continua acessível como `heading`)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/empty-state.tsx apps/frontend/src/components/ui/empty-state.test.tsx apps/frontend/src/features/gyms/components/gym-results.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/check-ins/page.tsx" "apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx"
git commit -m "feat(frontend): cena pixel nos estados vazios"
```

## Critérios de Sucesso

- `EmptyState` sem `scene` renderiza o mesmo DOM de antes; com `scene="empty"` exibe a cena `aria-hidden` ao lado do texto e mantém uma única região `status`, o título, a descrição, o ícone e a ação (FR-008).
- Listas de academias sem resultado (com busca e no modo navegação), lista de usuários vazia e check-ins vazios (membro e admin) exibem a cena; estados de erro e o "Comece pela busca" não a exibem.
