# Task 4: Página `/calendario` com orquestração de mês/ano [FR-001, FR-004, FR-005, FR-007, FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** standard
**Depends on:** task-01, task-02, task-03

## Visão Geral

Cria `CalendarioFeriados`, o componente de orquestração que guarda o mês exibido em estado local (iniciado no mês/ano atual), usa `useFeriadosDoAno` (Task 1) e `feriadosParaModifiers` (Task 2) para destacar os feriados, injeta `DiaComFeriado` (Task 3) via `components.DayButton`, e localiza a grade em pt-BR. Cria também a página `app/(authenticated)/calendario/page.tsx`, que monta `CalendarioFeriados` dentro do grupo de rotas autenticadas já existente, usando `PageContainer` (mesmo padrão de `app/(authenticated)/check-ins/page.tsx`, verificado linha a linha na revisão de spec: `PageContainer as="section" width="..." aria-labelledby="..."` com `<h1 id="...">` no `<header>` — **100% das páginas existentes em `(authenticated)/` seguem esse padrão, nenhuma usa `<div>` cru**).

**Localização pt-BR (achado de pesquisa):** `react-day-picker@10.0.1` não usa mais locales de `date-fns/locale` diretamente — a documentação do próprio `.d.ts` (`locale?: Partial<DayPickerLocale>`) recomenda `import { ptBR } from "react-day-picker/locale"`. Esse locale já vem com as legendas de navegação traduzidas (confirmado lendo `dist/esm/locale/pt-BR.js` do pacote): `labelNext: "Ir para o próximo mês"`, `labelPrevious: "Ir para o mês anterior"`, `labelMonthDropdown: "Escolha o mês"`, `labelYearDropdown: "Escolha o ano"`. O `aria-label` padrão de cada dia (`labelDayButton`) formata a data completa via `date-fns`, token `"PPPP"` — confirmado rodando `format(date, "PPPP", { locale: ptBR })`: `2025-04-21` → `"segunda-feira, 21 de abril de 2025"`, `2026-01-01` → `"quinta-feira, 1 de janeiro de 2026"`. É esse valor que chega em `DiaComFeriado` como `props["aria-label"]` e que a Task 3 compõe (não substitui) com o nome do feriado.

**Seleção de ano (FR-005) via `captionLayout="dropdown"` — decisão agora fechada em D2 da spec (revisão desta spec):** a prop `captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years"` do `DayPicker` já gera os dropdowns de mês e ano nativamente — não é necessário construir um seletor de ano próprio (regra YAGNI). O mecanismo que efetivamente muda os feriados exibidos quando o ano muda é o mesmo `onMonthChange` usado para navegação de mês — por isso o teste abaixo verifica a atualização de feriados ao cruzar a virada de ano via navegação de mês, que exercita exatamente o mesmo caminho de código que a troca de ano pelo dropdown usaria.

**Mismatch de hidratação SSR/cliente (achado da revisão de spec):** `new Date()` calculado direto no `useState` inicial roda uma vez no servidor (SSR) e de novo no cliente durante a hidratação — perto da virada do dia, ou com fuso do servidor diferente do usuário, o mês/ano calculado pode divergir entre as duas execuções e causar mismatch de hidratação do React. O projeto já tem um precedente exato para isso em `apps/frontend/src/components/ui/theme-toggle.tsx`: guardar um estado `mounted` (`useState(false)` + `useEffect(() => setMounted(true), [])`) e não computar/renderizar o valor dependente do relógio do cliente antes da montagem (`if (!mounted) return null`). `CalendarioFeriados` replica exatamente esse padrão.

## Arquivos

- Create: `apps/frontend/src/features/calendario/components/calendario-feriados.tsx`
- Test: `apps/frontend/src/features/calendario/components/calendario-feriados.test.tsx`
- Create: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify: `apps/frontend/e2e/accessibility.spec.ts` (adiciona `/calendario` ao scan axe-core de telas autenticadas)

### Conformidade com as Skills Padrão

