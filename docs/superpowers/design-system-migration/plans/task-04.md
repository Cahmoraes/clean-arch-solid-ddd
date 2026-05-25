# Task 4: Tabs, Pagination, EmptyState — componentes interativos secundários

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Atualizar `Tabs` (lista muda de pill para `rounded-md`), `Pagination` (botões de navegação de pill para `rounded-md`), e `EmptyState` (adicionar shadow-sm se card-like). Verificar `AdminBadge`, `Label`, `Dropdown` e `Toaster` por uso de tokens de paleta estáticos.

**Atenção:** `Badge` e `AdminBadge` mantêm `rounded-full` — apenas atualizar cores se necessário.

## Arquivos

- Modify: `apps/frontend/src/components/ui/tabs.tsx`
- Modify: `apps/frontend/src/components/ui/pagination.tsx`
- Inspect + Modify: `apps/frontend/src/components/ui/empty-state.tsx`
- Inspect + Modify: `apps/frontend/src/components/ui/admin-badge.tsx`
- Inspect + Modify: `apps/frontend/src/components/ui/dropdown-menu.tsx`
- Inspect + Modify: `apps/frontend/src/components/ui/label.tsx`

### Conformidade com as Skills Padrão

- shadcn: Tabs usa Radix primitive — alterar apenas classes CSS
- tailwindcss: `rounded-md` = 8px via `--radius-md` definido no Task 1

## Passos

- [ ] **Step 1: Atualizar tabs.tsx — lista e trigger para rounded-md**

Substituir o conteúdo de `apps/frontend/src/components/ui/tabs.tsx`:

```typescript
"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import {
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
} from "react"
import { cn } from "@/lib/cn"

const Tabs = TabsPrimitive.Root

const TabsList = forwardRef<
	ElementRef<typeof TabsPrimitive.List>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn(
			"inline-flex h-10 items-center justify-center gap-1 rounded-md bg-muted p-1 border border-border",
			className,
		)}
		{...props}
	/>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = forwardRef<
	ElementRef<typeof TabsPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			"inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium",
			"text-muted-foreground transition-colors",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
			className,
		)}
		{...props}
	/>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = forwardRef<
	ElementRef<typeof TabsPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			"mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			className,
		)}
		{...props}
	/>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
```

Mudanças: `rounded-full` → `rounded-md` em `TabsList` e `TabsTrigger`. Tab ativa ganha `shadow-sm` e fundo `bg-background` (em vez de `bg-secondary`).

- [ ] **Step 2: Atualizar pagination.tsx — botões de pill para rounded-md**

Abrir `apps/frontend/src/components/ui/pagination.tsx`. Localizar todos os botões de navegação (Prev, Next, itens de página). Substituir qualquer `rounded-full` por `rounded-md`. Manter `rounded-full` apenas se houver um item explicitamente estilizado como pill (ex.: ellipsis).

Padrão típico de um item de paginação após a mudança:
```typescript
// Antes:
// className="... rounded-full ..."
// Depois:
// className="... rounded-md ..."
```

- [ ] **Step 3: Inspecionar e atualizar empty-state.tsx**

Abrir `apps/frontend/src/components/ui/empty-state.tsx`. Se o componente usa um container card-like (fundo, borda), adicionar `shadow-sm`. Trocar qualquer token de paleta estático por semântico. Se já usa apenas tokens semânticos e não tem aparência de card, nenhuma alteração é necessária além de confirmar.

- [ ] **Step 4: Inspecionar admin-badge.tsx**

Abrir `apps/frontend/src/components/ui/admin-badge.tsx`. Verificar as classes de cor. Se usa cores de paleta estáticas (`bg-pure-black`, `text-pure-white`), substituir por `bg-primary text-primary-foreground`. Manter `rounded-full`. Verificar o teste `admin-badge.test.tsx` e atualizar se necessário.

- [ ] **Step 5: Inspecionar dropdown-menu.tsx**

Abrir `apps/frontend/src/components/ui/dropdown-menu.tsx`. Verificar o container do menu: deve ter `rounded-lg shadow-md`. Substituir `rounded-md` por `rounded-lg` no container se ainda não estiver assim. Verificar itens do menu: `hover:bg-muted`.

- [ ] **Step 6: Inspecionar label.tsx e toaster.tsx**

Abrir `apps/frontend/src/components/ui/label.tsx`. Verificar uso de tokens. `Label` é geralmente simples (`text-sm font-medium text-foreground`) — confirmar que usa apenas tokens semânticos.

Abrir `apps/frontend/src/components/ui/toaster.tsx`. Verificar se usa tokens semânticos ou hardcoded. O `Toaster` do Sonner geralmente aceita `toastOptions` com className — confirmar que está usando `bg-card text-card-foreground border-border`.

- [ ] **Step 7: Verificar lint, tipos e testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros, todos os testes passam.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/components/ui/tabs.tsx \
        apps/frontend/src/components/ui/pagination.tsx \
        apps/frontend/src/components/ui/empty-state.tsx \
        apps/frontend/src/components/ui/admin-badge.tsx \
        apps/frontend/src/components/ui/admin-badge.test.tsx \
        apps/frontend/src/components/ui/dropdown-menu.tsx \
        apps/frontend/src/components/ui/label.tsx \
        apps/frontend/src/components/ui/toaster.tsx
git commit -m "feat(frontend/ui): atualizar Tabs, Pagination e componentes secundários para nova paleta"
```

## Critérios de Sucesso

- `TabsList` e `TabsTrigger` usam `rounded-md`
- Tab ativa usa `bg-background shadow-sm`
- Pagination usa `rounded-md` nos botões de navegação
- Nenhum componente referencia tokens de paleta removidos
- Todos os testes passam, lint e tsc sem erros
