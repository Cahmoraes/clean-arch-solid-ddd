# Task 4: Mostrar a nota como trecho no painel e conter a lista do mês

**Status:** PENDING

**PRD:** N/A

**Spec:** `../specs/calendario-nota-modal-design.md`

**Tier:** standard

## Visão Geral

O painel do dia passa a mostrar a nota como um trecho de 3 linhas, sem rolagem, que é um botão para abrir o modal; Editar e Excluir saem do painel. A lista "No mês" fica contida no cartão, e só ela rola. Isso fecha o defeito da rolagem aninhada reportado com a nota longa.

## Arquivos

- Modify: `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.tsx`
- Modify: `apps/frontend/src/features/calendario-feriados/ui/month-agenda.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx` (prop do painel: `onEdit` vira `onOpenNote`, `onDelete` sai)
- Test: `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.test.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/ui/month-agenda.test.tsx`
- Test: `apps/frontend/src/features/training-notes/ui/training-notes-calendar.test.tsx`

## Interfaces

- **Consome:** `<NoteModal ... onRequestDelete={requestDelete} />` já renderizado por `page.tsx` e o `setModalOpen` da página (task-03)
- **Produz:** `DayDetailPanelProps` com `onOpenNote: () => void` no lugar de `onEdit`, e sem `onDelete`; todo o restante das props inalterado (`date`, `feriado?`, `nota?`, `notasStatus`, `feriadosStatus`, `onRetryNotas`, `onRetryFeriados`, `children?`, `className?`)

### Skills a invocar

- `vercel-composition-patterns`: o bloco da nota continua um subcomponente interno, sem novas props booleanas.
- `wcag-audit-patterns`: o trecho é um `button` cujo nome acessível é o próprio conteúdo (texto da nota e "Ver nota completa"), sem `aria-label` extra.
- `typescript-advanced`: renomear a prop sem deixar `onEdit` ou `onDelete` órfãos nos chamadores.
- `test-antipatterns`: testes por papel e texto; a verificação de layout real fica para a QA no navegador.
- `no-workarounds`: conter a lista pelo layout (`min-h-0` e `overflow-hidden` no cartão do painel), sem alturas fixas mágicas.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-nota-modal-visual.md` (baseline de layout, espaçamento, hierarquia e tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma de design-to-code configurada; `playwright-cli` pode tirar screenshot do painel em 1280, 1440 e 1920 px para conferência manual. Sem isso, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** bloco da nota com fundo de superfície, borda esquerda de 3px em ciano e raio 6px (como hoje); rótulo "Nota do dia"; trecho cortado em 3 linhas com reticências, seguido do link "Ver nota completa" em ciano; sem Editar e Excluir; lista "No mês" contida no cartão com fade no fim, só ela rola

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas registradas em `### Fidelidade Visual`. Confirme com o usuário se existe fonte de design original; se não houver, construa contra o mockup curado em `../specs/mockups/calendario-nota-modal-visual.md`. O mockup é o norte.

- **Step 1: Write the failing tests**

`day-detail-panel.test.tsx` (helper `renderPainel` passa a receber `onOpenNote: vi.fn()` e deixa de passar `onEdit` e `onDelete`). Substitua e acrescente:

```tsx
test("AC-01 a nota longa é cortada em 3 linhas sem rolagem e o texto completo segue no DOM", () => {
	const longo = "treino com os irmãos ".repeat(30).trim()
	renderPainel({ nota: criarNotaMock("2026-10-12", longo) })
	const trecho = screen.getByText(longo)
	expect(trecho).toHaveClass("line-clamp-3")
	expect(trecho).not.toHaveClass("overflow-y-auto")
	expect(trecho).not.toHaveClass("max-h-40")
})
test("AC-02 o painel não tem os botões Editar nem Excluir e o trecho abre a nota", async () => {
	const onOpenNote = vi.fn()
	renderPainel({ nota: criarNotaMock("2026-10-12", "treino"), onOpenNote })
	expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument()
	expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
	await userEvent.click(screen.getByRole("button", { name: /Ver nota completa/ }))
	expect(onOpenNote).toHaveBeenCalledTimes(1)
})
test("Adicionar nota chama onOpenNote", ...)   // dia sem nota: "Nenhuma nota neste dia." + botão "Adicionar nota"
```

Atualize, no mesmo arquivo: o teste "o texto da nota quebra linhas e palavras longas e tem altura limitada com rolagem" (remova as asserções `max-h-40` e `overflow-y-auto`, mantendo `whitespace-pre-line` e `break-words`), "AC-04 dia com feriado e nota mostra os dois blocos com Editar e Excluir" (os dois blocos, sem os botões), "Editar, Excluir e Adicionar nota chamam os callbacks" (só `onOpenNote`) e "erro de feriados mostra a mensagem com retry e mantém a nota editável" (a nota segue acessível pelo trecho).

