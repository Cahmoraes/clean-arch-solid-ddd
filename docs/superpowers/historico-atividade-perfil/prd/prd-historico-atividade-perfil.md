---
created_at: "2026-08-15T18:32:30-03:00"
updated_at: "2026-08-15T18:32:30-03:00"
---

# PRD: Histórico de Atividade no Perfil (/perfil)

## Visão Geral

A funcionalidade de histórico de atividades existe hoje apenas na visão admin (aba "Atividade" do modal de detalhes do usuário). O próprio usuário não tem como acompanhar sua atividade na plataforma: quantas vezes acessou, quando trocou a senha, se a conta foi bloqueada ou sofreu mudanças administrativas (promoção/rebaixamento de role, suspensão/reativação), nem seus check-ins recentes — tudo isso em um único lugar. Esta feature leva esse mesmo feed para a tela `/perfil` (visão do próprio usuário), como uma nova aba "Atividade", com os **mesmos detalhes e as mesmas decisões de paginação** da tela admin: os 20 eventos mais recentes, sem paginação.

## Objetivos

- Um usuário autenticado consegue, a partir da tela `/perfil`, visualizar seu próprio histórico de atividades sem sair da tela.
- O feed do perfil é idêntico ao da tela admin em tipos de evento, ordem, limite e apresentação — nenhum evento é omitido nem exibido de forma divergente.
- Nenhum usuário consegue acessar o histórico de outro usuário pela nova superfície — o acesso é restrito ao próprio histórico.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero ver meu histórico de atividades na tela `/perfil` (aba "Atividade"), para acompanhar o que aconteceu na minha conta em um único lugar.
- **US-02** — Como usuário autenticado, eu quero ver os meus últimos logins no meu histórico, para saber quando acessei a plataforma.
- **US-03** — Como usuário autenticado, eu quero ver eventos de segurança (troca de senha, bloqueio por segurança) no meu histórico, para detectar atividade suspeita na minha conta.
- **US-04** — Como usuário autenticado, eu quero ver meus check-ins misturados com os demais eventos, para ter uma visão unificada da minha atividade.
- **US-05** — Como usuário autenticado, eu quero ver mudanças administrativas sobre minha conta (role, status) no meu histórico, para saber quando fui promovido, rebaixado, suspenso ou reativado.
- **US-06** — Como usuário autenticado, eu quero que meus eventos sejam agrupados por data com um ícone indicando o tipo, para escanear rapidamente o que aconteceu e quando.
- **US-07** — Como usuário autenticado, ao abrir a aba "Atividade" sem nenhum evento registrado, eu quero ver um estado vazio claro, para saber que não há dados em vez de uma tela quebrada ou confusa.
- **US-08** — Como usuário autenticado, eu quero ver o mesmo conteúdo que um administrador vê sobre a minha atividade, com os mesmos detalhes e sem paginação além dos 20 itens recentes, para saber que a informação disponível para mim é a mesma.

## Funcionalidades Principais

**Acesso ao histórico do próprio usuário**
Permite que o usuário consulte apenas o próprio histórico na tela `/perfil`, sem expor dados de terceiros.

- **FR-001** — O sistema deve exibir, na aba "Atividade" da tela `/perfil`, o histórico de atividades do usuário autenticado (e somente dele).
- **FR-002** — O acesso ao histórico do perfil deve exigir autenticação; sem token válido, a requisição deve ser rejeitada como não autorizada.

**Feed de atividade (mesmos detalhes da tela admin)**
Reapresenta no perfil exatamente o que a tela admin já oferece.

- **FR-003** — A aba "Atividade" da tela `/perfil` deve exibir os últimos 20 eventos de atividade do usuário autenticado, ordenados por data/hora decrescente.
- **FR-004** — O feed do perfil deve incluir os mesmos tipos de evento da tela admin: login, senha alterada, conta Google vinculada, conta bloqueada, perfil atualizado, role alterada, status alterado e check-in.
- **FR-005** — Cada evento exibido deve indicar seu tipo e o horário em que ocorreu.
- **FR-006** — O feed do perfil não deve ter paginação nem "carregar mais" — apenas os 20 itens mais recentes (mesma decisão da tela admin).
- **FR-007** — A aba "Atividade" deve carregar os dados apenas quando for aberta pelo usuário (carregamento sob demanda), como já ocorre na tela admin.

**Apresentação visual**
Organiza os eventos de forma escaneável, com o mesmo padrão visual da tela admin.

- **FR-008** — Os eventos devem ser agrupados visualmente por data (ex: "Hoje", "Ontem", data completa).
- **FR-009** — Cada evento deve exibir um ícone com cor distinta conforme sua categoria (check-in, segurança, conta/perfil/administrativo).

**Estados de carregamento, erro e vazio**
Garantem que uma falha não seja confundida com ausência de dados.

- **FR-010** — Enquanto a busca está em andamento, a aba deve exibir um estado de carregamento.
- **FR-011** — Em caso de erro na busca, a aba deve exibir uma mensagem de erro distinta do estado vazio.
- **FR-012** — Se o usuário não tiver nenhum evento registrado, a aba deve exibir um estado vazio claro.

## Experiência do Usuário

O usuário acessa `/perfil` e encontra duas abas: "Visão geral" (o conteúdo atual — cartão de perfil e métricas) e "Atividade". Ao clicar em "Atividade", o feed é buscado e exibido agrupado por data, com cabeçalhos de seção ("Hoje", "Ontem", datas completas) e cada item mostrando um ícone colorido por categoria, a descrição do evento e o horário. Sem paginação nem "carregar mais" nesta versão — apenas os 20 itens mais recentes. Enquanto carrega, um esqueleto de carregamento é exibido; em erro, uma mensagem distinta do vazio; sem eventos, um estado vazio claro.

Decisões visuais completas (posição da aba, agrupamento, cores por categoria, tokens do tema) em `../specs/mockups/historico-atividade-perfil-visual.md`.

## Restrições Técnicas de Alto Nível

Carregadas das Características Arquiteturais validadas na fase de design:

- **Consistência com o padrão existente**: o feed deve reutilizar a leitura e a apresentação já estabelecidas na tela admin — nenhum mecanismo novo de leitura nem de renderização do feed é introduzido (um único componente compartilhado).
- **Segurança/Autorização**: o histórico é exposto apenas ao próprio usuário, com o `userId` derivado da autenticação (nunca de entrada do cliente); nenhum caminho deve permitir consultar a atividade de outro usuário.
- **Confiabilidade do registro**: o write path (captura de eventos) permanece inalterado; uma falha ao gravar atividade continua não impedindo a ação de conta original.
- Sem requisitos de compliance adicionais além dos já aplicáveis ao dado de conta existente.

## Fora de Escopo

- Paginação ou "carregar mais" além dos 20 itens mais recentes (mesma decisão da tela admin).
- Retenção, expurgo ou arquivamento de eventos antigos.
- Filtros por tipo de evento ou por período na aba "Atividade".
- Exportação do histórico de atividade.
- Alterações no registro/captura de eventos (write path) — os eventos já são capturados; esta feature apenas expõe a leitura para o próprio usuário.
- Mudanças na visão admin — o endpoint `GET /users/:userId/activity` e a aba "Atividade" do modal admin permanecem como estão.
- Audit log genérico para outros módulos do sistema além do módulo `user`.