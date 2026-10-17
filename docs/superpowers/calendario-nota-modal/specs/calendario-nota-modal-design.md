# Calendário: nota do dia em modal e trecho no painel: Design

- **Feature anterior que este design corrige:** `../../calendario-redesign-painel-gaveta/specs/calendario-redesign-painel-gaveta-design.md`
- **Norte visual:** `mockups/calendario-nota-modal-visual.md`

## Visão Geral

O redesign anterior (`calendario-redesign-painel-gaveta`) tirou o texto da nota de dentro da célula do dia, criou o painel do dia ao lado da grade e passou a editar a nota numa gaveta (`NoteDrawer`, um `Sheet`). Dois problemas apareceram no uso e no QA:

1. **Nota longa gera rolagem aninhada.** O bloco "Nota do dia" do painel tem altura máxima e rolagem interna (`max-h-40 overflow-y-auto`). Em telas largas o painel é forçado à altura da grade, e a lista "No mês" vaza para fora do cartão, com a própria barra de rolagem desenhada sobre a borda (print enviado pelo usuário).
2. **A gaveta cobre o que o painel mostra.** O QA do redesign registrou o BUG-01: a gaveta de 384 px com overlay cobre o painel do dia a 1280 e 1440 px, corta a borda da grade a 1440 px e ocupa metade da tela abaixo de 768 px. O usuário decidiu reverter a gaveta e voltar ao modal.

Resultado esperado, nas palavras do usuário: o modal serve para **editar e excluir** a nota; o painel mostra **um trecho** da nota que, ao clicar, leva ao texto completo; Salvar, Cancelar e Excluir passam a ser **ícones**, com disquete em Salvar. Sucesso é abrir um dia com nota de 500 caracteres e feriado em qualquer largura e ver o painel inteiro dentro do cartão, sem rolagem na nota e sem nada cobrindo a grade.

Esta feature **substitui** as decisões D2 (gaveta), D4 (confirmação de exclusão acionada do painel e da gaveta) e D5 (guarda das setas com gaveta aberta) do redesign anterior, e os critérios AC-06, AC-07, AC-09, AC-14 e AC-16 e o FR-017 (gaveta pela base abaixo de 768 px) daquele PRD. O histórico daquela feature não é reescrito.

## Escopo

**Dentro**
- Trocar a gaveta de edição por um modal centralizado, usado para criar, editar e excluir a nota do dia.
- Painel do dia: o bloco "Nota do dia" mostra no máximo 3 linhas, sem barra de rolagem; o trecho inteiro é clicável e abre o modal com o texto completo.
- Painel do dia: os botões Editar e Excluir saem do painel e passam a existir só no modal. "Adicionar nota" (dia sem nota) continua no painel e abre o mesmo modal, vazio.
- Painel do dia: nada é desenhado fora do cartão; só a lista "No mês" rola.
- Salvar, Cancelar e Excluir do modal viram botões só com ícone: disquete (`Save`), `X` e `Trash2`, do conjunto de ícones do projeto.
- Adicionar o ícone `Save` ao conjunto de ícones do projeto, pelo gerador existente.
- Remover o código da gaveta (`NoteDrawer`) e atualizar os testes que a exercitam.

**Fora de escopo**
- Backend, API, contrato OpenAPI e modelo de dados (a mudança é só de frontend, como no redesign).
- Limite da nota (continua 1 a 500 caracteres) e os textos de erro (conflito, rede, não encontrada, inválida).
- Texto "Repetir" (aparece só após falha de salvar): continua texto, pois o usuário pediu ícone só para Salvar, Cancelar e Excluir. (decisão minha)
- Texto do "Adicionar nota" e do link "Ver nota completa": continuam texto.
- Cabeçalho da página, navegação de ano e de mês, grade mensal, marcadores e tooltip das células.
- Várias notas por dia, rich text e demais itens que `notas-treino-calendario` já excluiu.

