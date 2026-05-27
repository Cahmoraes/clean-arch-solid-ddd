---
created_at: "2026-05-27T19:13:14-03:00"
updated_at: "2026-05-27T19:13:14-03:00"
---

# PRD: Users List Filters

## Visão Geral

A página `/admin/usuarios` carece de consistência visual com o restante do sistema e não oferece mecanismo para filtrar usuários por categoria nem visualizar rapidamente a distribuição da base. Esta feature resolve os dois problemas: alinha o layout com o padrão estabelecido pelas outras listagens e entrega uma barra de filtros categorizada com contadores em tempo real, tornando o gerenciamento de usuários mais eficiente para administradores.

## Objetivos

- Eliminar a inconsistência de largura entre a página de usuários e as demais listagens do sistema (check-ins como referência)
- Permitir que um administrador identifique, em menos de 3 segundos, quantos usuários existem em cada categoria (total, membros, admins, ativos, inativos)
- Reduzir o tempo para encontrar um subconjunto específico de usuários (ex: apenas administradores) eliminando a necessidade de varrer manualmente toda a lista
- Manter a busca por texto existente funcional em combinação com os novos filtros de categoria

## Histórias de Usuário

**US-001** — Como administrador, quero que a lista de usuários tenha a mesma largura das outras listagens do sistema, para ter uma experiência visual uniforme ao navegar entre páginas.

**US-002** — Como administrador, quero ver o total de usuários por categoria (todos, membros, administradores, ativos, inativos) no topo da página, para ter uma visão imediata do estado da base de usuários sem precisar paginar.

**US-003** — Como administrador, quero filtrar a lista de usuários por categoria selecionando uma tab, para visualizar apenas o subconjunto relevante à ação que preciso realizar.

**US-004** — Como administrador, quero combinar um filtro de categoria com uma busca por nome ou email, para localizar um usuário específico dentro de um grupo (ex: administradores com nome "João").

**US-005** — Como administrador, quero que a paginação seja reiniciada ao trocar de filtro, para não ver resultados deslocados de uma navegação anterior.

**US-006** — Como administrador, quero que os contadores reflitam a situação atual da base após promover ou rebaixar um usuário, para confiar nos números exibidos.

## Funcionalidades Principais

### F1 — Ajuste de Largura da Página

A página `/admin/usuarios` passa a usar o mesmo container de largura máxima da página `/check-ins`.

**Requisitos funcionais:**
- **RF-001**: O container principal da página `/admin/usuarios` tem largura máxima equivalente à da página `/check-ins`, com padding horizontal responsivo.

### F2 — Barra de Filtros com Contadores (`UserFilterBar`)

Componente exibido no topo da lista de usuários, acima do campo de busca, composto por tabs de categoria. Cada tab exibe o nome da categoria e um badge numérico com o total de usuários naquele grupo.

**Categorias disponíveis:** Todos · Membros · Administradores · Ativos · Inativos

**Requisitos funcionais:**
- **RF-002**: A página exibe uma barra de filtros com as cinco categorias: Todos, Membros, Administradores, Ativos, Inativos.
- **RF-003**: Cada categoria exibe um badge numérico com o total de usuários daquele grupo.
- **RF-004**: Os contadores são independentes da paginação — refletem o total real de cada categoria no banco, não apenas os itens da página atual.
- **RF-005**: A tab "Todos" é selecionada por padrão ao carregar a página.
- **RF-006**: Apenas uma categoria pode estar ativa por vez.

### F3 — Filtragem da Lista por Categoria

Selecionar uma tab aplica um filtro à listagem de usuários, que é buscada novamente do servidor com os parâmetros correspondentes.

**Requisitos funcionais:**
- **RF-007**: Selecionar a tab "Membros" exibe apenas usuários com role MEMBER.
- **RF-008**: Selecionar a tab "Administradores" exibe apenas usuários com role ADMIN.
- **RF-009**: Selecionar a tab "Ativos" exibe apenas usuários com status ativo.
- **RF-010**: Selecionar a tab "Inativos" exibe apenas usuários com status inativo.
- **RF-011**: Selecionar a tab "Todos" remove qualquer filtro de categoria ativo.
- **RF-012**: Trocar de filtro reseta a paginação para a página 1.
- **RF-013**: O filtro de categoria e a busca por texto (nome/email) funcionam combinados — ambos os parâmetros são enviados ao servidor simultaneamente.

### F4 — Endpoint de Stats (`GET /users/stats`)

Novo endpoint no backend que retorna os contadores por categoria para alimentar o `UserFilterBar`.

**Requisitos funcionais:**
- **RF-014**: O backend expõe um endpoint de stats de usuários retornando: total, membros, administradores, ativos e inativos.
- **RF-015**: O endpoint é acessível somente por usuários autenticados com role ADMIN.
- **RF-016**: Os contadores são atualizados na interface quando uma operação de promoção ou rebaixamento de role é concluída com sucesso.

### F5 — Filtro na Listagem do Backend (`GET /users`)

O endpoint existente de listagem de usuários passa a aceitar parâmetros opcionais de filtragem por role e por status.

**Requisitos funcionais:**
- **RF-017**: O backend aceita um parâmetro opcional de role (`MEMBER` ou `ADMIN`) na listagem de usuários.
- **RF-018**: O backend aceita um parâmetro opcional de status (`active` ou `inactive`) na listagem de usuários.
- **RF-019**: Na ausência dos parâmetros de filtro, o comportamento existente é preservado (retorna todos os usuários).
- **RF-020**: Os filtros de role e status são aplicados em conjunto com a busca por texto quando ambos estão presentes.

## Experiência do Usuário

**Fluxo principal:**
1. Administrador acessa `/admin/usuarios`
2. Página carrega com tab "Todos" ativa e contadores visíveis por categoria
3. Administrador clica em "Administradores" → lista filtra instantaneamente, badge da tab "Administradores" indica o total
4. Administrador digita um nome no campo de busca → lista refina dentro do filtro de administradores
5. Administrador clica em "Todos" → filtro é removido, busca por texto permanece ativa

**Estados de carregamento:**
- Os contadores exibem estado de carregamento (skeleton) enquanto `GET /users/stats` está em progresso
- A lista exibe skeleton loader padrão enquanto `GET /users` está em progresso
- Os dois carregamentos são independentes e paralelos

**Acessibilidade:**
- As tabs são navegáveis por teclado
- O badge de contagem é legível por leitores de tela (não apenas visual)

## Restrições Técnicas de Alto Nível

- O endpoint `GET /users/stats` deve ser protegido por autenticação JWT e restrito a administradores
- Os contadores devem ser precisos para qualquer volume de dados (não podem ser computados apenas dos itens paginados)
- A solução deve ser compatível com o cache Redis existente — as keys de cache devem incluir os novos parâmetros de filtro
- A invalidação de cache dos contadores deve ocorrer nas mesmas operações que já invalidam a listagem (promoção/demissão de role)

## Fora de Escopo

- Filtros combinados simultâneos (ex: "Membros Ativos") — apenas uma tab ativa por vez
- Ordenação da lista de usuários
- Exportação ou bulk actions sobre o conjunto filtrado
- Notificações em tempo real quando contadores mudam
- Filtros além das cinco categorias definidas (ex: filtro por data de cadastro)
- Modificação do comportamento das ações existentes na lista (promoção, rebaixamento, inativação)
