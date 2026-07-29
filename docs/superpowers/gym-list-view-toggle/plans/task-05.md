# Task 5: Criar `GymRow` com paridade de conteúdo com `GymCard`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Cria `GymRow`, o item da visualização em linhas, com layout horizontal (thumbnail 44×44px à esquerda, nome+meta ao centro, CTA de check-in à direita). `GymRow` replica **todo** o conteúdo de `GymCard` (pill de disponibilidade, descrição quando presente, localização via `resolveLocation`, telefone/"Ver detalhes", CTA de check-in, link de edição condicional para admin) — paridade obrigatória por D. "Paridade de conteúdo" da spec. Importa `resolveLocation` do módulo compartilhado criado na task 1 (não duplica a lógica). O mockup simplifica para nome+localização+CTA por brevidade; a paridade de conteúdo com `GymCard` prevalece sobre o HTML literal do mockup, conforme a nota "Fidelidade" do artefato curado.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Create (test): `apps/frontend/src/features/gyms/components/gym-row.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: layout horizontal flex (`flex items-center gap-[14px]`), thumbnail 44×44px com `rounded-[8px]`, hierarquia tipográfica (nome em `font-display`, meta em `text-muted-foreground`) via classes utilitárias consistentes com `gym-card.tsx`.
- `vercel-react-best-practices`: componente funcional simples, sem estado local desnecessário, props tipadas (`GymRowProps` espelhando `GymCardProps`).
- `vercel-composition-patterns`: reutilizar `GymImage` para a thumbnail (mesma composição de `GymCard`) em vez de recriar a lógica de imagem.
- `code-style`: seguir a mesma convenção de nomeação de `data-testid` (`gym-row-{id}`, `gym-row-edit-{id}`) espelhando `gym-card-{id}`/`gym-edit-{id}`.
- `test-antipatterns`: espelhar exatamente os casos reais de `gym-card.test.tsx` (disponibilidade, telefone/"Ver detalhes", pill de check-in, link de edição condicional) sem testar detalhes de implementação do Tailwind.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Visualização em linhas" — thumbnail 44×44px (`--v-r-sm` `8px`), linha com `padding: 12px 16px`, `gap: 14px`, borda inferior entre itens (última linha sem borda — tratada pelo container em `GymResults`, task 6), CTA de check-in com o mesmo estilo/pill verde (`--v-accent`) do card.
- **Fonte de design original:** nenhuma; seguir o mockup curado (confirmado na spec, seção "Especificação Visual").
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta já registrada nesta sessão: não há.)
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou teste visual configurada neste ambiente para esta sessão — fidelidade construída manualmente contra o mockup curado.
- **Decisões visuais já tomadas (não refazer):** o mockup simplifica o conteúdo da linha (nome + localização + CTA); a nota "Fidelidade" do mockup exige paridade total com `GymCard` (disponibilidade, descrição, telefone/"Ver detalhes", edição admin) — o layout horizontal é o *norte*, o conteúdo completo de `GymCard` é a exigência funcional que prevalece.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Fonte de design original e ferramentas de fidelidade já registradas acima (nenhuma disponível nesta sessão) — construir manualmente contra `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Visualização em linhas", garantindo paridade de conteúdo com `GymCard` (não seguir o HTML simplificado do mockup ao pé da letra para o conteúdo, só para o layout).

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/gyms/components/gym-row.test.tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymRow } from "./gym-row"

const gym: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: "Academia completa",
	phone: null,
	address: "Rua A, 100",
	imageKey: "gyms/volt.webp",
	latitude: -23.5,
	longitude: -46.6,
}

describe("GymRow VOLT", () => {
	test("exibe o nome da academia", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	})

	test("expõe a linha como link navegável para o detalhe", () => {
		renderWithProviders(<GymRow gym={gym} />)
		const link = screen.getByTestId("gym-row-g1")
		expect(link).toHaveAttribute("href", "/academias/g1")
	})

	test("usa a localização disponível como meta", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
	})

	test("exibe a descrição quando presente", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Academia completa")).toBeInTheDocument()
	})

	test('exibe "Ver detalhes" quando o telefone está ausente', () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Ver detalhes")).toBeInTheDocument()
	})

	test("exibe o telefone quando presente", () => {
		renderWithProviders(<GymRow gym={{ ...gym, phone: "(11) 99999-0000" }} />)
		expect(screen.getByText("(11) 99999-0000")).toBeInTheDocument()
	})

	test("exibe o pill de disponibilidade", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Disponível")).toBeInTheDocument()
	})

	test("exibe o CTA de check-in", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Check-in")).toBeInTheDocument()
	})

	test("não exibe o botão de edição quando adminEditHref não é informado", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.queryByTestId("gym-row-edit-g1")).not.toBeInTheDocument()
	})

	test("exibe o botão de edição com href correto quando adminEditHref é informado", () => {
		renderWithProviders(
			<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const editLink = screen.getByTestId("gym-row-edit-g1")
		expect(editLink).toBeInTheDocument()
		expect(editLink).toHaveAttribute("href", "/admin/academias/g1/editar")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test gym-row.test.tsx`
