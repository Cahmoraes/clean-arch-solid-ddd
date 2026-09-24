# Task 15: Passada de paleta nas demais telas [FR-004]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-04, task-09, task-12, task-13, task-14

## Visão Geral

Revisa as telas que sobraram (dashboard, calendário, perfil, assinatura, admin, cadastro, recuperação de senha, avisos) atrás de premissas do verde antigo, quando `accent` e `primary` eram o mesmo verde: `bg-accent` usado como sucesso, como fundo de alerta de erro ou como botão de ação primária com `hover:bg-primary-strong`, e texto de página em `text-accent-foreground`. Com `accent` agora ciano e `primary` magenta, esses usos mudariam de significado; a tarefa os corrige com tokens semânticos (erro em vermelho suave, sucesso em verde, aviso em âmbar, ação primária em `primary`), sem mudar layout. O teste de varredura da tarefa 4 continua como rede de segurança e um novo teste trava os padrões corrigidos.

Resultado da revisão dos usos de `bg-accent`/`text-accent` que ficam como estão (ciano é o acento pretendido, sem significado de status): pílulas e contadores (`notification-bell`, `stat-card` em destaque, badge do plano em `assinatura` e `plan-card-hero`), barra do dia atual em `weekly-chart`, número de check-ins e gradiente do perfil, item de foco do `dropdown-menu`.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/app/(public)/cadastro/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`
- Modify: `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`
- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Create (test): `apps/frontend/src/test/palette-assumptions.test.ts`
- Create (test): `apps/frontend/src/features/dashboard/components/checkins-timeline.test.tsx`
- Test: `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx`
- Test: `apps/frontend/src/components/layout/public-shell.test.tsx`

## Interfaces

- **Consome:**
  - De task-04: `listSourceFiles(extensions: ReadonlyArray<string>): SourceFile[]` e `interface SourceFile { path: string; content: string }` em `apps/frontend/src/test/source-files.ts`; o teste `no-literal-colors.test.ts` continua valendo.
  - De task-09: `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx` (mock de `@/features/profile/api` com `meState`, helpers `mockMatchMedia`/`mockIntersectionObserver` de `@/test/browser-mocks`, `ProfileHeroCard`).
  - De task-12 e 13: `SegmentedControl` e `NumberedPagination` com estados ativos em ciano (as telas restantes herdam).
  - De task-01: tokens `bg-destructive-soft`, `text-destructive`, `bg-success-soft`, `text-success`, `bg-success`, `bg-warning-soft`, `text-warning`, `border-warning`, `border-transparent`.
  - Tipos existentes: `CheckIn` de `@/features/check-ins/api` (`id`, `gymId`, `gymTitle`, `validatedAt`, `rejectedAt`, `status`, `createdAt`); `CheckinsTimeline({ checkIns, isLoading })` (props `interface CheckinsTimelineProps { checkIns: CheckIn[]; isLoading?: boolean }`, não exportada, importar o componente).
- **Produz:** N/A (nenhum símbolo novo; correções por token).

### Conformidade com as Skills Padrão

- `tailwindcss`: substituição por utilitários de token semântico; nenhuma cor literal nova.
- `shadcn`: alertas e badges seguem as convenções de status (`*-soft` mais texto semântico).
- `wcag-audit-patterns`: texto de erro em `text-destructive` sobre `bg-destructive-soft` (contraste calculado na tarefa 2), alertas com `role="alert"` mantidos, aviso de demonstração com `role="note"` mantido.
- `test-antipatterns`: testes por saída renderizada; a varredura de fragmentos proibidos só cobre padrões que não têm outro jeito de ser observados.
- `no-workarounds`: corrigir a causa (uso semântico errado do token), não voltar o `accent` ao verde.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-visual.md` (tokens e intenção: neon com parcimônia; status em verde, âmbar e vermelho)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para as demais telas? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** mesmo layout atual; ciano marca seleção e destaque, magenta só ação primária, status sempre verde, âmbar ou vermelho sem neon; sem mudança de layout nem de estrutura do shell

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: conferir com `playwright-cli` no fim do lote (dashboard, calendário, perfil, assinatura, admin analytics/planos/novo aviso, cadastro, recuperação de senha; escuro e claro).

- **Step 1: Write the failing test**

Criar `apps/frontend/src/test/palette-assumptions.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// Idiomas do verde antigo, quando accent e primary eram o mesmo verde.
// Com accent ciano e primary magenta, cada um muda de significado.
const FORBIDDEN_IDIOMS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
	{ name: "alerta de erro pintado com accent", pattern: /border border-border bg-accent/ },
	{ name: "banner de aviso pintado com accent", pattern: /border-primary bg-accent px-4 py-3/ },
	{
		name: "CTA com fundo accent e hover primary-strong",
		pattern: /bg-accent[^"'`]*hover:bg-primary-strong/,
	},
	{
		name: "texto de página em accent-foreground",
		pattern: /text-accent-foreground\/70/,
	},
]