- `shadcn`: uso do `Calendar` do shadcn/ui com `modifiers`, `modifiersClassNames`, `components` e `captionLayout`; uso de `PageContainer` (`@/components/layout/page-container`), padrão de layout do projeto.
- `tailwindcss`: classes utilitárias do cabeçalho da página (`font-display`, `text-3xl`, `font-medium`, `text-foreground`), mesmas usadas em `check-ins/page.tsx`.
- `wcag-audit-patterns`: grade navegável por teclado (herdada do `react-day-picker`); `PageContainer` com `aria-labelledby` ligando o `<h1>` (landmark de página); extensão do scan e2e axe-core para `/calendario`, alinhando a característica arquitetural nº1 da spec ao mecanismo de verificação real que o projeto já usa para essa classe de risco.
- `vercel-composition-patterns`: orquestração via composição (`Calendar` + `components.DayButton` injetado + hooks de domínio), sem introduzir uma abstração própria de grade.
- `vercel-react-best-practices`: guarda `mounted` (padrão já usado em `theme-toggle.tsx`) para evitar computar `new Date()` de forma divergente entre servidor e cliente; estado local mínimo e reuso de `useFeriadosDoAno`/`feriadosParaModifiers` já memoizados/puros.
- `test-antipatterns`: uso de `vi.useFakeTimers()`/`vi.setSystemTime` para controlar "mês atual" de forma determinística e `userEvent` com `advanceTimers` para navegação real, em vez de mockar `useFeriadosDoAno`.
- `playwright-cli`: extensão do teste e2e de acessibilidade (`accessibility.spec.ts`), que roda via Playwright.

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/calendario/components/calendario-feriados.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { CalendarioFeriados } from "./calendario-feriados"

