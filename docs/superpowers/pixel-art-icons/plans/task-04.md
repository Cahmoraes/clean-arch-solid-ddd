# Task 4: Componentes de ui compartilhados

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Migra os componentes compartilhados de `src/components/ui` (mapa de ícones de status e ação, `StatCard`, checkbox, alternador de tema, busca, paginação, badges, sheet e dialog) e os quatro testes que importavam ícones do `lucide-react` para `@/components/ui/pixel-icons`. O tipo `LucideIcon` vira `PixelIcon`, e os dois tamanhos fora da grade (`size-3.5` do checkbox e `h-3.5 w-3.5` do alternador de tema) passam para 16px.

## Arquivos

- Modify: `apps/frontend/src/components/ui/status-icon.ts`
- Modify: `apps/frontend/src/components/ui/stat-card.tsx`
- Modify: `apps/frontend/src/components/ui/checkbox.tsx`
- Modify: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Modify: `apps/frontend/src/components/ui/search-bar.tsx`
- Modify: `apps/frontend/src/components/ui/pagination.tsx`
- Modify: `apps/frontend/src/components/ui/role-badge.tsx`
- Modify: `apps/frontend/src/components/ui/admin-badge.tsx`
- Modify: `apps/frontend/src/components/ui/sheet.tsx`
- Modify: `apps/frontend/src/components/ui/dialog.tsx`
- Test: `apps/frontend/src/components/ui/status-icon.test.ts`
- Test: `apps/frontend/src/components/ui/stat-card.test.tsx`
- Test: `apps/frontend/src/components/ui/empty-state.test.tsx`
- Test: `apps/frontend/src/components/ui/segmented-control.test.tsx`
- Test: `apps/frontend/src/components/ui/checkbox.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `Check`, `CheckIcon`, `ChevronLeft`, `ChevronRight`, `CircleCheck`, `CircleSlash`, `MoreHorizontal`, `Moon`, `Pencil`, `Search`, `Shield`, `Sun`, `TriangleAlert`, `X`, `XIcon`, `Users`, `Bell`, `LayoutGrid` e o tipo `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`. Cada componente aceita `className` e `aria-hidden` e é atribuível a `ElementType`.
- **Produz:** `STATUS_ICON: Record<StatusIconTone, PixelIcon>` e `ACTION_ICON: Record<ActionIconName, PixelIcon>` (em `status-icon.ts`); `StatCardProps.icon: PixelIcon` (em `stat-card.tsx`). Nomes dos exports inalterados.

### Skills a invocar

- `shadcn`: `checkbox`, `dialog` e `sheet` são componentes no padrão shadcn sobre Radix; só o ícone muda, sem alterar slots nem data-attributes.
- `tailwindcss`: `size-3.5` para `size-4` e `h-3.5 w-3.5` para `h-4 w-4`; `h-3` dos badges e `size-4` do sheet ficam.
- `typescript-advanced`: `Record<..., PixelIcon>` e `icon: PixelIcon` no lugar de `LucideIcon`.
- `test-antipatterns`: `status-icon.test.ts` compara identidade com o export real do módulo; sem mock de ícone.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/pixel-art-icons-visual.md` (baseline de tamanho e estados; é norte, não pixel-final)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `playwright-cli`, `run` e a automação de navegador `claude-in-chrome`, descobertas por descrição e nunca fixadas; se nenhuma servir, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** ícones pequenos em 16px (`h-4 w-4`), badges de papel em 12px (`h-3`); `currentColor`, tons de status inalterados; `crispEdges`, sem `stroke`, nunca glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirme com o usuário se existe fonte de design original; a ausência é resposta válida e roteia para a implementação manual contra o mockup `../specs/mockups/pixel-art-icons-visual.md`. Só redescubra ferramentas se o campo estiver em branco.

- **Step 1: Write the failing test**

1. `apps/frontend/src/components/ui/status-icon.test.ts`: troque o import (linhas 1 a 9) e as descrições. Antes:

```ts
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"
import { describe, expect, test } from "vitest"
import { ACTION_ICON, STATUS_ICON } from "./status-icon"
```

Depois:

```ts
import { describe, expect, test } from "vitest"
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "@/components/ui/pixel-icons"
import { ACTION_ICON, STATUS_ICON } from "./status-icon"
```

