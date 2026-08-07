# Task 5: Badge de status de academias usa StatusBadge compartilhado (list + grid) [FR-005]

**Status:** PENDING
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** task-04

## Visão Geral

Migrar `gym-row.tsx` (view em lista) de um `<span>` bespoke (`renderStatusBadge`) para o componente compartilhado `StatusBadge` (já generalizado pela task 4), eliminando a duplicação de markup de badge de status e ganhando o ícone semântico automaticamente.

**Escopo ampliado (achado da revisão de spec):** `gym-card.tsx` (view em grid, alternada com `gym-row.tsx` na mesma listagem via `gym-results.tsx`, ambas recebendo o mesmo `adminEditHref`/`gym.status`) tem uma função `renderStatusBadge` bespoke idêntica em lógica à de `gym-row.tsx` — mesma condição `isDeactivated = adminEditHref && status === "deactivated"`, mesmos rótulos "Disponível"/"Desativada", mesmo dot+texto, só o wrapper visual difere (badge posicionada em overlay absoluto sobre a imagem, não inline). Sem migrar as duas, a tela de academias ficaria com a view em lista usando ícone e a view em grid ainda com o dot antigo — inconsistência visual que contraria o próprio objetivo desta feature. Esta task migra ambas.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: esta migração é risco médio (🟡 score 4 na spec) por potencial mudança sutil de tom/padding — comparar visualmente antes/depois, nas duas views (lista e grid).
- `tailwindcss`: ajuste fino de classes se o padding/tamanho do `StatusBadge` compartilhado divergir sutilmente dos `<span>`s bespoke anteriores; em `gym-card.tsx`, preservar o posicionamento absoluto (`absolute left-3 top-3 z-10 backdrop-blur`) via `className` do `StatusBadge`.
- `test-antipatterns`: preservar a estratégia de query dos testes existentes de ambos os arquivos (`getByText`) sem reescrevê-los por conveniência.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-semantic-icons-visual.md`
- **Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** badge "Disponível" usa tom `success`, badge "Desativada" usa tom `danger` (mapeamento definido nesta task, reaproveitando os tons já suportados por `StatusBadge`). A lógica condicional `isDeactivated = adminEditHref && status === "deactivated"` já existente é preservada tal como está — só a marcação visual do badge muda de `<span>` bespoke para `StatusBadge`. O botão de editar (`Link` com `Pencil`, já ícone-só) não é tocado por esta task.

## Passos

- **Step 1: Write the failing test**

Os 12 testes existentes de `gym-row.test.tsx` já cobrem o comportamento visível (`getByText("Disponível")`/`getByText("Desativada")`) e continuam válidos sem alteração — a mudança desta task é de implementação interna, não de contrato observável. Para tornar o passo de TDD explícito, adicionar um teste novo que afirma que a badge agora carrega um ícone (prova de que a migração para `StatusBadge`, que renderiza ícone via `STATUS_ICON`, realmente aconteceu):

Adicionar ao final de `gym-row.test.tsx` (dentro do `describe` existente, mantendo os imports e o `gym` de fixture já presentes no arquivo):

```tsx
	test("o selo de status usa o StatusBadge compartilhado (com ícone semântico)", () => {
		renderWithProviders(<GymRow gym={gym} />)
		const badge = screen.getByText("Disponível").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: FAIL — o `<span>` bespoke atual usa um dot (`h-1.5 w-1.5 rounded-full bg-current`), não um `<svg>`, então `querySelector("svg")` retorna `null`.

- **Step 3: Write minimal implementation**

Editar `apps/frontend/src/features/gyms/components/gym-row.tsx`: remover a função `renderStatusBadge` e importar `StatusBadge`.

```tsx
import { MapPin, Pencil } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/ui/status-badge"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { resolveLocation } from "@/features/gyms/lib/resolve-location"
```

Remover por completo o bloco:

```tsx
function renderStatusBadge(
	adminEditHref: string | undefined,
	status: "activated" | "deactivated" | undefined,
) {
	const isDeactivated = adminEditHref && status === "deactivated"
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
				isDeactivated
					? "bg-destructive-soft text-destructive"
					: "bg-background/80 text-subtle"
			}`}
		>
			<span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
			{isDeactivated ? "Desativada" : "Disponível"}
		</span>
	)
}
```

Dentro de `GymRow`, antes do `return`, calcular a mesma condição e trocar a chamada no JSX:

```tsx
export function GymRow({ gym, adminEditHref }: GymRowProps) {
	const isDeactivated = adminEditHref && gym.status === "deactivated"

	return (
```

E onde hoje está `{renderStatusBadge(adminEditHref, gym.status)}`, trocar para:

```tsx
						<StatusBadge tone={isDeactivated ? "danger" : "success"}>
							{isDeactivated ? "Desativada" : "Disponível"}
						</StatusBadge>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: PASS (13 testes: os 12 existentes + o novo teste de ícone)

- **Step 5: Write the failing test (gym-card.tsx)**

Adicionar ao final de `apps/frontend/src/features/gyms/components/gym-card.test.tsx` (dentro do `describe` existente, reaproveitando o fixture `gym` já presente no arquivo):

```tsx
test("o selo de status usa o StatusBadge compartilhado (com ícone semântico)", () => {
	renderWithProviders(<GymCard gym={gym} />)
	const badge = screen.getByText("Disponível").closest("span")
	expect(badge).not.toBeNull()
	expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-card.test.tsx`
Expected: FAIL — o `<span>` bespoke atual de `gym-card.tsx` usa um dot (`h-1.5 w-1.5 rounded-full bg-current`), não um `<svg>`, então `querySelector("svg")` retorna `null`.

- **Step 7: Write minimal implementation (gym-card.tsx)**

Editar `apps/frontend/src/features/gyms/components/gym-card.tsx`: importar `StatusBadge`, remover a função `renderStatusBadge` (mesma lógica de `isDeactivated = adminEditHref && status === "deactivated"` da task de `gym-row.tsx`) e trocar a chamada no JSX, preservando o posicionamento absoluto original via `className`:

```tsx
import { StatusBadge } from "@/components/ui/status-badge"
```

Adicionar este import junto aos existentes. Dentro de `GymCard`, antes do `return`, calcular a mesma condição:

```tsx
export function GymCard({ gym, adminEditHref }: GymCardProps) {
	const isDeactivated = adminEditHref && gym.status === "deactivated"

	return (
```

Remover por completo a função `renderStatusBadge` do topo do arquivo, e onde hoje está `{renderStatusBadge(adminEditHref, gym.status)}`, trocar para:

```tsx
					<StatusBadge
						tone={isDeactivated ? "danger" : "success"}
						className="absolute left-3 top-3 z-10 backdrop-blur"
					>
						{isDeactivated ? "Desativada" : "Disponível"}
					</StatusBadge>
```

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-card.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo o novo)

- **Step 9: Commit** *(esta task participa da Wave 3 em paralelo com as tasks 6, 7 e 8, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx
git commit -m "refactor: gym-row e gym-card usam StatusBadge compartilhado (FR-005)"
```

## Critérios de Sucesso

- `renderStatusBadge` não existe mais em `gym-row.tsx` nem em `gym-card.tsx`; ambos usam `<StatusBadge tone={...}>{...}</StatusBadge>`.
- Os 12 testes existentes de `gym-row.test.tsx` e os testes existentes de `gym-card.test.tsx` continuam passando sem mudança de estratégia de query.
- O botão de editar (`Link` com `Pencil`) permanece intacto em ambos os arquivos, sem alteração.
- A view em grid (`gym-card.tsx`) e a view em lista (`gym-row.tsx`) da mesma listagem de academias ficam visualmente consistentes — nenhuma das duas mantém o dot bespoke antigo.
