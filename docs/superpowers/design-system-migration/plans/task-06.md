# Task 6: PublicShell + páginas de autenticação — hero indigo

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Atualizar o `PublicShell` para usar `bg-primary` no header (identidade indigo nas páginas públicas). Atualizar o footer para remover a referência ao design monocromático. As páginas de autenticação (`/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`) herdam o novo shell automaticamente — verificar se há estilos inline hardcoded que precisem de ajuste.

## Arquivos

- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Modify: `apps/frontend/src/components/layout/public-shell.test.tsx`
- Inspect: `apps/frontend/src/app/(public)/login/page.tsx`
- Inspect: `apps/frontend/src/app/(public)/cadastro/page.tsx`
- Inspect: `apps/frontend/src/app/(public)/recuperar-senha/page.tsx`
- Inspect: `apps/frontend/src/app/(public)/redefinir-senha/page.tsx`

### Conformidade com as Skills Padrão

- react: PublicShell é Server Component (sem `"use client"`) — manter
- tailwindcss: usar `dark:` prefix para dark mode inline

## Passos

- [ ] **Step 1: Atualizar o teste do PublicShell**

Abrir `apps/frontend/src/components/layout/public-shell.test.tsx`. Adicionar asserção de que o header tem `bg-primary`:

```typescript
test("header do PublicShell deve ter bg-primary", () => {
  render(<PublicShell>conteúdo</PublicShell>)
  const header = screen.getByRole("banner")
  expect(header).toHaveClass("bg-primary")
})
```

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "header do PublicShell deve ter bg-primary"
```

Esperado: FAIL.

- [ ] **Step 3: Atualizar public-shell.tsx — header com identidade indigo**

Substituir o conteúdo de `apps/frontend/src/components/layout/public-shell.tsx`:

```typescript
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface PublicShellProps {
	children: ReactNode
	className?: string
}

export function PublicShell({ children, className }: PublicShellProps) {
	return (
		<div
			data-testid="public-shell"
			className={cn(
				"flex min-h-screen flex-col bg-background text-foreground",
				className,
			)}
		>
			<header className="bg-primary">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link
						href="/"
						aria-label="Página inicial"
						className="font-display text-xl font-semibold tracking-tight text-primary-foreground"
					>
						GymPass
					</Link>
					<nav
						aria-label="Ações de autenticação"
						className="flex items-center gap-2"
					>
						<Link
							href="/login"
							className="rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="rounded-md border border-primary-foreground bg-primary-foreground px-4 py-2 text-sm font-medium text-primary hover:bg-primary-foreground/90 transition-colors"
						>
							Criar conta
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1">{children}</main>
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<span>© {new Date().getFullYear()} GymPass</span>
					<span>Plataforma de acesso a academias</span>
				</div>
			</footer>
		</div>
	)
}
```

Mudanças:
- Header: `border-b border-border` → `bg-primary`
- Logo: `text-foreground` → `text-primary-foreground`
- Link "Entrar": pill `rounded-full` → `rounded-md`, cores para contexto sobre fundo escuro
- Link "Criar conta": pill `rounded-full` → `rounded-md`, fundo branco sobre indigo
- Footer: texto "monocromático inspirado em Ollama" → "Plataforma de acesso a academias"

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
pnpm --filter frontend test -- -t "header do PublicShell deve ter bg-primary"
```

Esperado: PASS.

- [ ] **Step 5: Inspecionar páginas de autenticação**

Abrir cada página pública e verificar se há estilos hardcoded que usam tokens de paleta removidos (`text-silver`, `bg-pure-white`, etc.):

```bash
grep -r "text-silver\|bg-pure\|text-pure\|bg-snow\|text-stone\|text-near-black" \
  apps/frontend/src/app/\(public\)/
```

Esperado: sem resultados. Se houver ocorrências, substituir pelo token semântico equivalente:
- `text-silver` → `text-muted-foreground`
- `bg-pure-white` → `bg-background`
- `text-pure-black` → `text-foreground`
- `bg-snow` → `bg-muted`

- [ ] **Step 6: Verificar lint, tipos e todos os testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros, todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/layout/public-shell.tsx \
        apps/frontend/src/components/layout/public-shell.test.tsx
git commit -m "feat(frontend/layout): PublicShell com header indigo e botões rounded-md"
```

## Critérios de Sucesso

- Header do PublicShell usa `bg-primary` (indigo)
- Logo usa `text-primary-foreground`
- Botões de CTA no header usam `rounded-md`
- Footer não referencia mais "monocromático" ou "Ollama"
- Nenhuma página de autenticação usa tokens de paleta removidos
- Todos os testes passam, lint e tsc sem erros
