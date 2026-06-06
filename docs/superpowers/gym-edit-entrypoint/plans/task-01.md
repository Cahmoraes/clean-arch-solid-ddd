# Task 1: `GymCard` — prop `adminEditHref` + `<Link>` de edição sobreposto

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-edit-entrypoint-design.md`
**Depends on:** N/A

## Visão Geral

Adicionar ao `GymCard` uma prop opcional `adminEditHref?: string`. Quando presente, o card
renderiza um segundo `<Link>` (estilizado como botão de ícone, com o ícone `Pencil`)
sobreposto no canto superior direito, **irmão** do `<Link>` principal — nunca aninhado.
A raiz do componente passa de `<Link>` para `<div className="relative ...">` que contém os
dois links como irmãos. O `GymCard` permanece sem `"use client"` e sem hooks.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`

### Conformidade com as Skills Padrão

- use `react`: componente de apresentação puro, dirigido por props, sem estado/hook.
- use `tailwindcss`: classes do design system (tokens `border`, `bg-background`, `text-primary`).
- use `test-antipatterns`: testes orientados a comportamento (href, aria-label, presença), sem detalhes de implementação.
- use `vercel-react-best-practices`: evitar tornar o componente client desnecessariamente; usar `<Link>` em vez de `useRouter`.

## Passos

- **Step 1: Escrever os testes falhando**

Adicionar ao final do `describe("GymCard VOLT", ...)` em
`apps/frontend/src/features/gyms/components/gym-card.test.tsx`:

```tsx
	test("não exibe o botão de edição quando adminEditHref não é informado", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
	})

	test("exibe o botão de edição com href correto quando adminEditHref é informado", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const editLink = screen.getByTestId("gym-edit-g1")
		expect(editLink).toBeInTheDocument()
		expect(editLink).toHaveAttribute("href", "/admin/academias/g1/editar")
	})

	test("rotula o botão de edição com o nome da academia", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		expect(
			screen.getByRole("link", { name: "Editar academia VOLT Centro" }),
		).toBeInTheDocument()
	})

	test("mantém o cartão navegável para o detalhe mesmo com o botão de edição", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		expect(screen.getByTestId("gym-card-g1")).toHaveAttribute(
			"href",
			"/academias/g1",
		)
	})
```

- **Step 2: Rodar os testes e confirmar que falham**

Run: `pnpm --filter frontend test -- src/features/gyms/components/gym-card.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="gym-edit-g1"]` e
erro de tipo/prop `adminEditHref` não existe em `GymCardProps`.

- **Step 3: Implementar a reestruturação no `GymCard`**

Substituir **todo** o conteúdo de
`apps/frontend/src/features/gyms/components/gym-card.tsx` por:

```tsx
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

export function GymCard({ gym, adminEditHref }: GymCardProps) {
	return (
		<div className="relative flex h-full flex-col">
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-card-${gym.id}`}
				className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong"
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
		</div>
	)
}
```

- **Step 4: Rodar os testes e confirmar que passam**

Run: `pnpm --filter frontend test -- src/features/gyms/components/gym-card.test.tsx`
Expected: PASS — todos os testes do `GymCard` (incluindo os 4 novos) passam.

- **Step 5: Lint e type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; zero erros de tipo.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx
git commit -m "feat(gym-edit-entrypoint): add optional admin edit link to GymCard"
```

## Critérios de Sucesso

- `GymCardProps` expõe `adminEditHref?: string`.
- Sem `adminEditHref`: nenhum elemento `gym-edit-{id}` é renderizado.
- Com `adminEditHref`: existe um `<Link>` `gym-edit-{id}` com `href` igual ao valor passado
  e `aria-label="Editar academia {título}"`.
- O `<Link>` principal do card (`gym-card-{id}`) continua apontando para `/academias/{id}`.
- Os dois `<Link>` são irmãos no DOM (não há `<a>` aninhado).
- `lint:fix` e `tsc:check` passam sem problemas.
