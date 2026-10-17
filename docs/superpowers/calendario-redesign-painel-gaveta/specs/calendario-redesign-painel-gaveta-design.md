# Calendário: redesign com painel do dia e gaveta: Design

- **Norte visual:** `mockups/calendario-redesign-painel-gaveta-visual.md`

## Visão Geral

A rota `/calendario` mostra um mês por vez, com feriados nacionais e as notas de treino do usuário. Hoje o texto do feriado e da nota é desenhado dentro de cada célula do dia, que fica espremida, e a lateral direita tem dois cards (notas e feriados) que crescem com o número de itens e poluem a tela.

O redesign tem três resultados:

- A célula do dia deixa de carregar texto: mostra o número e marcadores (quadrado âmbar = feriado, losango ciano = nota).
- Um painel à direita mostra o dia selecionado em detalhe (feriado e nota) e, abaixo, uma lista do mês com altura fixa e rolagem interna. A tela não cresce, qualquer que seja o número de notas.
- Criar e editar a nota acontece numa gaveta lateral (o modal atual sai). Clicar em um dia só o seleciona; editar é um segundo clique em "Editar" ou "Adicionar nota".

Sucesso, como o usuário observa: nenhuma célula tem texto espremido, a altura da página não muda com 1 ou 30 notas, e todo o fluxo de notas (criar, editar, excluir) continua funcionando como antes.

Contexto de features anteriores (decisões que este redesign respeita ou substitui estão em Decisões Arquiteturais): `calendario-layout-mes-unico`, `calendario-refinamento-visual`, `calendario-tooltip-feriado` e `notas-treino-calendario` construíram a tela atual; o tema "Noite neon" vem de `replaced-visual-redesign` e `replaced-retro-shapes`.

## Escopo

**Dentro:**

- Célula do dia em modo compacto com marcadores e tooltip (`MonthlyCalendar`).
- Seleção de dia e painel do dia com a lista do mês (feriados e notas juntos, ordem cronológica).
- Gaveta de criação e edição de nota no lugar do modal; confirmação de exclusão compartilhada entre painel e gaveta.
- Regra de seleção padrão e comportamento ao navegar de mês.
- Guarda no atalho de setas esquerda/direita para não trocar de mês durante a edição da nota (D5).
- Reescrita dos testes dos componentes afetados e remoção do código que fica sem uso.

**Fora de escopo:**

- Backend, API, contrato OpenAPI e tipos gerados: o redesign é só frontend e `training-notes` já existe (`notas-treino-calendario`).
- Novas dependências: a gaveta usa o `Sheet` que já existe em `components/ui/sheet.tsx`.
- Cabeçalho da página, navegação de ano, botão Hoje, setas do mês, swipe e `AuthenticatedShell`: ficam como estão (mesma exclusão de `calendario-layout-mes-unico` e `calendario-refinamento-visual`).
- Várias notas por dia, categorias, busca, lembretes e compartilhamento: seguem fora (`notas-treino-calendario`).
- Animação de troca de mês: hoje não há animação disparada; não será adicionada.
- Tooltip só de teclado novo, tokens de tema novos e categorização de feriados por tipo: seguem fora (`calendario-tooltip-feriado`, `calendario-refinamento-visual`).
- Atualizar as evidências de QA antigas em `docs/superpowers/*/qa/evidence/`: são histórico e não rodam na suíte.

**Anti-objetivos:**

- Mover o aperto de lugar: o texto espremido da célula não pode reaparecer num painel que também cresce sem limite.
- Perder acessibilidade: nome acessível do dia, `aria-current`, foco visível, navegação por teclado e `prefers-reduced-motion` não podem regredir.
- Parecer uma agenda de rede social ou mudar a cara do tema "Noite neon".
- Esconder o feriado atrás da nota, ou o contrário: os dois marcadores coexistem.

**Restrições:**

- Regras do `AGENTS.md` do frontend: Biome com complexidade cognitiva máxima 5, sem `rounded-full` nem `rounded-[Npx]`, `font-display` com mínimo de 15px, ícones só de `@/components/ui/pixel-icons`, sem `lucide-react`, botão só de ícone com `aria-label`, testes com `test` e descrições em PT-BR.
- Os testes de estilo existentes (`rounded-residue`, `font-display-weight`, `no-lucide`, `crt-scanlines-scope`, `globals-tokens`, `contrast-tokens`, `motion`) continuam passando.
- Fechamento da tarefa exige `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` sem falhas (`AGENTS.md` da raiz); no frontend o runner é `pnpm --filter frontend test -- --run`.

