---
created_at: "2026-07-07T16:00:57-03:00"
updated_at: "2026-07-07T16:00:57-03:00"
---

# PRD: Remoção do Redis Pub/Sub do Broadcast de Notificações (RabbitMQ Fanout)

## Visão Geral

O bounded context `notification` entrega notificações em tempo real (check-in aprovado/rejeitado,
alerta de segurança, promoção) via SSE. Como cada instância Fastify mantém suas próprias conexões
SSE em memória, o broadcast entre instâncias hoje depende de duas peças de infraestrutura em
paralelo: RabbitMQ (durabilidade) e Redis Pub/Sub (broadcast multi-instância). Esta feature
consolida as duas responsabilidades em uma só — RabbitMQ — eliminando o Redis Pub/Sub deste
fluxo específico, sem alterar a experiência do usuário final nem reduzir as garantias de entrega
já existentes.

Beneficia a equipe de engenharia/operações (menos peças de infraestrutura para operar e depurar
neste fluxo) e, indiretamente, o usuário final (mesma confiabilidade de notificação em tempo
real, sem regressão).

O Redis permanece no projeto — usado por rate-limit e BullMQ — apenas os componentes
Redis Pub/Sub específicos deste fluxo são removidos.

## Objetivos

- Eliminar o Redis Pub/Sub do fluxo de broadcast de notificações, sem introduzir uma nova
  dependência de broker além do RabbitMQ já usado no projeto.
- Manter 100% de paridade funcional: nenhuma regressão nos testes existentes de notificação
  (unit, business-flow) após o refactor.
- Suportar broadcast correto entre N instâncias Fastify (escala horizontal), sem configuração
  manual por instância ao subir um novo processo.
- Preservar a garantia de durabilidade atual: uma notificação não pode se perder mesmo que
  todas as instâncias estejam temporariamente fora do ar.

## Histórias de Usuário

- **US-01** — Como usuário autenticado da aplicação, eu quero continuar recebendo notificações em
  tempo real (check-in aprovado/rejeitado, alerta de segurança) no sino do header, para que eu
  não perceba nenhuma diferença na experiência após o refactor de infraestrutura.
- **US-02** — Como usuário que reconecta após uma queda momentânea de rede, eu quero que as
  notificações perdidas durante a desconexão apareçam via catch-up (`Last-Event-ID`), para que eu
  não perca nenhuma notificação relevante.
- **US-03** — Como equipe de engenharia, eu quero que o broadcast multi-instância dependa apenas
  do RabbitMQ (já usado no projeto), para que tenhamos uma peça de infraestrutura a menos para
  operar, monitorar e depurar neste fluxo.
- **US-04** — Como equipe de engenharia, eu quero que uma nova instância Fastify comece a
  receber o broadcast de notificações automaticamente ao subir, sem exigir configuração manual
  por instância, para que a escala horizontal continue simples de operar.
- **US-05** — Como equipe de engenharia, eu quero que os 7 exchanges RabbitMQ `direct` já
  existentes no projeto continuem funcionando exatamente como hoje, para que o refactor não
  introduza regressão em nenhum outro bounded context que dependa do `RabbitMQAdapter`.

## Funcionalidades Principais

### F1 — Broadcast de notificações via exchange fanout RabbitMQ

Substitui o `PSUBSCRIBE notifications:*` do Redis por uma exchange fanout RabbitMQ, com uma
fila exclusiva/auto-delete criada automaticamente por instância Fastify.

- **FR-001**: O sistema deve publicar cada notificação criada em uma exchange fanout do
  RabbitMQ, para consumo por todas as instâncias Fastify conectadas.
- **FR-002**: Cada instância Fastify deve declarar automaticamente sua própria fila exclusiva
  ao subir, sem exigir configuração manual de nome de fila ou binding por instância.
- **FR-003**: A fila de uma instância deve ser destruída automaticamente pelo broker quando a
  conexão dessa instância é encerrada (queda, deploy, restart), sem deixar filas órfãs.
