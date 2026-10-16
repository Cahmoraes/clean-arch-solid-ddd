# Task 7: UI do calendário com notas e fidelidade visual [FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010]

**Status:** PENDING

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Conecta a camada de dados ao calendário: célula com barrinha e losango, modal criar/editar/excluir com confirmação e rascunho em falha, sidebar agrupada por semana e painéis de loading/erro independentes entre feriados e notas.

## Arquivos

- Create: `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx`
- Create: `apps/frontend/src/features/training-notes/ui/training-notes-list.tsx`
- Modify: `apps/frontend/src/features/calendario/ui/monthly-calendar.tsx`
- Modify: `apps/frontend/src/app/calendario/page.tsx` (confirmar path: é o `page.tsx` da rota `calendario` existente)
- Test: `apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx`
- Test: `apps/frontend/src/features/training-notes/ui/training-notes-calendar.test.tsx`

## Interfaces

- **Consome:** `trainingNotesQueryKey(year: number, month: number): readonly ["training-notes", number, number]` (task-06); `useTrainingNotesQuery(year: number, month: number): UseQueryResult<TrainingNoteDTO[], ApiError>` (task-06); `useCreateNote(): UseMutationResult<NotaCriada, ApiError, { data: string; texto: string }>` (task-06); `useUpdateNote(): UseMutationResult<NotaAtualizada, ApiError, { data: string; texto: string }>` (task-06); `useDeleteNote(): UseMutationResult<void, ApiError, { data: string }>` (task-06); `mesBounds(year: number, month: number): { de: string; ate: string }` (task-06)
- **Produz:** N/A

### Skills a invocar

- `tanstack-query-best-practices`: consumo do cache mensal na célula e na sidebar sem fetch próprio
- `typescript-advanced`: props do modal e da lista tipadas
- `test-antipatterns`: testes de UI com MSW, sem acoplar a detalhe de implementação
- `vercel-react-best-practices`: composição da célula e estados independentes de loading/erro
- `wcag-audit-patterns`: `aria-label` do dia, foco de volta ao dia, `aria-live` na lista

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/notas-treino-calendario-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma aplicável neste ambiente (construir manualmente a partir do mockup)
- **Decisões visuais já tomadas (não refazer):** célula com barrinha ciano + losango; modal abaixo do calendário com Salvar/Cancelar/Excluir; sidebar com dias com nota; coexistência com feriado e hoje; tokens accent `#3ee0ff`, primary hoje, warning feriado; VT323/Inter/JetBrains Mono

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler `### Fidelidade Visual` acima e o mockup em `../specs/mockups/notas-treino-calendario-visual.md`; confirmar com o usuário se existe fonte de design original além do mockup curado. Sem fonte ou ferramenta adicional, construir manualmente a partir do mockup, reutilizando layout, spacing e tokens decididos sem re-derivá-los. "Sem fonte / sem ferramenta" é resposta válida e leva à implementação manual.

