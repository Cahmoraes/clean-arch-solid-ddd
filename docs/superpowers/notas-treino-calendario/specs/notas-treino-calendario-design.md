# Notas de Treino no Calendário: Design

- **Norte visual:** `mockups/notas-treino-calendario-visual.md`

## Visão Geral

Usuários logados anotam o treino do dia direto no calendário existente da rota `calendario`: uma nota curta de texto por data, por exemplo "Peito + tríceps 4x12", visível somente para o próprio autor. Hoje o calendário é somente leitura (feriados via BrasilAPI, sem backend); a nota adiciona o primeiro estado gravável da célula sem remover nada do que já existe. Sucesso é ver a barrinha da nota no dia e na lista da semana após salvar, com recarregamento mantendo o conteúdo.

## Escopo

**Dentro:** uma nota de texto por dia por usuário (fato do usuário ("informações sobre treino")); criar, editar e excluir com modal (salvar/cancelar/excluir); exclusão com confirmação (fato do usuário ("pede confirmação")); dias passados e futuros liberados (fato do usuário ("passado e futuro também")); nota exibida junto do nome do feriado quando coincidem (fato do usuário ("sim")); texto vazio bloqueado sem apagar nada (fato do usuário ("não")); persistência em Postgres com o autor tirado do JWT.

**Fora de escopo (com motivo):** várias notas por dia (conversa fixou uma; viraria lista ordenada — dono futuro: este mesmo contexto); rich text/foto/categorias/cores por tipo (sem pedido; o terceiro estado visual já ocupa o ciano); busca e lembretes/notificações (sem pedido; dono futuro: contexto notification); edição ou importação de feriados (veto explícito do histórico `calendario-feriados`); compartilhamento entre usuários (privacidade é o requisito central).

**Anti-objetivos:** parecer rede social (comparar, curtir, seguir treino alheio) seria fracasso mesmo com o CRUD funcionando; outro fracasso seria a nota esconder o feriado ou o destaque de hoje.

**Restrições:** seguir a constituição do repo (`apps/backend/AGENTS.md` + `AGENTS.md` do contexto, `apps/frontend/AGENTS.md`); feriados continuam frontend-only via BrasilAPI, sem proxy.

**Deixado ao construtor:** mensagens exatas de erro em PT-BR; skeleton e `EmptyState` da lista de notas; debounce do salvar.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Preocupação de domínio | Critério mensurável | Escopo |
|---|---|---|---|
| Privacidade | Nota de treino é pessoal; um vazamento entre contas quebra a confiança central | Nenhum endpoint aceita autor vindo do cliente; AC-05 passa com duas contas | escrita e leitura |
| Disponibilidade percebida | Rede móvel falha no meio do treino; perder o digitado é o pior resultado | Falha ao salvar mantém o rascunho com retry visível (AC-06) | escrita |
| Performance | Listagem mensal acompanha a navegação do calendário; lentidão trava a troca de mês | GET mensal com 31 dias responde p95 < 300 ms em dev com 1.000 notas (decisão minha) | leitura |

**Consideradas, não priorizadas:** escalabilidade (volume é de uma linha por dia por usuário); internacionalização (PT-BR fixo, como o resto do app).

## Arquitetura e Fluxo

O frontend mantém a leitura de feriados como hoje e adiciona um hook `useTrainingNotesQuery(year, month)` com chave mensal, mais mutations de criação, atualização e exclusão com invalidação do mês exibido. A célula do dia (`DayCell`) passa a renderizar a barrinha ciano com ellipsis e o losango quando há nota, mantendo os destaques de hoje e feriado; clique em dia vazio abre o modal em modo criar, clique na nota abre em modo editar com Excluir pedindo confirmação em seguida. O backend ganha um contexto novo `training-notes` em `domain/application/infra`, com regras puras no domínio, casos de uso retornando `Either`, injeção via Inversify, rotas registradas como constantes e repositório Prisma restrito à infra. O controller extrai o autor do JWT e o repassa aos casos de uso, de modo que o cliente informe data e texto, sem informar quem é o dono. O painel de notas tem loading e erro próprios, independentes do painel de feriados: falha da BrasilAPI ou ano sem feriados não esconde as notas (decisão minha). A sidebar lista os dias com nota do mês exibido, agrupados por semana com o mesmo `getSemanaDoMes` da `HolidayList`, filtrados no cliente a partir do cache mensal, sem fetch próprio (decisão minha). O frontend envia o primeiro e o último dia do mês; o caso de uso confia no `sub` do JWT sem consultar o contexto user, seguindo o padrão dos controllers existentes (decisão minha).

