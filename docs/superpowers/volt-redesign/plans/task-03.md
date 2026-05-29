# Task 3: Primitivos VOLT — BrandMark, Eyebrow, Avatar, RoleBadge/StatusBadge [RF-008, RF-017]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Cria os primitivos visuais reutilizáveis do VOLT como componentes em `components/ui/`, usando utilities Tailwind sobre os tokens da Task 1. São consumidos pelo shell, login e telas: o wordmark com raio (`BrandMark`), o kicker mono (`Eyebrow`), o avatar de iniciais (`Avatar`) e os badges de role/status (`RoleBadge`, `StatusBadge`).

## Arquivos

- Create: `apps/frontend/src/components/ui/brand-mark.tsx`
- Create: `apps/frontend/src/components/ui/eyebrow.tsx`
- Create: `apps/frontend/src/components/ui/avatar.tsx`
- Create: `apps/frontend/src/components/ui/role-badge.tsx`
- Create: `apps/frontend/src/components/ui/status-badge.tsx`
- Test: `apps/frontend/src/components/ui/brand-mark.test.tsx`
- Test: `apps/frontend/src/components/ui/avatar.test.tsx`
- Test: `apps/frontend/src/components/ui/role-badge.test.tsx`

### Conformidade com as Skills Padrão

- use code-style: kebab-case nos arquivos, PascalCase nos componentes, tokens semânticos, sem prefixo `get/set`, booleanos semânticos
- use test-antipatterns: asserir saída renderizada, sem testar detalhes internos

## Passos

- [ ] **Step 1: Escrever os testes que falham**

Crie `apps/frontend/src/components/ui/brand-mark.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { BrandMark } from "./brand-mark"

describe("BrandMark", () => {
	test("exibe o wordmark VOLT", () => {
		render(<BrandMark />)
		expect(screen.getByText("VOLT")).toBeInTheDocument()
	})

	test("renderiza o ícone de raio (svg)", () => {
		const { container } = render(<BrandMark />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})

	test("oculta o wordmark quando wordmark=false", () => {
		render(<BrandMark wordmark={false} />)
		expect(screen.queryByText("VOLT")).not.toBeInTheDocument()
	})
})
```

Crie `apps/frontend/src/components/ui/avatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Avatar } from "./avatar"

describe("Avatar", () => {
	test("exibe as iniciais derivadas do nome", () => {
		render(<Avatar name="Caique Moraes" />)
		expect(screen.getByText("CM")).toBeInTheDocument()
	})

	test("usa fallback quando não há nome", () => {
		render(<Avatar />)
		expect(screen.getByText("?")).toBeInTheDocument()
	})
})
```

Crie `apps/frontend/src/components/ui/role-badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { RoleBadge } from "./role-badge"

describe("RoleBadge", () => {
	test("exibe Admin para role ADMIN", () => {
		render(<RoleBadge role="ADMIN" />)
		expect(screen.getByText("Admin")).toBeInTheDocument()
	})

	test("exibe Membro para role MEMBER", () => {
		render(<RoleBadge role="MEMBER" />)
		expect(screen.getByText("Membro")).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "BrandMark"`
Expected: FAIL — módulo `./brand-mark` não existe.

- [ ] **Step 3: Implementar `brand-mark.tsx`**

```tsx
import { Zap } from "lucide-react"
import { cn } from "@/lib/cn"

export interface BrandMarkProps {
	/** Exibe o texto "VOLT" ao lado do ícone. Default: true. */
	wordmark?: boolean
	className?: string
}

export function BrandMark({ wordmark = true, className }: BrandMarkProps) {
	return (
		<span className={cn("inline-flex items-center gap-3", className)}>
			<span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
				<Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" />
			</span>
			{wordmark && (
				<span className="font-display text-xl font-bold tracking-wide">
					VOLT
				</span>
			)}
		</span>
	)
}
```

- [ ] **Step 4: Implementar `eyebrow.tsx`**

```tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface EyebrowProps {
	children: ReactNode
	className?: string
}

export function Eyebrow({ children, className }: EyebrowProps) {
	return (
		<span
			className={cn(
				"font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-subtle",
				className,
			)}
		>
			{children}
		</span>
	)
}
```

- [ ] **Step 5: Implementar `avatar.tsx`**

```tsx
import { cn } from "@/lib/cn"

const SIZE_CLASSES = {
	sm: "h-9 w-9 text-sm",
	md: "h-11 w-11 text-base",
	lg: "h-[88px] w-[88px] text-3xl",
} as const

export interface AvatarProps {
	name?: string
	size?: keyof typeof SIZE_CLASSES
	className?: string
}

function initials(name?: string): string {
	if (!name) return "?"
	const parts = name.split(" ").filter(Boolean)
	if (parts.length === 0) return "?"
	return parts
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-flex flex-shrink-0 items-center justify-center rounded-full bg-accent font-display font-bold text-accent-foreground",
				SIZE_CLASSES[size],
				className,
			)}
		>
			{initials(name)}
		</span>
	)
}
```

- [ ] **Step 6: Implementar `role-badge.tsx`**

```tsx
import { Shield } from "lucide-react"
import { cn } from "@/lib/cn"

export interface RoleBadgeProps {
	role: "ADMIN" | "MEMBER"
	className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
	const isAdmin = role === "ADMIN"
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
				isAdmin
					? "border-accent/45 bg-accent/20 text-foreground"
					: "border-border bg-surface-2 text-muted-foreground",
				className,
			)}
		>
			{isAdmin && <Shield className="h-3 w-3" aria-hidden="true" />}
			{isAdmin ? "Admin" : "Membro"}
		</span>
	)
}
```

- [ ] **Step 7: Implementar `status-badge.tsx`**

```tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

type StatusTone = "success" | "warning" | "danger" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
	success: "bg-success-soft text-success",
	warning: "bg-warning-soft text-warning",
	danger: "bg-destructive-soft text-destructive",
	neutral: "bg-surface-2 text-muted-foreground border border-border",
}

export interface StatusBadgeProps {
	tone: StatusTone
	children: ReactNode
	className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			<span
				className="h-1.5 w-1.5 rounded-full bg-current"
				aria-hidden="true"
			/>
			{children}
		</span>
	)
}
```

- [ ] **Step 8: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend test -- -t "BrandMark"`
Run: `pnpm --filter frontend test -- -t "Avatar"`
Run: `pnpm --filter frontend test -- -t "RoleBadge"`
Expected: todos PASS.

- [ ] **Step 9: Lint, tsc, build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 10: Commit**

```bash
git add apps/frontend/src/components/ui/brand-mark.tsx apps/frontend/src/components/ui/eyebrow.tsx apps/frontend/src/components/ui/avatar.tsx apps/frontend/src/components/ui/role-badge.tsx apps/frontend/src/components/ui/status-badge.tsx apps/frontend/src/components/ui/brand-mark.test.tsx apps/frontend/src/components/ui/avatar.test.tsx apps/frontend/src/components/ui/role-badge.test.tsx
git commit -m "feat(volt-redesign): primitivos VOLT (BrandMark, Eyebrow, Avatar, RoleBadge, StatusBadge)"
```

## Critérios de Sucesso

- `BrandMark` exibe ícone de raio + wordmark VOLT (wordmark opcional) [RF-008]
- `Avatar` deriva iniciais e tem 3 tamanhos
- `RoleBadge` distingue Admin (accent) de Membro (neutro) [RF-017]
- `StatusBadge` cobre success/warning/danger/neutral com tokens soft
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
