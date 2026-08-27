---
created_at: "2026-08-27T15:57:43-03:00"
updated_at: "2026-08-27T15:57:43-03:00"
---

# PRD: Paginação do histórico de atividades do perfil

## Visão Geral

Usuários autenticados acessam a aba **Atividade** do próprio perfil para consultar eventos de conta e check-ins. Atualmente, a tela apresenta apenas os 20 eventos mais recentes e não oferece acesso navegável ao restante do histórico. A paginação deve manter a lista compacta, permitir que o usuário encontre períodos anteriores e tornar o comportamento previsível conforme o histórico cresce.

## Objetivos

- Exibir no máximo 20 atividades por página.
- Permitir navegar por todas as páginas disponíveis do histórico do próprio usuário.
- Informar a posição atual, o total de atividades e o total de páginas.
- Preservar a página selecionada na URL para que a navegação seja reproduzível.
- Manter a ordenação decrescente por data e evitar alterações na captura dos eventos.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero navegar pelas páginas do meu histórico de atividades para que eu possa consultar eventos anteriores sem uma lista extensa · **UI:** sim
- **US-02** — Como usuário autenticado, eu quero visualizar quantos eventos existem e em qual página estou para que eu entenda a extensão do meu histórico · **UI:** sim
- **US-03** — Como usuário autenticado, eu quero receber uma indicação clara quando uma página não possui atividades para que eu não confunda ausência de resultados com erro · **UI:** sim
- **US-04** — Como consumidor do contrato do perfil, eu quero receber uma resposta paginada e validada para que a tela possa renderizar navegação consistente · **UI:** não

## Funcionalidades Principais

### Histórico paginado

O histórico do perfil passa a ser consultável por página, mantendo os eventos de conta e check-ins já existentes, sua ordenação e o acesso autenticado.

- **FR-001** (US-01, US-04) — O sistema deve aceitar uma página inteira e positiva para o histórico, usando a primeira página quando o parâmetro não for informado.
- **FR-002** (US-01, US-04) — O sistema deve retornar no máximo 20 atividades em cada página.
- **FR-003** (US-01, US-02, US-04) — O sistema deve retornar a coleção de eventos acompanhada da página atual, do tamanho da página, do total de eventos e do total de páginas.
- **FR-004** (US-01, US-04) — O sistema deve manter os eventos em ordem decrescente de data com desempate estável.
- **FR-005** (US-01, US-02) — A tela deve sincronizar a página selecionada na URL e oferecer navegação numerada somente quando houver mais de uma página.
- **FR-006** (US-03, US-04) — Uma página válida sem eventos deve retornar uma coleção vazia com metadados consistentes e a tela deve comunicar esse estado sem tratá-lo como erro.
- **FR-007** (US-04) — O sistema deve rejeitar parâmetros de página inválidos e preservar a autenticação exigida para o histórico do próprio usuário.

## Experiência do Usuário

Ao abrir a aba **Atividade**, o usuário vê o histórico agrupado por data dentro de um card. O rodapé informa “Exibindo 1–20 de N atividades” e apresenta controles numerados; a página atual fica destacada, e os controles de anterior/próxima respeitam os limites. A tela mantém os estados existentes de carregamento, erro e vazio.

O layout aprovado usa o tema dark VOLT: fundo escuro, card com borda e raio amplo, títulos em Space Grotesk, texto em Inter, metadados em JetBrains Mono e accent verde `#39e58c`. Em telas estreitas, o resumo fica acima dos controles. Os controles devem ser acessíveis por teclado, ter rótulos para tecnologias assistivas e indicar semanticamente a página atual.

Referência visual: `../specs/mockups/paginacao-historico-atividade-perfil-visual.md`.

## Restrições Técnicas de Alto Nível

- O acesso permanece restrito ao usuário autenticado e ao seu próprio histórico.
- O contrato HTTP e os tipos compartilhados devem permanecer alinhados e documentados para os consumidores.
- Cada resposta deve conter no máximo 20 eventos; o sistema não deve depender do envio do histórico completo para montar a tela.
- A página e o total devem ser obtidos de forma consistente para que `totalPages` seja confiável.
- A captura, persistência, retenção e migração dos eventos não fazem parte desta mudança.

## Fora de Escopo

- Alterar a gravação ou o modelo de dados dos eventos.
- Adicionar filtros, busca, exportação, retenção ou expurgo.
- Substituir a navegação numerada por “carregar mais”.
- Tornar o tamanho da página configurável pelo usuário.
- Alterar funcionalmente o endpoint administrativo de atividades.
- Adotar paginação por cursor nesta entrega; essa alternativa só será reavaliada se o volume ou a latência do histórico justificar uma nova decisão.
