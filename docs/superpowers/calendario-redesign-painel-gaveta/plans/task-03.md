# Task 3: Gaveta de criação e edição de nota [FR-010, FR-011, FR-012, FR-017]

**Status:** DONE

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Cria o `NoteDrawer`, a gaveta lateral que substitui o modal para criar e editar a nota do dia. O formulário, o conflito 409 e o erro de rede com "Repetir" migram do modal sem mudar de regra; a exclusão é só um pedido (`onRequestDelete`), porque quem a executa é o `DeleteNoteDialog`. A gaveta ainda não é ligada à página (task-06).

## Arquivos

- Create: `apps/frontend/src/features/training-notes/ui/training-note-drawer.tsx`
- Test: `apps/frontend/src/features/training-notes/ui/training-note-drawer.test.tsx`

## Interfaces

- **Consome:** `ERRO_TEXTO_INVALIDO`, `AVISO_CONFLITO` (`string`) de `@/features/training-notes/lib/note-messages` (task-02); `formatarDataCurta(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); `diaDaSemana(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); `mensagemDeFalha(error: unknown): string` de `@/features/training-notes/lib/note-messages` (task-02); existentes, sem task: `useCreateNote()`, `useUpdateNote()` e `NOTA_JA_EXISTE_CODE` de `../api/use-training-notes`, `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter` de `@/components/ui/sheet`, `ApiError` de `@/lib/errors`
- **Produz:** `interface NoteDrawerProps { open: boolean; date: string | null; feriadoNome?: string; initialTexto?: string; onOpenChange: (open: boolean) => void; onRequestDelete: (date: string) => void; onCloseAutoFocus: (event: Event) => void }`; `NoteDrawer(props: NoteDrawerProps)` em `features/training-notes/ui/training-note-drawer.tsx`

### Skills a invocar

- `zod`: o `notaSchema` do formulário (`trim`, 1 a 500 caracteres) com `zodResolver`.
- `tanstack-query-best-practices`: `useCreateNote`/`useUpdateNote` com `mutateAsync` e `isPending`; as mutations já invalidam `["training-notes"]`.
- `wcag-audit-patterns`: label ligado ao textarea, erro com `role="alert"`, aviso com `role="status"`, título e descrição do `Sheet`.
- `vercel-composition-patterns`: corpo do formulário em subcomponente com `key={date}`, sem proliferar props booleanas.
- `vercel-react-best-practices`: sem estado derivado redundante.
- `test-antipatterns`: msw real; nenhuma asserção sobre mocks do próprio componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (seção "Gaveta de edição"; norte, não pixel final)
- **Fonte de design original:** nenhuma; layout definido por mockup do companion a partir de um screenshot do estado atual
- **Confirmar com o usuário:** não há fonte de design original (a spec registra "nenhuma"); só reabrir a pergunta se o usuário trouxer uma
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` (abrir `/calendario`, capturar screenshot e comparar com o norte); sem ferramenta de design-to-code
- **Decisões visuais já tomadas (não refazer):** `Sheet` à direita, pela base abaixo de 768px; título com a data, subtítulo com dia da semana e feriado; rótulo "Nota do treino", textarea mono com contador `n/500`; rodapé Salvar (primário), Cancelar (outline), Excluir (destrutivo, só em edição), Repetir (outline, só após erro de rede); só tokens semânticos do tema "Noite neon"; sem `rounded-full`/`rounded-[Npx]`; ícones só de `@/components/ui/pixel-icons`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual` acima. Não há fonte de design original: construir contra o mockup curado e o tema real (tokens em `apps/frontend/src/app/globals.css`), usando `playwright-cli` para conferir a tela `/calendario` quando a gaveta estiver ligada (task-06). Não bloqueia.

- **Step 1: Write the failing tests**

`training-note-drawer.test.tsx`: `vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))`; `renderWithProviders` de `@/test/render`; `server`, `endpoint`, `instalarNotasMock` do msw de teste. Helper `renderGaveta(props?: Partial<NoteDrawerProps>)` com padrão `open date="2026-10-16" onOpenChange={fn} onRequestDelete={fn} onCloseAutoFocus={fn}`. Para criar e atualizar, `server.use` com `http.post(endpoint("/training-notes"))` (201, corpo `{ id, data, texto, atualizadoEm }`) e `http.put(endpoint("/training-notes/:date"))` (200, mesmo corpo) que registram `params`/corpo em um `vi.fn()`.