**Deixado ao construtor:**

- Medidas finais (altura mínima da célula próxima de 68px, largura do painel próxima de 300px, altura máxima da lista no layout empilhado) e o fade no fim da lista.
- Como o painel iguala a altura da grade (grid com `stretch` ou posicionamento interno) e como `Sheet` troca de lado abaixo de 768px (classes responsivas ou hook de breakpoint).
- Textos de estados que o mockup não mostra (lista vazia, carregando) seguindo os textos já existentes nos componentes atuais.
- Se `DayDetailPanel` e `MonthAgenda` ficam em arquivos separados ou no mesmo, desde que a divisão de responsabilidades abaixo seja respeitada.
- Remoção do código morto: `HolidayList`, `TrainingNotesList`, `TrainingNoteModal` e `getSemanaDoMes` quando nada mais os referenciar.

**Lentes fechadas:** atributos de qualidade (sem volume, prazo, dinheiro nem dado pessoal novo; a restrição que importa, acessibilidade, está em Restrições e nas ACs); evolução e rollout (frontend sem contrato vivo, entra com o deploy normal); dados e consistência (nenhum estado persistido novo, só estado de UI); segurança e privacidade (as notas seguem privadas por usuário e a API não muda).

## Arquitetura e Fluxo

O estado da tela continua em `CalendarPage` (`app/(authenticated)/calendario/page.tsx`), que já é dono dos dados (feriados do ano, notas do mês), da navegação de mês e do foco. Ela passa a guardar também o dia selecionado e se a gaveta está aberta; o `modalOpen` atual vira `drawerOpen`.

Fluxo:

1. A página carrega feriados do ano (`useFeriadosQuery`) e notas do mês (`useTrainingNotesQuery`). Cada fonte carrega e falha de forma independente, e a grade renderiza sem esperar nenhuma delas: enquanto os feriados carregam, as células ainda não têm marcador de feriado e o painel e a lista mostram "Carregando feriados" (idem para notas). O esqueleto de página inteira e o `CalendarEmptyState` do ano saem; a mensagem de erro de feriados passa a viver no bloco de erro do painel e da lista (decisão minha). O status de cada fonte é derivado assim: carregando = pendente sem dados; erro = falha sem dados; com dados em cache, inclusive depois de falha de um refetch, o status é ok e as ações de nota continuam disponíveis (decisão minha; uma divergência cai no caminho de conflito 409).
2. O dia selecionado é derivado, não sincronizado por efeito: a página guarda o último dia clicado (`clickedDate`, `string | null`) e os handlers de navegação (mês anterior e próximo, ano anterior e próximo, "Hoje") zeram `clickedDate`. A função pura `resolveSelectedDay` devolve `clickedDate` se ele pertence ao mês exibido; senão devolve hoje (quando o mês exibido contém hoje) ou o dia 1, e serve de rede de segurança para qualquer mudança de mês que não passe por esses handlers (D3).
3. Clicar em uma célula, ou em uma linha da lista do mês, só atualiza o dia clicado. O painel mostra o dia resolvido.
4. "Editar" ou "Adicionar nota" no painel abre `NoteDrawer` para o dia selecionado. Salvar chama as mutations existentes e fecha a gaveta; os dados voltam pelo cache do TanStack Query (as mutations já invalidam `["training-notes"]`), então marcador, painel e lista se atualizam sem estado novo.
5. "Excluir", no painel ou na gaveta, abre `DeleteNoteDialog`. Na gaveta, ela continua aberta por baixo da confirmação. Ao confirmar, a mutation de exclusão roda, a página fecha a gaveta (se aberta) e o painel volta ao estado "sem nota".
6. Ao fechar a gaveta (Cancelar, X, Esc, salvar ou excluir) e ao concluir uma exclusão feita pelo painel, a página devolve o foco ao botão do dia (`button[data-date="YYYY-MM-DD"]`), como o modal faz hoje. É a página, e não o Radix, quem devolve o foco (função `focusDay`, usada por `onCloseAutoFocus` e por `onDeleted`), porque o botão "Excluir" do painel deixa de existir quando a nota some.

