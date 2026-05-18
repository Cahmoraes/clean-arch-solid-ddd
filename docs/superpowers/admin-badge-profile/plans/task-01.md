# Task 1: Criar componente AdminBadge

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/admin-badge-profile-design.md`

## Visão Geral

Criar o componente presentacional `AdminBadge` — um pill roxo com ícone de escudo e texto "ADMIN" — com seus testes unitários. O componente não contém lógica condicional: apenas renderiza o badge. Quem decide exibi-lo ou não é o consumidor.

## Arquivos

- Create: `apps/frontend/src/components/ui/admin-badge.tsx`
- Create: `apps/frontend/src/components/ui/admin-badge.test.tsx`

### Conformidade com as Skills Padrão

- test-driven-development: escrever teste antes da implementação
- test-antipatterns: testar comportamento visual real, não detalhes de implementação interna

## Passos

- [ ] **Step 1: Escrever os testes com falha**

Crie o arquivo `apps/frontend/src/components/ui/admin-badge.test.tsx` com o seguinte conteúdo:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdminBadge } from "./admin-badge"

describe("AdminBadge", () => {
	it("renderiza o texto ADMIN", () => {
		render(<AdminBadge />)
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
	})

	it("renderiza o ícone de escudo (svg)", () => {
		const { container } = render(<AdminBadge />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})

	it("aplica className adicional quando fornecido", () => {
		render(<AdminBadge className="mt-2" />)
		const badge = screen.getByText("ADMIN").closest("span")
		expect(badge).toHaveClass("mt-2")
	})
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- -t "AdminBadge"
```

Saída esperada: **FAIL** com erro `Cannot find module './admin-badge'`.

- [ ] **Step 3: Criar a implementação mínima**

Crie o arquivo `apps/frontend/src/components/ui/admin-badge.tsx` com o seguinte conteúdo:

```tsx
import { Shield } from "lucide-react"

export function AdminBadge({ className }: { className?: string }) {
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white${className ? ` ${className}` : ""}`}
		>
			<Shield className="h-3 w-3" />
			ADMIN
		</span>
	)
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "AdminBadge"
```

Saída esperada: **PASS** — 3 testes passando.

- [ ] **Step 5: Verificar TypeScript e lint**

```bash
pnpm --filter frontend tsc:check && pnpm --filter frontend lint:fix
```

Saída esperada: sem erros de tipo, zero issues do Biome.

- [ ] **Step 6: Commit**

```bash
cd apps/frontend
git add src/components/ui/admin-badge.tsx src/components/ui/admin-badge.test.tsx
git commit -m "feat(frontend): add AdminBadge component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- O componente renderiza o texto "ADMIN" e o ícone SVG de escudo
- `className` extra é aplicado quando fornecido
- `pnpm --filter frontend test -- -t "AdminBadge"` passa com 3 testes ✅
- `pnpm --filter frontend tsc:check` sem erros ✅
- `pnpm --filter frontend lint:fix` zero issues ✅