E nas duas descrições, `ícone lucide correspondente` vira `ícone pixel-art correspondente`. As asserções de identidade (`toBe(CircleCheck)` etc.) permanecem como estão.

2. `apps/frontend/src/components/ui/stat-card.test.tsx` linha 2. Antes: `import { Users } from "lucide-react"`. Depois: `import { Users } from "@/components/ui/pixel-icons"`.

3. `apps/frontend/src/components/ui/segmented-control.test.tsx` linha 2. Antes: `import { LayoutGrid } from "lucide-react"`. Depois: `import { LayoutGrid } from "@/components/ui/pixel-icons"`.

4. `apps/frontend/src/components/ui/empty-state.test.tsx` linha 2. Antes: `import { Bell } from "lucide-react"`. Depois: `import { Bell } from "@/components/ui/pixel-icons"`.

5. `apps/frontend/src/components/ui/checkbox.test.tsx`: dentro de `describe("Checkbox", ...)`, após o teste `"oculta o ícone de check decorativo de leitores de tela quando marcado"`, acrescente:

```tsx
	test("o ícone de check marcado é pixel-art nítido e tem 16px (size-4)", () => {
		const { container } = render(
			<Checkbox aria-label="Aceitar termos" defaultChecked />,
		)
		const icon = container.querySelector("svg")
		expect(icon).toHaveClass("size-4")
		expect(icon).not.toHaveClass("size-3.5")
		expect(icon).toHaveAttribute("shape-rendering", "crispEdges")
	})
```

A posição dos imports entre si é normalizada pelo Biome no checkpoint; a lista de nomes e a origem acima são o que importa.

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/status-icon.test.ts`
Expected: FAIL em `mapeia cada tom de status ao ícone pixel-art correspondente` e `mapeia cada ação ao ícone pixel-art correspondente` (`STATUS_ICON.success` ainda é o `CircleCheck` do lucide, não o do módulo novo).

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/checkbox.test.tsx`
Expected: FAIL em `o ícone de check marcado é pixel-art nítido e tem 16px (size-4)` (classe atual `size-3.5`, sem `shape-rendering`).

- **Step 3: Write minimal implementation**

Em cada arquivo abaixo, troque o import e só o que estiver indicado.

1. `apps/frontend/src/components/ui/status-icon.ts` (linhas 1 a 10, 14 e 22). Antes:

```ts
import type { LucideIcon } from "lucide-react"
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"
```

Depois:

```ts
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	type PixelIcon,
	TriangleAlert,
	X,
} from "@/components/ui/pixel-icons"
```

Linha 14. Antes: `export const STATUS_ICON: Record<StatusIconTone, LucideIcon> = {`. Depois: `export const STATUS_ICON: Record<StatusIconTone, PixelIcon> = {`.
Linha 22. Antes: `export const ACTION_ICON: Record<ActionIconName, LucideIcon> = {`. Depois: `export const ACTION_ICON: Record<ActionIconName, PixelIcon> = {`.

2. `apps/frontend/src/components/ui/stat-card.tsx` (linhas 1 e 10; a linha 20, `icon: Icon,`, não muda). Linha 1. Antes: `import type { LucideIcon } from "lucide-react"`. Depois: `import type { PixelIcon } from "@/components/ui/pixel-icons"`. Linha 10. Antes: `icon: LucideIcon`. Depois: `icon: PixelIcon`.

3. `apps/frontend/src/components/ui/checkbox.tsx` (linhas 3 e 27). Linha 3. Antes: `import { CheckIcon } from "lucide-react"`. Depois: `import { CheckIcon } from "@/components/ui/pixel-icons"`. Linha 27. Antes: `<CheckIcon className="size-3.5" aria-hidden="true" />`. Depois: `<CheckIcon className="size-4" aria-hidden="true" />`.

4. `apps/frontend/src/components/ui/theme-toggle.tsx` (linhas 3 e 83). Linha 3. Antes: `import { Moon, Sun } from "lucide-react"`. Depois: `import { Moon, Sun } from "@/components/ui/pixel-icons"`. Linha 83. Antes: `className="theme-toggle-icon h-3.5 w-3.5 flex-shrink-0"`. Depois: `className="theme-toggle-icon h-4 w-4 flex-shrink-0"`.

