# Task 3: Forma retrô nos componentes compartilhados [FR-003, FR-004]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Esta task normaliza todo arredondamento avulso (`rounded-full`, `rounded-[Npx]`) em `apps/frontend/src/components/**` para os tokens de chanfro produzidos na task-01, e converte elementos hoje circulares (avatar, dots, thumb do switch) em quadrados. Elementos com lado menor que 12px usam `rounded-none` para não virarem losango.

## Arquivos

- Modify: `apps/frontend/src/components/notification/notification-bell.tsx`
- Modify: `apps/frontend/src/components/notification/notification-dropdown.tsx`
- Modify: `apps/frontend/src/components/notification/notification-item.tsx`
- Modify: `apps/frontend/src/components/ui/checkbox.tsx`
- Modify: `apps/frontend/src/components/ui/admin-badge.tsx`
- Modify: `apps/frontend/src/components/ui/toaster.tsx`
- Modify: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Modify: `apps/frontend/src/components/ui/chart.tsx`
- Modify: `apps/frontend/src/components/ui/skeleton.tsx`
- Modify: `apps/frontend/src/components/ui/form-field.tsx`
- Modify: `apps/frontend/src/components/ui/field-shell.tsx`
- Modify: `apps/frontend/src/components/ui/motion-toggle.tsx`
- Modify: `apps/frontend/src/components/ui/role-badge.tsx`
- Modify: `apps/frontend/src/components/ui/status-badge.tsx`
- Modify: `apps/frontend/src/components/ui/empty-state.tsx`
- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Modify: `apps/frontend/src/components/ui/avatar.tsx`
- Modify: `apps/frontend/src/components/ui/stat-card.tsx`
- Modify: `apps/frontend/src/components/ui/dialog.tsx`
- Modify: `apps/frontend/src/components/ui/dropdown-menu.tsx` (confirmar se `DropdownMenuRadioItem` usa `rounded-full`)
- Test: `apps/frontend/src/components/ui/motion-toggle.test.tsx`
- Test: `apps/frontend/src/components/ui/skeleton.test.tsx`
- Test: `apps/frontend/src/components/ui/theme-toggle.test.tsx`
- Test: `apps/frontend/src/components/ui/avatar.test.tsx` (criar — não existe hoje)
- Test: `apps/frontend/src/components/notification/notification-item.test.tsx`

## Interfaces

- **Consome:** tokens `rounded-xs/sm/md/lg/xl` produzidos pela task-01 (via `--radius-*` chanfrado sob `@supports`, reto por fallback); nenhuma outra interface de código.
- **Produz:** nenhum símbolo novo — apenas classes Tailwind normalizadas nos componentes acima. Tasks 4, 7 e 8 consomem esses mesmos arquivos já sem `rounded-full`/`rounded-[`; a task-08 (guarda de resíduo) consome esta normalização como precondição para passar.

### Skills a invocar

- `tailwindcss`: aplicar as classes `rounded-xs/sm/md/lg/xl` corretas a cada elemento, sem reintroduzir valores arbitrários.
- `shadcn`: vários componentes (`dialog.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`) seguem o padrão shadcn/Radix; preservar a estrutura de slots e variantes ao trocar só a forma.
- `test-antipatterns`: os testes novos/atualizados devem asserir a classe real renderizada (`toHaveClass`/`not.toHaveClass`), nunca mockar o componente para forçar o resultado.
- `no-workarounds`: se algum componente Radix aplicar `rounded-full` internamente (fora do controle direto via `className`), resolver a causa raiz (override via `className`/slot), nunca com `!important` ou CSS global de exceção.

## Passos

- **Step 1: Regra de mapeamento (aplicar em todos os arquivos deste checklist)**

Para cada ocorrência, medir o lado do elemento (classes `h-*`/`w-*`/`size-*`) e aplicar:
`rounded-full`: lado < 12px → `rounded-none`; ≤ 20px → `rounded-xs`; ≤ 40px → `rounded-sm`; maior → `rounded-md`; pills de texto (badges) → `rounded-sm`; barras finas (`h-0.5`) → `rounded-none`.
`rounded-[Npx]`: 2-4px → `rounded-xs`; 6-8px → `rounded-sm`; 10-14px → `rounded-md`; 16px+ → `rounded-xl` (container principal) ou `rounded-lg` (container interno).
Exceções explícitas desta task (prevalecem sobre a regra geral): `avatar.tsx` sm (`h-9 w-9`, 36px) e md (`h-11 w-11`, 44px) → `rounded-sm`; lg (`h-[88px]`) → `rounded-md`; dot não lido de `notification-item.tsx:117` (<12px) → `rounded-none`; thumb e trilho de `theme-toggle.tsx:71,77` → `rounded-xs`; `checkbox.tsx:18` (16px) → `rounded-xs`; `toaster.tsx:15` e `skeleton.tsx:14` (cards, 12px) → `rounded-md`; `empty-state.tsx:32` (card, 12px) → `rounded-md`; `form-field.tsx:46` e `field-shell.tsx:47` (barra `h-0.5`) → `rounded-none`; `DropdownMenuRadioItem` (indicador, se `rounded-full`) → `rounded-none`.

