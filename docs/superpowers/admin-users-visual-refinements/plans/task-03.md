# Task 3: Transição suave do painel de detalhes (split-view) [FR-006, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-admin-users-visual-refinements.md`
**Spec:** `../specs/admin-users-visual-refinements-design.md`
**Tier:** standard
**Depends on:** task-02 (ordem de execução sequencial escolhida para esta feature Medium; os arquivos desta task — `animated-panel.tsx` e `user-detail-container.tsx` — são independentes dos tocados nas tasks anteriores)

## Visão Geral

Cria um wrapper reutilizável `AnimatedPanel` (opacity + transform, 300ms ease-in-out,
com uma pequena janela de saída para animar o fechamento antes de desmontar) e o usa em
`DesktopView` para animar a entrada/saída do painel fixo do split-view — hoje um render
condicional puro, sem nenhuma transição. `MobileView` (o `Sheet` mobile) não muda: já usa
`animate-in`/`animate-out` do Radix.

## Arquivos

- Create: `apps/frontend/src/components/ui/animated-panel.tsx`
- Create: `apps/frontend/src/components/ui/animated-panel.test.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `AnimatedPanel` segue a mesma convenção dos componentes `components/ui/*` já existentes (arquivo kebab-case, export nomeado, props tipadas, `cn()`).
- `tailwindcss`: transição via utilitários `transition-[opacity,transform]`, `duration-300`, `ease-in-out`, sem animar largura/layout.
- `vercel-react-best-practices`: anima só `opacity`/`transform` (compositável por GPU, sem reflow); o padrão de desmontar depois da transição evita layout thrashing por remoção abrupta do DOM.
- `test-antipatterns`: os testes de `AnimatedPanel` observam comportamento (o conteúdo continua no DOM durante a janela de saída, some depois) em vez de inspecionar classes CSS internas de animação, que são detalhe de implementação.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-users-visual-refinements-visual.md`, seção "4. Transição do sidebar de detalhes".
- **Fonte de design original:** nenhuma; a transição foi validada ao vivo (botões de teste) no preview do companion, não a partir de um arquivo de design externo.
- **Confirmar com o usuário:** nenhuma fonte de design adicional foi mencionada — confirmar que continua assim antes de implementar.
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou regressão visual conectada neste ambiente — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** 300ms `ease-in-out`, `opacity` + `translateY(8px)→0` + `scale(.98)→1`, mesma duração da abertura do `Sheet` mobile (que permanece inalterado).

## Passos

- **Step 1: Write the failing tests — `AnimatedPanel` monta, mantém o conteúdo durante a saída e desmonta após 300ms**

```tsx
// apps/frontend/src/components/ui/animated-panel.test.tsx
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { AnimatedPanel } from "./animated-panel"

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

test("FR-006: nao renderiza o conteudo quando open comeca false", () => {
	render(
		<AnimatedPanel open={false}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.queryByText("conteudo")).not.toBeInTheDocument()
})

test("FR-006: renderiza o conteudo quando open e true", () => {
	render(
		<AnimatedPanel open={true}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.getByText("conteudo")).toBeInTheDocument()
})

test("FR-006, FR-007: mantem o conteudo visivel durante a transicao de saida (300ms) e remove depois", () => {
	const { rerender } = render(
		<AnimatedPanel open={true}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	rerender(
		<AnimatedPanel open={false}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.queryByText("conteudo")).toBeInTheDocument()

	act(() => {
		vi.advanceTimersByTime(299)
	})
	expect(screen.queryByText("conteudo")).toBeInTheDocument()

	act(() => {
		vi.advanceTimersByTime(1)
	})
	expect(screen.queryByText("conteudo")).not.toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run (de dentro de `apps/frontend`): `pnpm exec vitest run src/components/ui/animated-panel.test.tsx`
Expected: FAIL — o módulo `./animated-panel` ainda não existe.

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/components/ui/animated-panel.tsx
"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

const TRANSITION_MS = 300

export interface AnimatedPanelProps {
	open: boolean
	children: ReactNode
	className?: string
}

export function AnimatedPanel({ open, children, className }: AnimatedPanelProps) {
	const [shouldRender, setShouldRender] = useState(open)
	const [entered, setEntered] = useState(false)
	const lastChildrenRef = useRef<ReactNode>(children)

	if (open) {
		lastChildrenRef.current = children
	}

	useEffect(() => {
		let raf: number | undefined
		let timeout: ReturnType<typeof setTimeout> | undefined
		if (open) {
			setShouldRender(true)
			raf = requestAnimationFrame(() => setEntered(true))
		} else {
			setEntered(false)
			timeout = setTimeout(() => setShouldRender(false), TRANSITION_MS)
		}
		return () => {
			if (raf !== undefined) cancelAnimationFrame(raf)
			if (timeout !== undefined) clearTimeout(timeout)
		}
	}, [open])

	if (!shouldRender) return null

	return (
		<div
			className={cn(
				"transition-[opacity,transform] duration-300 ease-in-out",
				entered
					? "opacity-100 translate-y-0 scale-100"
					: "opacity-0 translate-y-2 scale-[0.98]",
				className,
			)}
		>
			{open ? children : lastChildrenRef.current}
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/animated-panel.test.tsx`
Expected: PASS

- **Step 5: Write the failing test — `DesktopView` usa `AnimatedPanel` e preserva o `EmptyState`**

```tsx
// apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx
test("no desktop sem usuario selecionado, mostra o estado vazio", () => {
	isDesktopMock.mockReturnValue(true)
	renderContainer(null)
	expect(screen.getByText("Selecione um usuário")).toBeInTheDocument()
})

test("no desktop com usuario selecionado, renderiza o painel de detalhes", () => {
	isDesktopMock.mockReturnValue(true)
	const user = buildUser()
	renderContainer(user)
	expect(screen.getByText(user.name)).toBeInTheDocument()
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: FAIL somente se o comportamento observável mudar — como este passo só troca o
mecanismo de montagem (mantendo `EmptyState` e `UserDetailPanel` como hoje), o esperado é
falhar apenas se a implementação do Step 7 ainda não foi aplicada e o arquivo de teste
referenciar comportamento novo; rode antes de aplicar o Step 7 para confirmar que o teste
está de fato exercitando o caminho desktop (`isDesktopMock.mockReturnValue(true)`), já que
os testes atuais do arquivo cobrem majoritariamente o caminho mobile.

- **Step 7: Write minimal implementation — `DesktopView` usa `AnimatedPanel`**

```tsx
// apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx
import { AnimatedPanel } from "@/components/ui/animated-panel"
// (mantém os demais imports existentes: UserRound, useEffect/useRef, EmptyState, Sheet*, AdminUser, useIsDesktop, UserDetailPanel)

function DesktopView({
	user,
	onClose,
	onUserPatched,
}: {
	user: AdminUser | null
	onClose: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
}) {
	return (
		<>
			{!user && (
				<EmptyState
					icon={UserRound}
					title="Selecione um usuário"
					description="Escolha um usuário na lista para ver os detalhes."
					className="lg:self-start lg:sticky lg:top-4"
				/>
			)}
			<AnimatedPanel
				open={user !== null}
				className="rounded-lg border border-border bg-card p-5 lg:self-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
			>
				{user ? (
					<UserDetailPanel
						user={user}
						onClose={onClose}
						onUserPatched={onUserPatched}
					/>
				) : null}
			</AnimatedPanel>
		</>
	)
}
```

`MobileView` e o componente exportado `UserDetailContainer` não mudam.

- **Step 8: Run test to verify it passes**

Run: `pnpm exec vitest run src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: PASS

- **Step 9: Commit**

```bash
git add apps/frontend/src/components/ui/animated-panel.tsx apps/frontend/src/components/ui/animated-panel.test.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx
git commit -m "feat(admin-users): transicao suave no painel fixo do split-view [FR-006, FR-007]"
```

## Critérios de Sucesso

- `AnimatedPanel` não renderiza os filhos quando `open` começa `false`, renderiza quando
  `open` é `true`, e — ao passar de `true` para `false` — mantém os filhos visíveis
  durante 300ms antes de removê-los do DOM (FR-006, FR-007).
- `DesktopView` mostra o `EmptyState` quando nenhum usuário está selecionado e o painel
  de detalhes (via `AnimatedPanel`) quando um usuário é selecionado — mesmo comportamento
  visível de hoje, agora com transição (FR-006).
- `MobileView`/`Sheet` permanecem sem nenhuma alteração de código ou comportamento.