- **Step 1: Write the failing test**

  ```tsx
  import CalendarioPage from "@/app/calendario/page"; // confirmar path: é o page.tsx da rota calendario existente

  test("AC-01 salvar a nota exibe a barrinha e inclui o dia na lista da semana", async () => {
    renderWithProviders(<CalendarioPage />);
    await user.click(await screen.findByRole("button", { name: /16 de outubro/ }));
    await user.type(screen.getByLabelText(/nota do treino/), "Peito + tríceps 4x12");
    await user.click(screen.getByRole("button", { name: /salvar/ }));
    expect(await screen.findByTestId("nota-bar-2026-10-16")).toBeInTheDocument();
    expect(screen.getByText(/semana.*16 de outubro/)).toBeInTheDocument();
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: FAIL — modal de nota não abre (célula sem wiring de criação).

- **Step 3: Implement barrinha+losango na `DayCell`, wiring criar/editar em `page.tsx` e `training-note-modal.tsx` nos arquivos da task**

  Pinos: confirmar no repo os paths exatos de `monthly-calendar.tsx` (o arquivo que exporta `MonthlyCalendarProps`) e do `page.tsx` da rota `calendario` antes de editar; prop opcional `notas` em `monthly-calendar.tsx` (`DayCell` segue privado, estendido por dentro); modal com RHF+zod `texto.trim().max(500)` (o `min(1)` e o bloqueio sem request vêm no Step 15) e props `{ open: boolean; date: string | null; initialTexto?: string; onOpenChange: (open: boolean) => void }`; clique em dia vazio cria, clique na nota edita; `aria-label` do dia com resumo da nota e foco de volta ao dia ao fechar. Estados de loading/erro ainda compartilhados com feriados (a independência vem no Step 27). Coexistência com feriado/hoje e exclusão vêm nos Steps 7 e 11.

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: PASS (teste AC-01).

- **Step 5: Write the failing test**

  ```tsx
  test("AC-02 dia com nota e feriado mostra o nome do feriado mais a nota", async () => {
    renderWithProviders(<CalendarioPage />);
    const cell = await screen.findByRole("button", { name: /12 de outubro/ });
    expect(cell).toHaveTextContent(/Nossa Senhora Aparecida/);
    expect(cell.querySelector('[data-testid="nota-bar-2026-10-12"]')).toBeInTheDocument();
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: FAIL — célula com nota esconde o nome do feriado (ou vice-versa).

- **Step 7: Implement coexistência feriado+nota na `DayCell` no arquivo da task**

  Pino: manter os destaques de hoje e feriado; a nota entra como barrinha ciano com ellipsis + losango sem remover nada existente.

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: PASS.

- **Step 9: Write the failing test**

  ```tsx
  test("AC-03 confirmar a exclusão some a nota da célula e da lista", async () => {
    renderWithProviders(<CalendarioPage />);
    await user.click(await screen.findByTestId("nota-bar-2026-10-16"));
    await user.click(screen.getByRole("button", { name: /excluir/ }));
    await user.click(screen.getByRole("button", { name: /confirmar/ }));
    await waitFor(() => expect(screen.queryByTestId("nota-bar-2026-10-16")).not.toBeInTheDocument());
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: FAIL — botão Excluir não existe no modal.

- **Step 11: Implement exclusão com `AlertDialog` e `training-notes-list.tsx` nos arquivos da task**

  Pinos: `AlertDialog` (`AlertDialogAction` destructive + `AlertDialogCancel` outline); toasts sonner; sidebar com dias com nota do mês agrupados por semana via `getSemanaDoMes`, derivados do cache mensal; `aria-live` onde a lista muda.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: PASS.

- **Step 13: Write the failing test**

  ```tsx
  test("AC-04 texto vazio mostra erro e nada é apagado", async () => {
    renderWithProviders(<CalendarioPage />);
    await user.click(await screen.findByTestId("nota-bar-2026-10-16"));
    await user.clear(screen.getByLabelText(/nota do treino/));
    await user.click(screen.getByRole("button", { name: /salvar/ }));
    expect(await screen.findByText(/1 a 500 caracteres/)).toBeInTheDocument();
    expect(screen.getByLabelText(/nota do treino/)).toBeInTheDocument();
    expect(screen.getByTestId("nota-bar-2026-10-16")).toBeInTheDocument();
  });
  ```

- **Step 14: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: FAIL — salvar vazio fecha o modal (ou dispara request).

- **Step 15: Implement bloqueio de texto vazio no modal no arquivo da task**

  Pino: acrescenta `.min(1)` ao schema e valida em RHF+zod antes de qualquer request; modal permanece aberto com o digitado; nada é gravado nem apagado.

- **Step 16: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: PASS.

- **Step 17: Review Focus: 409 na criação → modal sugere editar em vez de erro genérico — Write the failing test**

  ```tsx
  test("409 na criação troca o modal para edição com aviso", async () => {
    renderWithProviders(<CalendarioPage />);
    await user.click(await screen.findByRole("button", { name: /16 de outubro/ }));
    await user.type(screen.getByLabelText(/nota do treino/), "Peito + tríceps 4x12");
    await user.click(screen.getByRole("button", { name: /salvar/ }));
    expect(await screen.findByText(/já tem nota.*edite/i)).toBeInTheDocument();
    expect(screen.queryByText(/algo deu errado/i)).not.toBeInTheDocument();
  });
  ```

- **Step 18: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: FAIL — 409 cai em erro genérico (modo edição com aviso ausente).

- **Step 19: Implement troca para modo edição no 409 no arquivo da task**

  Pino: `code`/status 409 do hook (task-06) troca o modal para edição com o aviso, sem erro genérico.

- **Step 20: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: PASS.

- **Step 21: Write the failing test**

  ```tsx
  test("AC-06 rede falha mantém o rascunho com retry visível", async () => {
    server.use(http.post(endpoint("/training-notes"), () => HttpResponse.error())); // override MSW só neste teste, mesmo server dos testes de frontend
    renderWithProviders(<CalendarioPage />);
    await user.click(await screen.findByRole("button", { name: /17 de outubro/ }));
    await user.type(screen.getByLabelText(/nota do treino/), "Costas 5x5");
    await user.click(screen.getByRole("button", { name: /salvar/ }));
    expect(await screen.findByText(/sem conexão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nota do treino/)).toHaveValue("Costas 5x5");
    expect(screen.getByRole("button", { name: /repetir/ })).toBeInTheDocument();
  });
  ```

- **Step 22: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: FAIL — falha de rede fecha o modal e perde o digitado.

- **Step 23: Implement rascunho mantido com botão Repetir no modal no arquivo da task**

  Pino: em falha da mutation o modal permanece aberto com o texto, toast `toast.error` e botão Repetir que re-dispara a mutation.

- **Step 24: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
  Expected: PASS.

- **Step 25: Write the failing test**

  ```tsx
  test("AC-09 feriados falham e as notas seguem visíveis com retry nos feriados", async () => {
    server.use(http.get("*brasilapi*", () => HttpResponse.error())); // feriados continuam frontend-only via BrasilAPI; override só neste teste
    renderWithProviders(<CalendarioPage />);
    expect(await screen.findByTestId("nota-bar-2026-10-16")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar de novo.*feriados/i })).toBeInTheDocument();
  });
  ```

- **Step 26: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: FAIL — erro de feriados esconde as notas (painéis acoplados).

- **Step 27: Implement estados independentes de loading/erro entre feriados e notas em `page.tsx`**

  Pino: painel de notas opera normalmente quando a query de feriados falha ou volta vazia; painel de feriados mostra retry ou vazio.

- **Step 28: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
  Expected: PASS (todos os testes do arquivo).

## Critérios de Sucesso

- AC-01 [int]: WHEN o usuário salva a nota do dia THEN a célula exibe a barrinha e a lista da semana inclui o dia · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
- AC-02 [int]: WHEN o dia com nota também é feriado THEN a célula mostra o nome do feriado mais a nota · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
- AC-03 [int]: WHEN o usuário confirma a exclusão THEN a nota some da célula e da lista · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
- AC-04 [int]: WHEN o usuário tenta salvar o texto vazio THEN o modal mostra erro e nada é apagado · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
- AC-06 [int]: WHEN a rede falha ao salvar THEN o rascunho é mantido com retry visível · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-note-modal.test.tsx`
- AC-09 [int]: WHEN a leitura de feriados falha ou volta vazia THEN as notas do mês seguem visíveis com retry no painel de feriados · Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
- 409 na criação troca o modal para edição com aviso, sem erro genérico (Review Focus)
- Fidelidade ao mockup: barrinha ciano + losango, accent `#3ee0ff`, coexistência com feriado e hoje, foco de volta ao dia, `aria-label` e `aria-live`
