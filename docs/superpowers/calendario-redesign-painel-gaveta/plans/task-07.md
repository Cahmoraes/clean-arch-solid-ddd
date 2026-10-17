# Task 7: Atalho de setas seguro e remoção do código antigo [FR-015]

**Status:** DONE

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Impede que as setas esquerda e direita troquem de mês enquanto o usuário digita a nota ou enquanto a gaveta ou o diálogo de exclusão estão abertos, com uma função pura aplicada ao atalho global da página. Em seguida remove o código que ficou sem uso depois do redesign: as listas antigas, o modal e o agrupamento por semana.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/lib/month-shortcut.ts`
- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx` (efeito de `keydown`)
- Modify: `apps/frontend/src/features/training-notes/lib/note-messages.ts` (remover `DESCRICAO_POR_MODO` se ficar sem uso)
- Delete: `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx`, `apps/frontend/src/features/calendario-feriados/ui/holiday-list.test.tsx`
- Delete: `apps/frontend/src/features/training-notes/ui/training-notes-list.tsx`
- Delete: `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx`
- Delete: `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.ts`, `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.test.ts`
- Test: `apps/frontend/src/features/calendario-feriados/lib/month-shortcut.test.ts`
- Test: `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`

## Interfaces

- **Consome:** a `CalendarPage` integrada da task-06, com os estados `drawerOpen: boolean` e `deleteDate: string | null` e o efeito `keydown` de `window` que chama `handlePrevMonth()` em `ArrowLeft` e `handleNextMonth()` em `ArrowRight` (task-06). O teste de página também usa a gaveta (`NoteDrawer`, task-03) pelo botão "Adicionar nota" do painel.
- **Produz:** `isMonthShortcutBlocked(event: KeyboardEvent, overlayOpen: boolean): boolean` em `features/calendario-feriados/lib/month-shortcut.ts`.

### Skills a invocar

- `wcag-audit-patterns`: atalhos de teclado não podem interferir na edição de texto (WCAG 2.1.4 e 2.1.1).
- `test-antipatterns`: eventos reais despachados em elementos reais; sem mock do `KeyboardEvent`.
- `no-workarounds`: a guarda corrige a causa (listener global sem filtro de alvo); sem `stopPropagation` no textarea nem outros desvios.

## Passos

- **Step 1: Write the failing unit tests**

`month-shortcut.test.ts`. Helper que despacha o evento e devolve o `KeyboardEvent` já com `target`:

```ts
import { afterEach, describe, expect, test } from "vitest"
import { isMonthShortcutBlocked } from "./month-shortcut"

function disparar(alvo: HTMLElement, opcoes: { prevenir?: boolean } = {}): KeyboardEvent {
	document.body.append(alvo)
	let capturado!: KeyboardEvent
	alvo.addEventListener("keydown", (e) => {
		capturado = e
		if (opcoes.prevenir) e.preventDefault()
	}, { once: true })
	alvo.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }))
	return capturado
}

afterEach(() => { document.body.innerHTML = "" })

describe("isMonthShortcutBlocked", () => {
	test("não bloqueia com o alvo comum e sem overlay", () => {
		expect(isMonthShortcutBlocked(disparar(document.createElement("button")), false)).toBe(false)
	})
	test("bloqueia quando há gaveta ou diálogo aberto", () => {
		expect(isMonthShortcutBlocked(disparar(document.createElement("button")), true)).toBe(true)
	})
	test.each(["input", "textarea", "select"])("bloqueia quando o alvo é %s", (tag) => {
		expect(isMonthShortcutBlocked(disparar(document.createElement(tag)), false)).toBe(true)
	})
	test("bloqueia quando o alvo é contenteditable", () => {
		const div = document.createElement("div")
		div.setAttribute("contenteditable", "true")
		expect(isMonthShortcutBlocked(disparar(div), false)).toBe(true)
	})
	test("bloqueia quando o evento já teve o padrão impedido", () => {
		expect(isMonthShortcutBlocked(disparar(document.createElement("button"), { prevenir: true }), false)).toBe(true)
	})
})
```

- **Step 2: Write the failing page tests**

Em `page.test.tsx`, novo `describe("atalho de setas")` (`instalarNotasMock()`; `CalendarPage` com `initialYear={2026} initialMonth={9}`). Abrir a gaveta: clicar em `/^16 de outubro/`, depois no botão "Adicionar nota" do painel; o campo é `screen.getByLabelText("Nota do treino")`. O mês exibido é checado por `document.querySelector('button[data-date="2026-10-16"]')` (a grade renderiza só o mês exibido; a consulta evita o `aria-hidden` que o Radix põe no resto da página).

```tsx
test("AC-14 setas no textarea da gaveta não trocam o mês", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await screen.findByRole("button", { name: "Adicionar nota" }))
	await user.click(await screen.findByLabelText("Nota do treino"))
	await user.keyboard("{ArrowLeft}{ArrowRight}{ArrowRight}")
	expect(document.querySelector('button[data-date="2026-10-16"]')).toBeInTheDocument()
})

test("AC-14 setas com a gaveta aberta e o foco fora do campo não trocam o mês", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await screen.findByRole("button", { name: "Adicionar nota" }))
	screen.getByRole("button", { name: "Cancelar" }).focus()
	await user.keyboard("{ArrowRight}")
	expect(document.querySelector('button[data-date="2026-10-16"]')).toBeInTheDocument()
})
```