- **FR-004**: Ao reconectar após uma queda de conexão AMQP, a instância deve redeclarar sua
  fila e o binding à exchange automaticamente, sem intervenção manual.

### F2 — Preservação da durabilidade existente

A notificação não pode ser perdida mesmo que nenhuma instância esteja no ar no momento da
criação.

- **FR-005**: A notificação deve continuar sendo persistida no PostgreSQL antes de qualquer
  tentativa de broadcast em tempo real.
- **FR-006**: A publicação na exchange fanout só deve ser confirmada (ack) na fila durável de
  criação após sucesso, preservando a política de reprocessamento já existente em caso de falha.
- **FR-007**: Uma notificação criada enquanto nenhuma instância está no ar deve ficar disponível
  para o usuário assim que ele reconectar, via catch-up por `Last-Event-ID` contra o PostgreSQL
  (comportamento já existente, não deve regressar).

### F3 — Compatibilidade retroativa da infraestrutura de fila compartilhada

O componente de infraestrutura RabbitMQ compartilhado por todo o backend não pode regredir para
os fluxos que já o utilizam.

- **FR-008**: Os 7 exchanges RabbitMQ `direct` já existentes no projeto (fora do bounded context
  `notification`) devem continuar funcionando sem nenhuma mudança de comportamento observável.
- **FR-009**: O componente de infraestrutura de fila compartilhado deve suportar declarar tanto
  exchanges do tipo `direct` (comportamento atual, padrão) quanto do tipo `fanout` (novo, usado
  apenas pelo broadcast de notificações).

### F4 — Remoção do Redis Pub/Sub deste fluxo

- **FR-010**: Os componentes de publisher e subscriber Redis Pub/Sub específicos do bounded
  context `notification` devem ser removidos.
- **FR-011**: Nenhum outro uso de Redis no projeto (rate-limit, BullMQ) deve ser afetado ou
  removido.

## Experiência do Usuário

Sem mudança perceptível para o usuário final: o sino de notificações no header, o dropdown, a
paginação, o "marcar como lida" e a reconexão SSE com catch-up continuam idênticos. Esta feature
é inteiramente de infraestrutura de entrega (backend), sem componente visual novo ou alterado —
não há Especificação Visual associada.

## Restrições Técnicas de Alto Nível

Carregadas do spec de design aprovado (`docs/superpowers/notification-broadcast-fanout/specs/notification-broadcast-fanout-design.md`):

- **Simplicidade operacional**: uma peça de infraestrutura a menos no pipeline de broadcast —
  critério: componentes Redis Pub/Sub deste fluxo removidos do bounded context.
- **Confiabilidade / robustez**: nenhuma regressão na entrega em tempo real existente — critério:
  todos os testes de notificação (unit + business-flow) continuam passando; broadcast permanece
  best-effort com catch-up via `Last-Event-ID`, sem perda de dado no PostgreSQL.
- **Escalabilidade horizontal**: suportar N instâncias sem número fixo configurado — critério:
  fila exclusiva criada automaticamente por instância ao subir.
- **Manutenibilidade / testabilidade**: reuso do adapter RabbitMQ já testado — critério:
  compatibilidade retroativa (`type: 'direct'` como default) para os 7 exchanges existentes.

Integração obrigatória: RabbitMQ (já em uso no projeto). Nenhuma nova infraestrutura externa
além de uma nova dependência de biblioteca cliente (gerenciamento de reconexão AMQP).

## Fora de Escopo

- Qualquer mudança em `SseManager` (mantém `Map<userId, Set<SseClient>>` e cleanup existentes,
  inalterado).
- Qualquer mudança nos endpoints REST/SSE do bounded context `notification`.
- Migração de outros bounded contexts para exchanges fanout (os 7 exchanges `direct` existentes
  continuam `direct`).
- Remoção do Redis do projeto (permanece para rate-limit e BullMQ).
- Producer de notificações de promoção, push notifications mobile/web, email notifications
  (já fora de escopo no spec original do sistema de notificações).
