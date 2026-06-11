# Task 13: Redesign Academias (gym-grid, gym-card) [RF-021, RF-024]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila a tela de Academias (`/academias`) no vocabulário VOLT: `PageHeader`, `SearchBar` de busca por nome, e `gym-grid` de `gym-card` (header de foto com status aberto/fechado, nome + rating, localização, tags e rodapé com check-ins + botão Check-in). Preserva os hooks (`useAllGyms`/`useGymsByName`) e a paginação. A grade faz reflow automático.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx` (novo ou estendido)

### Conformidade com as Skills Padrão

- use code-style: reusar `PageHeader`/`SearchBar`, tokens semânticos, grid fluido
- use test-antipatterns: asserir conteúdo do card, sem testar internals

## Passos

- [ ] **Step 1: Escrever o teste que falha (gym-card VOLT)**

Crie/estenda `apps/frontend/src/features/gyms/components/gym-card.test.tsx` (ajuste o shape ao tipo real):

```tsx
import { render, screen } from "@/test/render"
import { describe, expect, test } from "vitest"
import { GymCard } from "./gym-card"

const gym = {
	id: "g1",
	title: "VOLT Centro",
	description: "Academia completa",
	latitude: -23.5,
	longitude: -46.6,
}

describe("GymCard VOLT", () => {
	test("exibe o nome da academia", () => {
		render(<GymCard gym={gym} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	})

	test("expõe o cartão como link/ação navegável", () => {
		const { container } = render(<GymCard gym={gym} />)
		expect(container.querySelector("a")).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "GymCard VOLT"`
Expected: FAIL — estrutura VOLT ainda não aplicada.

- [ ] **Step 3: Reescrever `gym-card.tsx`**

Card com header de foto (placeholder hachurado), status, corpo e rodapé:

```tsx
import { MapPin, Star } from "lucide-react"
import Link from "next/link"

<Link
	href={`/academias/${gym.id}`}
	className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong"
>
	<div className="relative flex h-[140px] items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-surface-2)_0_10px,var(--color-surface-3)_10px_20px)]">
		<span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11.5px] font-semibold text-success backdrop-blur">
			<span className="h-1.5 w-1.5 rounded-full bg-current" /> Aberto
		</span>
		<span className="text-[11px] text-subtle">foto</span>
	</div>
	<div className="flex flex-col gap-2.5 p-[18px]">
		<div className="flex items-center justify-between gap-2.5">
			<p className="font-display text-base font-semibold">{gym.title}</p>
			<span className="inline-flex items-center gap-1 text-[13px] font-semibold text-warning">
				<Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> 4.9
			</span>
		</div>
		<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
			<MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {gym.description}
		</p>
		<div className="mt-1 flex items-center justify-between border-t border-border pt-3.5">
			<span className="text-[12.5px] text-subtle">check-ins recentes</span>
			<span className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground">Check-in</span>
		</div>
	</div>
</Link>
```

> Ajuste os campos (`title`, `description`, `id`) ao tipo real. Status aberto/rating podem ser placeholders visuais se o backend não os fornecer (não inventar dados de negócio — usar rótulo neutro quando ausente).

- [ ] **Step 4: Aplicar grade fluida em `gym-results.tsx`**

Envolva os cards em grade com reflow automático:

```tsx
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
	{gyms.map((gym) => <GymCard key={gym.id} gym={gym} />)}
</div>
```

Mantenha `EmptyState`/`Skeleton` existentes (restilados com tokens).

- [ ] **Step 5: Aplicar `PageHeader` e `SearchBar` na página**

```tsx
import { PageHeader } from "@/components/ui/page-header"
import { SearchBar } from "@/components/ui/search-bar"
// ...
<PageHeader
	eyebrow="Rede"
	title="Academias"
	subtitle="Encontre onde treinar"
	action={isAdmin ? <Link href="/admin/academias/nova" className="h-11 rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-foreground hover:bg-primary-strong">Cadastrar</Link> : undefined}
/>
<form onSubmit={onSubmit} className="mb-6">
	<SearchBar placeholder="Buscar academia por nome" value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-md" />
</form>
```

Preserve a lógica draft→submitted e a alternância entre `useAllGyms`/`useGymsByName`.

- [ ] **Step 6: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "GymCard VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde. Verifique o e2e `onboarding.spec.ts`/seed (seletores `gym-search-*`) — preserve testids usados.

- [ ] **Step 7: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/academias/page.tsx" apps/frontend/src/features/gyms/
git commit -m "feat(volt-redesign): academias com gym-grid e gym-card VOLT"
```

## Critérios de Sucesso

- `PageHeader` + `SearchBar` + `gym-grid` de `gym-card` [RF-021]
- Grade faz reflow automático (`auto-fill minmax`) [RF-024]
- Busca por nome e paginação preservadas; testids de e2e intactos
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
