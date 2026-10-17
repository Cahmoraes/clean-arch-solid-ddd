# Tarefas: Calendário: redesign com painel do dia e gaveta

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

---

## Tarefas

- [ ] 1. Regra pura de dia selecionado → `task-01.md`
- [ ] 2. Diálogo de exclusão de nota e mensagens compartilhadas → `task-02.md`
- [ ] 3. Gaveta de criação e edição de nota → `task-03.md`
- [ ] 4. Lista do mês com feriados e notas → `task-04.md`
- [ ] 5. Painel do dia selecionado → `task-05.md`
- [ ] 6. Página: seleção, painel, gaveta e exclusão → `task-06.md`
- [ ] 7. Atalho de setas seguro e remoção do código antigo → `task-07.md`
- [ ] 8. Célula do dia compacta com marcadores e tooltip → `task-08.md`

## Restrições Globais

- Regras do `AGENTS.md` do frontend: Biome com complexidade cognitiva máxima 5, sem `rounded-full` nem `rounded-[Npx]`, `font-display` com mínimo de 15px, ícones só de `@/components/ui/pixel-icons`, sem `lucide-react`, botão só de ícone com `aria-label`, testes com `test` e descrições em PT-BR.
- Os testes de estilo existentes (`rounded-residue`, `font-display-weight`, `no-lucide`, `crt-scanlines-scope`, `globals-tokens`, `contrast-tokens`, `motion`) continuam passando.
- data do dia (`YYYY-MM-DD`): dia de calendário, sem fuso, o mesmo texto usado em `data-date`, nas notas e nos feriados; "hoje" é o dia local do navegador
- mês de navegação: índice 0-based em `useCalendarNavigation`; a API de notas recebe o mês 1-based (conversão só em `CalendarPage`)
- dia selecionado: pertence ao mês exibido; é derivado de `clickedDate` por `resolveSelectedDay` e um dia clicado em outro mês deixa de valer
- `onSelectDay`: seleciona o dia; não abre a gaveta e não é alternância (clicar de novo no dia selecionado não muda nada)

## Foco de Revisão

- Dia clicado em outro mês, ou mês exibido sem hoje, nunca deixa o painel sem dia: cai em hoje ou no dia 1 → `task-01`
- Salvar na gaveta com 409 (nota já existe) troca para edição com o aviso e mantém o texto digitado, sem fechar → `task-03`
- Excluir pelo painel: o botão "Excluir" some com a nota, e o foco ainda volta ao botão do dia → `task-06`
- Refetch de notas que falha com dados em cache mantém Editar, Adicionar e Excluir e não mostra erro → `task-06`
- Seta esquerda ou direita digitada no textarea da gaveta aberta não troca o mês → `task-07`