describe("CalendarioFeriados", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	test("renderiza o mês atual com os feriados do ano destacados", () => {
		vi.setSystemTime(new Date(2025, 3, 10))
		render(<CalendarioFeriados />)

		expect(
			screen.getByRole("button", {
				name: /segunda-feira, 21 de abril de 2025.*feriado: Dia de Tiradentes/i,
			}),
		).toBeInTheDocument()
	})

	test("navegar para o mês seguinte atualiza a grade exibida", async () => {
		vi.setSystemTime(new Date(2025, 3, 10))
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		render(<CalendarioFeriados />)

		await user.click(
			screen.getByRole("button", { name: "Ir para o próximo mês" }),
		)

		expect(
			screen.queryByRole("button", { name: /feriado: Dia de Tiradentes/i }),
		).not.toBeInTheDocument()
	})

	test("navegar através da virada de ano recalcula os feriados do novo ano", async () => {
		vi.setSystemTime(new Date(2025, 11, 10))
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		render(<CalendarioFeriados />)

		await user.click(
			screen.getByRole("button", { name: "Ir para o próximo mês" }),
		)

		expect(
			screen.getByRole("button", {
				name: /quinta-feira, 1 de janeiro de 2026.*feriado: Ano Novo/i,
			}),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/components/calendario-feriados.test.tsx`
Expected: FAIL com `Cannot find module './calendario-feriados'` (arquivo ainda não existe)

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/calendario/components/calendario-feriados.tsx
"use client"

import { useEffect, useState } from "react"
import { ptBR } from "react-day-picker/locale"
import { Calendar } from "@/components/ui/calendar"
import { useFeriadosDoAno } from "../hooks/use-feriados-do-ano"
import { feriadosParaModifiers } from "../lib/feriados-para-modifiers"
import { DiaComFeriado } from "./dia-com-feriado"

export function CalendarioFeriados() {
	// Mesmo padrão de apps/frontend/src/components/ui/theme-toggle.tsx: evita
	// computar `new Date()` no primeiro render (SSR) e de novo na hidratação
	// (cliente), o que poderia divergir e causar mismatch de hidratação.
	const [mesExibido, setMesExibido] = useState<Date | null>(null)

	useEffect(() => {
		const hoje = new Date()
		setMesExibido(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
	}, [])

	const feriados = useFeriadosDoAno(mesExibido?.getFullYear() ?? 0)

	if (!mesExibido) return null

	const { modifiers, modifiersClassNames } = feriadosParaModifiers(
		feriados,
		mesExibido,
	)

	return (
		<Calendar
			locale={ptBR}
			month={mesExibido}
			onMonthChange={setMesExibido}
			captionLayout="dropdown"
			modifiers={modifiers}
			modifiersClassNames={modifiersClassNames}
			components={{
				DayButton: (props) => <DiaComFeriado {...props} feriados={feriados} />,
			}}
		/>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/components/calendario-feriados.test.tsx`
Expected: `Test Files  1 passed (1)` / `Tests  3 passed (3)`

- **Step 5: Criar a página autenticada `/calendario`**

```tsx
// apps/frontend/src/app/(authenticated)/calendario/page.tsx
import { PageContainer } from "@/components/layout/page-container"
import { CalendarioFeriados } from "@/features/calendario/components/calendario-feriados"

export default function CalendarioPage() {
	return (
		<PageContainer as="section" width="narrow" aria-labelledby="calendario-title">
			<header className="flex flex-col gap-1">
				<h1
					id="calendario-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Calendário de Feriados
				</h1>
				<p className="text-sm text-muted-foreground">
					Consulte os feriados nacionais de qualquer mês ou ano.
				</p>
			</header>

			<CalendarioFeriados />
		</PageContainer>
	)
}
```

Segue exatamente o padrão de `app/(authenticated)/check-ins/page.tsx` (`PageContainer as="section" aria-labelledby="..."` + `<header><h1 id="...">`), confirmado na revisão de spec como convenção 100% consistente nas páginas de `(authenticated)/`; usa `width="narrow"` (em vez de `"default"`) porque a página é um único widget compacto, sem lista. A proteção de rota vem do `layout.tsx` desse grupo, não de lógica nova nesta página. Esta página não recebe teste próprio: é composição pura de `CalendarioFeriados` (já coberto nos Steps 1-4).

- **Step 6: Estender o scan e2e de acessibilidade para `/calendario`**

```typescript
// apps/frontend/e2e/accessibility.spec.ts
// dentro de test.describe("Acessibilidade — telas autenticadas"), no teste
// "varredura em /academias, /perfil e /check-ins":
		await scan(page, "/academias")
		await scan(page, "/perfil")
		await scan(page, "/check-ins")
		await scan(page, "/calendario")
```

O helper `scan(page, url)` já existente nesse arquivo aguarda `#main-content` (fornecido por `AuthenticatedShell`, comum a todas as páginas autenticadas — nenhuma mudança necessária em `CalendarioPage` para isso) e roda o `AxeBuilder` com as tags `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`, falhando o teste em violações `critical`/`serious`. `/calendario` é acessível a qualquer usuário autenticado (sem exigência de papel ADMIN), então entra no mesmo teste do usuário `MEMBER` que já varre `/academias`, `/perfil` e `/check-ins`.

- **Step 7: Commit** *(execução sequencial — Wave 3 é sequencial e depende da Wave 2 já integrada)*

```bash
git add apps/frontend/src/features/calendario/components/calendario-feriados.tsx apps/frontend/src/features/calendario/components/calendario-feriados.test.tsx "apps/frontend/src/app/(authenticated)/calendario/page.tsx" apps/frontend/e2e/accessibility.spec.ts
git commit -m "feat(calendario): adiciona pagina /calendario com orquestracao de mes/ano"
```

## Critérios de Sucesso

- `/calendario` exige autenticação por estar dentro do grupo de rotas `(authenticated)` [FR-007].
- Ao acessar a rota, a grade inicia no mês/ano atual com os feriados nacionais do ano destacados [FR-001].
- Navegar para o mês anterior/seguinte atualiza a grade exibida [FR-004].
- Selecionar um ano diferente (via `captionLayout="dropdown"`, nativo do `react-day-picker`, decisão fechada em D2 da spec) atualiza os feriados destacados para o ano selecionado — mecanismo verificado pelo teste de virada de ano, que exercita o mesmo `onMonthChange` [FR-005].
- A navegação (mês anterior/seguinte, dropdowns de mês/ano) e os dias de feriado permanecem acessíveis por teclado e com rótulos em pt-BR [FR-008].
- A página usa `PageContainer` com `aria-labelledby`, seguindo a convenção 100% consistente das páginas autenticadas do projeto.
- Nenhum mismatch de hidratação SSR/cliente: `mesExibido` só é computado a partir do relógio do cliente, após a montagem.
- `/calendario` está incluída no scan e2e de acessibilidade (axe-core) que o projeto já roda para outras rotas autenticadas.