Checklist (arquivo:linha → classe atual → classe alvo):

| Arquivo:linha | Classe atual | Classe alvo |
|---|---|---|
| `notification/notification-bell.tsx:74` | `rounded-full` (bolha contador) | `rounded-sm` (badge/pill) |
| `notification/notification-dropdown.tsx:83` | `rounded-full` (círculo ícone vazio) | medir e aplicar regra geral |
| `notification/notification-item.tsx:94` | `rounded-full` (círculo ícone tipo) | medir e aplicar regra geral |
| `notification/notification-item.tsx:117` | `rounded-full` (dot não lido) | `rounded-none` (exceção <12px) |
| `ui/checkbox.tsx:18` | `rounded-[4px]` (16px) | `rounded-xs` (exceção) |
| `ui/admin-badge.tsx:8` | `rounded-full` (badge) | `rounded-sm` (pill de texto) |
| `ui/toaster.tsx:15` | `rounded-[12px]` (toast) | `rounded-md` (exceção) |
| `ui/theme-toggle.tsx:51` | `rounded-full` (botão ícone) | medir e aplicar regra geral |
| `ui/theme-toggle.tsx:71` | `rounded-full` (trilho switch) | `rounded-xs` (exceção) |
| `ui/theme-toggle.tsx:77` | `rounded-full` (thumb) | `rounded-xs` (exceção) |
| `ui/chart.tsx:228,319` | `rounded-[2px]` (swatch legenda) | `rounded-xs` |
| `ui/skeleton.tsx:14` | `rounded-[12px]` | `rounded-md` (exceção) |
| `ui/form-field.tsx:46` | `rounded-full` (barra `h-0.5`) | `rounded-none` (exceção) |
| `ui/field-shell.tsx:47` | `rounded-full` (barra `h-0.5`) | `rounded-none` (exceção) |
| `ui/motion-toggle.tsx:33` | `rounded-full` (botão) | medir e aplicar regra geral |
| `ui/role-badge.tsx:14` | `rounded-full` (pill) | `rounded-sm` |
| `ui/status-badge.tsx:51` | `rounded-full` (pill) | `rounded-sm` |
| `ui/empty-state.tsx:32` | `rounded-[12px]` (card) | `rounded-md` (exceção) |
| `ui/empty-state.tsx:46` | `rounded-full` (círculo ícone) | medir e aplicar regra geral |
| `ui/segmented-control.tsx:24,35` | `rounded-full` (badges contagem) | `rounded-sm` |
| `ui/segmented-control.tsx:67` | `rounded-full` (pill segmento) | medir e aplicar regra geral |
| `ui/avatar.tsx:31` | `rounded-full` (sm/md/lg) | `rounded-sm` (sm, md) / `rounded-md` (lg) — exceção |
| `ui/stat-card.tsx:48` | `rounded-full` (badge delta) | `rounded-sm` |
| `ui/dialog.tsx:49` | `rounded-full` (botão fechar) | medir e aplicar regra geral |
| `ui/dropdown-menu.tsx` | `DropdownMenuRadioItem` (confirmar) | `rounded-none` se `rounded-full` |

- **Step 2: Write the failing test — skeleton**

```tsx
test("não usa mais rounded-[12px]; usa o token de chanfro rounded-md", () => {
	render(<Skeleton />)
	expect(screen.getByTestId("skeleton")).not.toHaveClass("rounded-[12px]")
	expect(screen.getByTestId("skeleton")).toHaveClass("rounded-md")
})
```

- **Step 3: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/skeleton.test.tsx`
Expected: FAIL — o componente ainda renderiza `rounded-[12px]`.

- **Step 4: Write minimal implementation — skeleton.tsx**

Em `ui/skeleton.tsx:14`, trocar `"animate-pulse rounded-[12px] bg-muted"` por `"animate-pulse rounded-md bg-muted"`.

- **Step 5: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/skeleton.test.tsx`
Expected: PASS.

- **Step 6: Write the failing test — theme-toggle e motion-toggle**

