# Task 3: Componentes shadcn Calendar/Popover + popover de feriado [FR-002, FR-006, FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Adiciona os componentes `Calendar` e `Popover` do shadcn/ui (ainda não existem no projeto — confirmado por pesquisa: `apps/frontend/src/components/ui/` tem `button.tsx`, `tooltip.tsx`, `dialog.tsx`, mas não `calendar.tsx` nem `popover.tsx`) e cria `DiaComFeriado`, o componente que substitui o `DayButton` padrão do `react-day-picker` para exibir um popover com o nome do feriado ao passar o mouse (hover), clicar OU focar via teclado um dia destacado — os três gatilhos, conforme a decisão fechada em D2 da spec (revisão desta spec: `Popover`, não `Tooltip`; gatilho hover+click+foco, não só "hover/click").

**Desvio pontual em relação à spec, decidido nesta pesquisa:** a spec descreve a customização via prop `components.Day`. A inspeção do `.d.ts` de `react-day-picker@10.0.1` (a versão atual do pacote, que o comando de instalação abaixo vai baixar) mostra dois pontos de customização: `Day` (renderiza a `<div role="gridcell">` inteira) e `DayButton` (renderiza apenas o `<button>` interativo dentro da célula, recebendo `{ day: CalendarDay, modifiers: Modifiers } & ButtonHTMLAttributes<HTMLButtonElement>`). Customizar `DayButton` é mais seguro: mantém a semântica nativa de `role="gridcell"` gerada por `Day` e troca apenas o botão interativo — exatamente a responsabilidade de `ExibirPopoverDeFeriado`/`DiaComFeriado` descrita na spec (a spec já foi corrigida para citar `components.DayButton`). Portanto este task injeta `DiaComFeriado` via `components={{ DayButton: ... }}`, não `components={{ Day: ... }}`. A responsabilidade do componente e o nome `DiaComFeriado` continuam os da spec.

**Verificação de peer deps (mitigação do Risco 3 da spec):** `react-day-picker@10.0.1` declara `peerDependencies: { react: ">=16.8.0", "@types/react": ">=16.8.0" }` (confirmado via `npm view react-day-picker peerDependencies`); o projeto usa `react@19.2.4`/`@types/react@^19.2.16` — compatível, instalação segura.

**Achados críticos da revisão de spec, incorporados nesta versão da task:**
1. **Foco de teclado (bloqueante):** o `DayButton` nativo do `react-day-picker@10.0.1` (`components/DayButton.js`, código-fonte real do pacote) implementa `useEffect(() => { if (modifiers.focused) ref.current?.focus() }, [modifiers.focused])` — é esse efeito que move o foco real do DOM quando as setas do teclado mudam o dia "focado" internamente no `DayPicker`. Como `DiaComFeriado` substitui `DayButton` inteiramente, precisa reproduzir o mesmo efeito, ou a navegação por seta quebra silenciosamente (o `tabIndex` muda mas o foco visual/de leitor de tela fica preso).
2. **Gatilho de foco (WCAG 2.2, critério 1.4.13):** todo conteúdo revelado por hover também deve ser revelado por foco de teclado — `DiaComFeriado` precisa de `onFocus`/`onBlur` espelhando `onMouseEnter`/`onMouseLeave`, não só os dois últimos.
3. **Corrida hover→click (bloqueante em uso real):** `mouseenter` dispara antes de `click` (inclusive em `userEvent.click`, que sintetiza os dois). Sem tratamento, o hover já abre o popover e o `click` seguinte aciona o toggle nativo do `PopoverTrigger` do Radix sobre o estado já `true`, fechando-o imediatamente. Fix: chamar `event.preventDefault()` no `onClick` do botão antes de `setOpen(true)` — `composeEventHandlers` do Radix pula `onOpenToggle` quando `defaultPrevented` é `true`.
4. **`aria-label` deve compor, não substituir:** o `aria-label` nativo calculado pelo `DayPicker` (via `labelDayButton`, no locale `pt-BR` algo como `"segunda-feira, 21 de abril de 2025"`, prefixado com `"Hoje,"` e sufixado com `", selecionado"` quando aplicável) chega em `props["aria-label"]`. `DiaComFeriado` deve anexar o nome do feriado a esse valor, nunca substituí-lo — do contrário os dias mais importantes da feature perdem contexto de leitor de tela.