## Componentes

| Componente | Responsabilidade | Oculta | Depende de | Usado por |
|---|---|---|---|---|
| `TrainingNote` | Entidade de domínio: data como dia de calendário, texto normalizado, vínculo com o autor | Normalização (trim + rejeição de vazio) e o formato de data residem aqui, não no controller | tipos de `shared`, relógio para `atualizadoEm` | casos de uso do contexto |
| Casos de uso de notas | Criar, atualizar, excluir e listar o intervalo do mês com as regras de posse | Posse verificada por par autor+data em cada operação; criação duplicada vira erro de domínio, com a concorrência resolvida pela UNIQUE de INV-01 com conversão de `P2002` no repositório | `TrainingNote`, porta do repositório, `Either` | controllers das rotas |
| `PrismaTrainingNotesRepository` | Persistir e ler notas no Postgres, incluindo a restrição por autor+data | SQL e mapeamento Prisma ficam isolados aqui; camadas acima enxergam a porta | Prisma, `schema.prisma` | casos de uso |
| UI de notas no calendário | Hook mensal, célula com barrinha, modal criar/editar/excluir e lista da semana | Cache mensal por ano+mês, sidebar derivada do cache e agrupada por semana, rascunho em falha e painel independente dos feriados ficam no frontend | `openapi-fetch`, TanStack Query, `DayCell` atual | rota `calendario` |

Nomes acima são os reais; evitam sufixos genéricos Manager/Handler/Controller.

## Fronteiras e Contratos

**Contrato:**

| Operação | Entrada | Saída | Erros |
|---|---|---|---|
| POST /training-notes | `{data: YYYY-MM-DD, texto: string 1..500 após trim}` | `201 {id, data, texto, atualizadoEm: ISO-8601 UTC}` | `NOTA_JA_EXISTE → 409; VALIDACAO → 400; NAO_AUTENTICADO → 401` |
| GET /training-notes | `query de: YYYY-MM-DD, ate: YYYY-MM-DD` (obrigatórios, `de<=ate`, intervalo até 62 dias; ver Significados) | `200 [{data, texto, atualizadoEm: ISO-8601 UTC}]` do autor, ordem crescente de data | `VALIDACAO → 400; NAO_AUTENTICADO → 401` |
| PUT /training-notes/:date | `{texto: string 1..500 após trim}` | `200 {id, data, texto, atualizadoEm: ISO-8601 UTC}` | `NOTA_INEXISTENTE → 404; VALIDACAO → 400; NAO_AUTENTICADO → 401` |
| DELETE /training-notes/:date | — | `204` sem corpo | `NOTA_INEXISTENTE → 404; NAO_AUTENTICADO → 401` |

**Integrações:**

| Fronteira (upstream → downstream) | O que atravessa |
|---|---|
| Calendário (frontend) → training-notes (backend) | operações do contrato acima, com JWT no cabeçalho |
| training-notes → Postgres | escrita e leitura via Prisma, restritas ao autor |
| Calendário → BrasilAPI | leitura anual de feriados, inalterada, direto do frontend |

**Significados:** `data` = dia de calendário `YYYY-MM-DD` em America/Sao_Paulo, exibido como está, sem conversão de fuso; o backend valida data real (ex. 2026-02-30 → 400, inclusive em path param) e os dois lados limitam anos a 1900–2199 (decisão minha); `texto` = UTF-8 com 1 a 500 caracteres após trim (decisão minha); contagem = `texto.trim().length` nas três camadas, trim no sentido de `String.trim`, quebras internas preservadas, o que impede estouro do `varchar(500)` (decisão minha); `de`/`ate` = dias de calendário com `de<=ate` e intervalo até 62 dias (decisão minha); autor = `sub` do JWT extraído no backend, o cliente não o informa; `atualizadoEm` = instante ISO-8601 em UTC; corpos de erro = `{message}` via ResponseFactory, e o frontend diferencia os casos pelo status HTTP (409 = dia já tem nota), seguindo `lib/api.ts` e `lib/errors`; falha visível = texto PT-BR definido na tabela de Falhas.

## Dados e Consistência

| ID | Enunciado | Categoria | Garantidor | Rede |
|---|---|---|---|---|
| INV-01 | Cada par autor + data tem até um registro de nota | unique | db | - |
| INV-02 | Nota com texto vazio não chega ao banco | limit | app | - |
| INV-03 | Excluir remove o registro e a listagem mensal deixa de incluir a data | transition | app | INV-01 |

