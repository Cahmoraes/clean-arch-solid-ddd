# Task 2: Diálogo de exclusão de nota e mensagens compartilhadas [FR-012, FR-013]

**Status:** DONE

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Extrai do modal atual as mensagens e formatadores que o painel, a gaveta e a exclusão vão dividir, e cria o `DeleteNoteDialog`, único dono da confirmação e da mutation de exclusão. Painel e gaveta só vão pedir a exclusão; o modal existente passa a importar as mensagens do novo módulo sem mudar de comportamento.

## Arquivos

- Create: `apps/frontend/src/features/training-notes/lib/note-messages.ts`
- Create: `apps/frontend/src/features/training-notes/ui/delete-note-dialog.tsx`
- Test: `apps/frontend/src/features/training-notes/lib/note-messages.test.ts`
- Test: `apps/frontend/src/features/training-notes/ui/delete-note-dialog.test.tsx`

Nota: esta task também alterou `training-note-modal.tsx` (só imports, sem mudar comportamento); o arquivo foi removido na task-07 e por isso não consta mais na lista acima.

## Interfaces

- **Consome:** N/A (só símbolos que já existem no repositório, citados nos passos: `useDeleteNote`, `DeleteNoteInput`, `ApiError`, `AlertDialog*`)
- **Produz:** em `features/training-notes/lib/note-messages.ts`: `ERRO_TEXTO_INVALIDO`, `AVISO_CONFLITO`, `ERRO_REDE`, `ERRO_NAO_ENCONTRADA` (`string`); `DESCRICAO_POR_MODO: Record<"criar" | "editar", string>`; `formatarDataCurta(date: string): string` (ex.: `"2026-10-16"` -> `"16 de outubro"`); `diaDaSemana(date: string): string` (minúsculo, ex.: `"segunda-feira"`); `mensagemDeFalha(error: unknown): string` (404 -> `ERRO_NAO_ENCONTRADA`, outro -> `ERRO_REDE`); em `features/training-notes/ui/delete-note-dialog.tsx`: `interface DeleteNoteDialogProps { open: boolean; date: string | null; onOpenChange: (open: boolean) => void; onDeleted: () => void }`; `DeleteNoteDialog(props: DeleteNoteDialogProps)`

### Skills a invocar

- `tanstack-query-best-practices`: a exclusão usa `useDeleteNote` (`mutateAsync`, `retry: 0`, invalidação de `["training-notes"]` já feita pelo hook).
- `wcag-audit-patterns`: `AlertDialog` com título, descrição e foco corretos; o foco não pode ser roubado depois de uma exclusão bem-sucedida.
- `test-antipatterns`: os testes usam msw de verdade; não mockar o hook nem o componente sob teste.
- `vercel-react-best-practices`: componente enxuto, sem estado desnecessário.

## Passos

- **Step 1: Confirm where the shared symbols live today**

Ler `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx`: `ERRO_TEXTO_INVALIDO`, `AVISO_CONFLITO`, `ERRO_REDE`, `ERRO_NAO_ENCONTRADA`, `DESCRICAO_POR_MODO`, `formatarDataCurta`, `mensagemDeFalha` são privados do módulo (não exportados), assim como `ConfirmacaoExclusao`/`excluir`. O dia da semana por extenso existe só como `getWeekday`/`WEEKDAY_FULL` privados em `features/calendario-feriados/ui/holiday-list.tsx` (`new Date(`${date}T12:00:00`).getDay()`); a task-07 apaga esse arquivo, então a lógica é copiada para `diaDaSemana`. `ApiError(status, code, userMessage, details?)` vem de `@/lib/errors`. Se algum símbolo estiver em outro lugar, ajuste o passo 3 ao que existe.

- **Step 2: Write the failing tests**