API confirmada via `.d.ts`/código-fonte do pacote `react-day-picker@10.0.1`:
- `DayButtonProps = { day: CalendarDay; modifiers: Modifiers } & React.ButtonHTMLAttributes<HTMLButtonElement>`
- `Modifiers = Record<string, boolean>` — então `modifiers.feriado` é `true` quando o dia bate com o modifier criado na Task 2; `modifiers.focused` é `true` quando é o dia atualmente "focado" pela navegação de teclado do `DayPicker`.
- `CalendarDay.isoDate: string` — representação estável `yyyy-MM-dd` do dia, **sem componente de hora/fuso** (mesmo formato de `Feriado.data` da Task 1) — usar `day.isoDate === feriado.data` para o lookup evita o risco de deslocamento de data (±1 dia) descrito na spec.
- `CalendarDay` é exportado publicamente por `react-day-picker` (via `export * from "./classes/index.js"` no índice do pacote) — pode ser importado e instanciado diretamente em teste: `new CalendarDay(date, displayMonth)`.

## Arquivos

- Modify: `apps/frontend/package.json` (via CLI: `react-day-picker`, `date-fns`, `@radix-ui/react-popover`)
- Create: `apps/frontend/src/components/ui/calendar.tsx` (gerado pela CLI shadcn)
- Create: `apps/frontend/src/components/ui/popover.tsx` (gerado pela CLI shadcn)
- Create: `apps/frontend/src/features/calendario/components/dia-com-feriado.tsx`
- Test: `apps/frontend/src/features/calendario/components/dia-com-feriado.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: instalação e uso dos componentes `Calendar`/`Popover` do shadcn/ui via CLI, seguindo a convenção `components.json` já configurada no projeto (`style: "new-york"`, alias `@/components/ui`).
- `tailwindcss`: classes utilitárias do destaque visual do dia de feriado (`FERIADO_HIGHLIGHT_CLASSNAME`, da Task 1) e do conteúdo do popover.
- `wcag-audit-patterns`: `aria-label` compondo (não substituindo) o nativo com o nome do feriado (FR-008); gatilho hover+click+foco (WCAG 1.4.13); paridade de gerenciamento de foco de teclado com o `DayButton` nativo.
- `vercel-composition-patterns`: substituição do `DayButton` padrão do `react-day-picker` via prop `components`, e composição `Popover`/`PopoverTrigger asChild`/`PopoverContent`.
- `vercel-react-best-practices`: estado controlado (`useState` + `open`/`onOpenChange`) para abrir o popover no hover, click e foco; `useRef`+`useEffect` reproduzindo o efeito de foco do componente nativo que está sendo substituído.
- `test-antipatterns`: testes de interação real (`userEvent.hover`/`userEvent.click`/`userEvent.tab`) em vez de simular estado interno do componente.

## Passos

- **Step 1: Instalar os componentes shadcn Calendar e Popover**

```bash
cd apps/frontend && npx shadcn@latest add calendar popover
```

Expected: cria `apps/frontend/src/components/ui/calendar.tsx` e `apps/frontend/src/components/ui/popover.tsx`; adiciona `react-day-picker`, `date-fns` e `@radix-ui/react-popover` a `apps/frontend/package.json` (executar via `pnpm`, já que o `components.json` do projeto está configurado para o workspace pnpm).

- **Step 2: Confirmar o shape gerado antes de integrar**

Abrir os dois arquivos gerados no Step 1 e confirmar (não assumir):
- Que `Calendar` (em `calendar.tsx`) repassa `modifiers`, `modifiersClassNames`, `components`, `month` e `onMonthChange` para o `DayPicker` interno (tipicamente via `React.ComponentProps<typeof DayPicker>` espalhado com `{...props}`). Se o wrapper gerado *não* repassar alguma dessas props, ajustar a assinatura de `Calendar` para aceitá-las e repassá-las explicitamente antes de prosseguir para a Task 4.
- Que `popover.tsx` exporta `Popover`, `PopoverTrigger` e `PopoverContent` seguindo o mesmo padrão já usado em `apps/frontend/src/components/ui/tooltip.tsx` (namespaces do Radix reexportados, `PopoverContent` com `forwardRef` + `Portal`). Ajustar os nomes usados no Step 4 abaixo caso a CLI gere nomes diferentes.

- **Step 3: Write the failing test**

```tsx
// apps/frontend/src/features/calendario/components/dia-com-feriado.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CalendarDay } from "react-day-picker"
import { describe, expect, test } from "vitest"
import type { Feriado } from "../schemas/feriado.schema"
import { DiaComFeriado } from "./dia-com-feriado"

