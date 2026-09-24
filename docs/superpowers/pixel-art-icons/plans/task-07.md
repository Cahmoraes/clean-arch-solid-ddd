# Task 7: Páginas autenticadas

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** cheap

**Depends on:** task-01

## Visão Geral

Troca o import de ícones de `lucide-react` para `@/components/ui/pixel-icons` nas 13 páginas de `src/app/(authenticated)`. É só troca de import: os tamanhos (`size-4`, `h-4`, `h-5`, `h-3`, `h-6`) já estão na grade de 12/16/20/24px e ficam. A única mudança de tipo é o mapa de ação de status da página de academia, que passa a tipar o ícone como `PixelIcon`.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/[userId]/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/planos/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `CalendarDays`, `ChevronLeft`, `ChevronRight`, `RefreshCcw`, `AlertTriangle`, `BadgeCheck`, `Check`, `LayoutGrid`, `List`, `Plus`, `Search`, `ArrowLeft`, `MapPin`, `Pencil`, `Phone`, `Power`, `RotateCcw`, `UserCircle`, `KeyRound`, `CalendarCheck`, `Users`, `ShieldCheck` e o tipo `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`. Cada componente aceita `className` e `aria-hidden`; é atribuível a `ElementType` e à prop `icon=` dos componentes de cabeçalho de página.
- **Produz:** N/A

### Skills a invocar

- `tailwindcss`: os tamanhos existentes (`size-4` = 16px, `h-5` = 20px, `h-3` = 12px, `h-6` = 24px) já estão na grade e ficam.
- `typescript-advanced`: em `academias/[id]/page.tsx`, `icon: typeof Power | typeof RotateCcw` vira `icon: PixelIcon`.

## Passos

- **Step 1: Write the failing test**

Em `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`, dentro de `describe("CalendarPage", ...)`, ao final do bloco, acrescente:

```tsx
	test("os ícones de navegação de ano são pixel-art nítidos e têm 16px (size-4)", async () => {
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2025`, () => HttpResponse.json([])),
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([])),
			http.get(`${BRASIL_API_FERIADOS_URL}/2027`, () => HttpResponse.json([])),
		)

		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={8} />)

		const previous = screen
			.getByLabelText("Ir para 2025 (ano anterior)")
			.querySelector("svg")
		const next = screen
			.getByLabelText("Ir para 2027 (ano seguinte)")
			.querySelector("svg")

		for (const icon of [previous, next]) {
			expect(icon).not.toBeNull()
			expect(icon).toHaveClass("size-4")
			expect(icon).toHaveAttribute("aria-hidden", "true")
			expect(icon).toHaveAttribute("shape-rendering", "crispEdges")
		}
		await screen.findByRole("heading", { name: /Setembro 2026/ })
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/calendario/page.test.tsx"`
Expected: FAIL em `os ícones de navegação de ano são pixel-art nítidos e têm 16px (size-4)` (o svg atual do lucide não tem `shape-rendering="crispEdges"`); os demais testes do arquivo passam.

- **Step 3: Write minimal implementation**

Em cada página, troque o import. Caminhos relativos a `apps/frontend/src/app/(authenticated)/`.

1. `calendario/page.tsx` (linhas 3 a 8). Antes:

```tsx
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	RefreshCcw,
} from "lucide-react"
```

Depois: o mesmo bloco com `} from "@/components/ui/pixel-icons"`.

2. `assinatura/page.tsx` (linha 3). Antes: `import { AlertTriangle, BadgeCheck, Check } from "lucide-react"`. Depois: `import { AlertTriangle, BadgeCheck, Check } from "@/components/ui/pixel-icons"`.

3. `academias/page.tsx` (linha 3). Antes: `import { LayoutGrid, List, Plus, Search } from "lucide-react"`. Depois: `import { LayoutGrid, List, Plus, Search } from "@/components/ui/pixel-icons"`.

4. `academias/[id]/page.tsx` (linhas 3 a 10 e linha 155). Antes:

```tsx
import {
	ArrowLeft,
	MapPin,
	Pencil,
	Phone,
	Power,
	RotateCcw,
} from "lucide-react"
```

Depois:

```tsx
import {
	ArrowLeft,
	MapPin,
	Pencil,
	Phone,
	type PixelIcon,
	Power,
	RotateCcw,
} from "@/components/ui/pixel-icons"
```

Linha 155. Antes: `icon: typeof Power | typeof RotateCcw`. Depois: `icon: PixelIcon`. O uso `<IconComponent ...>` do mapa não muda; `Power` e `RotateCcw` continuam sendo referenciados no mapa de configuração.

5. `perfil/page.tsx` (linha 3). Antes: `import { UserCircle } from "lucide-react"`. Depois: `import { UserCircle } from "@/components/ui/pixel-icons"`.

6. `perfil/[userId]/page.tsx` (linha 3). Antes: `import { UserCircle } from "lucide-react"`. Depois: `import { UserCircle } from "@/components/ui/pixel-icons"`.

7. `perfil/senha/page.tsx` (linha 4). Antes: `import { KeyRound } from "lucide-react"`. Depois: `import { KeyRound } from "@/components/ui/pixel-icons"`.

8. `check-ins/page.tsx` (linha 3). Antes: `import { CalendarCheck } from "lucide-react"`. Depois: `import { CalendarCheck } from "@/components/ui/pixel-icons"`.

9. `admin/academias/[id]/editar/page.tsx` (linha 4). Antes: `import { ArrowLeft } from "lucide-react"`. Depois: `import { ArrowLeft } from "@/components/ui/pixel-icons"`.

10. `admin/usuarios/[userId]/atividade/page.tsx` (linha 3). Antes: `import { ArrowLeft } from "lucide-react"`. Depois: `import { ArrowLeft } from "@/components/ui/pixel-icons"`.

11. `admin/usuarios/page.tsx` (linha 3). Antes: `import { Users } from "lucide-react"`. Depois: `import { Users } from "@/components/ui/pixel-icons"`.

12. `admin/check-ins/page.tsx` (linha 3). Antes: `import { ShieldCheck } from "lucide-react"`. Depois: `import { ShieldCheck } from "@/components/ui/pixel-icons"`.

13. `admin/planos/page.tsx` (linha 4). Antes: `import { Plus } from "lucide-react"`. Depois: `import { Plus } from "@/components/ui/pixel-icons"`. Os `Plus` com `h-6` e `h-4` permanecem.

A ordem dos imports entre si é normalizada pelo Biome no checkpoint.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/calendario/page.test.tsx"`
Expected: PASS

- **Step 5: Rodar os testes de página dos demais arquivos tocados**

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/assinatura/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/academias/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/academias/[id]/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/perfil/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/perfil/perfil-volt.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/perfil/[userId]/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/perfil/senha/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/check-ins/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/admin/usuarios/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/admin/check-ins/page.test.tsx"`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/admin/planos/page.test.tsx"`
Expected: PASS

- **Step 6: Verificar que nenhum import do pacote antigo restou nas páginas**

Run: `rg -n "lucide-react|typeof (Power|RotateCcw)" "apps/frontend/src/app/(authenticated)"`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add "apps/frontend/src/app/(authenticated)"
git commit -m "feat(frontend): páginas autenticadas com ícones pixel-art

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- As 13 páginas importam ícones de `@/components/ui/pixel-icons`; nenhuma cita `lucide-react`.
- `academias/[id]/page.tsx` tipa o ícone do mapa de ação como `PixelIcon`.
- Os ícones de navegação de ano do calendário renderizam com `size-4` e `shape-rendering="crispEdges"`.
- Os testes de página existentes seguem verdes.