`note-messages.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/errors"
import {
	diaDaSemana,
	ERRO_NAO_ENCONTRADA,
	ERRO_REDE,
	formatarDataCurta,
	mensagemDeFalha,
} from "./note-messages"

describe("note-messages", () => {
	test("formatarDataCurta devolve dia e mês por extenso em minúsculas", () => {
		expect(formatarDataCurta("2026-10-16")).toBe("16 de outubro")
		expect(formatarDataCurta("2026-03-01")).toBe("1 de março")
	})

	test("diaDaSemana devolve o dia da semana por extenso em minúsculas", () => {
		expect(diaDaSemana("2026-10-12")).toBe("segunda-feira")
		expect(diaDaSemana("2026-10-17")).toBe("sábado")
	})

	test("mensagemDeFalha devolve ERRO_NAO_ENCONTRADA para 404 e ERRO_REDE para o resto", () => {
		expect(mensagemDeFalha(new ApiError(404, "NOT_FOUND", "x"))).toBe(ERRO_NAO_ENCONTRADA)
		expect(mensagemDeFalha(new ApiError(500, "ERRO", "x"))).toBe(ERRO_REDE)
		expect(mensagemDeFalha(new Error("rede"))).toBe(ERRO_REDE)
	})
})
```

`delete-note-dialog.test.tsx`: `vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))` antes de importar `toast`; renderizar com `renderWithProviders` (`@/test/render`); handler de exclusão com `server.use(http.delete(endpoint("/training-notes/:date"), ...))` (`server` de `@/test/msw/server`, `endpoint` de `@/test/msw/handlers`). Props padrão: `open`, `date="2026-10-16"`, `onOpenChange = vi.fn()`, `onDeleted = vi.fn()`.