5. `apps/frontend/src/components/ui/search-bar.tsx` (linha 3). Antes: `import { Search } from "lucide-react"`. Depois: `import { Search } from "@/components/ui/pixel-icons"`.

6. `apps/frontend/src/components/ui/pagination.tsx` (linha 3). Antes: `import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"`. Depois: `import { ChevronLeft, ChevronRight, MoreHorizontal } from "@/components/ui/pixel-icons"` (o Biome quebra a linha em bloco multilinha no checkpoint).

7. `apps/frontend/src/components/ui/role-badge.tsx` (linha 1). Antes: `import { Shield } from "lucide-react"`. Depois: `import { Shield } from "@/components/ui/pixel-icons"`. Tamanho `h-3` permanece.

8. `apps/frontend/src/components/ui/admin-badge.tsx` (linha 1). Antes: `import { Shield } from "lucide-react"`. Depois: `import { Shield } from "@/components/ui/pixel-icons"`. Tamanho `h-3` permanece.

9. `apps/frontend/src/components/ui/sheet.tsx` (linha 3). Antes: `import { XIcon } from "lucide-react"`. Depois: `import { XIcon } from "@/components/ui/pixel-icons"`. `size-4` permanece.

10. `apps/frontend/src/components/ui/dialog.tsx` (linha 4). Antes: `import { X } from "lucide-react"`. Depois: `import { X } from "@/components/ui/pixel-icons"`.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/status-icon.test.ts`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/checkbox.test.tsx`
Expected: PASS

- **Step 5: Rodar os demais testes dos arquivos tocados**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/stat-card.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/empty-state.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/segmented-control.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pagination.test.tsx`
Expected: PASS (`svg` com `aria-hidden` segue presente)

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/admin-badge.test.tsx`
Expected: PASS (`svg` presente)

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/status-badge.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/search-bar.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/role-badge.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/sheet.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/dialog.test.tsx`
Expected: PASS

- **Step 6: Verificar que nenhum import do pacote antigo restou nos arquivos da task**

Run: `rg -n "lucide-react|LucideIcon" apps/frontend/src/components/ui -g "!pixel-icons.test.tsx"`
Expected: nenhuma linha de saída (código de saída 1 do `rg`; o glob exclui `pixel-icons.test.tsx`, que cita a string de propósito).

Run: `rg -n "size-3\.5|h-3\.5 w-3\.5" apps/frontend/src/components/ui/checkbox.tsx apps/frontend/src/components/ui/theme-toggle.tsx`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 7: Conferência visual (manual, sem bloquear)**

Com a ferramenta descoberta no Step 0, confira contra o mockup: checkbox marcado (16px), alternador de tema nos dois estados, paginação, busca, badges de papel (12px), fechar do dialog e do sheet, tema claro e escuro. Glifos nítidos, sem glow. Registre desvios.

- **Step 8: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/components/ui/status-icon.ts apps/frontend/src/components/ui/stat-card.tsx apps/frontend/src/components/ui/checkbox.tsx apps/frontend/src/components/ui/theme-toggle.tsx apps/frontend/src/components/ui/search-bar.tsx apps/frontend/src/components/ui/pagination.tsx apps/frontend/src/components/ui/role-badge.tsx apps/frontend/src/components/ui/admin-badge.tsx apps/frontend/src/components/ui/sheet.tsx apps/frontend/src/components/ui/dialog.tsx apps/frontend/src/components/ui/status-icon.test.ts apps/frontend/src/components/ui/stat-card.test.tsx apps/frontend/src/components/ui/empty-state.test.tsx apps/frontend/src/components/ui/segmented-control.test.tsx apps/frontend/src/components/ui/checkbox.test.tsx
git commit -m "feat(frontend): componentes de ui compartilhados com ícones pixel-art

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Os 10 arquivos de produção e os 4 testes importam ícones de `@/components/ui/pixel-icons`; nenhum usa `LucideIcon` ou cita `lucide-react`.
- `STATUS_ICON` e `ACTION_ICON` apontam para os exports do módulo novo (identidade), tipados como `PixelIcon`.
- O check do checkbox e o ícone do alternador de tema têm 16px; o check renderiza com `shape-rendering="crispEdges"`.
- Os testes existentes de `svg` com `aria-hidden` e `svg` presente seguem verdes.