`month-agenda.test.tsx`, no teste "AC-10 com 30 notas a lista rola por dentro...": troque as asserções por `toHaveClass("overflow-y-auto", "min-h-0", "flex-1")` e `not.toHaveClass("min-h-32")`.

`training-notes-calendar.test.tsx`: os testes que abriam o modal por "Editar" do painel passam a clicar no trecho (`getByRole("button", { name: /Ver nota completa/ })`), e os que excluíam pelo painel passam a excluir pelo Excluir do modal (`AC-05`: o painel não tem mais Excluir). Acrescente:

```tsx
test("AC-02 clicar no trecho da nota abre o modal com o texto completo e o foco no campo", async () => {
	// dia com nota longa -> clicar no botão "Ver nota completa" -> findByRole("dialog"),
	// getByLabelText("Nota do treino") com o texto completo e toHaveFocus()
})
```

- **Step 2: Review Focus: nota de uma palavra só, longa e sem espaços, é cortada em 3 linhas sem estourar o cartão**

```tsx
test("Review Focus: palavra única longa sem espaços fica em 3 linhas e quebra no cartão", () => {
	const palavra = "a".repeat(300)
	renderPainel({ nota: criarNotaMock("2026-10-12", palavra) })
	expect(screen.getByText(palavra)).toHaveClass("line-clamp-3", "break-words")
})
```

- **Step 3: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/day-detail-panel.test.tsx src/features/calendario-feriados/ui/month-agenda.test.tsx`
Expected: FAIL, a nota ainda tem `max-h-40 overflow-y-auto`, o painel ainda renderiza Editar e Excluir e não há botão "Ver nota completa".

- **Step 4: Implementar o trecho e a nova prop em `day-detail-panel.tsx`**

- `DayDetailPanelProps`: troque `onEdit: () => void` por `onOpenNote: () => void` e remova `onDelete`. `BlocoDeNotaComTexto({ nota, onOpenNote }: { nota: TrainingNoteDTO; onOpenNote: () => void })` mantém o contêiner (`flex flex-col gap-1 rounded-md border-l-[3px] border-accent bg-muted px-3 py-2`) e o rótulo "Nota do dia", e no lugar do `<p max-h-40 overflow-y-auto>` e dos botões renderiza um `<button type="button" onClick={onOpenNote}>` sem estilo de botão (alinhado à esquerda, `w-full text-left`) contendo `<span className="line-clamp-3 whitespace-pre-line break-words text-sm">{nota.texto}</span>` e `<span className="mt-1 block text-xs text-accent">Ver nota completa</span>`. Sem `aria-label`: o nome vem do conteúdo.
- `BlocoSemNota({ onAdd })` e o botão "Adicionar nota" ficam como estão, ligados a `onOpenNote`.
- Raiz do painel: `className={cn("min-h-0 gap-4 overflow-hidden", props.className)}` (o `Card` compartilhado em `components/ui/card.tsx` não é alterado).

- **Step 5: Conter a lista em `month-agenda.tsx` e ajustar a página**

Em `month-agenda.tsx`, no contêiner `data-testid="month-agenda-lista"` troque `min-h-32` por `min-h-0`, mantendo `flex-1 overflow-y-auto max-h-80 xl:max-h-none`. Em `page.tsx`: `CalendarContentProps` troca `onEdit` por `onOpenNote` e remove `onDelete`; o painel recebe `onOpenNote={props.onOpenNote}`; no uso de `CalendarContent`, `onOpenNote={() => setModalOpen(true)}`; `requestDelete` continua sendo passado só ao `NoteModal`.

- **Step 6: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/day-detail-panel.test.tsx src/features/calendario-feriados/ui/month-agenda.test.tsx src/features/training-notes/ui/training-notes-calendar.test.tsx "src/app/(authenticated)/calendario/page.test.tsx"`
Expected: PASS

- **Step 7: Commit** *(só quando `workflow.auto_commit` for true)*

```bash
git add -A apps/frontend/src
git commit -m "feat(calendario): nota como trecho no painel e lista do mes contida"
```

## Critérios de Sucesso

- AC-01 [unit]: WHEN a nota do dia tem texto com mais de 3 linhas THEN o painel mostra o trecho cortado em 3 linhas, sem barra de rolagem na nota, e o texto completo continua acessível no DOM
- AC-02 [unit]: WHEN o usuário clica no trecho da nota THEN abre o modal (`role="dialog"`) em modo edição com o texto completo no campo e o foco inicial no campo, e o painel não tem botões Editar nem Excluir
- AC-07 [unverified]: WHEN o dia tem feriado, nota de 500 caracteres e o mês tem muitas notas THEN nada do painel é desenhado fora do cartão e só a lista "No mês" rola · conferência: a QA confere no navegador a 1280, 1440 e 1920 px e em largura de celular
