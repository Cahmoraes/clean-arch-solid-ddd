# Task 13: Integrar `GymImage` no `GymCard` e no detalhe [FR-010, FR-014]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-12

## Visão Geral

Substitui o placeholder atual do card pela imagem real via `GymImage` e adiciona a `group` no link para ativar o zoom no hover (FR-010); exibe a imagem também na página de detalhe (FR-014). Mantém o selo "Disponível".

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`

### Conformidade com as Skills Padrão

- use frontend-design: integra o componente preservando o layout do card.
- use test-antipatterns: testa renderização da imagem/placeholder no card.

## Passos

- **Step 1: Atualizar o fixture e o teste do card (falha primeiro)**

Em `apps/frontend/src/features/gyms/components/gym-card.test.tsx`:

1. Adicione `imageKey` ao fixture `gym` (agora obrigatório no tipo):

```tsx
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
```

2. Adicione um teste que verifica a imagem renderizada:

```tsx
	test("exibe a imagem da academia no card", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByTestId("gym-image")).toBeInTheDocument()
	})
```

Run: `pnpm --filter frontend test -- -t "GymCard VOLT"`
Expected: FAIL — `gym-image` não existe ainda no card.

- **Step 2: Integrar `GymImage` no `GymCard`**

Em `apps/frontend/src/features/gyms/components/gym-card.tsx`:

1. Adicione o import:

```tsx
import { GymImage } from "@/features/gyms/components/gym-image"
```

2. Adicione `group` à className do `Link` (para ativar o zoom no hover):

```tsx
		<Link
			href={`/academias/${gym.id}`}
			data-testid={`gym-card-${gym.id}`}
			className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong"
		>
```

3. Substitua o bloco do placeholder (a `<div className="relative flex h-[140px] ...">...</div>` com o texto "foto") por:

```tsx
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
```

- **Step 3: Rodar o teste do card e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "GymCard VOLT"`
Expected: PASS (todos, incluindo o novo teste de imagem).

- **Step 4: Exibir a imagem no detalhe**

Em `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`:

1. Adicione o import:

```tsx
import { GymImage } from "@/features/gyms/components/gym-image"
```

2. No componente `DetailCard`, adicione a imagem como primeiro filho do `<article>` (antes do `<header>`):

```tsx
		<article
			data-testid="gym-detail-card"
			className="flex flex-col gap-6 rounded-[12px] border border-border bg-card p-6"
		>
			<GymImage
				imageKey={gym.imageKey}
				alt={gym.title}
				className="h-48 w-full rounded-[8px]"
			/>
			<header className="flex flex-col gap-2">
```

- **Step 5: Verificar testes da página de detalhe**

Run: `pnpm --filter frontend test -- -t "GymDetail"`
Expected: PASS (os testes existentes do detalhe continuam verdes; se algum fixture de gym no teste não tiver `imageKey`, adicione `imageKey: null`).

- **Step 6: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx "apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx"
git commit -m "feat(gyms): render GymImage in card and detail page"
```

## Critérios de Sucesso

- Card exibe a imagem (ou placeholder) com zoom no hover; selo "Disponível" preservado. [FR-010]
- Detalhe exibe a imagem (ou placeholder). [FR-014]
- Testes, `tsc:check` e `lint:fix` sem problemas.
