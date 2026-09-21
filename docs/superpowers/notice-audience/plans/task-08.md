# Task 8: AudienceSelector em cartões de rádio acessíveis [FR-001, FR-002, FR-003, FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-07

## Visão Geral

Cria o componente controlado `AudienceSelector({ value, onChange, disabled })`: um `<fieldset>` com `<legend>` "Público-alvo" e três cartões de rádio (Todos, Alunos, Administradores), cada um com título e descrição. Cada cartão é um `<label>` que envolve um `<input type="radio" name="audience" className="sr-only">`, no padrão dos planos de `/assinatura`. Escolher exatamente um público (FR-001) e refletir `value` como selecionado (o padrão "Todos" é fornecido pelo formulário, FR-002), exibir a descrição de cada opção (FR-003) e ser operável por teclado, com nome acessível "Público-alvo" (FR-004). O componente ainda não é usado pelo `NoticeForm` (task-10). As opções e o tipo `NoticeAudience` vêm da task-07.

Acessibilidade escolhida: cada `<input>` recebe `aria-labelledby` (título do cartão) e `aria-describedby` (descrição), assim o nome do rádio é só "Todos"/"Alunos"/"Administradores" e a descrição é anunciada separadamente.

## Arquivos

- Create: `apps/frontend/src/features/notices/components/audience-selector.tsx`
- Test: `apps/frontend/src/features/notices/components/audience-selector.test.tsx`

### Conformidade com as Skills Padrão

- `wcag-audit-patterns`: `<fieldset>` com `<legend>` real, rádios nativos navegáveis por setas, nome acessível por `aria-labelledby`, descrição por `aria-describedby`, foco visível por `has-[:focus-visible]`, indicador de seleção não depende só de cor (borda, anel e marcador).
- `tailwindcss`: classes utilitárias Tailwind 4 com tokens do tema (`border-primary`, `bg-card`, `border-border`, `text-muted-foreground`), variante `has-[...]` para foco e desabilitado, grid responsivo `grid-cols-1 sm:grid-cols-3`.
- `vercel-react-best-practices`: componente cliente enxuto, sem estado próprio (controlado), `useId` para ids estáveis, `key` estável por opção.
- `vercel-composition-patterns`: props explícitas e pequenas (`value`, `onChange`, `disabled`), sem props booleanas de variação; a lista de opções vem de uma constante compartilhada, não de um `switch` interno.
- `test-antipatterns`: os testes usam o componente real e `@testing-library/user-event`, consultam por papel e nome acessível, não por classe (exceto o teste de destaque visual, que é requisito de fidelidade) e não usam mocks.
- `no-workarounds`: nada de `div role="radio"` reinventado nem de `onClick` no cartão; o rádio nativo dentro do `<label>` faz o clique e o teclado funcionarem sem remendo.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/notice-audience-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma configurada além dos skills `frontend-design`, `impeccable`, `tailwindcss`, `wcag-audit-patterns` e da automação de navegador (`playwright-cli`, `claude-in-chrome`) para conferir visualmente; se nada disso estiver disponível, construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** três cartões de rádio em linha dentro do card do formulário (`grid grid-cols-1 gap-2 sm:grid-cols-3`, empilham abaixo de `sm`); cartão selecionado com borda `primary` e anel de 1px (`border-primary shadow-[0_0_0_1px_var(--color-primary)]`) mais indicador circular no canto superior direito preenchido em `primary`; não selecionado `border-border hover:border-border-strong`; foco por `has-[:focus-visible]:ring-2`; título e uma linha de descrição por cartão; raio `rounded-lg` no cartão; tema escuro por padrão, tokens VOLT (primary `#39e58c`, card `#161616`, borda `#2a2a2a`).

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` acima (o autor do plano as descobriu uma vez, na hora do plano). Confirmar com o usuário se existe uma fonte de design original (URL, export ou screenshot) para esta tela; só isso precisa do usuário. Se houver fonte ou ferramenta, usar; se não, construir manualmente contra o mockup curado em `../specs/mockups/notice-audience-visual.md`, reaproveitando o layout, o espaçamento e os tokens já decididos. Este passo nunca bloqueia: "sem fonte, sem ferramenta" segue para a implementação manual.

- **Step 1: Write the failing test**

Criar `apps/frontend/src/features/notices/components/audience-selector.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, test, vi } from "vitest"
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"
import { AudienceSelector } from "./audience-selector"

