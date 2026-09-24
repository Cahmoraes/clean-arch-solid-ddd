# Task 5: Features admin, atividade, dashboard, planos e assinatura

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** cheap

**Depends on:** task-01

## Visão Geral

Troca o import de ícones de `lucide-react` para `@/components/ui/pixel-icons` em 11 arquivos das features admin, atividade, dashboard, planos e assinatura. É mecânico: `kpi-cards.tsx` troca `LucideIcon` por `PixelIcon` e `plan-card.tsx` leva o check de `h-3.5 w-3.5` para `h-4 w-4`. O svg do ícone da atividade continua recebendo a classe de tom (`text-accent`, `text-warning`, `text-muted-foreground`) pelo `className`.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/bulk-action-bar.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Modify: `apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`
- Modify: `apps/frontend/src/features/activity/components/activity-tab.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/dashboard-page.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Modify: `apps/frontend/src/features/plans-admin/components/plan-card.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`
- Test: `apps/frontend/src/features/activity/components/activity-tab.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `X`, `Filter`, `AlertTriangle`, `CheckCircle2`, `ChevronDown`, `UserRound`, `Activity`, `KeyRound`, `ShieldAlert`, `ShieldCheck`, `UserCircle`, `AlertCircle`, `CalendarDays`, `CheckCircle`, `Flame`, `User`, `Check` e o tipo `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`. Cada componente aceita `className` e `aria-hidden`; é atribuível a `ComponentType<{ className?: string }>` (usado por `ACTIVITY_ICON_CONFIG`).
- **Produz:** N/A (`KpiSlotProps.icon` passa a ser `PixelIcon`, interface local não exportada).

### Skills a invocar

- `tailwindcss`: `h-3.5 w-3.5` para `h-4 w-4` em `plan-card.tsx`; `h-3` de `plan-card-hero.tsx` fica (12px).
- `typescript-advanced`: `icon: PixelIcon` em `KpiSlotProps`; `ACTIVITY_ICON_CONFIG` segue com `ComponentType<{ className?: string }>`.
- `test-antipatterns`: o teste novo asserta atributos e classes do svg realmente renderizado.

## Passos

- **Step 1: Review Focus: `svg` de ícone da atividade e de status → mantém a classe de tom (`text-accent`, `text-warning`, `text-muted-foreground`) repassada pelo `className` — Write the failing test**

Em `apps/frontend/src/features/activity/components/activity-tab.test.tsx`, dentro de `describe("ActivityTab", ...)`, após o teste `"exibe ícone com cor de segurança para eventos de senha e bloqueio"`, acrescente:

```tsx
	test("o svg de cada evento é pixel-art nítido e mantém a classe de tom repassada", () => {
		const events: UserActivityEvent[] = [
			buildEvent({
				id: "e1",
				type: "CHECK_IN",
				description: "Check-in — Academia Central",
			}),
			buildEvent({
				id: "e2",
				type: "PASSWORD_CHANGED",
				description: "Senha alterada",
			}),
		]
		render(<ActivityTab events={events} />)

		const checkInSvg = screen
			.getByRole("img", { name: "Check-in" })
			.querySelector("svg")
		const securitySvg = screen
			.getByRole("img", { name: "Segurança" })
			.querySelector("svg")

		expect(checkInSvg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(checkInSvg).toHaveClass("text-accent")
		expect(securitySvg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(securitySvg).toHaveClass("text-warning")
	})

	test("o svg do evento de login mantém text-muted-foreground e é pixel-art nítido", () => {
		const { container } = render(
			<ActivityTab events={[buildEvent({ id: "e1", type: "LOGIN" })]} />,
		)
		const loginSvg = container.querySelector("svg")

		expect(loginSvg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(loginSvg).toHaveClass("text-muted-foreground")
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/activity/components/activity-tab.test.tsx`
Expected: FAIL em `o svg de cada evento é pixel-art nítido e mantém a classe de tom repassada` e em `o svg do evento de login mantém text-muted-foreground e é pixel-art nítido` (o svg do lucide não tem `shape-rendering`); os demais testes do arquivo passam.

- **Step 3: Write minimal implementation**

Em cada arquivo, troque só o import (e o que estiver indicado). Antes/depois da linha de import:

1. `apps/frontend/src/features/admin/components/bulk-action-bar.tsx` (linha 3). Antes: `import { X } from "lucide-react"`. Depois: `import { X } from "@/components/ui/pixel-icons"`. O `<X aria-hidden="true" />` sem classe de tamanho continua como está (herda 24px do padrão do componente).

