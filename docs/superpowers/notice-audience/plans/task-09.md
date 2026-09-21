# Task 9: Pré-visualização mostra o público e subtítulo da página [FR-014]

**Status:** PENDING
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** cheap
**Depends on:** task-07

## Visão Geral

`NoticePreviewProps` ganha `audience: NoticeAudience`. Quando a pré-visualização NÃO está no estado vazio, ela mostra, abaixo do item de notificação, a linha `Público: <rótulo>` em mono, uppercase e cor `primary`; ao trocar a prop, a linha atualiza na hora (FR-014). O rótulo vem de `noticeAudienceLabel` (task-07). O subtítulo da página `/admin/avisos/novo` passa de "Comunicado enviado a todos os usuários pelo sino de notificações." para "Comunicado enviado ao público escolhido pelo sino de notificações.". Como `audience` agora é prop obrigatória, o `NoticeForm` precisa passá-la: ele já tem `audience` nos valores do formulário (task-07, `defaultValues` com `"ALL"`), então observa o campo com `useWatch` e o repassa ao preview. Enquanto o seletor não existe (task-10) o valor observado é sempre o padrão "Todos"; a task-10 só adiciona o controle que o altera.

## Arquivos

- Modify: `apps/frontend/src/features/notices/components/notice-preview.tsx`
- Modify: `apps/frontend/src/features/notices/components/notice-form.tsx` (só o `useWatch` e a prop do preview)
- Modify: `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-preview.test.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-form.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: a linha usa utilitários do tema (`font-mono text-xs uppercase tracking-wide text-primary`), sem CSS solto nem cor literal.
- `vercel-react-best-practices`: `NoticePreview` continua um componente puro dependente só de props; no formulário um único `useWatch` observa `title`, `message` e `audience` (uma assinatura, sem re-render extra por campo).
- `test-antipatterns`: os testes renderizam o componente real e consultam pelo texto visível ("Público: Alunos"), sem mock e sem espiar a implementação.
- `no-workarounds`: sem valor padrão escondido na prop (`audience` é obrigatória e o formulário a fornece); sem `?? "ALL"` no preview.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/notice-audience-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma configurada além dos skills `frontend-design`, `impeccable`, `tailwindcss`, `wcag-audit-patterns` e da automação de navegador (`playwright-cli`, `claude-in-chrome`) para conferir visualmente; se nada disso estiver disponível, construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** na coluna de pré-visualização, abaixo do item de notificação, uma linha "Público: X" em mono (JetBrains Mono), uppercase, cor `primary` (`#39e58c` no tema escuro); estado vazio não mostra a linha; tokens VOLT, raio `rounded-md` do contêiner da pré-visualização inalterado.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` acima (o autor do plano as descobriu uma vez, na hora do plano). Confirmar com o usuário se existe uma fonte de design original (URL, export ou screenshot) para esta tela; só isso precisa do usuário. Se houver fonte ou ferramenta, usar; se não, construir manualmente contra o mockup curado em `../specs/mockups/notice-audience-visual.md`, reaproveitando o layout, o espaçamento e os tokens já decididos. Este passo nunca bloqueia: "sem fonte, sem ferramenta" segue para a implementação manual.

- **Step 1: Write the failing test**

Substituir o conteúdo de `apps/frontend/src/features/notices/components/notice-preview.test.tsx` (os testes existentes ganham `audience="ALL"`; entram os testes novos de público):

