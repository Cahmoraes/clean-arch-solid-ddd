# Task 9: Pré-visualização do aviso [FR-013]

**Status:** DONE
**Verified:** `pnpm --filter frontend exec vitest run src/features/notices/components/notice-preview.test.tsx` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-07

## Visão Geral

`NoticePreview` mostra ao administrador como o aviso aparece no sino: rótulo mono "Como o usuário verá" e o `NotificationItem` real (tipo `NOTICE`, não lido, `createdAt` atual, `onMarkAsRead` sem efeito) dentro de um `<ul>` (o `NotificationItem` renderiza `<li>`). Enquanto título e mensagem estiverem vazios, exibe um estado vazio. Como o texto do administrador chega a todos os usuários, a task também fixa por teste que HTML ou script digitado é exibido como texto puro e nunca interpretado, tanto na pré-visualização quanto no item do sino.

## Arquivos

- Create: `apps/frontend/src/features/notices/components/notice-preview.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-preview.test.tsx`
- Modify (teste): `apps/frontend/src/components/notification/notification-item.test.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: os testes renderizam o `NotificationItem` real dentro do preview e assertam o que o usuário vê; nada de mock do item nem de detalhes internos.
- `no-workarounds`: a segurança contra HTML vem do render de texto padrão do React; nenhuma sanitização manual, `dangerouslySetInnerHTML` ou `innerHTML` é usada.
- `vercel-react-best-practices`: `createdAt` é fixado por `useState` lazy (estável entre renders), e o objeto do item é derivado no render sem `useEffect`.
- `shadcn`: reutiliza tokens semânticos do tema (`bg-surface-2`, `border-border`, `bg-card`, `text-muted-foreground`).
- `tailwindcss`: layout apenas com utilitários; sem CSS avulso.
- `wcag-audit-patterns`: o preview é uma `section` rotulada pelo texto "Como o usuário verá" e a lista referencia esse rótulo por `aria-labelledby`; o estado vazio é texto, não apenas visual.
- `frontend-design`: segue o painel de preview do mockup curado (`surface-2`, borda tracejada, `rounded-md`, rótulo mono).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-notice-broadcast-visual.md` (painel de preview à direita: `surface-2`, borda tracejada, `rounded-md`, rótulo mono "Como o usuário verá" e `NotificationItem` real)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `frontend-design` e `impeccable` (qualidade de UI) e `playwright-cli` ou `claude-in-chrome` (conferir a tela renderizada); se indisponíveis na execução, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** preview à direita do formulário, empilha abaixo de ~860px; usa o `NotificationItem` real para não divergir do sino; tema VOLT dark padrão (primário `#39e58c`, card `#161616`, `rounded-md` 14px)

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirmar com o usuário se existe fonte de design original (URL/export); se não houver, e sem ferramenta de fidelidade disponível, construir manualmente contra o mockup curado em `../specs/mockups/admin-notice-broadcast-visual.md` (norte, não pixel-final). Este passo nunca bloqueia.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/notices/components/notice-preview.test.tsx
import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { NoticePreview } from "./notice-preview"

const EMPTY_STATE = "Digite o título e a mensagem para ver a pré-visualização."

