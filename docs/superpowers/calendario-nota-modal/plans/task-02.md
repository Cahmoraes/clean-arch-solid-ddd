# Task 2: Criar o NoteModal com ações só com ícone

**Status:** PENDING

**PRD:** N/A

**Spec:** `../specs/calendario-nota-modal-design.md`

**Tier:** capable

## Visão Geral

Cria o `NoteModal`, um `Dialog` centralizado que cria, edita e exclui a nota do dia, com o mesmo comportamento do `NoteDrawer` atual (validação, erros, mutações) e com Salvar, Cancelar e Excluir como botões só com ícone. O `NoteDrawer` continua existindo até a task seguinte trocar a página.

## Arquivos

- Create: `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx`
- Test: `apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx`
- Referência (não alterar): `apps/frontend/src/features/training-notes/ui/training-note-drawer.tsx` e `training-note-drawer.test.tsx`

## Interfaces

- **Consome:** `export const Save: PixelIcon` de `@/components/ui/pixel-icons` (task-01); já existentes: `X` e `Trash2` do mesmo módulo, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` de `@/components/ui/dialog`, `Tooltip`, `TooltipTrigger`, `TooltipContent` de `@/components/ui/tooltip`, `Button` (`size="icon"`) de `@/components/ui/button`, `useCreateNote(): UseMutationResult<NotaCriada, ApiError, UpsertNoteInput>` e `useUpdateNote(): UseMutationResult<NotaAtualizada, ApiError, UpsertNoteInput>` de `../api/use-training-notes`, e de `../lib/note-messages`: `ERRO_TEXTO_INVALIDO`, `AVISO_CONFLITO`, `formatarDataCurta`, `mensagemDeFalha`
- **Produz:**
  - `export interface NoteModalProps { open: boolean; date: string | null; feriadoNome?: string; initialTexto?: string; onOpenChange: (open: boolean) => void; onRequestDelete: (date: string) => void; onCloseAutoFocus: (event: Event) => void }` (mesmas props do `NoteDrawerProps`)
  - `export function NoteModal(props: NoteModalProps): JSX.Element`

### Skills a invocar

- `vercel-composition-patterns`: a regra dos botões de ação (ícone, `aria-label`, tooltip) deve ser um pequeno componente interno reutilizado pelos três botões, sem proliferar props booleanas.
- `wcag-audit-patterns`: botões só com ícone precisam de nome acessível, foco inicial previsível e retorno de foco.
- `zod`: reaproveitar o `notaSchema` (`texto` com `trim`, mínimo 1, máximo 500) do drawer.
- `typescript-advanced`: tipar o componente interno de ação e as props sem `any`.
- `test-antipatterns`: testar o comportamento visível (papel, nome, foco, mensagens), nunca detalhes de implementação ou mocks.
- `no-workarounds`: foco e tooltip resolvidos pelas props do Radix, sem `setTimeout`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-nota-modal-visual.md` (baseline de layout, espaçamento, hierarquia e tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma de design-to-code configurada; `playwright-cli` pode tirar screenshot do modal para conferência manual. Sem isso, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** modal centralizado (`DialogContent`, largura padrão `max-w-lg`); título com a data e subtítulo "dia da semana · feriado" exatamente como o `NoteDrawer` já exibe; rótulo "Nota do treino", textarea de 6 linhas com contador `n/500`; fileira de ações alinhada à esquerda com gap de 8px, na ordem Salvar (`variant="primary"`, ícone `Save`), Cancelar (`variant="outline"`, ícone `X`), Repetir (texto, só após falha de salvar), Excluir (`variant="destructive"`, ícone `Trash2`, só em modo edição); botões `size="icon"` com ícones `h-4 w-4` e `aria-hidden`

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas registradas em `### Fidelidade Visual`. Confirme com o usuário se existe fonte de design original; se não houver, construa contra o mockup curado em `../specs/mockups/calendario-nota-modal-visual.md`. O mockup é o norte: reaproveite layout, espaçamento e tokens decididos.

- **Step 1: Write the failing tests**

Em `training-note-modal.test.tsx`, copie o esqueleto de `training-note-drawer.test.tsx` (helper de render com `renderWithProviders`, `instalarNotasMock`, mock de `sonner`), trocando `NoteDrawer` por `NoteModal` e o helper `renderGaveta` por `renderModal`. Testes (descrições em PT-BR, `test`, não `it`), data de exemplo `"2026-10-16"`:

```tsx
test("AC-02 abre em modo edição com o texto completo no campo e o foco inicial no campo", async () => {
	const texto = "treino com os irmãos ".repeat(14).trim()
	renderModal({ initialTexto: texto })
	expect(await screen.findByRole("dialog")).toBeInTheDocument()
	const campo = screen.getByLabelText("Nota do treino")
	expect(campo).toHaveValue(texto)
	expect(campo).toHaveFocus()
	expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
})
test("AC-03 ao criar abre vazio e sem o botão Excluir", async () => {
	renderModal({})
	await screen.findByRole("dialog")
	expect(screen.getByLabelText("Nota do treino")).toHaveValue("")
	expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
})
test("AC-04 salvar com texto válido grava a nota e fecha o modal", ...) // onOpenChange chamado com false; copie o fluxo "salvar cria" do drawer
test("AC-04 Cancelar fecha sem gravar", ...)                             // onOpenChange(false) e nenhuma requisição de gravação
test("AC-05 Excluir pede a exclusão sem apagar nem fechar", ...)        // onRequestDelete com "2026-10-16", onOpenChange sem false
test("AC-06 Salvar, Cancelar e Excluir são botões só com ícone com nome acessível exato", async () => {
	renderModal({ initialTexto: "x" })
	for (const nome of ["Salvar", "Cancelar", "Excluir"]) {
		const botao = await screen.findByRole("button", { name: nome })
		expect(botao.textContent).toBe("")
		expect(botao.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
	}
})
test("AC-06 cada ação mostra tooltip com o mesmo texto", async () => {
	// para Salvar, Cancelar e Excluir: user.hover(botão) e expect(await screen.findByRole("tooltip")).toHaveTextContent(nome); user.unhover antes do próximo
})
test("AC-06 Repetir continua texto e aparece só após falha de rede ao salvar", ...) // botão com texto "Repetir"
```

Falhas (AC-08), reaproveitando os fluxos e o mock do drawer (`criacaoComErroDeRede`, `forcar409NaCriacao`):

```tsx
test("AC-08 texto vazio mostra 'Escreva de 1 a 500 caracteres' e não envia", ...)
test("AC-08 conflito 409 passa para modo edição com o aviso", ...)      // status "Esse dia já tem nota — edite a atual", Excluir aparece, texto mantido
test("AC-08 falha de rede mantém o texto e oferece Repetir", ...)       // "Sem conexão — tente de novo"
test("AC-08 nota não encontrada (404) mostra o aviso", ...)             // "Nota não encontrada — recarregue o mês"; force o 404 como os demais testes forçam erros (handler MSW via `server.use` e `endpoint`)
```

O rótulo "AC-xx" fica no nome do teste.

- **Step 2: Review Focus: texto de exatamente 500 caracteres salva e o de 501 é recusado**

```tsx
test("Review Focus: texto de 500 caracteres salva e o de 501 é recusado", async () => {
	// 501 caracteres: Salvar -> role="alert" com "Escreva de 1 a 500 caracteres", nenhuma requisição
	// 500 caracteres exatos: Salvar grava e onOpenChange(false)
})
```

- **Step 3: Review Focus: ao abrir, o foco está no campo e nenhum tooltip abre sozinho**

```tsx
test("Review Focus: ao abrir o modal o foco está no campo e nenhum tooltip está aberto", async () => {
	renderModal({ initialTexto: "x" })
	await screen.findByRole("dialog")
	expect(screen.getByLabelText("Nota do treino")).toHaveFocus()
	expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
Expected: FAIL, não há módulo `./training-note-modal` nem `NoteModal`.

- **Step 5: Implement `NoteModal` in `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx`**

Assinatura: `export function NoteModal(props: NoteModalProps): JSX.Element`, com `NoteModalProps` conforme `## Interfaces`. Parta da estrutura do `NoteDrawer` (esquema `notaSchema`, `LIMITE_TEXTO = 500`, `CampoTextoNota` com `id="nota-treino-texto"`, contador `n/500` e `role="alert"` do erro, `tratarErroSalvar`, `persistirNota`, `isNotaJaExiste`, `key={date}` no corpo para descartar o rascunho ao trocar de dia), trocando `Sheet*` por `Dialog*`:

- `<Dialog open onOpenChange>` e, só quando `date` não é nulo, `<DialogContent onCloseAutoFocus={props.onCloseAutoFocus} onOpenAutoFocus={...}>` com `DialogHeader`, `DialogTitle` (`formatarDataCurta(date)`) e `DialogDescription` (o mesmo subtítulo do drawer). O `DialogContent` e o X embutido ("Close") não são alterados.
- `onOpenAutoFocus`: impedir o foco padrão (`event.preventDefault()`) e focar o `textarea` de `id="nota-treino-texto"`, para nenhum botão (e nenhum tooltip) receber o foco na abertura.
- Ações: um componente interno `BotaoDeAcao({ rotulo, icone, ...props })` que renderiza `<Tooltip><TooltipTrigger asChild><Button size="icon" aria-label={rotulo} {...props}><Icone className="h-4 w-4" aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{rotulo}</TooltipContent></Tooltip>`. Usado por Salvar (`type="submit"`, `variant="primary"`, `Save`), Cancelar (`variant="outline"`, `X`, fecha com `onOpenChange(false)`), Excluir (`variant="destructive"`, `Trash2`, só em `modo === "editar"`, chama `onRequestDelete(date)`). "Repetir" continua um `Button variant="outline"` com texto, só quando `comErroSalvar`. Todos com `disabled={salvando}`. Container das ações: `flex gap-2`, alinhado à esquerda, ordem Salvar, Cancelar, Repetir, Excluir.
- Sem confirmação ao fechar com texto não salvo: descarta, como o drawer.

- **Step 6: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
Expected: PASS

- **Step 7: Commit** *(só quando `workflow.auto_commit` for true)*

```bash
git add apps/frontend/src/features/training-notes/ui/training-note-modal.tsx apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx
git commit -m "feat(training-notes): criar NoteModal com acoes so com icone"
```

## Critérios de Sucesso

- AC-06 [unit]: WHEN o modal está aberto THEN Salvar, Cancelar e Excluir são botões só com ícone (`Save`, `X`, `Trash2`), com nome acessível exatamente "Salvar", "Cancelar" e "Excluir" e tooltip com o mesmo texto; "Repetir" continua texto
- AC-08 [unit]: WHEN ocorre validação inválida, conflito 409, falha de rede ou 404 ao salvar ou excluir THEN o modal mostra as mensagens da tabela de Falhas e Erros, mantém o texto digitado e oferece "Repetir" na falha de rede
