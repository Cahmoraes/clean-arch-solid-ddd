# Task 3: `DetailsTab` + helpers de formatação [RF-008, RF-011]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** N/A

## Visão Geral

Cria o conteúdo da aba **Detalhes**: nome, e-mail, User ID, status, role, "Membro desde" e "Último acesso". Como `AdminUser` não expõe `lastLoginAt`, o campo "Último acesso" exibe um fallback gracioso ("Sem registro"). Também cria o módulo de helpers de formatação (`statusLabel`, `statusBadgeClassName`, `formatCreatedAt`) reaproveitados por outras partes do painel.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts`
- Create: `apps/frontend/src/features/admin/components/user-detail/details-tab.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/details-tab.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: componente de apresentação
- use tailwindcss skill: grid responsivo e tokens do design system
- use test-antipatterns skill + vitest skill: testes de renderização com Testing Library

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/details-tab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { DetailsTab } from "./details-tab"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "usr_4821kx",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		...overrides,
	}
}

describe("DetailsTab", () => {
	test("exibe nome, e-mail e User ID", () => {
		render(<DetailsTab user={buildUser()} />)
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByText("joao@example.com")).toBeInTheDocument()
		expect(screen.getByText("usr_4821kx")).toBeInTheDocument()
	})

	test("exibe o rótulo de status traduzido", () => {
		render(<DetailsTab user={buildUser({ status: "suspended" })} />)
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("exibe fallback gracioso para último acesso ausente", () => {
		render(<DetailsTab user={buildUser()} />)
		expect(screen.getByText("Sem registro")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "DetailsTab"`
Expected: FAIL — `Failed to resolve import "./details-tab"`.

- **Step 3: Criar os helpers de formatação**

Crie `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts`:

```ts
export function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

export function statusBadgeClassName(status: string): string {
	if (status === "activated") {
		return "border-transparent bg-success-soft text-success"
	}
	if (status === "suspended") {
		return "border-transparent bg-destructive-soft text-destructive"
	}
	if (status === "locked") {
		return "border-transparent bg-warning-soft text-warning"
	}
	return "border-border bg-muted text-muted-foreground"
}

export function formatCreatedAt(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
			new Date(iso),
		)
	} catch {
		return iso
	}
}
```

- **Step 4: Implementar o `DetailsTab`**

Crie `apps/frontend/src/features/admin/components/user-detail/details-tab.tsx`:

```tsx
import type { ReactNode } from "react"
import { RoleBadge } from "@/components/ui/role-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"
import {
	formatCreatedAt,
	statusBadgeClassName,
	statusLabel,
} from "./user-detail-format"

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</dt>
			<dd className="text-sm text-foreground">{value}</dd>
		</div>
	)
}

export function DetailsTab({ user }: { user: AdminUser }) {
	return (
		<dl className="grid gap-4 sm:grid-cols-2">
			<InfoItem label="Nome" value={user.name} />
			<InfoItem label="E-mail" value={user.email} />
			<InfoItem
				label="User ID"
				value={<span className="font-mono text-xs">{user.id}</span>}
			/>
			<InfoItem
				label="Status"
				value={
					<span
						className={cn(
							"inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium",
							statusBadgeClassName(user.status),
						)}
					>
						{statusLabel(user.status)}
					</span>
				}
			/>
			<InfoItem label="Permissão" value={<RoleBadge role={user.role} />} />
			<InfoItem label="Membro desde" value={formatCreatedAt(user.createdAt)} />
			<InfoItem label="Último acesso" value="Sem registro" />
		</dl>
	)
}
```

> Nota de design (RF-011): "Último acesso" usa fallback fixo "Sem registro" porque a API não expõe `lastLoginAt`. Quando o campo existir, troque por `user.lastLoginAt ? formatCreatedAt(user.lastLoginAt) : "Sem registro"`.

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "DetailsTab"`
Expected: PASS — 3 testes passam.

- **Step 6: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts apps/frontend/src/features/admin/components/user-detail/details-tab.tsx apps/frontend/src/features/admin/components/user-detail/details-tab.test.tsx
git commit -m "feat(frontend): add DetailsTab and user-detail format helpers"
```

## Critérios de Sucesso

- A aba exibe nome, e-mail, User ID, status (rótulo traduzido), permissão, membro desde (RF-008).
- "Último acesso" exibe fallback gracioso quando o dado não existe (RF-011).
- Helpers `statusLabel`/`statusBadgeClassName`/`formatCreatedAt` exportados para reuso.
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