const feriados: Feriado[] = [{ data: "2025-04-21", nome: "Dia de Tiradentes" }]

function criarDia(data: Date) {
	return new CalendarDay(data, new Date(2025, 3, 1))
}

const ARIA_LABEL_NATIVO = "segunda-feira, 21 de abril de 2025"

describe("DiaComFeriado", () => {
	test("exibe o popover com o nome do feriado ao clicar em um dia de feriado", async () => {
		const user = userEvent.setup()
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 21))}
				modifiers={{ feriado: true }}
				aria-label={ARIA_LABEL_NATIVO}
			>
				21
			</DiaComFeriado>,
		)

		await user.click(
			screen.getByRole("button", { name: /feriado: Dia de Tiradentes/i }),
		)

		expect(await screen.findByText("Dia de Tiradentes")).toBeInTheDocument()
	})

	test("exibe o popover com o nome do feriado ao passar o mouse (hover) em um dia de feriado", async () => {
		const user = userEvent.setup()
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 21))}
				modifiers={{ feriado: true }}
				aria-label={ARIA_LABEL_NATIVO}
			>
				21
			</DiaComFeriado>,
		)

		await user.hover(
			screen.getByRole("button", { name: /feriado: Dia de Tiradentes/i }),
		)

		expect(await screen.findByText("Dia de Tiradentes")).toBeInTheDocument()
	})

	test("mantém o popover aberto ao clicar em um dia após o hover, sem fechar pelo toggle nativo do Radix", async () => {
		const user = userEvent.setup()
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 21))}
				modifiers={{ feriado: true }}
				aria-label={ARIA_LABEL_NATIVO}
			>
				21
			</DiaComFeriado>,
		)

		const dia = screen.getByRole("button", {
			name: /feriado: Dia de Tiradentes/i,
		})
		await user.hover(dia)
		await user.click(dia)

		expect(screen.getByText("Dia de Tiradentes")).toBeInTheDocument()
	})

	test("exibe o popover ao focar o dia de feriado via teclado (WCAG 1.4.13)", async () => {
		const user = userEvent.setup()
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 21))}
				modifiers={{ feriado: true }}
				aria-label={ARIA_LABEL_NATIVO}
			>
				21
			</DiaComFeriado>,
		)

		await user.tab()

		expect(await screen.findByText("Dia de Tiradentes")).toBeInTheDocument()
	})

	test("não exibe popover para um dia sem feriado", () => {
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 22))}
				modifiers={{ feriado: false }}
				aria-label="terça-feira, 22 de abril de 2025"
			>
				22
			</DiaComFeriado>,
		)

		expect(screen.queryByText("Dia de Tiradentes")).not.toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "terça-feira, 22 de abril de 2025" }),
		).toBeInTheDocument()
	})

	test("compõe o aria-label nativo com o nome do feriado, sem substituí-lo", () => {
		render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 21))}
				modifiers={{ feriado: true }}
				aria-label={ARIA_LABEL_NATIVO}
			>
				21
			</DiaComFeriado>,
		)

		const dia = screen.getByRole("button", {
			name: /segunda-feira, 21 de abril de 2025.*feriado: Dia de Tiradentes/i,
		})
		expect(dia).toBeInTheDocument()
	})

	test("move o foco do DOM para o botão quando modifiers.focused se torna true (paridade com o DayButton nativo)", () => {
		const { rerender } = render(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 22))}
				modifiers={{ feriado: false, focused: false }}
				aria-label="terça-feira, 22 de abril de 2025"
			>
				22
			</DiaComFeriado>,
		)

		rerender(
			<DiaComFeriado
				feriados={feriados}
				day={criarDia(new Date(2025, 3, 22))}
				modifiers={{ feriado: false, focused: true }}
				aria-label="terça-feira, 22 de abril de 2025"
			>
				22
			</DiaComFeriado>,
		)

		expect(
			screen.getByRole("button", { name: "terça-feira, 22 de abril de 2025" }),
		).toHaveFocus()
	})
})
```

- **Step 4: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/components/dia-com-feriado.test.tsx`
Expected: FAIL com `Cannot find module './dia-com-feriado'` (arquivo ainda não existe)

- **Step 5: Write minimal implementation**