Layout: duas colunas a partir de 1280px (grade à esquerda, painel à direita); abaixo disso, uma coluna com o painel depois da grade. O painel iguala a altura da grade a partir de 1280px; empilhado, a lista tem altura máxima própria. A gaveta abre à direita e, abaixo de 768px, pela base (decisão minha, ver D2).

Teclado: cada dia continua sendo um botão com parada própria no Tab, sem roving tabindex (como hoje). Enter e Space selecionam o dia pelo clique nativo do botão. O atalho global de setas esquerda/direita continua trocando de mês, com a guarda de D5.

## Componentes

**`CalendarPage`** (alterado)
- **Responsabilidade:** compor a tela e ser dona do estado de seleção, gaveta, navegação e foco.
- **Interface:** sem props novas (`initialYear?`, `initialMonth?` como hoje). Internamente guarda `clickedDate`, `drawerOpen`, `deleteDate`; entrega `selectedDate` resolvido a `MonthlyCalendar`, `DayDetailPanel` e `MonthAgenda`, e `feriadoNome` do dia à `NoteDrawer`.
- **Oculta:** a regra de seleção derivada (e o zerar de `clickedDate` na navegação), `focusDay` e a devolução do foco depois de fechar a gaveta ou excluir, a guarda do atalho de setas, o mapeamento mês 0-based da navegação para mês 1-based da API de notas.
- **Local:** `app/(authenticated)/calendario/page.tsx`. Já tem `biome-ignore` de complexidade; a extração dos subcomponentes abaixo deve reduzir, não aumentar, essas supressões.
- **Depende de:** `useCalendarNavigation`, `useFeriadosQuery`, `useTrainingNotesQuery`. **Usado por:** o roteador do Next.

**`resolveSelectedDay`** (novo, função pura)
- **Responsabilidade:** decidir qual dia está selecionado.
- **Interface:** `resolveSelectedDay({ clicked: string | null, year: number, monthIndex: number, today: Date }) => string` (`YYYY-MM-DD`). Devolve `clicked` se ele pertence ao mês exibido; senão hoje, se hoje pertence; senão o dia 1.
- **Oculta:** a regra de padrão de seleção e a comparação por dia de calendário (sem fuso, como o resto da tela).
- **Local:** `features/calendario-feriados/lib/resolve-selected-day.ts`, ao lado de `get-feriados-do-mes.ts`.
- **Usado por:** `CalendarPage`.

**`MonthlyCalendar`** (alterado)
- **Responsabilidade:** desenhar o mês e reportar o dia clicado.
- **Interface:** props atuais mais `selectedDate: string`; `onSelectDay(date)` passa a significar "selecionar". Cada célula é um `button` com `data-date`, `aria-current="date"` em hoje, `aria-pressed` no dia selecionado e o mesmo padrão de `aria-label` de hoje (dia, feriado, nota).
- **Oculta:** a prevalência visual (hoje sobre feriado), a forma e a cor dos marcadores, o tooltip (feriado e nota no mesmo tooltip, feriado primeiro) e o anel do dia selecionado. O texto do feriado e da nota sai da célula; o `aria-label` continua sendo onde o resumo do dia é falado.
- **Local:** `features/calendario-feriados/ui/monthly-calendar.tsx`.
- **Usado por:** `CalendarPage`.

**`DayDetailPanel`** (novo)
- **Responsabilidade:** mostrar o dia selecionado e oferecer as ações da nota; hospeda a lista do mês como filho.
- **Interface:** `{ date: string, feriado?: Feriado, nota?: TrainingNoteDTO, notasStatus: "ok" | "carregando" | "erro", feriadosStatus: "ok" | "carregando" | "erro", onEdit(), onDelete(), onRetryNotas(), onRetryFeriados(), children }`.
- **Oculta:** a composição dos blocos (feriado, nota, vazio, erro) e qual deles aparece em cada combinação de estado; esconde Editar/Adicionar/Excluir quando as notas não carregaram (D1, Falhas).
- **Local:** `features/calendario-feriados/ui/day-detail-panel.tsx`, porque `MonthlyCalendar` e a página já tratam notas ao lado de feriados nessa feature (decisão minha).
- **Usado por:** `CalendarPage`.

