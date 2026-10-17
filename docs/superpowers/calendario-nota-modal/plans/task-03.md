# Task 3: Trocar o NoteDrawer pelo NoteModal na página do calendário

**Status:** PENDING

**PRD:** N/A

**Spec:** `../specs/calendario-nota-modal-design.md`

**Tier:** standard

## Visão Geral

A página do calendário passa a renderizar o `NoteModal` no lugar do `NoteDrawer`, mantendo a estrutura atual (a página continua dona da confirmação de exclusão, do retorno de foco e da guarda das setas). O código e os testes da gaveta são removidos. O painel ainda tem Editar e Excluir nesta task; eles saem na seguinte.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify: `apps/frontend/src/features/calendario-feriados/lib/month-shortcut.ts` (comentário JSDoc que ainda diz "gaveta")
- Modify (test): `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`
- Modify (test): `apps/frontend/src/features/training-notes/ui/training-notes-calendar.test.tsx`
- Delete: `apps/frontend/src/features/training-notes/ui/training-note-drawer.tsx`
- Delete: `apps/frontend/src/features/training-notes/ui/training-note-drawer.test.tsx` (a cobertura migrou para o teste do modal na task anterior)

## Interfaces

- **Consome:** `export function NoteModal(props: NoteModalProps)` e `export interface NoteModalProps { open: boolean; date: string | null; feriadoNome?: string; initialTexto?: string; onOpenChange: (open: boolean) => void; onRequestDelete: (date: string) => void; onCloseAutoFocus: (event: Event) => void }` de `@/features/training-notes/ui/training-note-modal` (task-02)
- **Produz:** N/A

### Skills a invocar

- `no-workarounds`: o retorno de foco já é resolvido por `focusDay`, `deleteOpenerRef` e `focusAfterDialog`; manter esse mecanismo, sem atrasos ou flags novas.
- `wcag-audit-patterns`: retorno de foco ao fechar modal e confirmação, e guarda das setas com sobreposição aberta.
- `test-antipatterns`: asserções sobre papéis, nomes e foco, sem espiar implementação.
- `vercel-react-best-practices`: renomear o estado sem criar re-renders extras.

## Passos

- **Step 1: Write the failing tests**

Em `training-notes-calendar.test.tsx` (usa `renderWithProviders`, `instalarNotasMock`, `userEvent`), acrescente:

```tsx
test("AC-06 pelo calendário o modal da nota tem ações só com ícone", async () => {
	instalarNotasMock()
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^20 de outubro/ }))
	await user.click(await screen.findByRole("button", { name: "Adicionar nota" }))
	await screen.findByRole("dialog")
	expect(screen.getByRole("button", { name: "Salvar" }).textContent).toBe("")
	expect(screen.getByRole("button", { name: "Cancelar" }).textContent).toBe("")
})
test("AC-05 cancelar a confirmação aberta pelo modal devolve o foco ao botão Excluir do modal", async () => {
	// dia com nota (semente de instalarNotasMock) -> abrir o modal por "Editar" do painel -> clicar Excluir no modal
	// -> "Excluir a nota?" (alertdialog) -> Cancelar -> expect(botão Excluir do modal).toHaveFocus() e o dialog do modal segue aberto
})
test("AC-03 Adicionar nota abre o modal vazio, sem o botão Excluir", ...)   // dia sem nota -> "Adicionar nota" -> dialog com campo vazio e sem "Excluir"
test("AC-04 salvar grava e devolve o foco ao botão do dia; Cancelar e Esc também", ...) // test.each para Salvar, Cancelar e Esc; renomeie o "AC-09 o foco volta ao botão do dia ao fechar a gaveta por %s" existente
```

Reaproveite o padrão dos testes "AC-09 ... ao excluir pela gaveta" já existentes no arquivo. Nos demais testes dos dois arquivos (`training-notes-calendar.test.tsx`, `page.test.tsx`) que citam "gaveta" no nome, o helper `abrirGaveta` ou o comentário, renomeie para "modal" / `abrirModal` sem mudar o comportamento verificado: nesta task o painel ainda tem Editar e Excluir, e as setas, o foco e a confirmação continuam testados como hoje.

- **Step 2: Review Focus: confirmar a exclusão feita pelo modal fecha tudo e devolve o foco ao botão do dia**

```tsx
test("Review Focus: confirmar a exclusão feita pelo modal fecha tudo e devolve o foco ao botão do dia", ...)
// dia com nota -> abrir o modal -> Excluir -> confirmar em "Excluir a nota?" -> nenhum dialog aberto e o botão do dia com foco
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
Expected: FAIL, os botões Salvar e Cancelar ainda têm texto (a página renderiza o `NoteDrawer`).

- **Step 4: Trocar o componente em `page.tsx`**

Em `apps/frontend/src/app/(authenticated)/calendario/page.tsx`: troque o import da linha 30 por `import { NoteModal } from "@/features/training-notes/ui/training-note-modal"`; no JSX substitua `<NoteDrawer ... />` por `<NoteModal ... />` com exatamente as mesmas props (`open`, `date={selectedDate}`, `feriadoNome`, `initialTexto`, `onOpenChange`, `onRequestDelete={requestDelete}`, `onCloseAutoFocus` com `event.preventDefault()` e `focusDay(selectedDate)`). Renomeie `drawerOpen`/`setDrawerOpen` para `modalOpen`/`setModalOpen` (inclusive em `overlayOpen = modalOpen || deleteDate !== null` e em `onDeleted`). Não altere `deleteOpenerRef`, `focusAfterDialog`, `requestDelete` nem o `DeleteNoteDialog`. Em `month-shortcut.ts` troque a palavra "gaveta" do JSDoc por "modal".

- **Step 5: Remover o drawer**

Apague `training-note-drawer.tsx` e `training-note-drawer.test.tsx`. Confira que nada mais os referencia:

Run: `grep -rn "NoteDrawer\|training-note-drawer" apps/frontend/src`
Expected: nenhuma saída (código de saída 1).

- **Step 6: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run "src/app/(authenticated)/calendario/page.test.tsx" src/features/training-notes/ui/training-notes-calendar.test.tsx src/features/training-notes/ui/delete-note-dialog.test.tsx src/features/training-notes/ui/training-note-modal.test.tsx`
Expected: PASS

- **Step 7: Commit** *(só quando `workflow.auto_commit` for true)*

```bash
git add -A apps/frontend/src
git commit -m "refactor(calendario): trocar gaveta de nota pelo NoteModal"
```

## Critérios de Sucesso

- AC-03 [unit]: WHEN o dia não tem nota e o usuário aciona "Adicionar nota" THEN abre o mesmo modal vazio, sem o botão Excluir
- AC-04 [unit]: WHEN o usuário salva um texto válido THEN a nota é gravada, o modal fecha e o foco volta ao botão do dia; Cancelar e Esc fecham sem gravar e devolvem o foco ao mesmo botão
- AC-05 [unit]: WHEN o usuário aciona Excluir no modal THEN abre a confirmação "Excluir a nota?"; confirmar exclui, fecha confirmação e modal e devolve o foco ao botão do dia; cancelar a confirmação devolve o foco ao botão Excluir do modal
- AC-09 [unit]: WHEN o modal ou a confirmação de exclusão está aberto THEN as setas esquerda e direita não trocam o mês