describe("NoticePreview", () => {
	test("exibe o rótulo Como o usuário verá", () => {
		render(<NoticePreview title="Manutenção" message="Sistema fora do ar." />)

		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
	})

	test("reflete o título e a mensagem informados no item do sino", () => {
		render(
			<NoticePreview
				title="Manutenção programada"
				message="O sistema ficará fora do ar hoje às 22h."
			/>,
		)

		const list = screen.getByRole("list")
		expect(within(list).getByText("Manutenção programada")).toBeInTheDocument()
		expect(
			within(list).getByText("O sistema ficará fora do ar hoje às 22h."),
		).toBeInTheDocument()
	})

	test("usa o item real de notificação, exibido como não lido e recente", () => {
		render(<NoticePreview title="Aviso" message="Mensagem" />)

		expect(within(screen.getByRole("list")).getByRole("button")).toBeInTheDocument()
		expect(screen.getByText("agora")).toBeInTheDocument()
	})

	test("atualiza a pré-visualização quando as props mudam", () => {
		const { rerender } = render(
			<NoticePreview title="Primeiro" message="Mensagem um" />,
		)

		rerender(<NoticePreview title="Segundo" message="Mensagem dois" />)

		expect(screen.getByText("Segundo")).toBeInTheDocument()
		expect(screen.getByText("Mensagem dois")).toBeInTheDocument()
		expect(screen.queryByText("Primeiro")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem estão vazios", () => {
		render(<NoticePreview title="" message="" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem têm só espaços", () => {
		render(<NoticePreview title="   " message="  " />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
	})

	test("mostra o item quando apenas um dos campos foi preenchido", () => {
		render(<NoticePreview title="Só título" message="" />)

		expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
		expect(screen.getByText("Só título")).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/components/notice-preview.test.tsx`
Expected: FAIL - não foi possível resolver `./notice-preview` (módulo inexistente).

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/notices/components/notice-preview.tsx
"use client"

import { useId, useState } from "react"
import { NotificationItem } from "@/components/notification/notification-item"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"

export interface NoticePreviewProps {
	title: string
	message: string
}

const PREVIEW_NOTIFICATION_ID = "notice-preview"
const EMPTY_STATE_TEXT =
	"Digite o título e a mensagem para ver a pré-visualização."

const ignoreMarkAsRead = (): void => undefined

export function NoticePreview({ title, message }: NoticePreviewProps) {
	const labelId = useId()
	const [createdAt] = useState(() => new Date().toISOString())
	const isEmpty = title.trim() === "" && message.trim() === ""
	const notification: NotificationItemData = {
		id: PREVIEW_NOTIFICATION_ID,
		type: "NOTICE",
		title,
		message,
		gymName: null,
		reason: null,
		readAt: null,
		createdAt,
	}

	return (
		<section
			aria-labelledby={labelId}
			className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-surface-2 p-4"
		>
			<p
				id={labelId}
				className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
			>
				Como o usuário verá
			</p>
			{isEmpty ? (
				<p className="text-sm text-muted-foreground">{EMPTY_STATE_TEXT}</p>
			) : (
				<ul
					aria-labelledby={labelId}
					className="overflow-hidden rounded-md border border-border bg-card"
				>
					<NotificationItem
						notification={notification}
						onMarkAsRead={ignoreMarkAsRead}
					/>
				</ul>
			)}
		</section>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/components/notice-preview.test.tsx`
Expected: PASS (7 testes).

- **Step 5: Review Focus: Mensagem com HTML ou script → exibida como texto na pré-visualização e no sino, sem executar. Write the test (pré-visualização)**

Review Focus: Mensagem com HTML ou script → exibida como texto na pré-visualização e no sino, sem executar

Adicionar a `notice-preview.test.tsx`, dentro do `describe` (o spec nunca nomeou entrada com marcação; é a entrada implícita que o administrador pode digitar):

```tsx
	test("Review Focus: HTML e script digitados aparecem como texto na pré-visualização, sem executar", () => {
		const scriptMessage = '<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = render(
			<NoticePreview title={boldTitle} message={scriptMessage} />,
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})
```

- **Step 6: Write the test (sino)**

Adicionar a `apps/frontend/src/components/notification/notification-item.test.tsx` (criado na task 7), dentro do `describe("NotificationItem com tipo NOTICE", ...)`:

```tsx
	test("Review Focus: HTML e script na mensagem aparecem como texto no sino, sem executar", () => {
		const scriptMessage = '<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = renderItem(
			makeNotification({ title: boldTitle, message: scriptMessage }),
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})
```

- **Step 7: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/components/notice-preview.test.tsx`
Expected: PASS (8 testes).

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (5 testes). Os dois novos são testes de caracterização: o React já escapa texto, então passam com a implementação atual e protegem contra a introdução futura de `dangerouslySetInnerHTML` ou de qualquer render de HTML. Se algum falhar, corrigir o componente (não o teste).

- **Step 8: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/frontend/src/features/notices/components/notice-preview.tsx apps/frontend/src/features/notices/components/notice-preview.test.tsx apps/frontend/src/components/notification/notification-item.test.tsx
git commit -m "feat(notices): adiciona pre-visualizacao do aviso no sino"
```

## Critérios de Sucesso

- A pré-visualização mostra título e mensagem com o `NotificationItem` real e reflete mudanças de props (FR-013).
- Título e mensagem vazios (ou só espaços) mostram o estado vazio em vez de um item em branco.
- HTML ou script digitado é exibido como texto na pré-visualização e no item do sino, sem criar elementos nem executar código.