```tsx
import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { NoticePreview } from "./notice-preview"

const EMPTY_STATE = "Digite o título e a mensagem para ver a pré-visualização."

describe("NoticePreview", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	test("exibe o rótulo Como o usuário verá", () => {
		render(
			<NoticePreview
				title="Manutenção"
				message="Sistema fora do ar."
				audience="ALL"
			/>,
		)

		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
	})

	test("reflete o título e a mensagem informados no item do sino", () => {
		render(
			<NoticePreview
				title="Manutenção programada"
				message="O sistema ficará fora do ar hoje às 22h."
				audience="ALL"
			/>,
		)

		const list = screen.getByRole("list")
		expect(within(list).getByText("Manutenção programada")).toBeInTheDocument()
		expect(
			within(list).getByText("O sistema ficará fora do ar hoje às 22h."),
		).toBeInTheDocument()
	})

	test("usa o item real de notificação, exibido como recente", () => {
		render(<NoticePreview title="Aviso" message="Mensagem" audience="ALL" />)

		expect(
			within(screen.getByRole("list")).getByRole("button"),
		).toBeInTheDocument()
		expect(screen.getByText("agora")).toBeInTheDocument()
	})

	test("mantém o rótulo agora ao digitar após minutos de montagem", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"))
		const { rerender } = render(
			<NoticePreview
				title="Manutenção"
				message="Sistema fora do ar."
				audience="ALL"
			/>,
		)

		vi.advanceTimersByTime(2 * 60_000)
		rerender(
			<NoticePreview
				title="Manutenção!"
				message="Sistema fora do ar hoje."
				audience="ALL"
			/>,
		)

		expect(screen.getByText("agora")).toBeInTheDocument()
		expect(screen.queryByText(/atrás/)).not.toBeInTheDocument()
	})

	test("atualiza a pré-visualização quando as props mudam", () => {
		const { rerender } = render(
			<NoticePreview title="Primeiro" message="Mensagem um" audience="ALL" />,
		)

		rerender(
			<NoticePreview title="Segundo" message="Mensagem dois" audience="ALL" />,
		)

		expect(screen.getByText("Segundo")).toBeInTheDocument()
		expect(screen.getByText("Mensagem dois")).toBeInTheDocument()
		expect(screen.queryByText("Primeiro")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem estão vazios", () => {
		render(<NoticePreview title="" message="" audience="ALL" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem têm só espaços", () => {
		render(<NoticePreview title="   " message="  " audience="ALL" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
	})

	test("mostra o item quando apenas um dos campos foi preenchido", () => {
		render(<NoticePreview title="Só título" message="" audience="ALL" />)

		expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
		expect(screen.getByText("Só título")).toBeInTheDocument()
	})

	test("Review Focus: HTML e script digitados aparecem como texto na pré-visualização, sem executar", () => {
		const scriptMessage =
			'<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = render(
			<NoticePreview
				title={boldTitle}
				message={scriptMessage}
				audience="ALL"
			/>,
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})

	test("FR-014: com título, mensagem e audience MEMBERS mostra Público: Alunos", () => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		expect(screen.getByText("Público: Alunos")).toBeInTheDocument()
	})

	test.each([
		["ALL", "Público: Todos"],
		["MEMBERS", "Público: Alunos"],
		["ADMINS", "Público: Administradores"],
	] as const)("mostra o rótulo do público %s", (audience, expected) => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience={audience} />,
		)

		expect(screen.getByText(expected)).toBeInTheDocument()
	})

	test("FR-014: trocar a prop audience atualiza a linha na hora", () => {
		const { rerender } = render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		rerender(
			<NoticePreview title="Aviso" message="Mensagem" audience="ADMINS" />,
		)

		expect(screen.getByText("Público: Administradores")).toBeInTheDocument()
		expect(screen.queryByText("Público: Alunos")).not.toBeInTheDocument()
	})

	test("estado vazio não mostra a linha de público", () => {
		render(<NoticePreview title="" message="" audience="MEMBERS" />)

		expect(screen.queryByText(/Público:/)).not.toBeInTheDocument()
	})

	test("a linha de público destaca-se em mono, maiúsculas e cor primary", () => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		expect(screen.getByText("Público: Alunos")).toHaveClass(
			"font-mono",
			"uppercase",
			"text-primary",
		)
	})
})
```

Em `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.test.tsx`, trocar o subtítulo esperado:

```tsx
		expect(
			screen.getByText(
				"Comunicado enviado ao público escolhido pelo sino de notificações.",
			),
		).toBeInTheDocument()
```

