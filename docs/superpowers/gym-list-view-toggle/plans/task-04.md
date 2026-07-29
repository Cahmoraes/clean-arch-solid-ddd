# Task 4: Ampliar `SegmentedControl.label` de `string` para `ReactNode`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Amplia o tipo `SegmentedItem<T>.label` de `string` para `ReactNode`, mudança aditiva que permite que os itens do `SegmentedControl` levem um ícone em vez de texto — necessário para o toggle ícone-apenas (`LayoutGrid`/`List`) da task 7. Todo `string` já satisfaz `ReactNode`, então os 3 consumidores existentes (`check-in-filter-bar.tsx`, `period-selector.tsx`, `user-filter-bar.tsx`) continuam compilando e passando sem alteração — não devem ser tocados nesta task.

## Arquivos

- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Modify (test): `apps/frontend/src/components/ui/segmented-control.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: mudança de tipo genérico aditiva (`string` → `ReactNode`) sem quebrar inferência de `SegmentedItem<T>` nos 3 consumidores existentes.
- `tailwindcss`: ajustar padding/dimensões do botão via classes condicionais para aproximar o item ícone-apenas do visual quadrado 34×34px do mockup, sem quebrar o layout em pílula dos itens de texto existentes.
- `vercel-react-best-practices`: manter o componente genérico `SegmentedControl<T>` reutilizável e sem novas props além do necessário para aceitar `ReactNode`.
- `code-style`: manter a convenção existente do arquivo (export nomeado, `cn()` para composição de classes, `fieldset`/`button` semânticos).
- `test-antipatterns`: cobrir apenas o novo caso real (label como ícone) sem duplicar os testes já existentes de string/count/aria-label.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Toggle escolhido (Opção A)" — botões 34×34px ícone-apenas, sem label de texto, container com `border-radius: var(--v-r-md)` e `padding: 3px`.
- **Fonte de design original:** nenhuma; seguir o mockup curado (confirmado na spec, seção "Especificação Visual" — nenhuma ferramenta externa usada nesta sessão).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta já registrada nesta sessão: não há.)
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou teste visual configurada neste ambiente para esta sessão — fidelidade construída manualmente contra o mockup curado.
- **Decisões visuais já tomadas (não refazer):** D1 da spec aceita a divergência visual pílula (formato atual do `SegmentedControl`) vs. quadrado (mockup) — não criar um componente novo nem forçar o formato quadrado exato; apenas garantir que um `ReactNode` (ícone) renderize corretamente centralizado dentro do botão existente.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Fonte de design original e ferramentas de fidelidade já registradas acima (nenhuma disponível nesta sessão) — construir manualmente contra `../specs/mockups/gym-list-view-toggle-visual.md`. Reusar a decisão D1 da spec (divergência pílula vs. quadrado aceita) sem re-derivar.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/components/ui/segmented-control.test.tsx (adicionar dentro do describe existente)
import { LayoutGrid } from "lucide-react"
// ... (imports existentes de fireEvent, render, screen, describe, expect, test, vi, SegmentedControl mantidos)

test("aceita um ReactNode (ícone) como label", () => {
	render(
		<SegmentedControl
			items={[
				{ value: "cards", label: <LayoutGrid data-testid="icon-cards" /> },
				{ value: "rows", label: "Linhas" },
			]}
			value="cards"
			onValueChange={vi.fn()}
			aria-label="Alternar visualização"
		/>,
	)
	expect(screen.getByTestId("icon-cards")).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Esta é uma mudança de tipo (`label: string` → `label: ReactNode`); Vitest transpila TS via esbuild sem checar tipos, então o teste roda e passa em runtime mesmo antes da mudança — o RED real é de tipo, não de comportamento. Verificar com o typechecker:

Run: `pnpm --filter frontend tsc:check`
Expected: FAIL with `Type '{ value: string; label: Element }' is not assignable to type 'SegmentedItem<string>'. Types of property 'label' are incompatible. Type 'Element' is not assignable to type 'string'.` no arquivo de teste, na linha do item `{ value: "cards", label: <LayoutGrid data-testid="icon-cards" /> }`

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/components/ui/segmented-control.tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface SegmentedItem<T extends string = string> {
	value: T
	label: ReactNode
	count?: number
}

// (SegmentedControlProps, InlineBadge, FloatBadge permanecem inalterados)
```

O restante do arquivo (`SegmentedControl`, incluindo `{item.label}` no JSX) permanece idêntico — `ReactNode` já é renderizável diretamente onde `string` era usado.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS (sem erros de tipo)

Run: `pnpm --filter frontend test segmented-control.test.ts`
Expected: PASS (5 testes: os 4 existentes + o novo caso de ícone)

Rodar também a suíte completa dos 3 consumidores para confirmar zero regressão:

Run: `pnpm --filter frontend test check-in-filter-bar period-selector user-filter-bar`
Expected: PASS (sem alteração nesses arquivos)

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/segmented-control.tsx apps/frontend/src/components/ui/segmented-control.test.tsx
git commit -m "feat: amplia SegmentedItem.label de string para ReactNode para suportar ícones"
```

## Critérios de Sucesso

- `SegmentedItem<T>.label` tem tipo `ReactNode`.
- Os 3 consumidores existentes (`check-in-filter-bar.tsx`, `period-selector.tsx`, `user-filter-bar.tsx`) não foram modificados e continuam passando `string` sem erro de compilação.
- Novo teste cobre um item com `label` como ícone (`ReactNode`) renderizando corretamente.
- `pnpm --filter frontend tsc:check` sem erros novos.
- `pnpm --filter frontend test segmented-control.test.ts` 100% verde.