```tsx
test("mostra o título e a descrição com a data por extenso", async () => {
	renderWithProviders(<DeleteNoteDialog open date="2026-10-16" onOpenChange={vi.fn()} onDeleted={vi.fn()} />)
	expect(await screen.findByRole("alertdialog", { name: "Excluir a nota?" })).toBeInTheDocument()
	expect(
		screen.getByText("A nota de 16 de outubro será apagada e sairá da célula e da lista. Essa ação não pode ser desfeita."),
	).toBeInTheDocument()
})

test("confirmar apaga a nota, avisa e chama onDeleted", async () => {
	const apagou = vi.fn()
	server.use(http.delete(endpoint("/training-notes/:date"), ({ params }) => {
		apagou(params.date)
		return new HttpResponse(null, { status: 204 })
	}))
	const onOpenChange = vi.fn()
	const onDeleted = vi.fn()
	const user = userEvent.setup()
	renderWithProviders(<DeleteNoteDialog open date="2026-10-16" onOpenChange={onOpenChange} onDeleted={onDeleted} />)
	await user.click(await screen.findByRole("button", { name: "Confirmar" }))
	await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
	expect(apagou).toHaveBeenCalledWith("2026-10-16")
	expect(toast.success).toHaveBeenCalledWith("Nota excluída.")
	expect(onOpenChange).toHaveBeenCalledWith(false)
})

test("cancelar não apaga a nota", async () => {
	const apagou = vi.fn()
	server.use(http.delete(endpoint("/training-notes/:date"), () => {
		apagou()
		return new HttpResponse(null, { status: 204 })
	}))
	const onOpenChange = vi.fn()
	const onDeleted = vi.fn()
	const user = userEvent.setup()
	renderWithProviders(<DeleteNoteDialog open date="2026-10-16" onOpenChange={onOpenChange} onDeleted={onDeleted} />)
	await user.click(await screen.findByRole("button", { name: "Cancelar" }))
	expect(onOpenChange).toHaveBeenCalledWith(false)
	expect(apagou).not.toHaveBeenCalled()
	expect(onDeleted).not.toHaveBeenCalled()
})

test("404 mostra 'Nota não encontrada — recarregue o mês' e mantém o diálogo aberto", async () => {
	vi.mocked(toast.error).mockClear()
	server.use(http.delete(endpoint("/training-notes/:date"), () =>
		HttpResponse.json({ message: "x" }, { status: 404 }),
	))
	const onOpenChange = vi.fn()
	const onDeleted = vi.fn()
	const user = userEvent.setup()
	renderWithProviders(<DeleteNoteDialog open date="2026-10-16" onOpenChange={onOpenChange} onDeleted={onDeleted} />)
	await user.click(await screen.findByRole("button", { name: "Confirmar" }))
	await waitFor(() =>
		expect(toast.error).toHaveBeenCalledWith("Nota não encontrada — recarregue o mês"),
	)
	expect(onDeleted).not.toHaveBeenCalled()
	expect(onOpenChange).not.toHaveBeenCalledWith(false)
	expect(screen.getByRole("alertdialog")).toBeInTheDocument()
})

test("date nulo não renderiza conteúdo", () => {
	renderWithProviders(<DeleteNoteDialog open date={null} onOpenChange={vi.fn()} onDeleted={vi.fn()} />)
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
})
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/lib/note-messages.test.ts`
Expected: FAIL: o módulo `./note-messages` não existe.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/delete-note-dialog.test.tsx`
Expected: FAIL: o módulo `./delete-note-dialog` não existe.

- **Step 4: Create `note-messages.ts` and point the existing modal at it**

Em `apps/frontend/src/features/training-notes/lib/note-messages.ts` exporte, com os valores literais do modal:

```ts
export const ERRO_TEXTO_INVALIDO = "Escreva de 1 a 500 caracteres"
export const AVISO_CONFLITO = "Esse dia já tem nota — edite a atual"
export const ERRO_REDE = "Sem conexão — tente de novo"
export const ERRO_NAO_ENCONTRADA = "Nota não encontrada — recarregue o mês"
export const DESCRICAO_POR_MODO: Record<"criar" | "editar", string> = {
	criar: "Descreva o treino do dia em até 500 caracteres.",
	editar: "Edite o texto da nota ou exclua o treino do dia.",
}
export function formatarDataCurta(date: string): string
export function diaDaSemana(date: string): string
export function mensagemDeFalha(error: unknown): string
```

`formatarDataCurta` e `mensagemDeFalha` são movidos do modal sem mudar a lógica (`formatarDataCurta` usa a lista de meses em minúsculas); `diaDaSemana` copia a lógica de `getWeekday` de `holiday-list.tsx`. Em `training-note-modal.tsx`, remova as definições privadas e importe de `../lib/note-messages` (edição mínima: só imports e remoção das cópias).

- **Step 5: Implement `DeleteNoteDialog(props: DeleteNoteDialogProps)` in `apps/frontend/src/features/training-notes/ui/delete-note-dialog.tsx`**

Porte `ConfirmacaoExclusao` e `excluir` do modal para este componente (`"use client"`), usando `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` de `@/components/ui/alert-dialog` e `useDeleteNote` de `../api/use-training-notes`. Textos verbatim: título "Excluir a nota?"; descrição "A nota de {formatarDataCurta(date)} será apagada e sairá da célula e da lista. Essa ação não pode ser desfeita."; botões "Cancelar" e "Confirmar". Comportamento:

- `date === null`: não renderiza conteúdo.
- Confirmar: `event.preventDefault()` no `AlertDialogAction`, `mutateAsync({ data: date })`, depois `toast.success("Nota excluída.")`, `onOpenChange(false)` e `onDeleted()`.
- Falha: só `toast.error(mensagemDeFalha(error))`; o diálogo continua aberto e `onDeleted` não é chamado.
- Foco: depois de uma exclusão bem-sucedida o diálogo não devolve o foco ao elemento anterior (o botão "Excluir" some com a nota; quem leva o foco ao dia é `onDeleted`, na página). Use `onCloseAutoFocus` do `AlertDialogContent` com `event.preventDefault()` apenas quando a exclusão foi confirmada (um `useRef<boolean>` marcado no sucesso); em Cancelar o padrão do Radix permanece.

- **Step 6: Run tests to verify they pass, and that the existing modal is unchanged**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/lib/note-messages.test.ts`
Expected: PASS: 3 testes.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/delete-note-dialog.test.tsx`
Expected: PASS: 5 testes.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
Expected: PASS: os 4 testes existentes seguem verdes (a refatoração de imports não mudou o comportamento).

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/training-notes/lib/note-messages.ts apps/frontend/src/features/training-notes/lib/note-messages.test.ts apps/frontend/src/features/training-notes/ui/delete-note-dialog.tsx apps/frontend/src/features/training-notes/ui/delete-note-dialog.test.tsx apps/frontend/src/features/training-notes/ui/training-note-modal.tsx
git commit -m "feat(training-notes): dialogo de exclusao e mensagens compartilhadas"
```

## Critérios de Sucesso

- O módulo `note-messages` exporta as constantes, `DESCRICAO_POR_MODO`, `formatarDataCurta`, `diaDaSemana` e `mensagemDeFalha` com os valores literais do modal (FR-012).
- `DeleteNoteDialog` só remove a nota ao confirmar; Cancelar não chama a API; em 404 mostra "Nota não encontrada — recarregue o mês" e permanece aberto; em sucesso chama `onDeleted` (FR-013).
- O modal existente continua com seus 4 testes verdes (comportamento inalterado).