**`MonthAgenda`** (novo, substitui `HolidayList` e `TrainingNotesList`)
- **Responsabilidade:** listar feriados e notas do mês em uma lista só.
- **Interface:** `{ feriados: Feriado[], notas: TrainingNoteDTO[], selectedDate: string, onSelectDay(date), notasStatus, feriadosStatus, onRetryNotas(), onRetryFeriados() }`.
- **Oculta:** a mescla e a ordem (data crescente, feriado antes da nota no mesmo dia), o visual das linhas por tipo, a rolagem com altura limitada, e os estados de erro, vazio e carregamento independentes por fonte.
- **Local:** `features/calendario-feriados/ui/month-agenda.tsx`.
- **Usado por:** `CalendarPage` (como filho de `DayDetailPanel`).

**`NoteDrawer`** (novo, substitui `TrainingNoteModal`)
- **Responsabilidade:** criar e editar a nota de um dia numa gaveta.
- **Interface:** `{ open, date: string | null, feriadoNome?: string, initialTexto?, onOpenChange, onRequestDelete(date) }`; o dia da semana vem de `date` e o nome do feriado, quando existe, aparece no subtítulo (decisão minha). Usa `Sheet` (`side` à direita; pela base abaixo de 768px) e o foco volta ao botão do dia via `onCloseAutoFocus`.
- **Oculta:** o formulário (`texto` com trim, 1 a 500 caracteres, contador), os modos criar e editar, o tratamento de conflito 409 e de erro de rede com "Repetir" (idênticos ao modal atual, ver Falhas) e a escolha do lado da gaveta.
- **Local:** `features/training-notes/ui/training-note-drawer.tsx`.
- **Depende de:** `useCreateNote`, `useUpdateNote`, `Sheet`. **Usado por:** `CalendarPage`.

**`DeleteNoteDialog`** (novo, extraído do modal)
- **Responsabilidade:** ser o dono da exclusão de uma nota.
- **Interface:** `{ open, date: string | null, onOpenChange, onDeleted() }`. Mostra "Excluir a nota?" com Cancelar e Confirmar.
- **Oculta:** a confirmação, a mutation `useDeleteNote` e o tratamento de 404 (nota já inexistente: avisa para recarregar o mês, como hoje). Painel e gaveta apenas pedem a exclusão; nenhum dos dois conhece a mutation.
- **Local:** `features/training-notes/ui/delete-note-dialog.tsx`.
- **Depende de:** `useDeleteNote`, `AlertDialog`. **Usado por:** `CalendarPage`.

## Fronteiras e Contratos

**Contrato:** nenhuma operação nova ou alterada (frontend apenas; o redesign usa as operações de `training-notes` e de feriados que já existem).

**Integrações:** nenhuma fronteira nova. `DayDetailPanel` e `MonthAgenda` recebem dados já prontos da página; só a página conhece as queries.

**Significados:**

| Valor | Significado |
|---|---|
| data do dia (`YYYY-MM-DD`) | dia de calendário, sem fuso, o mesmo texto usado em `data-date`, nas notas e nos feriados; "hoje" é o dia local do navegador |
| mês de navegação | índice 0-based em `useCalendarNavigation`; a API de notas recebe o mês 1-based (conversão só em `CalendarPage`) |
| dia selecionado | pertence ao mês exibido; é derivado de `clickedDate` por `resolveSelectedDay` e um dia clicado em outro mês deixa de valer |
| `onSelectDay` | seleciona o dia; não abre a gaveta e não é alternância (clicar de novo no dia selecionado não muda nada) |
| falha de uma fonte | afeta só os blocos daquela fonte; a outra continua visível; só conta como falha quando não há dados em cache |

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê | AC |
|---|---|---|---|---|
| Consulta de notas falha | `isError` da query de notas | marcadores de nota somem; painel e lista tratam só a fonte de notas; Editar e Adicionar ficam ocultos (não dá para saber se o dia tem nota) | no bloco de nota e na lista: "Não foi possível carregar as notas" com "Tentar de novo"; feriados seguem normais | AC-13 |
| Consulta de feriados falha | `isError` da query de feriados | marcadores e bloco de feriado somem; notas seguem editáveis | no bloco de feriado e na lista: erro de feriados com "Tentar de novo"; notas seguem normais | AC-13 |
| Notas ou feriados ainda carregando | `isPending` sem dados | a grade já aparece; os blocos da fonte pendente mostram texto de carregamento e a outra fonte segue visível; Editar e Adicionar ficam ocultos enquanto as notas carregam | "Carregando notas" ou "Carregando feriados" nos blocos e na lista | AC-13 |
| Refetch falha com dados em cache | `isError` com dados | mantém os dados e as ações de nota | a tela segue como estava | AC-13 |
| Salvar com conflito 409, erro de rede ou excluir nota inexistente (404) | respostas já tratadas pelo modal atual | a gaveta e `DeleteNoteDialog` herdam as regras e os textos do `TrainingNoteModal`, sem mudança (ver AC-04 e AC-09 de `notas-treino-calendario`) | as mesmas mensagens de hoje, agora na gaveta | AC-07, AC-08 |
| Setas esquerda/direita digitadas no textarea da gaveta | `keydown` com alvo editável ou gaveta aberta | o atalho global ignora o evento; o mês não muda | o cursor anda no texto | AC-14 |

