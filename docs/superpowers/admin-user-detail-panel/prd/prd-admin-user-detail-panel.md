---
created_at: "2026-05-30T20:47:53-03:00"
updated_at: "2026-05-30T20:47:53-03:00"
---

# PRD: Painel de Detalhes do Usuário (Admin)

## Visão Geral

Administradores precisam visualizar os detalhes completos de um usuário e executar ações de
gerenciamento a partir da lista de usuários do painel admin. Hoje a lista exibe apenas informações
resumidas em cada linha. Esta feature adiciona um **painel de detalhes** que abre ao clicar em um
usuário, apresentando dados completos e ações administrativas sem que o admin perca o contexto da
lista.

A solução adota um layout **split-view inline** no desktop (lista à esquerda, detalhes à direita,
sem overlay) e um **Dialog bottom-sheet** no mobile. O conteúdo é idêntico nas duas apresentações,
servido por um único componente compartilhado.

**Público:** administradores do sistema (`role = ADMIN`).

## Objetivos

- Permitir que o admin veja todos os dados de um usuário em ≤ 1 clique a partir da lista.
- Permitir navegação direta entre usuários no desktop (trocar de usuário sem fechar/reabrir nada).
- Centralizar as ações administrativas (editar, suspender/reativar, promover/revogar admin, excluir)
  em um único ponto, sempre com confirmação para ações sensíveis.
- Preservar o contexto da lista durante a inspeção de um usuário (desktop).
- Garantir paridade total de conteúdo entre desktop e mobile.

**Métrica de sucesso:** o admin consegue inspecionar e agir sobre um usuário sem navegar para outra
página; ações destrutivas nunca são executadas sem confirmação explícita.

## Histórias de Usuário

- **US-01** — Como administrador, quero clicar em um usuário na lista para ver seus detalhes completos,
  para que eu possa avaliar sua conta sem sair da página.
- **US-02** — Como administrador no desktop, quero que a lista continue visível ao lado dos detalhes,
  para que eu mantenha o contexto e compare usuários rapidamente.
- **US-03** — Como administrador no desktop, quero alternar para outro usuário clicando em outra linha,
  para que eu inspecione vários usuários em sequência sem reabrir um modal.
- **US-04** — Como administrador no mobile, quero que os detalhes abram em um painel deslizante de tela
  cheia, para que a experiência seja confortável em telas pequenas.
- **US-05** — Como administrador, quero ver os dados organizados em abas (Detalhes, Permissões,
  Atividade), para que eu encontre rapidamente a informação que procuro.
- **US-06** — Como administrador, quero editar os dados de um usuário a partir do painel, para que eu
  corrija informações de conta.
- **US-07** — Como administrador, quero suspender ou reativar um usuário, para que eu controle o acesso
  dele ao sistema, com confirmação antes de aplicar.
- **US-08** — Como administrador, quero promover um membro a admin ou revogar privilégios de admin, para
  que eu gerencie permissões, com confirmação antes de aplicar.
- **US-09** — Como administrador, quero excluir um usuário, para que eu remova contas indevidas, com
  confirmação antes de aplicar.
- **US-10** — Como administrador, quero ver o status e a role do usuário de forma destacada, para que eu
  identifique o estado da conta de imediato.
- **US-11** — Como administrador, quero que as ações disponíveis reflitam o estado atual do usuário
  (ex.: "Suspender" para ativos, "Reativar" para suspensos), para que eu não execute ações inválidas.

## Funcionalidades Principais

### 1. Abertura do painel de detalhes

Ao clicar em uma linha da lista, o painel de detalhes do usuário é exibido.

- **RF-001** — Clicar em uma linha de usuário deve exibir o painel de detalhes desse usuário.
- **RF-002** — No desktop (≥ 768px), o painel deve aparecer como coluna à direita da lista, sem overlay,
  mantendo a lista visível à esquerda.
- **RF-003** — No mobile (< 768px), o painel deve abrir como um Dialog bottom-sheet sobre a lista.
- **RF-004** — A linha do usuário atualmente selecionado deve receber destaque visual na lista.
- **RF-005** — No desktop, clicar em outra linha deve substituir o conteúdo do painel pelos dados do
  novo usuário, sem fechar o painel.
