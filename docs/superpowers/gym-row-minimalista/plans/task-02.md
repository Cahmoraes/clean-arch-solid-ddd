# Task 2: Ícones de ação Check-in e editar com tooltip [FR-006, FR-007, FR-008, FR-009]

**Status:** DONE

**PRD:** `../prd/prd-gym-row-minimalista.md`

**Spec:** `../specs/gym-row-minimalista-design.md`

**Tier:** standard

## Visão Geral

À direita da linha ficam só dois ícones de 32px, irmãos do link da linha (nunca aninhados): Check-in, para todos, e editar, só para admin. Cada um tem `aria-label`, tooltip (também no foco de teclado) e o destino correto. O espaço reservado à direita evita sobreposição com títulos longos.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-row.test.tsx`

## Interfaces

- **Consome:** `GymRow` sem selo/telefone/pílula e com o ponto `data-testid="gym-row-status"` no título (task-01)
- **Produz:** `GymRow` final: links irmãos com `data-testid` `gym-row-checkin-{id}` (`aria-label` "Check-in em {título}", `href` `/academias/{id}`) e `gym-row-edit-{id}` (`aria-label` "Editar academia {título}", `href` `adminEditHref`, só admin)

### Skills a invocar

- `test-antipatterns`: testes de tooltip e de estrutura sem asserir sobre mocks
- `shadcn`: `Tooltip`/`TooltipTrigger asChild` de `components/ui/tooltip.tsx` (radix)
- `tailwindcss`: classes dos botões-ícone e padding reservado
- `wcag-audit-patterns`: botão só de ícone com `aria-label` e tooltip no foco, alvo mínimo de 24px
- `vercel-composition-patterns`: extrair `GymRowAction` para manter a complexidade cognitiva do Biome em 5 ou menos
- `no-workarounds`: sem `biome-ignore` nem asserções de tipo

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-row-minimalista-visual.md` (variante A: dois botões-ícone 32px, gap 8px, Check-in em destaque na cor de acento, editar neutro)
- **Fonte de design original:** screenshot da lista atual fornecido pelo usuário e mockup da variante A no companion
- **Confirmar com o usuário:** existe uma fonte de design original além do screenshot e do mockup curado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** ícones de 32px com gap 8px; Check-in com borda e ícone `accent`; editar neutro como hoje (hover `accent`); ícones pixel-art de 16px (`h-4 w-4`); sem `rounded-full`

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler `### Fidelidade Visual` acima. Não há fonte de design além do mockup curado: construir a partir de `../specs/mockups/gym-row-minimalista-visual.md`. Este passo não bloqueia.

- **Step 1: Escrever os testes que falham**

Em `apps/frontend/src/features/gyms/components/gym-row.test.tsx`, remover os testes antigos do botão de editar que tratam de posicionamento absoluto ou destaque em ciano no hover e que passarem a conflitar com o novo markup (o teste "exibe o botão de edição com href correto quando adminEditHref é informado" e "não exibe o botão de edição quando adminEditHref não é informado" permanecem válidos). Adicionar:

```tsx
test("exibe o ícone de Check-in com nome acessível e destino do detalhe", () => {
	renderWithProviders(<GymRow gym={gym} />)
	const checkIn = screen.getByTestId("gym-row-checkin-g1")
	expect(checkIn).toHaveAttribute("aria-label", "Check-in em VOLT Centro")
	expect(checkIn).toHaveAttribute("href", "/academias/g1")
	expect(checkIn).toHaveClass("h-8", "w-8", "text-accent")
})

test("os ícones de ação são irmãos do link da linha, nunca aninhados", () => {
	renderWithProviders(
		<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
	)
	const row = screen.getByTestId("gym-row-g1")
	expect(row).not.toContainElement(screen.getByTestId("gym-row-checkin-g1"))
	expect(row).not.toContainElement(screen.getByTestId("gym-row-edit-g1"))
})

test("o ícone de Check-in mostra o tooltip 'Check-in em VOLT Centro'", async () => {
	renderWithProviders(<GymRow gym={gym} />)
	fireEvent.focus(screen.getByTestId("gym-row-checkin-g1"))
	expect(await screen.findByRole("tooltip")).toHaveTextContent(
		"Check-in em VOLT Centro",
	)
})

test("o ícone de editar do admin tem aria-label e alvo de 32px", () => {
	renderWithProviders(
		<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
	)
	const edit = screen.getByTestId("gym-row-edit-g1")
	expect(edit).toHaveAttribute("aria-label", "Editar academia VOLT Centro")
	expect(edit).toHaveClass("h-8", "w-8")
})


```

O tooltip do Radix abre no foco: garantir que `fireEvent` esteja importado de `@testing-library/react` no arquivo de teste (acrescentar ao import existente de `screen`). Se `check-in-actions.test.tsx` usar outra forma de disparo que funcione neste ambiente (happy-dom), seguir essa forma.

- **Step 2: Review Focus: sem `adminEditHref` só existe o ícone de Check-in — Write the failing test**