## Especificação Visual

**Artefato curado:** `mockups/calendario-redesign-painel-gaveta-visual.md` (prosa, markup representativo e tokens, relativo a este spec)

**Fonte de design original:** nenhuma; layout definido via mockup do companion, a partir do screenshot do estado atual fornecido pelo usuário.

**Decisões visuais (norte, não pixel-final):**
- Layout: grade à esquerda e painel do dia à direita (300px), uma coluna abaixo de 1280px.
- Célula: número em VT323 e marcadores (quadrado âmbar = feriado, losango ciano = nota), sem texto; hoje e feriado mantêm as cores atuais, o dia selecionado ganha anel duplo ciano.
- Painel: cabeçalho com a data por extenso, bloco de feriado com borda âmbar, bloco de nota com borda ciano e botões, lista do mês com fade no fim e rolagem interna.
- Gaveta: `Sheet` à direita com título da data, textarea de até 500 caracteres com contador e Salvar, Cancelar e Excluir; pela base abaixo de 768px.
- Tokens: só os semânticos do tema "Noite neon" (`primary`, `accent`, `warning`, `destructive`, `muted`, `card`), chanfro de 6px e 12px, sem cor literal nova.

**Fidelidade:** o mockup é um norte. A fidelidade final é construída na task de implementação, contra o tema real e os componentes existentes (`Card`, `Button`, `Sheet`, `AlertDialog`).

## Decisões Arquiteturais

### D1. Vamos tirar o texto da célula e mostrar o detalhe do dia num painel, com a lista do mês de altura fixa

- **Contexto:** a célula espremida e as listas laterais que crescem são os dois problemas do usuário. Alternativas: grade larga com agenda compacta embaixo (rejeitada pelo usuário: a agenda fica abaixo da dobra no desktop); grade larga sem listas e só com gaveta (rejeitada pelo usuário: a lista do mês só aparece sob demanda).
- **Decisão:** vamos manter duas colunas, com célula de marcadores e um painel que mostra o dia selecionado e a lista do mês com rolagem interna.
- **Justificativa:** técnica, porque a altura do painel deixa de depender do número de itens; de negócio, o usuário vê feriado e nota do dia sem sair da tela.
- **Consequências:** ganha célula limpa e altura estável; aceita um clique a mais para ler a nota completa, e substitui "nota como barrinha ciano com texto na célula" e "sidebar agrupada por semana" de `notas-treino-calendario` e `calendario-refinamento-visual`. Fundir grade e painel numa só superfície continua descartado: são dois cards.
- **Conformidade:** teste da célula garante que ela não contém o texto do feriado nem da nota (AC-01); teste da lista garante rolagem interna com muitas notas (AC-10).

### D2. Vamos usar o `Sheet` existente para criar e editar a nota, no lugar do `Dialog`

- **Contexto:** o usuário pediu a gaveta da opção C para a edição. Alternativa: manter o modal centralizado (rejeitada pelo usuário). Um componente de gaveta novo foi descartado porque `components/ui/sheet.tsx` já existe, sobre o mesmo Radix Dialog, sem dependência nova.
- **Decisão:** vamos trocar `TrainingNoteModal` por `NoteDrawer` baseado em `Sheet`, lado direito, e pela base abaixo de 768px (decisão minha; a ideia de "folha pela base em telas menores" foi confirmada, o ponto de corte é meu). O foco volta ao botão do dia ao fechar.
- **Justificativa:** técnica, reaproveita primitivo e comportamento de foco e Esc do Radix; de negócio, a edição não cobre a grade nem o painel.
- **Consequências:** ganha consistência com o primitivo existente; aceita reescrever o teste do modal e depender do `onCloseAutoFocus` para devolver o foco ao dia.
- **Conformidade:** AC-06, AC-07 e AC-09 cobrem abrir, salvar e devolver o foco.