- **Step 3: Review Focus: Seta esquerda ou direita digitada no textarea da gaveta aberta não troca o mês — Write the failing test**

```tsx
test("Review Focus: seta esquerda ou direita digitada no textarea da gaveta aberta move o cursor e não troca o mês", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await screen.findByRole("button", { name: "Adicionar nota" }))
	const campo = await screen.findByLabelText("Nota do treino")
	await user.type(campo, "abc{ArrowLeft}{ArrowLeft}X")
	expect(campo).toHaveValue("aXbc")
	expect(document.querySelector('button[data-date="2026-10-16"]')).toBeInTheDocument()
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/lib/month-shortcut.test.ts`
Expected: FAIL: o módulo `./month-shortcut` não existe.

Run: `cd apps/frontend && pnpm exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: FAIL: os três testes novos (AC-14 e Review Focus): hoje o atalho global troca para setembro e `button[data-date="2026-10-16"]` some.

- **Step 5: Implement `isMonthShortcutBlocked(event: KeyboardEvent, overlayOpen: boolean): boolean` in `apps/frontend/src/features/calendario-feriados/lib/month-shortcut.ts`**

Devolve `true` quando `overlayOpen`, ou `event.defaultPrevented`, ou o alvo é um elemento `input`, `textarea` ou `select`, ou está dentro de um elemento com `contenteditable` diferente de `"false"` (por exemplo `closest('[contenteditable]:not([contenteditable="false"])')`). Um `event.target` que não seja `Element` (por exemplo `window`) não é editável. Complexidade cognitiva máxima 5: extraia `alvoEditavel(target: EventTarget | null): boolean`.

- **Step 6: Apply the guard in the `keydown` effect of `apps/frontend/src/app/(authenticated)/calendario/page.tsx`**

No handler do `window` `keydown`, a primeira linha passa a ser `if (isMonthShortcutBlocked(e, drawerOpen || deleteDate !== null)) return`; `drawerOpen` e `deleteDate` entram nas dependências do efeito. O restante do atalho (ArrowLeft -> mês anterior, ArrowRight -> próximo) não muda. Não aumentar a complexidade já suprimida por `biome-ignore`: se necessário, extraia o efeito para um hook local.

- **Step 7: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/lib/month-shortcut.test.ts`
Expected: PASS: 7 testes (cada tag do `test.each` conta um).

Run: `cd apps/frontend && pnpm exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: PASS: todos os testes do arquivo, incluindo o "navega via teclado ArrowLeft/Right" existente (sem overlay, o atalho segue funcionando).

- **Step 8: Confirm the old code has no remaining consumers**

Run (na raiz do repositório): `grep -rnE "holiday-list|HolidayList|training-notes-list|TrainingNotesList|training-note-modal|TrainingNoteModal|get-semana-do-mes|getSemanaDoMes|agruparFeriadosPorSemana|DESCRICAO_POR_MODO" apps/frontend/src apps/frontend/e2e`
Expected: ocorrências somente nos próprios arquivos a apagar (`holiday-list.tsx`, `holiday-list.test.tsx`, `training-notes-list.tsx`, `training-note-modal.tsx`, `get-semana-do-mes.ts`, `get-semana-do-mes.test.ts`) e na definição de `DESCRICAO_POR_MODO` em `note-messages.ts`. Qualquer outra ocorrência é um consumidor vivo: tratá-la antes de apagar.

- **Step 9: Delete the unused code**

`git rm` dos seis arquivos listados em `## Arquivos` (o teste do modal já saiu na task-06). Em `note-messages.ts`, remover `DESCRICAO_POR_MODO` (a gaveta usa o dia da semana como descrição e não o consome). Limpar imports órfãos que sobrarem.

- **Step 10: Verify nothing references the removed code and the affected suites still pass**

Run (na raiz do repositório): `grep -rnE "holiday-list|HolidayList|training-notes-list|TrainingNotesList|training-note-modal|TrainingNoteModal|get-semana-do-mes|getSemanaDoMes|agruparFeriadosPorSemana|DESCRICAO_POR_MODO" apps/frontend/src apps/frontend/e2e`
Expected: nenhuma saída.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/lib/note-messages.test.ts`
Expected: PASS: 3 testes.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
Expected: PASS: todos os testes do arquivo (a página segue resolvendo todos os imports).

- **Step 11: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/lib/month-shortcut.ts apps/frontend/src/features/calendario-feriados/lib/month-shortcut.test.ts "apps/frontend/src/app/(authenticated)/calendario/page.tsx" "apps/frontend/src/app/(authenticated)/calendario/page.test.tsx" apps/frontend/src/features/training-notes/lib/note-messages.ts
git commit -m "feat(calendario): atalho de setas seguro e remocao do codigo antigo"
```

## Critérios de Sucesso

- AC-14 [unit]: WHEN o usuário aperta seta esquerda ou direita com o foco num campo editável ou com a gaveta aberta THEN o mês exibido não muda
- `isMonthShortcutBlocked` devolve `true` com overlay aberto, evento já tratado ou alvo `input`/`textarea`/`select`/`contenteditable`, e `false` nos demais casos (FR-015).
- Sem overlay e fora de campos editáveis, as setas continuam trocando o mês.
- `HolidayList`, `TrainingNotesList`, `TrainingNoteModal` e `getSemanaDoMes`/`agruparFeriadosPorSemana` não existem mais e nada no repositório os referencia.
