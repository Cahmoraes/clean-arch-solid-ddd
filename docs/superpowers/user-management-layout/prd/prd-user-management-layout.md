---
created_at: "2026-09-15T19:30:04-03:00"
updated_at: "2026-09-15T19:30:04-03:00"
---

# PRD: Modernização do layout de usuários

## Visão Geral

A rota de usuários precisa permitir que administradores encontrem, consultem e
compreendam usuários com menos troca de contexto. O produto já possui lista, busca,
filtros e painel de detalhe, mas a hierarquia visual pode ser mais clara e consistente
entre desktop e mobile.

Este PRD define uma experiência master-detail moderna, acessível e responsiva, sem
alterar contratos de dados, autorização ou regras de negócio existentes.

## Objetivos

- Permitir localizar um usuário e abrir seu detalhe sem navegação de página.
- Manter lista e detalhe visíveis simultaneamente em desktop amplo.
- Preservar o contexto do usuário selecionado ao alternar entre lista e detalhe.
- Tornar o fluxo completo operável por teclado, com foco visível e contagem anunciada.
- Oferecer uma apresentação legível abaixo de 1024px por meio de drawer.
- Evitar a introdução de edição inline, ações em massa ou novos filtros de negócio.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero filtrar usuários por tipo e status para que eu encontre rapidamente o grupo que preciso gerenciar · **UI:** sim
- **US-02** — Como administrador, eu quero buscar por nome ou e-mail para que eu localize um usuário específico sem percorrer toda a lista · **UI:** sim
- **US-03** — Como administrador, eu quero visualizar a lista e o detalhe do usuário selecionado no mesmo contexto para que eu compare informações sem perder minha posição · **UI:** sim
- **US-04** — Como administrador, eu quero consultar visão geral, atividade e permissões para que eu compreenda o estado e o histórico do usuário · **UI:** sim
- **US-05** — Como administrador em dispositivo menor, eu quero abrir o detalhe em uma apresentação legível para que eu consiga consultar usuários sem conteúdo comprimido · **UI:** sim
- **US-06** — Como administrador que navega por teclado ou tecnologia assistiva, eu quero perceber seleção, resultados e foco para que eu execute o fluxo com segurança · **UI:** sim

## Funcionalidades Principais

### Filtros e busca

Os tipos de usuário devem aparecer como uma seleção segmentada da mesma lista, com
contadores. A busca deve aceitar nome ou e-mail, informar o estado atual e manter o
comportamento server-side existente.

- **FR-001** (US-01) — O sistema deve exibir filtros para todos, membros, administradores, ativos e inativos, permitindo apenas uma categoria ativa por vez.
- **FR-002** (US-01) — O sistema deve exibir a contagem correspondente a cada categoria quando as estatísticas estiverem disponíveis.
- **FR-003** (US-02) — O sistema deve permitir buscar usuários por nome ou e-mail e reiniciar a paginação ao alterar a consulta.
- **FR-004** (US-01, US-02) — O sistema deve preservar filtros e consulta enquanto o administrador consulta o detalhe do usuário selecionado.

### Lista e seleção

A lista deve ser o ponto de navegação principal, com linhas informativas e seleção clara.

- **FR-005** (US-03) — O sistema deve exibir avatar, nome, e-mail, papel e status em cada usuário.
- **FR-006** (US-03) — O sistema deve manter o usuário selecionado visualmente identificado enquanto o detalhe estiver aberto.
- **FR-007** (US-03, US-06) — O sistema deve permitir percorrer usuários com as setas para cima e para baixo e manter foco visível.
- **FR-008** (US-03) — O sistema deve selecionar o primeiro usuário quando houver resultados e nenhum usuário estiver selecionado.

### Detalhe e contexto

O detalhe deve priorizar identidade, status, informações essenciais e acesso às áreas já
existentes de atividade e permissões.

- **FR-009** (US-03, US-04) — O sistema deve exibir o cabeçalho do usuário, seu papel, status e ação principal de edição.
- **FR-010** (US-04) — O sistema deve disponibilizar as áreas de visão geral, atividade e permissões para o usuário selecionado.
- **FR-011** (US-03, US-04) — O sistema deve manter ações secundárias e destrutivas em menu separado, com confirmação para ações irreversíveis.

### Responsividade e acessibilidade

A apresentação deve adaptar a densidade sem duplicar o conteúdo do detalhe.

- **FR-012** (US-03, US-05) — Em viewport de 1024px ou maior, o sistema deve exibir lista e detalhe em split-view com aproximadamente 40% e 60% da largura.
- **FR-013** (US-05) — Em viewport menor que 1024px, o sistema deve apresentar o detalhe em drawer sem perder o usuário selecionado.
- **FR-014** (US-06) — O sistema deve devolver o foco ao item de origem ao fechar o drawer.
- **FR-015** (US-06) — O sistema deve anunciar alterações relevantes na contagem de resultados e na seleção por meio de uma região apropriada para tecnologia assistiva.
- **FR-016** (US-06) — O sistema deve apresentar estados de carregamento, erro, vazio e paginação sem remover a estrutura compreensível da tela.

## Experiência do Usuário

O administrador entra na página e encontra título, contagem e ação primária. Abaixo,
seleciona um tipo de usuário, pesquisa por nome/e-mail ou abre filtros adicionais. A lista
mostra resultados com estado selecionado claro; ao selecionar uma linha, o detalhe aparece
sem trocar de página.

No desktop amplo, o painel de detalhe permanece sticky e rola de forma independente. No
tablet e mobile, o detalhe abre em drawer, recebe foco e devolve o foco para a linha ao ser
fechado. A experiência visual segue o artefato curado em
`specs/mockups/user-management-layout-visual.md`: superfícies escuras, bordas discretas,
destaque de seleção, espaçamento consistente e hierarquia clara.

O segmented control deve ser tratado como filtro, não como tabs, pois as opções filtram a
mesma lista. Tabs verdadeiras ficam restritas às áreas internas do detalhe. Todos os
estados importantes precisam ter equivalente textual, não depender apenas de cor e manter
foco visível.

## Restrições Técnicas de Alto Nível

- Reutilizar os dados, mutations, cache e integrações já existentes no módulo admin.
- Não alterar a autoridade de autorização do backend.
- Manter a organização feature-based e os componentes do design system existentes.
- Preservar busca server-side com debounce e paginação.
- Priorizar usabilidade, acessibilidade e responsividade.
- Validar a experiência com testes unitários, MSW e fluxos E2E existentes.
- Preservar legibilidade e interação em viewports de 375px, 768px e 1024px.

## Fora de Escopo

- Alteração de endpoints, modelo de usuário ou matriz de autorização.
- Ações em massa ou seleção múltipla para mutações.
- Edição inline de campos.
- Novos filtros de negócio, como data, localização ou ordenação adicional.
- Migração de framework, design system, gerenciador de estado ou cliente de dados.
- Criação de uma nova tela de atividade independente.