### D3. Vamos selecionar o dia no primeiro clique e abrir a edição só no segundo

- **Contexto:** hoje clicar no dia abre o modal direto. Alternativa: manter o clique abrindo a gaveta (rejeitada pelo usuário: "apenas selecionar, editar com segundo clique").
- **Decisão:** clicar seleciona; "Editar" ou "Adicionar nota" abre a gaveta. O dia selecionado é derivado do último dia clicado por `resolveSelectedDay`, sem efeito de sincronização, e os handlers de navegação zeram o dia clicado: hoje se o mês exibido o contém, senão o dia 1 (decisão minha); o clique em uma linha da lista também seleciona (decisão minha).
- **Justificativa:** técnica, derivar evita estado fora do mês e `useEffect`; de negócio, ler uma nota deixa de exigir abrir um formulário.
- **Consequências:** ganha leitura rápida e ausência de reset manual ao trocar de mês; aceita um clique extra para editar.
- **Conformidade:** AC-02 e AC-03; teste da função pura cobre os três casos da regra.

### D4. Vamos ter um único dono da exclusão, o `DeleteNoteDialog`, usado pelo painel e pela gaveta

- **Contexto:** o mockup aprovado tem "Excluir" no painel e na gaveta. Alternativa: duplicar a confirmação e a mutation nos dois lugares (rejeitada: a mesma regra em dois lugares).
- **Decisão:** vamos extrair a confirmação e a mutation do modal para `DeleteNoteDialog`; painel e gaveta só pedem a exclusão à página.
- **Justificativa:** técnica, uma regra, um dono; de negócio, a exclusão se comporta igual nos dois caminhos.
- **Consequências:** ganha consistência; aceita um componente a mais e a página mediar o pedido.
- **Conformidade:** AC-08 roda o mesmo teste a partir do painel e da gaveta.

### D5. Vamos ignorar o atalho de setas esquerda/direita quando o alvo é editável ou há gaveta ou diálogo aberto

- **Contexto:** o atalho global é um listener em `window` sem guarda e já dispara com o foco no textarea do modal atual. A gaveta mantém um textarea, então o defeito continuaria visível. Alternativa: deixar como está (rejeitada: trocar o mês enquanto o usuário digita perde a seleção e confunde).
- **Decisão (decisão minha):** vamos adicionar a guarda; o restante do comportamento do atalho não muda.
- **Justificativa:** técnica, é a menor correção que torna a edição segura; de negócio, digitar a nota não pode trocar de mês.
- **Consequências:** ganha edição previsível; aceita tocar numa função que já tem `biome-ignore` de complexidade.
- **Conformidade:** AC-14.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Onde ficam os componentes novos | `DayDetailPanel` e `MonthAgenda` em `features/calendario-feriados/ui/`; `NoteDrawer` e `DeleteNoteDialog` em `features/training-notes/ui/` (decisão minha) | se a navegação do calendário migrar para uma feature própria |
| Foco depois de excluir | `focusDay` da página devolve o foco ao botão do dia, na gaveta e no painel (decisão minha) | se o Radix passar a devolver o foco sozinho em todos os casos |
| Marcação do dia selecionado | `aria-pressed` no botão do dia (decisão minha) | se o teste de acessibilidade pedir `aria-selected` por papel de grade |
| Tooltip da célula | feriado e nota no mesmo tooltip, feriado primeiro (decisão minha) | se o texto da nota longa ficar ilegível no tooltip |
| Lista do mês sem agrupamento por semana | ordem cronológica plana (decisão minha) | se o usuário sentir falta das semanas |
| Ponto de corte da folha pela base | 768px (decisão minha) | se a gaveta lateral ficar estreita em tablets |

## Riscos

| Risco | Score | Mitigação |
|---|---|---|
| Marcadores sem texto dependem de forma e cor para serem entendidos | 3 (médio) | forma diferente por tipo (quadrado e losango) além da cor, `aria-hidden` nos marcadores e resumo completo no `aria-label` da célula (AC-01, AC-15) |
| O foco não voltar ao dia após fechar a gaveta, sobretudo depois de excluir | 3 (médio) | o botão do dia (`data-date`) é estável e o foco é devolvido por `onCloseAutoFocus` (AC-09) |
| Reescrever cinco suítes de teste e perder asserções de acessibilidade que já existiam | 4 (médio) | as asserções de `aria-label`, `aria-current`, grade e foco migram para as ACs deste spec (AC-15, AC-09) e os testes de estilo existentes seguem rodando no fechamento (Restrições) |