```tsx
test("AC-06 abre com o título da data e o texto atual da nota", async () => {
	renderGaveta({ initialTexto: "Peito + tríceps 4x12" })
	expect(await screen.findByRole("heading", { name: "16 de outubro" })).toBeInTheDocument()
	expect(screen.getByLabelText("Nota do treino")).toHaveValue("Peito + tríceps 4x12")
	expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
})

test("AC-06 ao criar abre com o campo vazio e sem Excluir", async () => {
	renderGaveta()
	expect(await screen.findByLabelText("Nota do treino")).toHaveValue("")
	expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
})

test("AC-07 salvar cria a nota no modo criar, avisa e fecha", async () => {
	const { criou } = registrarSalvamento()
	const onOpenChange = vi.fn()
	const user = userEvent.setup()
	renderGaveta({ onOpenChange })
	await user.type(await screen.findByLabelText("Nota do treino"), "Peito + tríceps 4x12")
	await user.click(screen.getByRole("button", { name: "Salvar" }))
	await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
	expect(criou).toHaveBeenCalledWith({ data: "2026-10-16", texto: "Peito + tríceps 4x12" })
	expect(toast.success).toHaveBeenCalledWith("Nota salva.")
})

test("AC-07 salvar atualiza a nota no modo editar, avisa e fecha", async () => {
	const { atualizou } = registrarSalvamento()
	const onOpenChange = vi.fn()
	const user = userEvent.setup()
	renderGaveta({ initialTexto: "antigo", onOpenChange })
	const campo = await screen.findByLabelText("Nota do treino")
	await user.clear(campo)
	await user.type(campo, "novo")
	await user.click(screen.getByRole("button", { name: "Salvar" }))
	await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
	expect(atualizou).toHaveBeenCalledWith("2026-10-16", expect.objectContaining({ texto: "novo" }))
	expect(toast.success).toHaveBeenCalledWith("Nota atualizada.")
})

test("texto vazio mostra 'Escreva de 1 a 500 caracteres' e nada é enviado", async () => {
	const { criou, atualizou } = registrarSalvamento()
	const onOpenChange = vi.fn()
	const user = userEvent.setup()
	renderGaveta({ onOpenChange })
	await user.click(await screen.findByRole("button", { name: "Salvar" }))
	expect(await screen.findByRole("alert")).toHaveTextContent("Escreva de 1 a 500 caracteres")
	expect(criou).not.toHaveBeenCalled()
	expect(atualizou).not.toHaveBeenCalled()
	expect(onOpenChange).not.toHaveBeenCalledWith(false)
})

test("o contador mostra n/500 enquanto digita", async () => {
	const user = userEvent.setup()
	renderGaveta()
	await user.type(await screen.findByLabelText("Nota do treino"), "abc")
	expect(screen.getByText("3/500")).toBeInTheDocument()
})

test("rede falha mantém o rascunho com Repetir visível", async () => {
	vi.mocked(toast.error).mockClear()
	instalarNotasMock({ criacaoComErroDeRede: true })
	const user = userEvent.setup()
	renderGaveta()
	await user.type(await screen.findByLabelText("Nota do treino"), "Costas 5x5")
	await user.click(screen.getByRole("button", { name: "Salvar" }))
	expect(await screen.findByText(/sem conexão/i)).toBeInTheDocument()
	expect(screen.getByLabelText("Nota do treino")).toHaveValue("Costas 5x5")
	expect(screen.getByRole("button", { name: "Repetir" })).toBeInTheDocument()
	expect(toast.error).toHaveBeenCalledWith("Sem conexão — tente de novo")
})

test("Excluir pede a exclusão sem apagar nem fechar", async () => {
	const apagou = vi.fn()
	server.use(http.delete(endpoint("/training-notes/:date"), () => {
		apagou()
		return new HttpResponse(null, { status: 204 })
	}))
	const onRequestDelete = vi.fn()
	const onOpenChange = vi.fn()
	const user = userEvent.setup()
	renderGaveta({ initialTexto: "x", onRequestDelete, onOpenChange })
	await user.click(await screen.findByRole("button", { name: "Excluir" }))
	expect(onRequestDelete).toHaveBeenCalledWith("2026-10-16")
	expect(apagou).not.toHaveBeenCalled()
	expect(onOpenChange).not.toHaveBeenCalledWith(false)
})

test("o subtítulo mostra o dia da semana e o feriado", async () => {
	const { unmount } = renderGaveta({ date: "2026-10-12", feriadoNome: "Nossa Senhora Aparecida" })
	expect(await screen.findByText("segunda-feira · Nossa Senhora Aparecida")).toBeInTheDocument()
	unmount()
	renderGaveta({ date: "2026-10-16" })
	expect(await screen.findByText("sexta-feira")).toBeInTheDocument()
})
```

`registrarSalvamento()` é um helper do arquivo de teste:

```tsx
function registrarSalvamento() {
	const criou = vi.fn()
	const atualizou = vi.fn()
	server.use(
		http.post(endpoint("/training-notes"), async ({ request }) => {
			const corpo = (await request.json()) as { data: string; texto: string }
			criou(corpo)
			return HttpResponse.json({ id: "n1", ...corpo, atualizadoEm: "2026-10-16T12:00:00.000Z" }, { status: 201 })
		}),
		http.put(endpoint("/training-notes/:date"), async ({ request, params }) => {
			const corpo = (await request.json()) as { texto: string }
			atualizou(params.date, corpo)
			return HttpResponse.json({ id: "n1", data: String(params.date), texto: corpo.texto, atualizadoEm: "2026-10-16T12:00:00.000Z" })
		}),
	)
	return { criou, atualizou }
}
```

- **Step 2: Review Focus: Salvar na gaveta com 409 (nota já existe) troca para edição com o aviso e mantém o texto digitado, sem fechar — Write the failing test**

