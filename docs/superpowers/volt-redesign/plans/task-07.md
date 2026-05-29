# Task 7: Redesign do shell público + tela de Login [RF-014, RF-015, RF-023]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila o `PublicShell` (header/footer) no vocabulário VOLT com `BrandMark`, e reconstrói a tela de Login no layout split do mockup: painel-marca dark à esquerda (wordmark, eyebrow, hero "Treine onde **você** estiver", stats mono) e painel de formulário à direita. Preserva integralmente a lógica de formulário existente (react-hook-form, `useLogin`, `useLoginWithGoogle`, `GoogleSignInButton`) e os contratos de teste/e2e (labels "E-mail"/"Senha", `data-testid="login-submit"`, redirect para `/inicio`). Abaixo de 860px o painel-marca some e fica só o formulário.

## Arquivos

- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Test: `apps/frontend/src/app/(public)/login/login-volt.test.tsx` (novo)

### Conformidade com as Skills Padrão

- use code-style: tokens semânticos, preservar handlers e tipos do formulário
- use test-antipatterns: preservar os contratos de e2e (labels/testids), asserir o hero VOLT renderizado

## Passos

- [ ] **Step 1: Escrever o teste que falha (hero VOLT + contrato preservado)**

Crie `apps/frontend/src/app/(public)/login/login-volt.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@/test/render"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/features/auth/api", () => ({
	useLogin: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
	useLoginWithGoogle: () => ({ mutate: vi.fn(), isPending: false }),
}))

import LoginPage from "./page"

describe("Login VOLT", () => {
	test("exibe o painel-marca com o hero", () => {
		render(<LoginPage />)
		expect(screen.getByText(/Treine onde/i)).toBeInTheDocument()
	})

	test("preserva os campos e o botão de submit", () => {
		render(<LoginPage />)
		expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
		expect(screen.getByTestId("login-submit")).toBeInTheDocument()
	})
})
```

> Nota: ajuste os `vi.mock` de `@/features/auth/api` aos nomes/assinaturas reais dos hooks ao abrir o arquivo de `page.tsx`. Os nomes esperados são `useLogin` e `useLoginWithGoogle`.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "Login VOLT"`
Expected: FAIL — o hero ainda não existe.

- [ ] **Step 3: Restilar o `PublicShell`**

Em `apps/frontend/src/components/layout/public-shell.tsx`, substitua o header e o footer para usar `BrandMark` e tokens VOLT (mantendo a estrutura e os links Entrar/Criar conta):

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { BrandMark } from "@/components/ui/brand-mark"
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
			<header className="border-b border-border">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link href="/" aria-label="Página inicial VOLT">
						<BrandMark />
					</Link>
					<nav aria-label="Ações de autenticação" className="flex items-center gap-2">
						<Link
							href="/login"
							className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-primary-strong"
						>
							Criar conta
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1">{children}</main>
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<span>© {new Date().getFullYear()} VOLT</span>
					<span>Plataforma de acesso a academias</span>
				</div>
			</footer>
		</div>
	)
}
```

- [ ] **Step 4: Reconstruir o layout split na tela de login**

Abra `apps/frontend/src/app/(public)/login/page.tsx`. Mantenha intactos: imports de hooks (`useLogin`, `useLoginWithGoogle`), `react-hook-form`/`zodResolver`, o `GoogleSignInButton`, o `<Suspense>`, o banner de erro `role="alert"` e o `data-testid="login-submit"`. Envolva o conteúdo no grid split abaixo, colocando o formulário existente dentro do painel direito.

Estrutura do retorno do componente (painel-marca + painel-formulário):

```tsx
<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
	{/* Painel-marca (some < 860px) */}
	<aside className="relative flex flex-col justify-between overflow-hidden bg-[#0a0a0a] p-12 text-[#f3f3ee] max-[860px]:hidden">
		<div className="flex items-center justify-between">
			<BrandMark className="text-white" />
			<Eyebrow className="text-white/40">v3.0</Eyebrow>
		</div>
		<h2 className="font-display text-[clamp(48px,7vw,92px)] font-bold leading-[0.92] tracking-[-0.03em]">
			Treine onde<br />
			<span className="text-accent">você</span> estiver.
		</h2>
		<div className="flex flex-wrap gap-9">
			<div className="flex flex-col gap-0.5">
				<span className="font-mono text-3xl font-bold text-accent tabular">312</span>
				<span className="max-w-[110px] text-xs text-white/55">academias parceiras</span>
			</div>
			<div className="flex flex-col gap-0.5">
				<span className="font-mono text-3xl font-bold text-accent tabular">48k</span>
				<span className="max-w-[110px] text-xs text-white/55">check-ins por mês</span>
			</div>
			<div className="flex flex-col gap-0.5">
				<span className="font-mono text-3xl font-bold text-accent tabular">4.9</span>
				<span className="max-w-[110px] text-xs text-white/55">avaliação média</span>
			</div>
		</div>
	</aside>

	{/* Painel-formulário */}
	<div className="flex flex-col justify-center p-12 max-[560px]:p-6">
		<div className="mx-auto w-full max-w-[400px]">
			<Eyebrow>Acesse sua conta</Eyebrow>
			<h1 className="mb-8 mt-2 font-display text-[30px] font-semibold tracking-tight">
				Entrar
			</h1>
			{/* >>> mantenha aqui o <form> existente, o banner de erro,
			    o GoogleSignInButton e os links (esqueci senha / criar conta) <<< */}
		</div>
	</div>
</div>
```

Adicione os imports no topo do arquivo:

```tsx
import { BrandMark } from "@/components/ui/brand-mark"
import { Eyebrow } from "@/components/ui/eyebrow"
```

- [ ] **Step 5: Restilar os controles do formulário existente**

Ajuste as classes dos inputs e do botão de submit para o estilo VOLT (sem alterar nomes de campos, validação ou handlers):

- Inputs: `className="h-12 w-full rounded-md border border-border bg-surface-2 px-4 text-[15px] text-foreground outline-none transition-colors focus:border-accent focus:bg-surface focus:ring-[3px] focus:ring-accent/30 placeholder:text-subtle"`
- Label do campo: `className="mb-2 block text-[13px] font-semibold text-muted-foreground"`
- Botão de submit (preservando `data-testid="login-submit"`): `className="h-11 w-full rounded-md bg-accent font-semibold text-accent-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"`
- Divisor "ou": `<div className="my-7 flex items-center gap-3.5 text-sm text-subtle before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">ou</div>`

- [ ] **Step 6: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "Login VOLT"`
Expected: PASS (2 testes).

- [ ] **Step 7: Rodar a suíte completa, lint, tsc e build**

Run: `pnpm --filter frontend test`
Expected: PASS. Atualize qualquer teste de login antigo que asserisse o layout anterior, preservando os contratos (labels/testid).

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/components/layout/public-shell.tsx "apps/frontend/src/app/(public)/login/page.tsx" "apps/frontend/src/app/(public)/login/login-volt.test.tsx"
git commit -m "feat(volt-redesign): shell público VOLT e login em layout split"
```

## Critérios de Sucesso

- `PublicShell` usa `BrandMark` e tokens VOLT no header/footer [RF-014]
- Login em split: painel-marca dark + formulário, com hero e stats mono [RF-015]
- Painel-marca some abaixo de 860px (só formulário) [RF-023]
- Campos, validação, Google login e `data-testid="login-submit"` preservados (e2e intacto)
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