## Testes

**Runner:** `pnpm --filter frontend test -- --run` (Vitest); fechamento com `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build`.
**Níveis:** unitário AC-01 a AC-15; a suíte de testes de estilo existente (Restrições) roda inteira no fechamento; verificação visual no QA (navegador, a partir de 1280px e abaixo de 768px) AC-16.

- AC-01 · WHEN o mês é exibido THEN cada célula mostra o número e, quando houver feriado ou nota, só marcadores (quadrado âmbar e losango ciano), sem o texto do feriado nem da nota dentro da célula (origem: fato do usuário ("as informações ficam espremidas"))
- AC-02 · WHEN o usuário clica em um dia THEN o dia fica selecionado (`aria-pressed`) e o painel passa a mostrar esse dia, sem abrir a gaveta (origem: D3)
- AC-03 · WHEN a página abre ou o usuário troca de mês, de ano ou usa "Hoje" THEN o dia selecionado é hoje se o mês exibido o contém e o dia 1 caso contrário, e um dia clicado em outro mês deixa de valer (origem: D3)
- AC-04 · WHEN o dia selecionado tem feriado e nota THEN o painel mostra o bloco de feriado nacional e o bloco de nota com Editar e Excluir (origem: fato do usuário ("painel mostra o dia em detalhe"))
- AC-05 · WHEN o dia selecionado não tem nota THEN o painel mostra "Nenhuma nota neste dia." e "Adicionar nota", sem Editar nem Excluir (origem: fato do usuário (mockup aprovado, estado 3))
- AC-06 · WHEN o usuário aciona "Editar" ou "Adicionar nota" THEN a gaveta abre com o título da data e o texto atual da nota (vazio ao criar) (origem: D2)
- AC-07 · WHEN o usuário salva na gaveta THEN a nota é criada ou atualizada pelas mutations existentes, a gaveta fecha e painel, marcador e lista mostram o novo texto (origem: D2)
- AC-08 · WHEN o usuário aciona Excluir, no painel ou na gaveta, THEN aparece "Excluir a nota?" e a nota só é removida ao confirmar; ao confirmar, a gaveta (se aberta) fecha e o painel mostra "Nenhuma nota neste dia." (origem: D4)
- AC-09 · WHEN a gaveta fecha por Cancelar, X, Esc, salvar ou excluir, ou uma exclusão termina pelo painel, THEN o foco volta ao botão do dia (`data-date`) (origem: D2)
- AC-10 · WHEN o mês tem muitas notas THEN a lista do mês rola dentro do painel e a altura do painel não aumenta (origem: fato do usuário ("podem crescer muito e poluirão a tela"))
- AC-11 · WHEN o usuário clica em uma linha da lista do mês THEN o dia daquela linha fica selecionado (origem: D3)
- AC-12 · WHEN a lista do mês é exibida THEN feriados e notas aparecem juntos em ordem cronológica, com o feriado antes da nota no mesmo dia (origem: D1)
- AC-13 · WHEN a consulta de notas ou a de feriados está carregando ou falha sem dados THEN a grade continua visível, o painel e a lista mostram carregando ou erro com "Tentar de novo" só para aquela fonte e a outra segue visível; com dados em cache, uma falha de refetch não esconde nada (origem: Falhas: Consulta de notas falha)
- AC-14 · WHEN o usuário aperta seta esquerda ou direita com o foco num campo editável ou com a gaveta aberta THEN o mês exibido não muda (origem: D5)
- AC-15 · WHEN uma célula é renderizada THEN ela mantém `data-date`, `aria-current="date"` em hoje e o `aria-label` com dia, feriado e nota, os marcadores são `aria-hidden` e o tooltip mostra feriado e nota ao passar o mouse e ao focar (origem: D1)
- AC-16 · WHEN a viewport tem 1280px ou mais THEN painel e grade ficam lado a lado com a mesma altura, e abaixo de 1280px o painel fica depois da grade; abaixo de 768px a gaveta abre pela base (origem: D2)