```tsx
// apps/frontend/src/features/calendario/components/dia-com-feriado.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import type { DayButtonProps } from "react-day-picker"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/cn"
import {
	FERIADO_HIGHLIGHT_CLASSNAME,
	type Feriado,
} from "../schemas/feriado.schema"

interface DiaComFeriadoProps extends DayButtonProps {
	feriados: Feriado[]
}

export function DiaComFeriado({
	feriados,
	day,
	modifiers,
	className,
	children,
	...props
}: DiaComFeriadoProps) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLButtonElement>(null)

	// Paridade com o DayButton nativo do react-day-picker: é este efeito que
	// move o foco real do DOM quando as setas do teclado mudam o dia "focado".
	useEffect(() => {
		if (modifiers.focused) ref.current?.focus()
	}, [modifiers.focused])

	const feriado = feriados.find((item) => item.data === day.isoDate)

	if (!feriado) {
		return (
			<Button
				ref={ref}
				variant="ghost"
				size="icon"
				className={className}
				{...props}
			>
				{children}
			</Button>
		)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					ref={ref}
					variant="ghost"
					size="icon"
					{...props}
					className={cn(className, FERIADO_HIGHLIGHT_CLASSNAME)}
					aria-label={`${props["aria-label"]} — feriado: ${feriado.nome}`}
					onMouseEnter={(event) => {
						props.onMouseEnter?.(event)
						setOpen(true)
					}}
					onMouseLeave={(event) => {
						props.onMouseLeave?.(event)
						setOpen(false)
					}}
					onFocus={(event) => {
						props.onFocus?.(event)
						setOpen(true)
					}}
					onBlur={(event) => {
						props.onBlur?.(event)
						setOpen(false)
					}}
					onClick={(event) => {
						// Evita que o toggle nativo do PopoverTrigger (Radix) feche o
						// popover que o hover já abriu — mouseenter dispara antes de
						// click, então sem isso o clique fecharia o popover recém-aberto.
						event.preventDefault()
						props.onClick?.(event)
						setOpen(true)
					}}
				>
					{children}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto px-3 py-1.5 text-sm">
				{feriado.nome}
			</PopoverContent>
		</Popover>
	)
}
```

**Nota de reuso:** `DiaComFeriado` usa o `Button` já existente em `apps/frontend/src/components/ui/button.tsx` (`variant="ghost" size="icon"`, assinatura confirmada na pesquisa desta task: `ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>`, `type` default automático quando `asChild` não é usado, `forwardRef<HTMLButtonElement, ButtonProps>` — aceita `ref` normalmente) em vez de um `<button>` cru. Isso evita perder o botão de dia gerado pelo shadcn CLI no Step 1 — o `className`/`aria-label` computados pelo `DayPicker` continuam chegando via `{...props}`/`className`, então o destaque do feriado (`cn(className, FERIADO_HIGHLIGHT_CLASSNAME)`) apenas estende o estilo padrão em vez de recriá-lo do zero.

- **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/components/dia-com-feriado.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  7 passed (7)`

- **Step 7: Commit** *(execução sequencial apenas — em uma wave paralela o orquestrador commita na barreira de integração; se seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/package.json apps/frontend/pnpm-lock.yaml apps/frontend/src/components/ui/calendar.tsx apps/frontend/src/components/ui/popover.tsx apps/frontend/src/features/calendario/components/dia-com-feriado.tsx apps/frontend/src/features/calendario/components/dia-com-feriado.test.tsx
git commit -m "feat(calendario): adiciona Calendar/Popover shadcn e popover de feriado no dia"
```

## Critérios de Sucesso

- Componentes `Calendar` e `Popover` do shadcn/ui instalados em `apps/frontend/src/components/ui/`, seguindo a convenção do `components.json` do projeto.
- `DiaComFeriado` exibe um popover com o nome correto do feriado ao passar o mouse, ao clicar OU ao focar via teclado um dia destacado como feriado (WCAG 1.4.13); um dia sem feriado não exibe popover [FR-006].
- Clicar em um dia após o hover não fecha o popover recém-aberto (corrida hover→click tratada).
- O `aria-label` do botão do dia de feriado **compõe** o rótulo nativo do `react-day-picker` com o nome do feriado, sem substituí-lo [FR-008].
- Navegação por seta do teclado continua movendo o foco real do DOM (paridade com o `DayButton` nativo que `DiaComFeriado` substitui).
- O lookup do feriado usa `day.isoDate` (string `yyyy-MM-dd` sem hora/fuso) comparado a `Feriado.data`, evitando o risco de deslocamento de data descrito na spec.
