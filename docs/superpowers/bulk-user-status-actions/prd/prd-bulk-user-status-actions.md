---
created_at: "2026-08-04T11:23:35-03:00"
updated_at: "2026-08-04T11:23:35-03:00"
---

# PRD: Ações em Massa (Ativar/Desativar) na Listagem de Usuários

## Visão Geral

Na tela `/admin/usuarios`, o administrador só consegue ativar ou desativar usuários um por
um: abrir o painel de detalhe, clicar em "Mais ações" e aplicar a ação individualmente. Para
qualquer operação que envolva vários usuários (ex.: desativar uma leva de contas suspeitas,
reativar um grupo após um bloqueio temporário), isso exige repetir o mesmo fluxo manual N
vezes.

Esta feature introduz uma **operação em massa** na própria listagem: o administrador marca
múltiplos usuários (checkbox por linha) e aplica Ativar ou Desativar de uma vez, com uma
única confirmação. No banco de dados, a operação é executada como uma escrita bulk (não um
loop de updates individuais) e é idempotente — repetir a mesma solicitação não produz
efeitos colaterais além do já alcançado.

## Objetivos

- Reduzir de N interações manuais (abrir detalhe → mais ações → confirmar, repetido por
  usuário) para 1 fluxo único (selecionar → confirmar) ao alterar o status de vários
  usuários.
- Garantir que a alteração de status de N usuários selecionados seja persistida como **uma
  única operação de escrita** no banco, independente do valor de N (até o limite suportado).
- Garantir que repetir a mesma operação (mesmos usuários, mesma ação) não produza um
  resultado diferente do já alcançado — a operação é idempotente por definição, não apenas
  na prática.
- Manter o mesmo nível de segurança do fluxo individual: nenhum usuário fora da política de
  gestão do administrador logado (ele mesmo, o usuário root, outro administrador) pode ser
  afetado, mesmo que o payload da requisição seja manipulado.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero selecionar múltiplos usuários na listagem e
  aplicar Ativar ou Desativar de uma vez, para não precisar repetir a ação individualmente
  para cada usuário.
- **US-02** — Como administrador, eu quero que usuários que eu não tenho permissão de
  gerenciar (eu mesmo, o usuário root, outro administrador) apareçam com a seleção
  desabilitada, para não tentar aplicar uma ação que seria rejeitada.
- **US-03** — Como administrador, eu quero confirmar explicitamente antes que a ação em
  massa seja aplicada, para evitar que um clique acidental afete vários usuários de uma vez.
- **US-04** — Como administrador, eu quero que a ação "Ativar" em massa também desbloqueie
  usuários bloqueados, para que o comportamento seja consistente com a ativação individual.
- **US-05** — Como administrador, eu quero ver, ao final da operação, quantos usuários
  foram efetivamente atualizados e quantos foram ignorados, para entender o resultado real
  da ação em massa.
- **US-06** — Como administrador, eu quero poder repetir a mesma ação em massa (por exemplo,
  após uma falha de rede) sem me preocupar em causar um efeito duplicado ou inesperado.
- **US-07** — Como administrador, eu quero que minha seleção seja limpa automaticamente ao
  trocar de página, filtro ou busca, para não correr o risco de aplicar uma ação a uma
  seleção que não corresponde mais ao que estou vendo na tela.

## Funcionalidades Principais

### Seleção múltipla na listagem

O que faz: adiciona um checkbox a cada usuário na listagem e um checkbox de "selecionar
página" com suporte a estado indeterminado (seleção parcial).

Por que importa: é o ponto de entrada da feature — sem seleção múltipla, não há operação em
massa possível.

Como funciona (alto nível): a seleção é restrita à página atual carregada na tela; não há
seleção de "todos os N resultados do filtro".

- **FR-001** — O sistema deve permitir que o administrador selecione múltiplos usuários por
  meio de um checkbox por linha, restrito aos usuários exibidos na página atual da
  listagem.
- **FR-002** — O sistema deve fornecer um checkbox "selecionar página", com estado
  indeterminado quando apenas parte dos usuários da página está selecionada.
- **FR-003** — O sistema deve desabilitar o checkbox de seleção para qualquer usuário que o
  administrador logado não tenha permissão de gerenciar (o próprio administrador, o usuário
  root, ou outro administrador).
- **FR-011** — O sistema deve limpar a seleção automaticamente sempre que o administrador
  mudar de página, alterar o filtro de status, ou alterar o termo de busca.

### Aplicação da ação em massa

O que faz: exibe uma barra de ações quando há usuários selecionados, com os botões Ativar,
Desativar e Limpar seleção, e exige confirmação antes de aplicar a ação escolhida.

Por que importa: é a ação central da feature — sem uma barra de ação clara e uma
confirmação, o risco de erro em uma operação que afeta múltiplos usuários de uma vez é alto.

