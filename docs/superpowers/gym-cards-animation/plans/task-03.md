# Task 03: Migrar hover do GymCard para motion/react [FR-004, FR-005, FR-006]

**Status:** DONE
**PRD:** `../prd/prd-gym-cards-animation.md`
**Spec:** `../specs/gym-cards-animation-design.md`
**Depends on:** task-01

## Visão Geral

Substitui o hover Tailwind do `GymCard` (`hover:-translate-y-0.5`, `hover:border-border-strong`, `transition-*`, `group`) por um `motion.div` wrapper externo com `whileHover` usando o efeito glow verde aprovado no design (boxShadow cor `rgba(57,229,140,0.45)`). O botão de edição admin mantém seu hover Tailwind intacto — apenas o card principal é migrado. Atualiza os testes existentes do `GymCard`.

**Atenção:** A classe `group` deve ser removida do `Link` porque a task-04 vai remover as classes `group-hover:*` do `GymImage`. Manter `group` sem consumidores é um dead class que o Biome pode sinalizar.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`

### Conformidade com as Skills Padrão

- code-style: tabs, aspas duplas, importar `motion` de `"motion/react"`
- no-workarounds: whileHover Motion é a solução definitiva, não um patch sobre os classes Tailwind

## Passos

### Step 1: Adicionar teste TDD para o wrapper motion.div (vai falhar pois o componente ainda não usa motion)

Abrir `apps/frontend/src/features/gyms/components/gym-card.test.tsx` e adicionar no `describe("GymCard VOLT")`:

```tsx
test("o card principal é envolvido por um motion.div (data-testid gym-card-wrapper)", () => {
	const { container } = renderWithProviders(<GymCard gym={gym} />)
	const wrapper = container.querySelector("[data-testid='gym-card-wrapper']")
	expect(wrapper).toBeInTheDocument()
})

test("link do card não possui classes Tailwind de hover legadas", () => {
	renderWithProviders(<GymCard gym={gym} />)
	const link = screen.getByTestId("gym-card-g1")
	expect(link.className).not.toContain("hover:-translate-y-0.5")
	expect(link.className).not.toContain("hover:border-border-strong")
	expect(link.className).not.toContain("transition-[transform,border-color]")
	expect(link.className).not.toContain("group")
})
```

### Step 2: Rodar o teste para confirmar que falha

```bash
pnpm --filter frontend test:run -- -t "GymCard VOLT"
```

Resultado esperado: FAIL — 2 novos testes falham (wrapper não existe, classes ainda presentes).

### Step 3: Implementar a migração no GymCard

Substituir o conteúdo completo de `apps/frontend/src/features/gyms/components/gym-card.tsx`:

```tsx
import { motion } from "motion/react"
import { MapPin, Pencil } from "lucide-react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"

export interface GymCardProps {
	gym: Gym
	adminEditHref?: string
}

function resolveLocation(gym: Gym): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}

const cardHoverVariant = {
	y: -3,
	scale: 1.015,
	boxShadow:
		"0 0 0 1px rgba(57,229,140,0.45), 0 10px 30px -12px rgba(0,0,0,0.5)",
}

export function GymCard({ gym, adminEditHref }: GymCardProps) {
	return (
		<motion.div
			data-testid="gym-card-wrapper"
			className="relative flex h-full flex-col rounded-lg"
			whileHover={cardHoverVariant}
			transition={{ type: "spring", stiffness: 300, damping: 25 }}
		>
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-card-${gym.id}`}
				className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
			>
				<div className="relative h-[140px] w-full">
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full"
					/>
					<span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11.5px] font-semibold text-subtle backdrop-blur">
						<span className="h-1.5 w-1.5 rounded-full bg-current" /> Disponível
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-2.5 p-[18px]">
					<p className="font-display text-base font-semibold text-card-foreground">
						{gym.title}
					</p>
					{gym.description ? (
						<p className="line-clamp-2 text-[13px] text-muted-foreground">
							{gym.description}
						</p>
					) : null}
					<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
						<span className="line-clamp-1">{resolveLocation(gym)}</span>
					</p>
					<div className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
						{gym.phone ? (
							<span className="text-[12.5px] text-subtle">{gym.phone}</span>
						) : (
							<span className="text-[12.5px] text-subtle">Ver detalhes</span>
						)}
						<span className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground">
							Check-in
						</span>
					</div>
				</div>
			</Link>
			{adminEditHref ? (
				<Link
					href={adminEditHref}
					data-testid={`gym-edit-${gym.id}`}
					aria-label={`Editar academia ${gym.title}`}
					className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
				>
					<Pencil className="h-4 w-4" aria-hidden="true" />
				</Link>
			) : null}
		</motion.div>
	)
}
```

**Mudanças principais:**
- `<div className="relative flex h-full flex-col">` → `<motion.div data-testid="gym-card-wrapper" ... whileHover={cardHoverVariant}>`
- `Link` className: removido `group`, `transition-[transform,border-color]`, `hover:-translate-y-0.5`, `hover:border-border-strong`
- Botão admin mantém `transition-colors hover:bg-background hover:text-primary` intacto

### Step 4: Rodar os testes para confirmar que passam

```bash
pnpm --filter frontend test:run -- -t "GymCard VOLT"
```

Resultado esperado: PASS — todos os 9 testes verdes (7 originais + 2 novos).

### Step 5: Rodar lint e typecheck

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Resultado esperado: 0 erros Biome, 0 erros TypeScript.

### Step 6: Commit

```bash
git add apps/frontend/src/features/gyms/components/gym-card.tsx \
        apps/frontend/src/features/gyms/components/gym-card.test.tsx
git commit -m "feat(frontend): migrar hover GymCard para motion/react (glow verde)

- Substitui div.relative por motion.div wrapper com whileHover spring
- Remove group, hover:*, transition-* do Link principal
- Mantém hover Tailwind intacto no botão de edição admin
- Efeito: translateY(-3px) + boxShadow verde rgba(57,229,140,0.45)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm --filter frontend test:run -- -t "GymCard VOLT"` passa com 9 testes verdes
- `pnpm --filter frontend biome:fix` reporta zero problemas
- `pnpm --filter frontend tsc:check` passa sem erros
- `gym-card.tsx` importa `motion` de `"motion/react"` [FR-005]
- `gym-card.tsx` usa `motion.div` com `whileHover` contendo `boxShadow` com `rgba(57,229,140,0.45)` [FR-004]
- `Link` principal não contém `group`, `hover:-translate-y-0.5`, `hover:border-border-strong` [FR-006]
- Botão admin mantém `transition-colors hover:bg-background hover:text-primary`