function renderSelector(
	props: Partial<{ value: NoticeAudience; disabled: boolean }> = {},
) {
	const onChange = vi.fn()
	render(
		<AudienceSelector
			value={props.value ?? "ALL"}
			onChange={onChange}
			disabled={props.disabled}
		/>,
	)
	return { onChange }
}

function radio(name: string) {
	return screen.getByRole("radio", { name })
}

function StatefulSelector({ initial }: { initial: NoticeAudience }) {
	const [value, setValue] = useState<NoticeAudience>(initial)
	return <AudienceSelector value={value} onChange={setValue} />
}

describe("AudienceSelector", () => {
	test("FR-001 e FR-004: renderiza um grupo Público-alvo com os três rádios", () => {
		renderSelector()

		const group = screen.getByRole("group", { name: "Público-alvo" })
		const radios = within(group).getAllByRole("radio")
		expect(radios.map((item) => item.getAttribute("value"))).toEqual([
			"ALL",
			"MEMBERS",
			"ADMINS",
		])
		expect(radio("Todos")).toBeInTheDocument()
		expect(radio("Alunos")).toBeInTheDocument()
		expect(radio("Administradores")).toBeInTheDocument()
	})

	test("FR-002: o valor inicial ALL aparece como o único selecionado", () => {
		renderSelector({ value: "ALL" })

		expect(radio("Todos")).toBeChecked()
		expect(radio("Alunos")).not.toBeChecked()
		expect(radio("Administradores")).not.toBeChecked()
	})

	test("reflete um value diferente do padrão", () => {
		renderSelector({ value: "MEMBERS" })

		expect(radio("Alunos")).toBeChecked()
		expect(radio("Todos")).not.toBeChecked()
	})

	test("clicar em Alunos chama onChange com MEMBERS", async () => {
		const { onChange } = renderSelector()

		await userEvent.click(radio("Alunos"))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith("MEMBERS")
	})

	test("clicar no texto do cartão Administradores chama onChange com ADMINS", async () => {
		const { onChange } = renderSelector()

		await userEvent.click(screen.getByText("Somente administradores ativos"))

		expect(onChange).toHaveBeenCalledWith("ADMINS")
	})

	test("FR-004: as setas do teclado trocam a seleção entre os cartões", async () => {
		render(<StatefulSelector initial="ALL" />)

		await userEvent.tab()
		expect(radio("Todos")).toHaveFocus()

		await userEvent.keyboard("{ArrowRight}")
		expect(radio("Alunos")).toBeChecked()
		expect(radio("Todos")).not.toBeChecked()

		await userEvent.keyboard("{ArrowRight}")
		expect(radio("Administradores")).toBeChecked()

		await userEvent.keyboard("{ArrowLeft}")
		expect(radio("Alunos")).toBeChecked()
	})

	test("FR-003: cada opção exibe e expõe a sua descrição", () => {
		renderSelector()

		expect(screen.getByText("Alunos e administradores ativos")).toBeVisible()
		expect(radio("Todos")).toHaveAccessibleDescription(
			"Alunos e administradores ativos",
		)
		expect(radio("Alunos")).toHaveAccessibleDescription("Somente alunos ativos")
		expect(radio("Administradores")).toHaveAccessibleDescription(
			"Somente administradores ativos",
		)
	})

	test("o cartão selecionado é destacado com a borda primary", () => {
		renderSelector({ value: "MEMBERS" })

		expect(radio("Alunos").closest("label")).toHaveClass("border-primary")
		expect(radio("Todos").closest("label")).not.toHaveClass("border-primary")
	})

	test("desabilitado: os rádios ficam inertes e onChange não é chamado", async () => {
		const { onChange } = renderSelector({ disabled: true })

		expect(radio("Todos")).toBeDisabled()
		expect(radio("Alunos")).toBeDisabled()
		expect(radio("Administradores")).toBeDisabled()
		await userEvent.click(radio("Alunos"))
		expect(onChange).not.toHaveBeenCalled()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/audience-selector.test.tsx`
Expected: FAIL with `Failed to resolve import "./audience-selector"` (o componente ainda não existe), 1 arquivo de teste com falha.

- **Step 3: Write minimal implementation**

Criar `apps/frontend/src/features/notices/components/audience-selector.tsx`:

```tsx
"use client"

import { useId } from "react"
import {
	NOTICE_AUDIENCE_OPTIONS,
	type NoticeAudienceOption,
} from "@/features/notices/notice-audience-options"
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"
import { cn } from "@/lib/cn"

export interface AudienceSelectorProps {
	value: NoticeAudience
	onChange: (value: NoticeAudience) => void
	disabled?: boolean
}

interface AudienceCardProps {
	option: NoticeAudienceOption
	groupId: string
	selected: boolean
	disabled: boolean
	onSelect: (value: NoticeAudience) => void
}

function AudienceCard({
	option,
	groupId,
	selected,
	disabled,
	onSelect,
}: AudienceCardProps) {
	const titleId = `${groupId}-${option.value}-title`
	const descriptionId = `${groupId}-${option.value}-description`

	return (
		<label
			data-selected={selected}
			className={cn(
				"relative flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 pr-9 transition-colors",
				"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-2",
				"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
				selected
					? "border-primary shadow-[0_0_0_1px_var(--color-primary)]"
					: "border-border hover:border-border-strong",
			)}
		>
			<input
				type="radio"
				name="audience"
				value={option.value}
				checked={selected}
				disabled={disabled}
				onChange={() => onSelect(option.value)}
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className="sr-only"
			/>
			<span id={titleId} className="block text-sm font-semibold text-foreground">
				{option.label}
			</span>
			<span
				id={descriptionId}
				className="block text-xs text-muted-foreground"
			>
				{option.description}
			</span>
			<span
				aria-hidden="true"
				className={cn(
					"absolute right-3 top-3 size-3.5 rounded-full border",
					selected ? "border-primary bg-primary" : "border-border-strong",
				)}
			/>
		</label>
	)
}

export function AudienceSelector({
	value,
	onChange,
	disabled = false,
}: AudienceSelectorProps) {
	const groupId = useId()

	return (
		<fieldset className="flex flex-col gap-2 border-0 p-0">
			<legend className="mb-2 text-sm font-medium text-foreground">
				Público-alvo
			</legend>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{NOTICE_AUDIENCE_OPTIONS.map((option) => (
					<AudienceCard
						key={option.value}
						option={option}
						groupId={groupId}
						selected={option.value === value}
						disabled={disabled}
						onSelect={onChange}
					/>
				))}
			</div>
		</fieldset>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/audience-selector.test.tsx`
Expected: PASS (9 testes). Se o caso de setas do teclado falhar, investigar a causa (ordem do DOM, `name` compartilhado, ambiente happy-dom) e corrigir a causa; não enfraquecer a asserção nem trocar o teste por `fireEvent`.

Depois, conferir o visual contra o mockup (Step 0): abrir o componente no navegador, checar três cartões em linha a partir de `sm`, empilhados abaixo, cartão selecionado com borda e anel `primary`, foco visível ao navegar por teclado. O componente só aparece na tela após a task-10.

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/notices/components/audience-selector.tsx apps/frontend/src/features/notices/components/audience-selector.test.tsx
git commit -m "feat(notice-audience): adiciona AudienceSelector em cartoes de radio"
```

## Critérios de Sucesso

- O componente renderiza um grupo nomeado "Público-alvo" com exatamente três rádios (Todos, Alunos, Administradores), e só o que corresponde a `value` está selecionado (FR-001, FR-002).
- Cada opção exibe a sua descrição e a expõe como descrição acessível (FR-003).
- Clique no rádio ou no cartão chama `onChange` com o valor certo; as setas do teclado trocam a seleção; com `disabled` nada muda (FR-001, FR-004).
- O cartão selecionado usa borda `primary` com anel de 1px e o layout empilha em uma coluna abaixo de `sm`, conforme o mockup.