describe("Premissas do verde antigo", () => {
	test("nenhum arquivo de produção usa accent com o significado do verde antigo", () => {
		const violations = listSourceFiles([".ts", ".tsx"]).flatMap((file) =>
			FORBIDDEN_IDIOMS.filter(({ pattern }) => pattern.test(file.content)).map(
				({ name }) => `${file.path}: ${name}`,
			),
		)
		expect(violations).toEqual([])
	})
})
```

Criar `apps/frontend/src/features/dashboard/components/checkins-timeline.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import { CheckinsTimeline } from "./checkins-timeline"

function build(status: CheckIn["status"], id: string): CheckIn {
	return {
		id,
		gymId: "g1",
		gymTitle: `Academia ${id}`,
		validatedAt: null,
		rejectedAt: null,
		status,
		createdAt: "2026-05-29T10:00:00Z",
	}
}

describe("CheckinsTimeline", () => {
	test("Validado usa verde semântico, Pendente âmbar e Rejeitado vermelho", () => {
		render(
			<CheckinsTimeline
				checkIns={[
					build("validated", "a"),
					build("pending", "b"),
					build("rejected", "c"),
				]}
			/>,
		)
		expect(screen.getByText("Validado")).toHaveClass("bg-success-soft", "text-success")
		expect(screen.getByText("Pendente")).toHaveClass("bg-warning-soft", "text-warning")
		expect(screen.getByText("Rejeitado")).toHaveClass("text-destructive")
		expect(screen.getByText("Validado")).not.toHaveClass("bg-accent")
	})

	test("mostra a mensagem de lista vazia sem check-ins", () => {
		render(<CheckinsTimeline checkIns={[]} />)
		expect(screen.getByText("Nenhum check-in registrado ainda.")).toBeInTheDocument()
	})
})
```

Acrescentar ao `describe("ProfileHeroCard", ...)` de `apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx`:

```tsx
	test("a conta ativa usa o verde semântico de sucesso, não o acento ciano", () => {
		render(<ProfileHeroCard thisMonth={4} streak={2} />)
		expect(screen.getByText("Conta ativa")).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		expect(screen.getByText("Conta ativa")).not.toHaveClass("bg-accent")
	})
