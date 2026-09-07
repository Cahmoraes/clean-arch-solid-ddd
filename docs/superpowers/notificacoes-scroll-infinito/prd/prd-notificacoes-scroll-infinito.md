---
created_at: "2026-09-07T10:36:27-03:00"
updated_at: "2026-09-07T10:48:51-03:00"
---

# PRD: Scroll Infinito no Dropdown de Notificações

## Visão Geral

O dropdown de notificações no header da aplicação hoje carrega apenas uma página fixa de até 10 notificações, sem forma de acessar itens mais antigos sem sair do componente. Para usuários com muitas notificações, carregar tudo de uma vez consumiria rede e tempo de carregamento desnecessários. Esta feature adiciona scroll infinito ao dropdown: a lista cresce em lotes conforme o usuário rola, parando automaticamente quando não há mais notificações.

## Objetivos

- Reduzir o volume de dados transferidos por abertura do dropdown quando o usuário tem muitas notificações — cada busca adicional traz no máximo 5 itens.
- Manter a experiência de tempo real existente (notificações via SSE) funcionando sem re-buscar dados já carregados.
- Não introduzir regressão nas ações existentes do dropdown (marcar como lida, marcar todas como lidas).

## Histórias de Usuário

- **US-01** — Como usuário com muitas notificações, eu quero que o dropdown carregue mais itens automaticamente ao rolar para baixo, para não precisar esperar o carregamento de todo o histórico de uma vez · **UI:** sim
- **US-02** — Como usuário com poucas notificações (5 ou menos), eu quero que o dropdown continue funcionando normalmente sem comportamento de scroll infinito desnecessário, para que a experiência não mude quando não há nada a paginar · **UI:** sim
- **US-03** — Como usuário com o dropdown aberto, eu quero que notificações novas apareçam automaticamente no topo da lista, para não perder atualizações em tempo real enquanto navego pelo histórico já carregado · **UI:** sim
- **US-04** — Como usuário, eu quero ver um indicador discreto de carregamento enquanto o próximo lote é buscado, para saber que a lista ainda está carregando e não que travou · **UI:** sim
- **US-05** — Como usuário, eu quero que uma falha temporária de rede ao carregar mais notificações não quebre a lista já carregada, para continuar usando o dropdown normalmente · **UI:** sim

## Funcionalidades Principais

### Carregamento paginado por lotes

A lista inicia com até 10 notificações. Ao rolar até o fim da lista, o sistema busca automaticamente o próximo lote de até 5 notificações, repetindo até não haver mais notificações a carregar.

- **FR-001** (US-01) — O sistema deve buscar automaticamente o próximo lote de notificações quando o usuário rolar até o fim da lista atualmente carregada no dropdown.
- **FR-002** (US-01) — Cada lote buscado após a carga inicial deve conter no máximo 5 notificações.
- **FR-003** (US-01) — A carga inicial do dropdown deve conter no máximo 10 notificações.
- **FR-004** (US-01, US-02) — O sistema deve parar de buscar novos lotes quando não houver mais notificações a carregar, sem exibir indicador de carregamento nesse estado.
- **FR-005** (US-02) — Quando o total de notificações do usuário for menor ou igual ao tamanho da carga inicial, o dropdown deve exibir a lista completa sem disparar nenhuma busca adicional.

### Reconciliação com notificações em tempo real

Notificações recebidas via o canal de tempo real (SSE) existente devem aparecer imediatamente no dropdown aberto, sem descartar ou re-buscar os lotes já carregados pelo scroll.

- **FR-006** (US-03) — Uma notificação recebida em tempo real enquanto o dropdown está aberto deve aparecer imediatamente no topo da lista, sem exigir reabertura do dropdown.
- **FR-007** (US-03) — A chegada de uma notificação em tempo real não deve re-buscar ou descartar os lotes de notificações já carregados pelo scroll.

### Suporte de paginação no backend

A API de notificações precisa aceitar buscar um número específico de itens a partir de uma posição específica, para permitir lotes de tamanhos diferentes (10 na carga inicial, 5 depois). A forma de paginação hoje existente (por número de página) continua funcionando normalmente para quem já a utiliza.

- **FR-012** (US-01) — O sistema deve permitir buscar notificações informando quantos itens pular e quantos itens retornar, de forma que a carga inicial e os lotes seguintes possam ter tamanhos diferentes.
- **FR-013** (US-01) — A forma de busca de notificações por número de página, já usada por outras partes do sistema, deve continuar funcionando sem alteração de comportamento.

### Feedback de carregamento e falhas

- **FR-008** (US-04) — O sistema deve exibir um indicador visual discreto de carregamento no rodapé da lista enquanto o próximo lote está sendo buscado.
- **FR-009** (US-04) — O indicador de carregamento deve desaparecer assim que o lote terminar de carregar ou quando não houver mais notificações a carregar.
- **FR-010** (US-05) — Se a busca de um novo lote falhar, o sistema deve tentar novamente automaticamente, sem exigir ação do usuário e sem exibir mensagem de erro.
- **FR-011** (US-05) — Uma falha ao buscar um novo lote não deve remover ou alterar as notificações já exibidas na lista.

## Experiência do Usuário

O usuário abre o dropdown de notificações pelo ícone no header, como hoje. A lista aparece já com até 10 itens. Ao rolar o mouse/touch até o fim da lista visível, novos itens surgem automaticamente em grupos de 5, com um spinner sutil aparecendo brevemente no rodapé durante cada busca. Quando não há mais notificações, o spinner simplesmente não aparece mais — não há mensagem de "fim da lista". Se uma notificação nova chegar em tempo real enquanto o usuário navega pela lista já carregada, ela surge no topo sem interromper a posição do scroll. As ações já existentes (marcar como lida, marcar todas como lidas) continuam disponíveis normalmente sobre qualquer item, independente de qual lote o carregou.

## Restrições Técnicas de Alto Nível

- **Performance:** cada busca de lote adicional deve transferir no máximo 5 notificações — critério mensurável validado no design.
- **Confiabilidade:** falha ao buscar um lote não pode invalidar ou remover lotes já carregados; reconciliação com tempo real não deve duplicar itens.
- **Testabilidade:** o comportamento de paginação e a reconciliação com tempo real devem ser cobertos por testes automatizados, já que introduzem um padrão novo no frontend.
- A API de notificações precisa de uma extensão retrocompatível de contrato (FR-012/FR-013) — descoberto durante o planejamento técnico, a paginação existente não suportava lotes de tamanho variável.

## Fora de Escopo

- Uma tela dedicada de histórico completo de notificações (fora do dropdown) — não faz parte desta feature.
- Mensagem de erro visível ao usuário quando o retry automático falhar repetidamente — a decisão de produto foi falha silenciosa (ver FR-010/FR-011); uma UI de erro fica para uma iteração futura, se necessário.
- Alterar o comportamento de paginação de outras telas do sistema (ex.: atividade de perfil, atividade de admin) — essas telas mantêm paginação numerada por decisão de produto já registrada em features anteriores.
- Botão manual de "carregar mais" — o carregamento é sempre automático por scroll.