Expected: FAIL with `Failed to resolve import "./gym-row"` (o componente ainda não existe)

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/gyms/components/gym-row.tsx
import { MapPin, Pencil } from "lucide-react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { resolveLocation } from "@/features/gyms/lib/resolve-location"

export interface GymRowProps {
	gym: Gym
	adminEditHref?: string
}

export function GymRow({ gym, adminEditHref }: GymRowProps) {
	return (
		<div data-testid="gym-row-wrapper" className="relative flex w-full">
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-row-${gym.id}`}
				className="flex w-full items-center gap-[14px] bg-card px-4 py-3"
			>
				<div className="relative h-11 w-11 flex-shrink-0">
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full rounded-[8px]"
						hoverEffect={false}
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center gap-2">
						<p className="font-display text-sm font-semibold text-card-foreground">
							{gym.title}
						</p>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-subtle">
							<span className="h-1.5 w-1.5 rounded-full bg-current" /> Disponível
						</span>
					</div>
					{gym.description ? (
						<p className="line-clamp-1 text-[13px] text-muted-foreground">
							{gym.description}
						</p>
					) : null}
					<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
						<span className="line-clamp-1">{resolveLocation(gym)}</span>
					</p>
				</div>
				<div className="flex flex-shrink-0 items-center gap-3">
					{gym.phone ? (
						<span className="text-[12.5px] text-subtle">{gym.phone}</span>
					) : (
						<span className="text-[12.5px] text-subtle">Ver detalhes</span>
					)}
					<span className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground">
						Check-in
					</span>
				</div>
			</Link>
			{adminEditHref ? (
				<Link
					href={adminEditHref}
					data-testid={`gym-row-edit-${gym.id}`}
					aria-label={`Editar academia ${gym.title}`}
					className="absolute right-3 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
				>
					<Pencil className="h-4 w-4" aria-hidden="true" />
				</Link>
			) : null}
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test gym-row.test.tsx`
Expected: PASS (10 testes)

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx
git commit -m "feat: adiciona GymRow com paridade de conteúdo com GymCard para a visualização em linhas"
```

## Critérios de Sucesso

- `GymRow` renderiza, para o mesmo `Gym`, todo o conteúdo que `GymCard` renderiza: pill de disponibilidade, descrição condicional, localização (via `resolveLocation` importado da task 1), telefone/"Ver detalhes" condicional, CTA de check-in, link de edição condicional para admin.
- Layout horizontal: thumbnail 44×44px à esquerda, nome+meta ao centro, CTA à direita.
- `data-testid` segue o padrão `gym-row-{id}` / `gym-row-edit-{id}`.
- `pnpm --filter frontend test gym-row.test.tsx` 100% verde.
