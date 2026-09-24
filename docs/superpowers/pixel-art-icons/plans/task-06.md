# Task 6: Features check-ins, academias, perfil e contato

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** cheap

**Depends on:** task-01

## Visão Geral

Troca o import de ícones de `lucide-react` para `@/components/ui/pixel-icons` em 12 arquivos das features de check-ins, academias, perfil e contato. Leva os três ícones `h-3.5 w-3.5` (`MapPin` em card e linha de academia, `Clock` no resumo de horários) para `h-4 w-4` e faz o spinner de carregamento de aprovar/rejeitar girar em passos (`steps(8)`), mantendo `animate-spin` no próprio svg.

## Arquivos

- Modify: `apps/frontend/src/features/profile/components/EditProfileModal.tsx`
- Modify: `apps/frontend/src/features/contact/components/contact-section.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Modify: `apps/frontend/src/features/gyms/components/operating-hours-summary.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `ArrowRight`, `Clock`, `Mail`, `Filter`, `Search`, `X`, `ArrowDown`, `ArrowUp`, `Check`, `Loader2`, `MapPin`, `Pencil` (todos `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`, com `className` repassado e `aria-hidden="true"` por padrão). São atribuíveis a `ComponentType<{ className?: string }>`, tipo usado pelo mapa de `check-in-item.tsx` (`{ cls: string; Icon: ComponentType<{ className?: string }> }`) e pela prop `icon?` de `EmptyState` (recebe `icon={Search}` em `gym-results.tsx`).
- **Produz:** N/A

### Skills a invocar

- `tailwindcss`: `h-3.5 w-3.5` para `h-4 w-4`; o timing em passos usa a propriedade arbitrária `[animation-timing-function:steps(8)]` junto de `animate-spin`.
- `test-antipatterns`: o teste novo asserta classes do svg realmente renderizado, sem mockar o ícone.
- `wcag-audit-patterns`: o spinner continua `aria-hidden` e o botão mantém `aria-busy` e `aria-label` (o estado de carregamento não se perde).

## Passos

- **Step 1: Review Focus: `Loader2` de aprovar/rejeitar check-in → `.animate-spin` fica no próprio `<svg>` e gira em passos (`steps(8)`), o botão não perde o estado de carregamento — Write the failing test**

Em `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx`, logo após o teste `"mostra um ícone de carregamento apenas no botão que está de fato pendente"` (mesmo `describe`, para herdar o mesmo setup de mocks), acrescente:

```tsx
	test("o ícone de carregamento mantém .animate-spin no próprio svg e gira em passos (steps(8))", () => {
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ isPending: true }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const spinner = approveBtn.querySelector(".animate-spin")

		expect(spinner).not.toBeNull()
		expect(spinner?.tagName.toLowerCase()).toBe("svg")
		expect(spinner).toHaveClass("[animation-timing-function:steps(8)]")
		expect(spinner).toHaveAttribute("shape-rendering", "crispEdges")
		expect(approveBtn).toHaveAttribute("aria-busy", "true")
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-actions.test.tsx`
Expected: FAIL em `o ícone de carregamento mantém .animate-spin no próprio svg e gira em passos (steps(8))` (o spinner atual não tem a classe `[animation-timing-function:steps(8)]` nem `shape-rendering`); os demais testes do arquivo passam.

- **Step 3: Write minimal implementation**

Em cada arquivo, troque o import e só o que estiver indicado.

1. `apps/frontend/src/features/profile/components/EditProfileModal.tsx` (linha 3). Antes: `import { ArrowRight } from "lucide-react"`. Depois: `import { ArrowRight } from "@/components/ui/pixel-icons"`. O `<ArrowRight` da linha 123 não tem classe de tamanho e continua assim (herda 24px do padrão do componente).

2. `apps/frontend/src/features/contact/components/contact-section.tsx` (linha 1). Antes: `import { Clock, Mail } from "lucide-react"`. Depois: `import { Clock, Mail } from "@/components/ui/pixel-icons"`. `size-4` permanece.

3. `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx` (linha 3). Antes: `import { Filter } from "lucide-react"`. Depois: `import { Filter } from "@/components/ui/pixel-icons"`.

4. `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx` (linha 1). Antes: `import { Search, X } from "lucide-react"`. Depois: `import { Search, X } from "@/components/ui/pixel-icons"`.

5. `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx` (linha 1). Antes: `import { ArrowDown, ArrowUp } from "lucide-react"`. Depois: `import { ArrowDown, ArrowUp } from "@/components/ui/pixel-icons"`.