```

Acrescentar ao final de `apps/frontend/src/components/layout/public-shell.test.tsx`:

```tsx
describe("PublicShell — ação primária", () => {
	test("o CTA Criar conta usa o primary (magenta) e não o acento", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const cta = screen.getByRole("link", { name: /criar conta/i })
		expect(cta).toHaveClass("bg-primary", "text-primary-foreground")
		expect(cta).not.toHaveClass("bg-accent")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/test/palette-assumptions.test.ts src/features/dashboard/components/checkins-timeline.test.tsx src/features/dashboard/components/profile-hero-card.test.tsx src/components/layout/public-shell.test.tsx`
Expected: FAIL. A varredura lista `app/(public)/cadastro/page.tsx`, `app/(authenticated)/perfil/senha/page.tsx`, `app/(authenticated)/admin/usuarios/page.tsx`, `app/(public)/login/page.tsx` (alerta), `app/(authenticated)/assinatura/page.tsx` (banner, CTAs e subtítulo), e os CTAs de `plan-card-hero.tsx`, `bulk-status-confirmation-dialog.tsx`, `confirmation-dialogs.tsx`, `permissions-tab.tsx` e `public-shell.tsx`; o teste de timeline falha em `bg-success-soft` (o Validado tem `bg-accent`); o do hero falha porque "Conta ativa" tem `bg-accent`; o do `PublicShell` falha porque o CTA tem `bg-accent`.

- **Step 3: Write minimal implementation**

3a. Alertas de erro (`role="alert"`) que usavam `border border-border bg-accent ... text-foreground`. Em cada arquivo abaixo, trocar essa combinação por `border border-transparent bg-destructive-soft ... text-destructive`, mantendo o resto da classe (`rounded-[12px] px-4 py-3 text-sm`):

- `apps/frontend/src/app/(public)/login/page.tsx` (`data-testid="login-submit-error"`)
- `apps/frontend/src/app/(public)/cadastro/page.tsx` (`data-testid="signup-submit-error"`)
- `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx` (as duas ocorrências de `change-password-submit-error`)
- `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` (`ErrorState`, `data-testid="admin-users-error"`, que usa `px-4 py-6`)

Exemplo (cadastro):

```tsx
						className="rounded-[12px] border border-transparent bg-destructive-soft px-4 py-3 text-sm text-destructive"
```

3b. `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`:

- `DemoBanner`: trocar a classe base por `"flex items-start gap-3 rounded-[12px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground"`, o ícone `AlertTriangle` por `className="mt-0.5 h-4 w-4 shrink-0 text-warning"` e o `<span className="text-accent-foreground/70">` por `<span className="text-muted-foreground">`.
- Subtítulo da página (`<p className="text-sm text-accent-foreground/70">Escolha um plano ...`): trocar a classe por `text-sm text-muted-foreground` (era texto de página em cor de texto do acento).
- Botões `subscription-submit` e `subscription-change-plan`: trocar `bg-accent ... text-accent-foreground hover:bg-primary-strong` por `bg-primary ... text-primary-foreground hover:bg-primary-strong` (ação primária em magenta). Manter as demais classes (`h-11 rounded-md px-5 font-semibold disabled:opacity-60`).

3c. `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`: trocar

```tsx
const STATUS_DOT_CLASS: Record<CheckInStatus, string> = {
	validated: "bg-success",
	pending: "bg-warning",
	rejected: "bg-destructive",
}

const STATUS_BADGE_CLASS: Record<CheckInStatus, string> = {
	validated: "border-transparent bg-success-soft text-success",
	pending: "border-transparent bg-warning-soft text-warning",
	rejected: "border-transparent bg-destructive-soft text-destructive",
}
```

3d. `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`, `StatusBadge`: trocar `statusClass` e o ponto por

```tsx
	const statusClass = isActive
		? "border-transparent bg-success-soft text-success"
		: "border-transparent bg-muted text-muted-foreground"
```

e o `<span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-success" : "bg-muted-foreground/70")} aria-hidden="true" />`.

3e. Botões de ação primária que combinavam `bg-accent` com `hover:bg-primary-strong` (o hover magenta só faz sentido num fundo magenta). Trocar por `bg-primary text-primary-foreground hover:bg-primary-strong`, mantendo as demais classes de cada elemento:

- `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`: link "Assinar agora"
- `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx`: `className` do ramo `action === "activate"`
- `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`: botão "Confirmar" de promoção
- `apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx`: "Tornar Administrador"
- `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`: botão "Editar dados": `bg-primary text-primary-foreground hover:bg-primary/90`
- `apps/frontend/src/components/layout/public-shell.tsx`: link "Criar conta"

(`check-in-actions.tsx` já foi tratado na tarefa 13.) Os demais usos de `bg-accent`/`text-accent` listados na Visão Geral ficam como estão. A varredura de literais da tarefa 4 roda no passo 4 como rede de segurança.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/test/palette-assumptions.test.ts src/test/no-literal-colors.test.ts src/features/dashboard/components/checkins-timeline.test.tsx src/features/dashboard/components/profile-hero-card.test.tsx src/components/layout/public-shell.test.tsx src/features/admin/components/bulk-status-confirmation-dialog.test.tsx src/features/admin/components/user-detail "src/app/(public)/login/page.test.tsx" "src/app/(public)/cadastro/page.test.tsx" "src/app/(authenticated)/perfil/senha/page.test.tsx" "src/app/(authenticated)/admin/usuarios/page.test.tsx" "src/app/(authenticated)/assinatura/page.test.tsx"`
Expected: PASS (os testes de página encontram os alertas por `data-testid` e `role`, que não mudaram)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add "apps/frontend/src/app/(public)/login/page.tsx" "apps/frontend/src/app/(public)/cadastro/page.tsx" "apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/assinatura/page.tsx" apps/frontend/src/features/dashboard/components/checkins-timeline.tsx apps/frontend/src/features/dashboard/components/checkins-timeline.test.tsx apps/frontend/src/features/dashboard/components/profile-hero-card.tsx apps/frontend/src/features/dashboard/components/profile-hero-card.test.tsx apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx apps/frontend/src/components/layout/public-shell.tsx apps/frontend/src/components/layout/public-shell.test.tsx apps/frontend/src/test/palette-assumptions.test.ts
git commit -m "refactor(frontend): passada de paleta nas demais telas"
```

## Critérios de Sucesso

- Nenhuma tela usa `bg-accent` como fundo de alerta de erro nem de aviso; erros usam `bg-destructive-soft` com `text-destructive`, o aviso de demonstração usa âmbar; botões de ação primária usam `bg-primary` (FR-004).
- Status de check-in no dashboard e "Conta ativa" no hero usam verde, âmbar e vermelho semânticos, sem depender do acento.
- A varredura de literais da tarefa 4 continua verde; nenhuma mudança de layout (FR-004).