- **RF-006** — No desktop, quando nenhum usuário estiver selecionado, o painel deve exibir um estado
  vazio orientando a selecionar um usuário.

### 2. Conteúdo em abas

Os dados do usuário são organizados em três abas.

- **RF-007** — O painel deve apresentar as abas: `Detalhes`, `Permissões` e `Atividade`.
- **RF-008** — A aba `Detalhes` deve exibir: nome completo, e-mail, User ID, status, role, data de
  criação ("Membro desde") e último acesso.
- **RF-009** — A aba `Permissões` deve exibir a role atual e oferecer a ação de promover/revogar admin.
- **RF-010** — A aba `Atividade` deve exibir o histórico de eventos do usuário (login, mudança de role,
  alteração de senha, criação de conta) com data e hora.
- **RF-011** — Quando os dados de "último acesso" ou de "atividade" não estiverem disponíveis na API, a
  interface deve exibir um estado vazio gracioso ("Sem dados de atividade disponíveis") em vez de erro.

### 3. Cabeçalho de identidade

- **RF-012** — O cabeçalho do painel deve exibir avatar (iniciais com fallback), nome, e-mail e badges
  de status e role.
- **RF-013** — O status e a role devem ser comunicados por texto além de cor (acessibilidade).

### 4. Ações administrativas

- **RF-014** — O painel deve oferecer as ações: editar dados, suspender/reativar, promover/revogar admin
  e excluir usuário.
- **RF-015** — Toda ação sensível (suspender, reativar, promover, revogar, excluir) deve exigir
  confirmação via diálogo antes de ser executada.
- **RF-016** — As ações exibidas devem ser contextuais ao estado do usuário: "Suspender" para usuários
  ativos e "Reativar" para suspensos; "Promover" para membros e "Revogar" para admins.
- **RF-017** — "Editar dados" deve abrir um formulário de edição dedicado.
- **RF-018** — Enquanto uma ação está em andamento, o controle correspondente deve indicar estado de
  carregamento (`aria-busy`).
- **RF-019** — A ação "Excluir" deve ficar oculta ou desabilitada enquanto não existir endpoint de
  exclusão no backend.

### 5. Acessibilidade e navegação

- **RF-020** — No desktop, as setas ↑/↓ devem mover a seleção entre as linhas da lista, atualizando o
  painel.
- **RF-021** — O Dialog mobile deve prender o foco e fechar com `Esc`, seguindo o padrão de diálogo do
  design system.
- **RF-022** — As abas devem ser navegáveis por teclado, com indicação de aba ativa (`aria-selected`).

## Experiência do Usuário

**Fluxo principal (desktop):** o admin está na lista de usuários → clica em uma linha → o painel surge à
direita com a aba `Detalhes` ativa → navega entre abas ou clica em outra linha para inspecionar outro
usuário → executa uma ação (ex.: suspender) → confirma no diálogo → vê o status atualizado.

**Fluxo principal (mobile):** o admin vê a lista em tela cheia → toca em um usuário → um painel sobe da
base com os mesmos dados e ações → fecha por swipe, botão ou backdrop.

**Considerações de UX/UI:**
- Destaque claro da linha ativa.
- Estados de carregamento (`Skeleton`) e vazio bem definidos.
- Ações destrutivas visualmente diferenciadas e sempre confirmadas.
- Paridade total de conteúdo entre desktop e mobile.

## Restrições Técnicas de Alto Nível

- A feature é restrita a usuários com `role = ADMIN`.
- Os dados de identidade já disponíveis na API: `id`, `name`, `email`, `role`, `status`, `createdAt`.
- Dependências de dados ainda não garantidas pela API: último acesso (`lastLoginAt`), histórico de
  auditoria/atividade e endpoint de exclusão de usuário. A feature de visualização não deve ser
  bloqueada por essas dependências — elas degradam graciosamente.
- Deve respeitar o design system e os padrões de diálogo/badge existentes no frontend.

## Fora de Escopo

- Edição inline de campos diretamente no painel (a edição ocorre em formulário/modal dedicado).
- Ações em massa (multi-seleção de usuários).
- Implementação do backend de auditoria/atividade (feature dependente, se necessária).
- Implementação do endpoint de exclusão de usuário no backend (dependência sinalizada).
- Exportação de dados de um usuário individual.