6. `apps/frontend/src/features/check-ins/components/check-in-item.tsx` (linha 1). Antes: `import { Check, Clock, X } from "lucide-react"`. Depois: `import { Check, Clock, X } from "@/components/ui/pixel-icons"`. O mapa `{ cls: string; Icon: ComponentType<{ className?: string }> }` não muda.

7. `apps/frontend/src/features/check-ins/components/check-in-actions.tsx` (linha 3 e as duas ocorrências do spinner, nos botões de rejeitar e de aprovar, em torno das linhas 56 e 95). Linha 3. Antes: `import { Loader2 } from "lucide-react"`. Depois: `import { Loader2 } from "@/components/ui/pixel-icons"`. Em cada uma das duas ocorrências. Antes:

```tsx
<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
```

Depois:

```tsx
<Loader2
	className="h-4 w-4 animate-spin [animation-timing-function:steps(8)]"
	aria-hidden="true"
/>
```

8. `apps/frontend/src/features/gyms/components/gym-card.tsx` (linhas 1 e 71). Linha 1. Antes: `import { MapPin, Pencil } from "lucide-react"`. Depois: `import { MapPin, Pencil } from "@/components/ui/pixel-icons"`. Linha 71. Antes: `<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />`. Depois: `<MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />`.

9. `apps/frontend/src/features/gyms/components/gym-row.tsx` (linhas 1 e 47). Linha 1. Antes: `import { MapPin, Pencil } from "lucide-react"`. Depois: `import { MapPin, Pencil } from "@/components/ui/pixel-icons"`. Linha 47. Antes: `<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />`. Depois: `<MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />`.

10. `apps/frontend/src/features/gyms/components/operating-hours-summary.tsx` (linhas 3 e 166). Linha 3. Antes: `import { Clock } from "lucide-react"`. Depois: `import { Clock } from "@/components/ui/pixel-icons"`. Linha 166. Antes: `<Clock className="h-3.5 w-3.5" aria-hidden="true" />`. Depois: `<Clock className="h-4 w-4" aria-hidden="true" />`.

11. `apps/frontend/src/features/gyms/components/gym-results.tsx` (linha 3). Antes: `import { Search } from "lucide-react"`. Depois: `import { Search } from "@/components/ui/pixel-icons"`. O `icon={Search}` passado ao `EmptyState` não muda.

12. `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx` (linha 3). Antes: `import { Pencil } from "lucide-react"`. Depois: `import { Pencil } from "@/components/ui/pixel-icons"`.

A ordem dos imports entre si é normalizada pelo Biome no checkpoint.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-actions.test.tsx`
Expected: PASS (inclui os testes existentes que usam `querySelector(".animate-spin")`).

- **Step 5: Rodar os testes dos demais arquivos tocados**

Run: `cd apps/frontend && pnpm exec vitest run src/features/profile/components/EditProfileModal.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/contact/components/contact-section.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-filter-bar.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-search-input.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-sort-toggle.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/check-ins/components/check-in-item.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/gyms/components/gym-card.test.tsx`
Expected: PASS (o `svg` do StatusBadge segue presente)

Run: `cd apps/frontend && pnpm exec vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: PASS (o `svg` do StatusBadge segue presente)

Run: `cd apps/frontend && pnpm exec vitest run src/features/gyms/components/operating-hours-summary.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/gyms/components/gym-results.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/features/gyms/components/gym-image-edit-overlay.test.tsx`
Expected: PASS

- **Step 6: Verificar que nenhum import do pacote antigo restou nos arquivos da task**

Run: `rg -n "lucide-react" apps/frontend/src/features/profile apps/frontend/src/features/contact apps/frontend/src/features/check-ins apps/frontend/src/features/gyms`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

Run: `rg -n "h-3\.5|w-3\.5" apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/operating-hours-summary.tsx`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/features/profile apps/frontend/src/features/contact apps/frontend/src/features/check-ins apps/frontend/src/features/gyms
git commit -m "feat(frontend): features de check-ins, academias, perfil e contato com ícones pixel-art

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Os 12 arquivos importam ícones de `@/components/ui/pixel-icons` e nenhum cita `lucide-react`.
- O spinner de aprovar e o de rejeitar mantêm `animate-spin` no próprio `<svg>` e ganham `[animation-timing-function:steps(8)]`; o botão continua com `aria-busy`.
- `MapPin` (card e linha) e `Clock` (resumo de horários) têm 16px (`h-4 w-4`).
- Os testes existentes dos arquivos tocados seguem verdes.