**Modelo:** `training_notes` (tabela nova)

| Coluna | Tipo | Nulo | Restrição |
|---|---|---|---|
| `id` | uuid | não | PK, gerado pela aplicação |
| `user_id` | uuid | não | FK `users.id` com `onDelete Restrict` (convenção do schema para linhas de User), compõe UNIQUE · INV-01 |
| `data` | date | não | compõe UNIQUE(`user_id`, `data`) · INV-01 |
| `texto` | varchar(500) | não | trimado em app, vazio rejeitado · INV-02 |
| `created_at` | timestamptz | não | preenchido na criação |
| `updated_at` | timestamptz | não | preenchido a cada escrita |

Sem dados legados: a tabela nasce vazia e o código antigo não a referencia. Concorrência na criação resolve-se no banco: o repositório converte `P2002` em erro de domínio, no padrão de `prisma-check-in-repository` (decisão minha).

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê | AC |
|---|---|---|---|---|
| Texto vazio ou acima de 500 caracteres | validação em app antes de persistir | nada é gravado; modal permanece aberto com o digitado | "Escreva de 1 a 500 caracteres" | AC-04 |
| Criar nota para dia que já tem nota | conflito no par autor+data (ver INV-01) | criação recusada; sugere editar | "Esse dia já tem nota — edite a atual" | AC-07 |
| Editar ou excluir nota inexistente | leitura por autor+data retorna vazio | operação recusada sem efeito colateral | "Nota não encontrada — recarregue o mês" | AC-08 |
| Rede falha ao salvar | timeout/erro da mutation | rascunho mantido no modal com retry | "Sem conexão — tente de novo" com botão Repetir | AC-06 |
| Sem sessão válida | JWT ausente ou expirado | backend recusa; frontend redireciona ao login | tela de login | AC-05 |
| Leitura de feriados falha ou volta vazia | query de feriados em erro ou lista vazia | painel de feriados mostra retry ou estado vazio; painel de notas opera normalmente | notas do mês seguem visíveis | AC-09 |

## Rollout e Compatibilidade

Consumidor hoje: a rota `calendario` autenticada; nenhum contrato existente muda e a tabela nova não afeta leituras antigas. Ordem: migration + backend primeiro, frontend em seguida; frontend antigo segue funcionando sem notas. Sem flag (decisão minha — mudança aditiva pequena). Sinal de saúde em produção: criar, recarregar o mês e confirmar a nota persistida; erro 5xx nas rotas novas aciona o alerta já usado pelo backend.

## Especificação Visual

**Artefato curado:** `mockups/notas-treino-calendario-visual.md` (prosa + núcleo HTML, relativo a este spec)

**Fonte de design original:** nenhuma; layout definido apenas via mockup do companion.

**Decisões visuais (norte, não pixel-final):**
- Layout: grade e sidebar atuais preservados; nota como barrinha ciano com ellipsis + losango na célula; modal abaixo do calendário.
- Hierarquia: número do dia maior; nota secundária; coexistência com feriado e hoje sem remover destaques.
- Spacing/escala: `gap-6` no grid principal, `gap-1` nos dias, célula `min-h-14`, raios do tema.
- Tokens: `accent #3ee0ff` para nota; `primary #ff3ea5` segue de hoje; `warning #ffb443` segue de feriado; tipografia VT323/Inter/JetBrains Mono.
- Interação: criar no dia vazio, editar na nota, excluir com confirmação; foco retorna ao dia ao fechar; `aria-label` do dia inclui resumo da nota.

**Fidelidade:** o mockup é um *norte*. A fidelidade final é construída na task de implementação, de preferência com os componentes reais e as ferramentas de fidelidade visual do ambiente.

## Decisões Arquiteturais

### D1. Vamos criar o contexto `training-notes` no backend em vez de pendurar as notas no contexto de calendário/feriados

- **Contexto:** feriados são frontend-only sem persistência; alternativas: A) estender a feature frontend com `localStorage`, B) novo contexto de backend, C) guardar dentro do contexto `user`.
- **Decisão:** B — contexto próprio em `domain/application/infra` com entidade, casos de uso, repositório Prisma e rotas como constantes.
- **Justificativa técnica:** respeita o isolamento entre contextos e as regras do dependency-cruiser; `localStorage` quebraria o requisito multi-dispositivo e a privacidade testável no servidor.
- **Justificativa de negócio:** custo de um contexto pequeno hoje evita migração de dados de um armazenamento provisório amanhã.
- **Consequências:** ganha persistência por autor e testes de contrato; aceita uma migration e quatro rotas a operar.
- **Conformidade:** fitness functions existentes acusam import de infra fora de lugar; teste AC-05 prova o isolamento por autor.