```tsx
test("botão, trilho e thumb do theme-toggle não usam mais rounded-full", () => {
	render(<ThemeToggle />)
	const button = screen.getByRole("button", { name: /tema/i })
	expect(button).not.toHaveClass("rounded-full")
})

test("botão do motion-toggle não usa mais rounded-full", () => {
	render(<MotionToggle />)
	expect(screen.getByRole("button")).not.toHaveClass("rounded-full")
})
```

- **Step 7: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Run: `pnpm --filter frontend exec vitest run src/components/ui/motion-toggle.test.tsx`
Expected: FAIL — ambos os componentes ainda renderizam `rounded-full`.

- **Step 8: Write minimal implementation — theme-toggle.tsx e motion-toggle.tsx**

Aplicar o checklist do Step 1 às linhas 51, 71 e 77 de `theme-toggle.tsx` e à linha 33 de `motion-toggle.tsx`.

- **Step 9: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Run: `pnpm --filter frontend exec vitest run src/components/ui/motion-toggle.test.tsx`
Expected: PASS.

- **Step 10: Review Focus: "Dot de status ou elemento com menos de 12px de lado → canto reto (`rounded-none`), nunca losango" — Write the failing test**

```tsx
test("o dot não lido tem menos de 12px de lado e usa rounded-none, nunca rounded-full", () => {
	render(<NotificationItem notification={unreadNotification} />)
	const dot = screen.getByTestId("unread-dot")
	expect(dot).toHaveClass("rounded-none")
	expect(dot).not.toHaveClass("rounded-full")
})
```

- **Step 11: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/notification/notification-item.test.tsx`
Expected: FAIL — o dot ainda usa `rounded-full`.

- **Step 12: Write minimal implementation — notification-item.tsx**

Aplicar o checklist do Step 1 às linhas 94 e 117 de `notification-item.tsx`.

- **Step 13: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS — inclui o teste existente do botão excluir (`rounded-md`, linhas 175/183), que continua válido sem alteração.

- **Step 14: Write the failing test — avatar quadrado (criar avatar.test.tsx)**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Avatar } from "./avatar"

describe("Avatar", () => {
	test.each(["sm", "md", "lg"] as const)("tamanho %s nunca usa rounded-full", (size) => {
		render(<Avatar size={size} name="Ana" />)
		expect(screen.getByText("A")).not.toHaveClass("rounded-full")
	})

	test("sm e md usam rounded-sm; lg usa rounded-md", () => {
		const { rerender } = render(<Avatar size="sm" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-sm")
		rerender(<Avatar size="md" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-sm")
		rerender(<Avatar size="lg" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-md")
	})
})
```

- **Step 15: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/avatar.test.tsx`
Expected: FAIL — `avatar.test.tsx` não existe hoje, ou (após criado) o componente ainda renderiza `rounded-full` para todos os tamanhos.

- **Step 16: Write minimal implementation — avatar.tsx**

Em `ui/avatar.tsx:31`, trocar a classe fixa `rounded-full` por uma condicional por `size`: `sm`/`md` → `rounded-sm`; `lg` → `rounded-md`.

- **Step 17: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/avatar.test.tsx`
Expected: PASS.

- **Step 18: Aplicar o restante do checklist do Step 1**

Aplicar a regra de mapeamento aos arquivos restantes do checklist que não têm teste dedicado nesta task (`notification-bell.tsx`, `notification-dropdown.tsx`, `admin-badge.tsx`, `toaster.tsx`, `chart.tsx`, `form-field.tsx`, `field-shell.tsx`, `role-badge.tsx`, `status-badge.tsx`, `empty-state.tsx`, `segmented-control.tsx`, `stat-card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`). Cada troca é mecânica (classe Tailwind por classe Tailwind); nenhum destes arquivos tem teste que assere a classe de arredondamento hoje, então a guarda de resíduo da task-08 (`rounded-residue.test.ts`) é quem cobre a regressão nestes casos.

- **Step 19: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/components
git commit -m "feat(frontend): normaliza arredondamento avulso para tokens de chanfro em components/"
```

## Critérios de Sucesso

- Nenhum arquivo em `apps/frontend/src/components/**` usa `rounded-full` ou `rounded-[Npx]` (FR-003, FR-004).
- Avatar, dots, thumb do switch e demais elementos hoje circulares são exibidos quadrados/chanfrados, com elementos < 12px em `rounded-none` (FR-004).
- `motion-toggle.test.tsx`, `skeleton.test.tsx`, `theme-toggle.test.tsx`, `notification-item.test.tsx` e o novo `avatar.test.tsx` passam com as classes normalizadas.
