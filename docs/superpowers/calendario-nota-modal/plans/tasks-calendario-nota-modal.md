# Tarefas: Calendário: nota do dia em modal e trecho no painel

**Spec:** `../specs/calendario-nota-modal-design.md`

**PRD:** N/A

---

## Tarefas

- [ ] 1. Adicionar o ícone Save ao conjunto de ícones do projeto → `task-01.md`
- [ ] 2. Criar o NoteModal com ações só com ícone → `task-02.md`
- [ ] 3. Trocar o NoteDrawer pelo NoteModal na página do calendário → `task-03.md`
- [ ] 4. Mostrar a nota como trecho no painel e conter a lista do mês → `task-04.md`

## Restrições Globais

- O projeto não usa lucide (`no-lucide.test.ts` falha o build se `lucide-react` aparecer). Ícones vêm de `src/components/ui/pixel-icons.tsx`, arquivo **gerado** por `apps/frontend/scripts/generate-pixel-icons.mjs`; não se edita à mão.
- Os testes existentes buscam os botões por nome acessível exato (`getByRole("button", { name: "Salvar" })` e equivalentes); esses nomes não mudam.

## Foco de Revisão

- Texto de exatamente 500 caracteres salva e o de 501 é recusado com "Escreva de 1 a 500 caracteres" → `task-02`
- Ao abrir o modal o foco inicial está no campo de texto e nenhum tooltip abre sozinho → `task-02`
- Cancelar a confirmação de exclusão aberta pelo modal devolve o foco ao botão Excluir do modal; confirmar devolve ao botão do dia → `task-03`
- Nota de uma palavra só, longa e sem espaços, é cortada em 3 linhas sem estourar o cartão → `task-04`