2. `apps/frontend/src/features/admin/components/user-filter-bar.tsx` (linha 3). Antes: `import { Filter } from "lucide-react"`. Depois: `import { Filter } from "@/components/ui/pixel-icons"`.

3. `apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx` (linha 3). Antes: `import { AlertTriangle, CheckCircle2 } from "lucide-react"`. Depois: `import { AlertTriangle, CheckCircle2 } from "@/components/ui/pixel-icons"`.

4. `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx` (linha 3). Antes: `import { ChevronDown } from "lucide-react"`. Depois: `import { ChevronDown } from "@/components/ui/pixel-icons"`.

5. `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx` (linha 3). Antes: `import { UserRound } from "lucide-react"`. Depois: `import { UserRound } from "@/components/ui/pixel-icons"`.

6. `apps/frontend/src/features/activity/components/activity-tab.tsx` (linhas 1 a 8). Antes:

```tsx
import {
	Activity,
	CheckCircle2,
	KeyRound,
	ShieldAlert,
	ShieldCheck,
	UserCircle,
} from "lucide-react"
```

Depois: o mesmo bloco com `} from "@/components/ui/pixel-icons"`. `ACTIVITY_ICON_CONFIG` (`ComponentType<{ className?: string }>`) não muda.

7. `apps/frontend/src/features/dashboard/components/dashboard-page.tsx` (linha 3). Antes: `import { AlertCircle } from "lucide-react"`. Depois: `import { AlertCircle } from "@/components/ui/pixel-icons"`.

8. `apps/frontend/src/features/dashboard/components/kpi-cards.tsx` (linhas 3 a 9 e linha 27). Antes:

```tsx
import {
	Activity,
	CalendarDays,
	CheckCircle,
	Flame,
	type LucideIcon,
} from "lucide-react"
```

Depois:

```tsx
import {
	Activity,
	CalendarDays,
	CheckCircle,
	Flame,
	type PixelIcon,
} from "@/components/ui/pixel-icons"
```

Linha 27, em `interface KpiSlotProps`. Antes: `icon: LucideIcon`. Depois: `icon: PixelIcon`.

9. `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx` (linha 3). Antes: `import { User } from "lucide-react"`. Depois: `import { User } from "@/components/ui/pixel-icons"`.

10. `apps/frontend/src/features/plans-admin/components/plan-card.tsx` (linhas 1 e 55). Linha 1. Antes: `import { Check } from "lucide-react"`. Depois: `import { Check } from "@/components/ui/pixel-icons"`. Linha 55. Antes: `<Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />`. Depois: `<Check className="h-4 w-4 text-success" aria-hidden="true" />`.

11. `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx` (linha 1). Antes: `import { Check } from "lucide-react"`. Depois: `import { Check } from "@/components/ui/pixel-icons"`. O `h-3` permanece.

A ordem dos imports entre si é normalizada pelo Biome no checkpoint.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/activity/components/activity-tab.test.tsx`
Expected: PASS (inclui os testes existentes de `text-accent`, `text-warning` e `text-muted-foreground`).

- **Step 5: Rodar os testes dos demais arquivos tocados**

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/bulk-action-bar.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/user-filter-bar.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/user-detail/details-edit-form.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/user-detail/details-tab.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/dashboard/components/dashboard-page.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/dashboard/components/profile-hero-card.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/subscriptions/components/plan-card-hero.test.tsx`
Expected: PASS

- **Step 6: Verificar que nenhum import do pacote antigo restou nos arquivos da task**

Run: `rg -n "lucide-react|LucideIcon" apps/frontend/src/features/admin apps/frontend/src/features/activity apps/frontend/src/features/dashboard apps/frontend/src/features/plans-admin apps/frontend/src/features/subscriptions`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

Run: `rg -n "h-3\.5|w-3\.5" apps/frontend/src/features/plans-admin/components/plan-card.tsx`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/features/admin apps/frontend/src/features/activity apps/frontend/src/features/dashboard apps/frontend/src/features/plans-admin apps/frontend/src/features/subscriptions
git commit -m "feat(frontend): features admin, atividade, dashboard e planos com ícones pixel-art

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Os 11 arquivos importam ícones de `@/components/ui/pixel-icons`; nenhum usa `LucideIcon` ou cita `lucide-react`.
- O svg do ícone da atividade renderiza com `shape-rendering="crispEdges"` e mantém a classe de tom passada pelo `className`.
- O check de `plan-card.tsx` tem 16px (`h-4 w-4`).
- Os testes existentes dos arquivos tocados seguem verdes.