Como funciona (alto nível): ao confirmar, o sistema aplica a ação a todos os usuários
selecionados que o administrador tem permissão de gerenciar, informando ao final quantos
foram atualizados e quantos foram ignorados.

- **FR-004** — O sistema deve exibir uma barra de ações sempre que houver 1 ou mais
  usuários selecionados, oferecendo as opções Ativar, Desativar e Limpar seleção.
- **FR-005** — O sistema deve exigir confirmação explícita do administrador (diálogo de
  confirmação) antes de aplicar Ativar ou Desativar em massa — para ambas as ações, sem
  exceção.
- **FR-006** — A ação "Ativar" em massa deve também desbloquear usuários que estejam com
  status de bloqueado, replicando o comportamento já existente na ativação individual.
- **FR-010** — Ao final da operação, o sistema deve informar ao administrador quantos
  usuários foram solicitados, quantos foram efetivamente atualizados e quantos foram
  ignorados.

### Persistência em lote, idempotente e segura

O que faz: aplica a mudança de status de todos os usuários elegíveis selecionados como uma
única operação de escrita no banco de dados, revalidando no servidor quem pode ser afetado.

Por que importa: é o requisito de negócio explícito desta feature — performance (evitar N
updates individuais) e idempotência (segurança para repetir a operação) a nível de banco de
dados.

Como funciona (alto nível): o servidor sempre reavalia, para cada usuário selecionado, se o
administrador tem permissão de alterá-lo — independentemente do que a interface já
bloqueou — e só então aplica a escrita em lote.

- **FR-007** — A alteração de status dos usuários selecionados deve ser persistida como uma
  única operação de escrita no banco de dados por solicitação, independentemente da
  quantidade de usuários selecionados (respeitado o limite máximo de FR-012).
- **FR-008** — A operação deve ser idempotente: repetir a mesma solicitação (mesmos
  usuários, mesma ação) não deve produzir um resultado diferente do estado já alcançado
  pela primeira execução bem-sucedida.
- **FR-009** — O servidor deve revalidar a permissão do administrador sobre cada usuário
  selecionado antes de aplicar a mudança de status, independentemente do que a interface do
  cliente permitiu selecionar ou do conteúdo da requisição recebida.
- **FR-012** — O sistema deve limitar a quantidade de usuários que podem ser incluídos em
  uma única solicitação de ação em massa a um máximo de 100.

## Experiência do Usuário

A jornada principal: o administrador abre `/admin/usuarios`, marca um ou mais usuários por
checkbox (ou usa "selecionar página"), vê a barra de ações fixa aparecer no rodapé com a
contagem de selecionados, escolhe Ativar ou Desativar, confirma em um diálogo, e recebe um
retorno resumido do resultado (quantos foram atualizados/ignorados).

Decisões visuais já validadas (ver artefato curado
`docs/superpowers/bulk-user-status-actions/specs/mockups/bulk-user-status-actions-visual.md`):
o checkbox fica dentro do card de cada usuário (a listagem continua no formato de cards, não
vira uma tabela de dados) e a barra de ações fica ancorada ao rodapé da lista, aparecendo
apenas quando há seleção — opção escolhida por comparação lado a lado com uma alternativa em
que a barra substituiria a área de busca/filtro no topo.

Acessibilidade: os checkboxes devem ser operáveis por teclado e ter estado
(selecionado/indeterminado/desabilitado) comunicado a leitores de tela, consistente com os
demais controles interativos já existentes na tela.

## Restrições Técnicas de Alto Nível

Características arquiteturais priorizadas (validadas durante o design):

| Característica | Critério mensurável |
|---|---|
| Performance | 1 operação de escrita em lote no banco por solicitação, independente do tamanho da seleção (até 100 usuários) |
| Idempotência | Repetir a mesma solicitação duas vezes produz o mesmo estado final; a segunda chamada não reaplica efeitos |
| Segurança/Autorização | A permissão de gestão é revalidada no servidor para cada usuário da seleção, mesmo que a interface já tenha bloqueado a seleção de usuários inelegíveis |

Outras restrições:
- Nenhum novo mecanismo de autenticação/autorização é introduzido — reaproveita as regras
  de gestão de usuário já existentes.
- A seleção é sempre restrita à página atualmente carregada na listagem (sem seleção
  "cross-page").

## Fora de Escopo

- Seleção entre páginas ("selecionar todos os N resultados do filtro atual").
- Exclusão em massa (soft-delete) de usuários.
- Alteração em massa de papel/role dos usuários.
- Trilha de auditoria detalhada (quem/quando) além da que já existe hoje no sistema — não
  há um novo mecanismo de auditoria granular por usuário para a ação em massa.
- Relatório detalhado de "falha por usuário específico" na interface — o retorno ao
  administrador é agregado (quantidade atualizada/ignorada), não uma lista individual de
  motivos por usuário.