### D2. Vamos modelar uma nota por data em vez de lista de notas por dia

- **Contexto:** o pedido fala em anotar o treino do dia; alternativas: A) uma nota por data, B) várias notas ordenadas por dia.
- **Decisão:** A — par autor+data com restrição em banco (ver INV-01).
- **Justificativa técnica:** leitura mensal vira um mapa data→texto sem ordenação; a célula exibe um item previsível.
- **Justificativa de negócio:** cobre o uso relatado ("qual treino irei realizar") com a UI mais simples; múltiplas viram evolução futura sem migração destrutiva.
- **Consequências:** ganha simplicidade; aceita recusar a segunda nota do mesmo dia com erro orientando a editar.
- **Conformidade:** AC-01 e AC-07 exercitam criar e o conflito.

### D3. Vamos extrair o autor do JWT no backend em vez de recebê-lo no corpo

- **Contexto:** toda escrita precisa do dono; alternativas: A) `userId` no corpo, B) `sub` do JWT.
- **Decisão:** B — controller resolve o autor da sessão e repassa aos casos de uso.
- **Justificativa técnica:** elimina falsificação de autor por construção; repositório sempre filtra pelo autor da sessão.
- **Justificativa de negócio:** privacidade é o requisito central; o custo é zero porque a sessão autenticada já existe.
- **Consequências:** ganha isolamento testável; aceita que clientes nunca criem nota para outro usuário, nem como admin.
- **Conformidade:** AC-05 cruza duas contas e espera conjuntos disjuntos.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Limite do texto | 500 caracteres com trim; vazio bloqueia (decisão minha) | usuários pedirem treinos longos com frequência |
| Granularidade do cache | chave mensal por ano+mês com invalidação na escrita (decisão minha) | navegação mensal apresentar lentidão medida |
| Ordem de deploy | backend antes do frontend, sem flag (decisão minha) | erro em produção nas rotas novas |

## Riscos

| Risco | Score | Mitigação |
|---|---|---|
| Nota de um usuário aparecendo para outro por filtro de autor ausente | 3 🟡 | Autor sempre do JWT com filtro em toda query; AC-05 cruza duas contas |
| Data gravada com hora/fuso deslocando a nota para o dia vizinho | 4 🟡 | Coluna `date` sem hora + significado de `data` fixo; INV-01 e AC-01 conferem o dia exibido |

## Testes

**Runner:** backend `pnpm --filter backend test:run` (vitest app-domain) mais `test:business-flow` e `test:e2e:prisma`; frontend `pnpm --filter frontend test -- --run` (vitest).
**Banco de teste:** Postgres real via `apps/backend/test/vite.config.integration.ts` (suite `test:e2e:prisma`) para INV-01.
**Níveis:** unitário AC-01, AC-03, AC-04, AC-06, AC-07, AC-08, AC-09; banco real INV-01, INV-03, AC-02, AC-05.

- AC-01 · WHEN o usuário salva a nota do dia THEN a célula exibe a barrinha e a lista da semana inclui o dia (origem: fato do usuário ("informações sobre treino, qual treino irei realizar"))
- AC-02 · WHEN o dia com nota também é feriado THEN a célula mostra o nome do feriado mais a nota (origem: fato do usuário ("sim, aparece junto com o nome do feriado"))
- AC-03 · WHEN o usuário confirma a exclusão THEN a nota some da célula e da lista (origem: fato do usuário ("pede confirmação"))
- AC-04 · WHEN o usuário tenta salvar o texto vazio THEN o modal mostra erro e nada é apagado (origem: fato do usuário ("não apaga ao salvar vazio"))
- AC-05 · WHEN outra conta abre o mesmo mês THEN as notas da primeira conta não aparecem (origem: D3)
- AC-06 · WHEN a rede falha ao salvar THEN o rascunho é mantido com retry visível (origem: Falhas: Rede falha ao salvar)
- AC-07 · WHEN o usuário cria nota para dia que já tem nota THEN a criação é recusada com orientação de editar (origem: D2)
- AC-08 · WHEN o usuário edita nota inexistente THEN recebe aviso sem efeito colateral (origem: Falhas: Editar ou excluir nota inexistente)
- AC-09 · WHEN a leitura de feriados falha ou volta vazia THEN as notas do mês seguem visíveis com retry no painel de feriados (origem: Falhas: Leitura de feriados falha ou volta vazia)