**Anti-objetivos** (seria falha mesmo que tudo funcione)
- Reintroduzir qualquer rolagem aninhada na nota do painel.
- Deixar o painel crescer sem limite com texto longo (era o anti-objetivo do redesign anterior: "o texto espremido da célula não pode reaparecer num painel que também cresce sem limite").
- Botão de ação (Salvar, Cancelar, Excluir) sem nome acessível, ou com nome diferente de "Salvar", "Cancelar" e "Excluir".
- A gaveta continuar existindo escondida em alguma largura (por exemplo abaixo de 768 px).

**Restrições**
- Regras do repositório (`AGENTS.md` raiz e do frontend): `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passam 100%; sem gambiarras; testes com `test` (não `it`), descrição em PT-BR; componentes em PascalCase e arquivos em kebab-case.
- O projeto não usa lucide (`no-lucide.test.ts` falha o build se `lucide-react` aparecer). Ícones vêm de `src/components/ui/pixel-icons.tsx`, arquivo **gerado** por `apps/frontend/scripts/generate-pixel-icons.mjs`; não se edita à mão.
- Os testes existentes buscam os botões por nome acessível exato (`getByRole("button", { name: "Salvar" })` e equivalentes); esses nomes não mudam.

**Deixado ao construtor**
- Como conter a lista "No mês" dentro do cartão (por exemplo `overflow-hidden` no cartão e `min-h-0` na lista, em vez do `min-h-32` atual); o requisito é AC-07, o mecanismo é dele. Abaixo de `xl` a lista continua com a rolagem própria já decidida no redesign.
- Largura do modal (padrão do `DialogContent` do projeto, `max-w-lg`), atraso do tooltip e aparência exata do botão que envolve o trecho.
- O que acontece ao fechar o modal com texto digitado e não salvo: mantém o comportamento que a gaveta tinha hoje.
- Nome e posição dos arquivos novos e dos testes, seguindo as convenções do frontend.

**Lentes fechadas:** Dados e consistência (nada é persistido ou alterado); Evolução e rollout (frontend único, sem consumidores fora do repositório, confirmado pelo usuário); Segurança e privacidade (nenhum dado novo ou exposto); Atributos de qualidade (sem volume, prazo ou integração nova).

## Arquitetura e Fluxo

Fluxo do dia selecionado (a página `calendario/page.tsx` continua dona do estado):

1. O usuário seleciona um dia na grade. O painel mostra feriado (se houver), o trecho da nota (se houver) e a lista "No mês".
2. Dia com nota: clicar no trecho abre o `NoteModal` em modo edição, com o texto completo. Dia sem nota: "Adicionar nota" abre o mesmo modal em modo criação, sem Excluir.
3. Salvar grava a nota (mesma chamada de hoje), fecha o modal e devolve o foco ao botão do dia. Cancelar e Esc fecham sem gravar e devolvem o foco ao botão do dia.
4. Excluir (só em modo edição) abre a confirmação `DeleteNoteDialog` por cima do modal. Confirmar exclui, fecha a confirmação e o modal e devolve o foco ao botão do dia; cancelar a confirmação devolve o foco ao botão Excluir do modal. (decisão minha: preserva o comportamento de foco que os testes atuais da gaveta já verificam; o construtor confere contra o código atual e mantém o que já existe)
5. Com o modal ou a confirmação abertos, as setas esquerda/direita não trocam o mês (guarda já existente, agora ligada ao modal).

O painel passa a só sinalizar "abrir a nota do dia" para a página; ele não conhece mais a exclusão.

## Componentes

**`DayDetailPanel`** (alterado)
- **Responsabilidade:** mostrar o resumo do dia selecionado (feriado, trecho da nota, lista do mês) e sinalizar a intenção de abrir a nota.
- **Interface:** recebe o dia, o feriado, a nota e os itens do mês; emite `onOpenNote` (editar ou adicionar). Deixa de receber `onDelete`.
- **Oculta:** o limite de 3 linhas do trecho e como a lista do mês fica contida no cartão.
- **Local:** `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.tsx` (e `month-agenda.tsx` para a contenção da lista).
- **Usado por:** `calendario/page.tsx`.

**`NoteModal`** (novo; substitui `NoteDrawer`)
- **Responsabilidade:** criar, editar e excluir a nota de um dia, num modal centralizado.
- **Interface:** as mesmas props que o `NoteDrawer` recebe hoje da página: `open`, `onOpenChange`, o dia e o feriado (para o cabeçalho), a nota existente (ou nenhuma), `onRequestDelete` e `onCloseAutoFocus`. Criar e atualizar a nota continuam sendo chamados pelo próprio modal (`useCreateNote`, `useUpdateNote`), como na gaveta; a página não faz a mutação. O chamador não conhece validação nem mapeamento de erros.
- **Oculta:** validação 1 a 500 caracteres com contador, mapeamento dos erros (409, rede, 404, inválida) para as mensagens e o modo (criação ou edição); a regra de que os três botões de ação são ícones com `aria-label` e tooltip.
- **Local:** `apps/frontend/src/features/training-notes/ui/training-note-modal.tsx` (novo), reaproveitando o `Dialog` de `src/components/ui/dialog.tsx`; `training-note-drawer.tsx` é removido. (decisão minha: o nome e o diretório seguem o modal que existiu antes do redesign)
- **Depende de:** `Dialog`, `Tooltip`, `Button` (`size="icon"`), `pixel-icons`, `useCreateNote`, `useUpdateNote`. O modal não renderiza a confirmação de exclusão; só a pede por `onRequestDelete`.

**`calendario/page.tsx`** (alterado, estrutura mantida): renderiza o `NoteModal` no lugar do `NoteDrawer` e deixa de passar `onDelete` ao painel. Continua dona do `DeleteNoteDialog`, de `deleteOpenerRef`, `focusAfterDialog` e `overlayOpen` (a guarda das setas) e do retorno de foco ao botão do dia. A exclusão passa a ter um único ponto de partida, o botão Excluir do modal. (resposta do código atual; decisão minha manter a estrutura e só trocar o componente)

**`DeleteNoteDialog`** (inalterado): confirmação "Excluir a nota?", renderizada pela página e acionada só a partir do modal.

**`pixel-icons.tsx`** (regenerado): ganha o export `Save`.

## Fronteiras e Contratos

**Contrato:** nenhuma operação nova ou alterada (só frontend; as chamadas de criar, editar e excluir nota são as mesmas de hoje).

**Significados**
- Data do dia: dia de calendário (sem horário), exibido como "12 de outubro" com o dia da semana, como a gaveta já exibia.
- "Trecho": é só apresentação. O texto guardado e o limite de 500 caracteres não mudam; o corte em 3 linhas é visual e o texto completo continua no DOM e no modal.
- Excluir: remove a nota do dia (estado alvo: dia sem nota); não é alternância. Uma tela desatualizada que tente excluir uma nota já removida recebe "Nota não encontrada — recarregue o mês" (404), como hoje.

## Falhas e Erros

Os comportamentos abaixo já existem na gaveta e passam inalterados para o modal. O que muda é onde aparecem.

| Falha | Detecção | Comportamento | O que o usuário vê | AC |
|---|---|---|---|---|
| Texto vazio ou com mais de 500 caracteres | validação no formulário | não envia | "Escreva de 1 a 500 caracteres" | AC-08 |
| Dia já tem nota (conflito ao criar) | resposta 409 | modal passa para modo edição | "Esse dia já tem nota — edite a atual" | AC-08 |
| Sem conexão ao salvar | falha de rede | mantém o texto digitado | "Sem conexão — tente de novo" e botão "Repetir" | AC-08 |
| Nota não existe mais | resposta 404 | não altera nada | "Nota não encontrada — recarregue o mês" | AC-08 |

## Especificação Visual

**Artefato curado:** `mockups/calendario-nota-modal-visual.md` (prosa, marcação central e tokens, relativo a este spec)

**Fonte de design original:** Nenhuma; layout definido via mockup do companion, aprovado pelo usuário na conversa.

**Decisões visuais (norte, não pixel-final):**
- Painel: nota cortada em 3 linhas com reticências (AC-01), seguida do link "Ver nota completa"; o trecho todo é um botão. Sem Editar e Excluir.
- Modal: título com a data ("12 de outubro"), subtítulo "dia da semana · feriado", rótulo "Nota do treino", textarea com o texto completo e contador `n/500`, e a fileira de ícones.
- Ícones de ação: botões quadrados de 40 px (`size="icon"`): `Save` em magenta (primário), `X` com borda (cancelar), `Trash2` em vermelho (destrutivo), ordem Salvar, Cancelar, Excluir.
- Tokens do tema escuro e fontes do projeto (VT323 nos títulos e botões, Inter no corpo, JetBrains Mono no campo), conforme o artefato.

**Fidelidade:** o mockup é um *norte*. A fidelidade final é construída na task de implementação.

## Decisões Arquiteturais

### D1. Vamos editar e excluir a nota num modal centralizado, no lugar da gaveta

- **Contexto:** o redesign adotou a gaveta para a edição, a pedido do usuário na época. O QA mostrou que ela cobre o painel e parte da grade em 1280 e 1440 px e metade da tela abaixo de 768 px (BUG-01). Alternativas: manter a gaveta e estreitá-la (rejeitada pelo usuário, que decidiu reverter); mostrar o formulário embutido no painel (rejeitada: o painel já é estreito e o texto espremido é o anti-objetivo do redesign).
- **Decisão:** vamos usar o `Dialog` do projeto como modal para criar, editar e excluir, em todas as larguras; sem gaveta lateral nem pela base.
- **Justificativa:** técnica: reaproveita um componente existente e elimina o caso especial por largura; de negócio: a nota fica legível sem esconder o contexto do dia, que era o motivo declarado do redesign.
- **Consequências:** ganha um comportamento único em todas as larguras e menos código; aceita que o modal cobre a tela enquanto aberto (é o que modais fazem) e que a exclusão passa por dois diálogos empilhados (modal e confirmação).
- **Conformidade:** teste de unidade verifica que criar, editar e excluir acontecem num elemento `role="dialog"` aberto pelo painel e que o foco volta ao botão do dia; teste de arquitetura existente do frontend continua passando sem referência a `Sheet` no calendário.

### D2. Vamos mostrar um trecho de 3 linhas da nota no painel e abrir o texto completo no modal

- **Contexto:** o texto longo gerava rolagem aninhada e a lista do mês vazava do cartão. Alternativas: deixar a nota crescer inteira (rejeitada pelo usuário e contra o anti-objetivo do redesign); manter rolagem interna com altura máxima (rejeitada: é exatamente o defeito reportado).
- **Decisão:** vamos limitar o trecho a 3 linhas com reticências, sem rolagem, e tornar o trecho inteiro um botão que abre o modal com o texto completo.
- **Justificativa:** técnica: altura do bloco previsível, o que garante espaço para a lista do mês em qualquer tela; de negócio: o usuário vê do que se trata a nota e lê o resto onde também edita.
- **Consequências:** ganha painel de altura estável; aceita que ler a nota inteira exige um clique e que Editar e Excluir deixam de aparecer no painel.
- **Conformidade:** AC-01 e AC-02; revisão visual do AC-07 pela QA em navegador.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Nome acessível do botão do trecho | o próprio conteúdo (texto da nota e "Ver nota completa"), sem `aria-label` extra, para o rótulo visível estar no nome (decisão minha) | leitores de tela reclamarem de leitura longa |
| Botões de ação sem texto | `aria-label` com o nome atual e tooltip com o mesmo texto (decisão minha) | usuários não entenderem o disquete |
| Ícone de salvar | `save` do pixelarticons (disquete), via `Save: "save"` no `ICON_MAP` do gerador (decisão minha: o projeto não tinha ícone de salvar; é a versão que combina com os demais) | n/a |
| "Repetir" | continua texto (decisão minha) | n/a |
| Foco inicial ao abrir o modal | o campo de texto, para que nenhum tooltip abra sozinho na abertura (decisão minha) | n/a |
| Tooltip com botão desabilitado | durante o salvamento os três botões ficam desabilitados e sem tooltip, o que é aceito; o nome acessível não muda (decisão minha) | n/a |
| X de fechar embutido no `DialogContent` | fica como está: é do componente compartilhado, que não é alterado; coexiste com o Cancelar. O anti-objetivo vale só para os três botões de ação (decisão minha) | usuário achar os dois X redundantes |

## Riscos

- **Regerar `pixel-icons.tsx` pode alterar outros ícones.** O gerador busca os SVGs na CDN; se a versão não estiver fixada em 2.4.1, o arquivo pode mudar além do `Save`. Mitigação: conferir que o diff do arquivo gerado só acrescenta `Save` (AC-10) e que `no-lucide.test.ts` passa. O gerador precisa de rede. Se ele não puder rodar, ou alterar outros ícones além do `Save`, a task para e reporta; não se escreve o `Save` à mão no arquivo gerado (decisão minha, pela restrição do repositório).
- **Testes e documentos do redesign anterior citam a gaveta.** Mitigação: atualizar os testes que a exercitam (`training-note-drawer.test.tsx`, `training-notes-calendar.test.tsx`, `calendario/page.test.tsx`, `day-detail-panel.test.tsx`, `month-agenda.test.tsx`); os documentos antigos ficam como histórico.

## Testes

**Runner:** `pnpm --filter frontend test -- --run` (Vitest, `renderWithProviders`, MSW).
**Níveis:** unitário AC-01 a AC-06, AC-08, AC-09 e AC-10; AC-07 depende de layout real e é verificado em navegador pela QA a 1280, 1440 e 1920 px, e em largura de celular.

- AC-01 · WHEN a nota do dia tem texto com mais de 3 linhas THEN o painel mostra o trecho cortado em 3 linhas, sem barra de rolagem na nota, e o texto completo continua acessível no DOM (origem: D2)
- AC-02 · WHEN o usuário clica no trecho da nota THEN abre o modal (`role="dialog"`) em modo edição com o texto completo no campo e o foco inicial no campo, e o painel não tem botões Editar nem Excluir (origem: D2)
- AC-03 · WHEN o dia não tem nota e o usuário aciona "Adicionar nota" THEN abre o mesmo modal vazio, sem o botão Excluir (origem: D1)
- AC-04 · WHEN o usuário salva um texto válido THEN a nota é gravada, o modal fecha e o foco volta ao botão do dia; Cancelar e Esc fecham sem gravar e devolvem o foco ao mesmo botão (origem: D1)
- AC-05 · WHEN o usuário aciona Excluir no modal THEN abre a confirmação "Excluir a nota?"; confirmar exclui, fecha confirmação e modal e devolve o foco ao botão do dia; cancelar a confirmação devolve o foco ao botão Excluir do modal (origem: D1)
- AC-06 · WHEN o modal está aberto THEN Salvar, Cancelar e Excluir são botões só com ícone (`Save`, `X`, `Trash2`), com nome acessível exatamente "Salvar", "Cancelar" e "Excluir" e tooltip com o mesmo texto; "Repetir" continua texto (origem: fato do usuário ("substitua os textos de salvar, cancelar e excluir por ícones"))
- AC-07 · WHEN o dia tem feriado, nota de 500 caracteres e o mês tem muitas notas THEN nada do painel é desenhado fora do cartão e só a lista "No mês" rola (origem: fato do usuário ("o scroll gerado quando o texto é muito grande"))
- AC-08 · WHEN ocorre validação inválida, conflito 409, falha de rede ou 404 ao salvar ou excluir THEN o modal mostra as mensagens da tabela de Falhas e Erros, mantém o texto digitado e oferece "Repetir" na falha de rede (origem: Falhas: Sem conexão ao salvar)
- AC-09 · WHEN o modal ou a confirmação de exclusão está aberto THEN as setas esquerda e direita não trocam o mês (origem: D1)
- AC-10 · WHEN o gerador de ícones é executado THEN `pixel-icons.tsx` passa a exportar `Save`, o diff do arquivo gerado só acrescenta esse ícone e `no-lucide.test.ts` continua passando (origem: fato do usuário ("em salvar substitua por um ícone de disquete"))