```tsx
test("sem adminEditHref não há ícone de editar", () => {
	renderWithProviders(<GymRow gym={gym} />)
	expect(screen.queryByTestId("gym-row-edit-g1")).not.toBeInTheDocument()
	expect(screen.getByTestId("gym-row-checkin-g1")).toBeInTheDocument()
})
```

- **Step 3: Review Focus: título longo não sobrepõe os ícones — Write the failing test**

```tsx
test("reserva padding à direita para os ícones, com título longo", () => {
	const longName: Gym = {
		...gym,
		title: "Schmeler, Runolfsson and Murazik Gym Academia de Treinamento Funcional",
	}
	const { unmount } = renderWithProviders(<GymRow gym={longName} />)
	expect(screen.getByTestId("gym-row-g1")).toHaveClass("pr-14")
	unmount()
	renderWithProviders(
		<GymRow gym={longName} adminEditHref="/admin/academias/g1/editar" />,
	)
	expect(screen.getByTestId("gym-row-g1")).toHaveClass("pr-24")
})
```

- **Step 4: Rodar os testes e verificar que falham**

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="gym-row-checkin-g1"]`

- **Step 5: Implementar o mínimo**

Reescrever `apps/frontend/src/features/gyms/components/gym-row.tsx` (estado final da linha):

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { CheckCircle, MapPin, Pencil } from "@/components/ui/pixel-icons"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { GymSummary } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { resolveLocation } from "@/features/gyms/lib/resolve-location"
import { resolveGymStatusBadge } from "@/features/gyms/lib/resolve-status-badge"
import { cn } from "@/lib/cn"

export interface GymRowProps {
	gym: GymSummary
	adminEditHref?: string
}

const STATUS_DOT_CLASS = {
	success: "bg-success",
	danger: "bg-destructive",
} as const

const ACTION_CLASS =
	"inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-accent"

interface GymRowActionProps {
	href: string
	label: string
	testId: string
	className?: string
	children: ReactNode
}

function GymRowAction({
	href,
	label,
	testId,
	className,
	children,
}: GymRowActionProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					href={href}
					data-testid={testId}
					aria-label={label}
					className={cn(ACTION_CLASS, className)}
				>
					{children}
				</Link>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

export function GymRow({ gym, adminEditHref }: GymRowProps) {
	const { tone: statusTone, label: statusLabel } = resolveGymStatusBadge(
		gym,
		adminEditHref,
	)
	return (
		<div data-testid="gym-row-wrapper" className="relative flex w-full">
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-row-${gym.id}`}
				className={cn(
					"flex w-full items-center gap-[14px] bg-card px-4 py-3 transition-colors hover:bg-surface-2",
					adminEditHref ? "pr-24" : "pr-14",
				)}
			>
				<div className="relative h-11 w-11 flex-shrink-0">
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full rounded-sm"
						hoverEffect={false}
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<p className="flex items-center gap-2 font-display text-[15px] text-card-foreground">
						<span
							role="img"
							aria-label={statusLabel}
							title={statusLabel}
							data-testid="gym-row-status"
							className={`h-2 w-2 flex-shrink-0 ${STATUS_DOT_CLASS[statusTone]}`}
						/>
						{gym.title}
					</p>
					{gym.description ? (
						<p className="line-clamp-1 text-[13px] text-muted-foreground">
							{gym.description}
						</p>
					) : null}
					<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
						<MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
						<span className="line-clamp-1">{resolveLocation(gym)}</span>
					</p>
				</div>
			</Link>
			<div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
				<GymRowAction
					href={`/academias/${gym.id}`}
					label={`Check-in em ${gym.title}`}
					testId={`gym-row-checkin-${gym.id}`}
					className="border-accent text-accent"
				>
					<CheckCircle className="h-4 w-4" aria-hidden="true" />
				</GymRowAction>
				{adminEditHref ? (
					<GymRowAction
						href={adminEditHref}
						label={`Editar academia ${gym.title}`}
						testId={`gym-row-edit-${gym.id}`}
					>
						<Pencil className="h-4 w-4" aria-hidden="true" />
					</GymRowAction>
				) : null}
			</div>
		</div>
	)
}
```

Se a task-01 tiver trocado o ponto por `sr-only` (fallback do Biome), preservar essa forma aqui em vez do `role="img"`. Confirmar que `@/lib/cn` exporta `cn` (mesmo import usado em `components/ui/status-badge.tsx`).

- **Step 6: Rodar os testes e verificar que passam**

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: PASS

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-results.test.tsx`
Expected: PASS

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true)*

```bash
git add apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx
git commit -m "feat(frontend): ícones de check-in e editar na linha de academia"
```

## Critérios de Sucesso

- Ícone de Check-in em destaque à direita, com destino `/academias/{id}` (FR-006).
- Ícone de editar só com `adminEditHref` (FR-007).
- Ícones de 32px, irmãos do link da linha, com padding reservado (`pr-14` / `pr-24`) que impede sobreposição com títulos longos (FR-008).
- Cada ícone tem `aria-label` e tooltip, também no foco de teclado (FR-009).