Em `apps/frontend/src/features/notices/components/notice-form.test.tsx`, adicionar dentro do `describe("NoticeForm", ...)`:

```tsx
	test("FR-014: a pré-visualização mostra o público padrão Todos assim que há texto", async () => {
		renderWithProviders(<NoticeForm />)
		expect(screen.queryByText(/Público:/)).not.toBeInTheDocument()

		await userEvent.type(titleInput(), "Manutenção")

		expect(screen.getByText("Público: Todos")).toBeInTheDocument()
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/notice-preview.test.tsx src/features/notices/components/notice-form.test.tsx "src/app/(authenticated)/admin/avisos/novo/page.test.tsx"`
Expected: FAIL. `notice-preview.test.tsx`: os testes de público falham com `Unable to find an element with the text: Público: Alunos` (e afins), pois o preview ainda ignora `audience`; `notice-form.test.tsx`: o teste FR-014 falha com `Unable to find an element with the text: Público: Todos`; `page.test.tsx`: falha por não encontrar o novo subtítulo. Os testes de preview que já existiam continuam passando.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/notices/components/notice-preview.tsx`, adicionar os imports:

```tsx
import { noticeAudienceLabel } from "@/features/notices/notice-audience-options"
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"
```

trocar a interface e a assinatura:

```tsx
export interface NoticePreviewProps {
	title: string
	message: string
	audience: NoticeAudience
}
```

```tsx
export function NoticePreview({ title, message, audience }: NoticePreviewProps) {
```

e trocar o ramo não vazio do JSX (o ramo do estado vazio permanece igual):

```tsx
			{isEmpty ? (
				<p className="text-sm text-muted-foreground">{EMPTY_STATE_TEXT}</p>
			) : (
				<>
					<ul
						aria-labelledby={labelId}
						className="overflow-hidden rounded-md border border-border bg-card"
					>
						<NotificationItem
							notification={notification}
							onMarkAsRead={ignoreMarkAsRead}
						/>
					</ul>
					<p className="font-mono text-xs uppercase tracking-wide text-primary">
						{`Público: ${noticeAudienceLabel(audience)}`}
					</p>
				</>
			)}
```

Em `apps/frontend/src/features/notices/components/notice-form.tsx`, trocar o `useWatch` e a prop do preview:

```tsx
	const [title, message, audience] = useWatch({
		control,
		name: ["title", "message", "audience"],
	})
```

```tsx
			<NoticePreview title={title} message={message} audience={audience} />
```

Em `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.tsx`, trocar o subtítulo:

```tsx
				subtitle="Comunicado enviado ao público escolhido pelo sino de notificações."
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/notice-preview.test.tsx src/features/notices/components/notice-form.test.tsx "src/app/(authenticated)/admin/avisos/novo/page.test.tsx"`
Expected: PASS (preview: 9 existentes + 1 + 3 + 1 + 1 + 1 = 16; formulário: existentes + 1; página: 2).

Depois, conferir visualmente contra o mockup (Step 0): a linha "PÚBLICO: TODOS" aparece em mono, maiúscula e na cor `primary` logo abaixo do item de notificação, e some quando título e mensagem estão vazios.

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/notices/components/notice-preview.tsx apps/frontend/src/features/notices/components/notice-preview.test.tsx apps/frontend/src/features/notices/components/notice-form.tsx apps/frontend/src/features/notices/components/notice-form.test.tsx "apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.tsx" "apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.test.tsx"
git commit -m "feat(notice-audience): preview mostra o publico e subtitulo da pagina"
```

## Critérios de Sucesso

- Com título ou mensagem preenchidos, a pré-visualização mostra "Público: Todos", "Público: Alunos" ou "Público: Administradores" conforme `audience`, e a linha atualiza quando a prop muda (FR-014).
- No estado vazio a linha de público não aparece.
- A linha usa mono, maiúsculas e a cor `primary`, como no mockup.
- O subtítulo da página é "Comunicado enviado ao público escolhido pelo sino de notificações."