```tsx
test("Review Focus: 409 troca para edição com o aviso e mantém o texto digitado, sem fechar", async () => {
	vi.mocked(toast.error).mockClear()
	instalarNotasMock({ forcar409NaCriacao: true })
	const onOpenChange = vi.fn()
	const user = userEvent.setup()
	renderGaveta({ onOpenChange })
	await user.type(await screen.findByLabelText("Nota do treino"), "Peito + tríceps 4x12")
	await user.click(screen.getByRole("button", { name: "Salvar" }))
	expect(await screen.findByRole("status")).toHaveTextContent("Esse dia já tem nota — edite a atual")
	expect(screen.getByLabelText("Nota do treino")).toHaveValue("Peito + tríceps 4x12")
	expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument() // virou modo editar
	expect(onOpenChange).not.toHaveBeenCalledWith(false)
	expect(toast.error).not.toHaveBeenCalled()
})
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-note-drawer.test.tsx`
Expected: FAIL: o módulo `./training-note-drawer` não existe (`NoteDrawer` não definido).

- **Step 4: Implement `NoteDrawer(props: NoteDrawerProps)` in `apps/frontend/src/features/training-notes/ui/training-note-drawer.tsx`**

`"use client"`. Portar a lógica do formulário de `training-note-modal.tsx` (o arquivo existe até a task-07), trocando `Dialog` por `Sheet`:

- `Sheet open onOpenChange`; `SheetContent` com `onCloseAutoFocus={onCloseAutoFocus}` (o botão X do `SheetContent` permanece, `showCloseButton` padrão). Lado: direita a partir de 768px e pela base abaixo de 768px, por classes responsivas do Tailwind em `SheetContent` (sem hook de breakpoint, se as classes bastarem; a verificação é visual no QA, AC-16 da task-06).
- Título (`SheetTitle`) = `formatarDataCurta(date)`; descrição (`SheetDescription`) = `diaDaSemana(date)` + `" · " + feriadoNome` quando houver. `date === null` não renderiza o corpo.
- Corpo em subcomponente com `key={date}` para reiniciar o formulário ao trocar de dia. `react-hook-form` + `zodResolver` com o schema exato: `z.object({ texto: z.string().trim().min(1, ERRO_TEXTO_INVALIDO).max(500, ERRO_TEXTO_INVALIDO) })`.
- Campo: `Label` "Nota do treino" com `htmlFor="nota-treino-texto"`, `textarea` `id="nota-treino-texto"` (`maxLength={500}`, mono), erro de validação em `<p role="alert" id="nota-treino-erro">`, contador `{n}/500` (valor atual do campo).
- `modo` inicial: "editar" se `initialTexto` não for vazio, senão "criar". Salvar: criar -> `createNote.mutateAsync({ data: date, texto })`, editar -> `updateNote.mutateAsync({ data: date, texto })`. Sucesso: `toast.success("Nota salva.")` (criar) ou `toast.success("Nota atualizada.")` (editar) e `onOpenChange(false)`.
- Erro ao salvar: 409 (status 409 ou `code === NOTA_JA_EXISTE_CODE`) -> `modo = "editar"` e aviso `AVISO_CONFLITO` em `<p role="status">`, sem toast, sem fechar, rascunho mantido. Outro erro -> `erroSalvar = mensagemDeFalha(error)` exibido junto ao campo e `toast.error(erroSalvar)`; o botão "Repetir" (`form.handleSubmit(salvar)()`) aparece só enquanto `erroSalvar !== null` e mantém o rascunho.
- Rodapé (`SheetFooter`): `Button` Salvar (primário, `type="submit"`, desabilitado enquanto `createNote.isPending || updateNote.isPending`), Cancelar (outline, `onOpenChange(false)`), Repetir (outline, condicional), Excluir (`variant="destructive"`, só em editar, `onClick={() => onRequestDelete(date)}`; não usa `useDeleteNote`).
- Biome: complexidade cognitiva máxima 5; extraia `persistirNota` e `tratarErroSalvar` como no modal.

- **Step 5: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-note-drawer.test.tsx`
Expected: PASS: 9 testes.

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/training-notes/ui/training-note-drawer.tsx apps/frontend/src/features/training-notes/ui/training-note-drawer.test.tsx
git commit -m "feat(training-notes): gaveta de criacao e edicao de nota"
```

## Critérios de Sucesso

- AC-06 [unit]: WHEN o usuário aciona "Editar" ou "Adicionar nota" THEN a gaveta abre com o título da data e o texto atual da nota (vazio ao criar)
- AC-07 [unit]: WHEN o usuário salva na gaveta THEN a nota é criada ou atualizada pelas mutations existentes, a gaveta fecha e painel, marcador e lista mostram o novo texto
- Conflito 409, erro de rede com "Repetir" e texto vazio se comportam como no modal, com as mesmas mensagens (FR-012); a gaveta pede a exclusão por `onRequestDelete` sem conhecer a mutation.
- Abaixo de 768px a gaveta abre pela base (FR-017; conferência visual na task-06).
