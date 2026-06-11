---
created_at: "2026-05-30T15:12:06-03:00"
updated_at: "2026-05-30T15:12:06-03:00"
---

# PRD: Sistema de Notificação em Tempo Real

## Visão Geral

Usuários autenticados da plataforma de academias precisam ser informados imediatamente sobre eventos relevantes à sua conta — aprovação ou rejeição de check-ins e alertas de segurança — sem precisar recarregar a página ou navegar para outra tela.

O sistema expõe um ícone de sino no header com badge de contagem de não-lidas. Ao clicar, um dropdown exibe as notificações recentes. A entrega é em tempo real via Server-Sent Events (SSE).

---

## Objetivos

1. **Entrega em tempo real**: notificações chegam ao browser em até 2 segundos após o evento de domínio ser publicado
2. **Zero perda de notificações**: reconexão automática com replay das mensagens perdidas via `Last-Event-ID`
3. **UX não-intrusiva**: o usuário não sai da página atual para ver as notificações
4. **Rastreabilidade**: notificações de alertas de segurança são persistidas e auditáveis (soft delete, nunca hard delete imediato)
5. **Escalabilidade horizontal**: o sistema funciona com múltiplas instâncias do servidor Fastify

---

## Histórias de Usuário

### US-01 — Receber notificação de check-in aprovado
**Como** membro autenticado,  
**Eu quero** ser notificado em tempo real quando meu check-in for aprovado por um admin,  
**Para que** eu saiba imediatamente que minha entrada na academia foi confirmada.

### US-02 — Receber notificação de check-in rejeitado
**Como** membro autenticado,  
**Eu quero** ser notificado em tempo real quando meu check-in for rejeitado,  
**Para que** eu entenda que algo impediu minha entrada e possa tomar uma ação.

### US-03 — Receber alerta de segurança
**Como** usuário autenticado,  
**Eu quero** ser notificado sobre atividades suspeitas na minha conta (ex: login de novo dispositivo, conta bloqueada),  
**Para que** eu possa reagir rapidamente a uma possível violação de segurança.

### US-04 — Ver contagem de não-lidas
**Como** usuário autenticado,  
**Eu quero** ver um badge numérico no ícone de sino indicando quantas notificações não li,  
**Para que** eu saiba que há algo novo sem precisar abrir o painel.

### US-05 — Abrir painel de notificações
**Como** usuário autenticado,  
**Eu quero** clicar no sino e ver um dropdown com as notificações recentes,  
**Para que** eu possa ler o conteúdo sem sair da página atual.

### US-06 — Marcar notificação individual como lida
**Como** usuário autenticado,  
**Eu quero** que clicar em uma notificação a marque como lida automaticamente,  
**Para que** o badge diminua e eu saiba o que já li.

### US-07 — Marcar todas as notificações como lidas
**Como** usuário autenticado,  
**Eu quero** limpar todas as notificações não-lidas de uma vez com um botão,  
**Para que** eu possa zerar o badge rapidamente sem clicar em cada item.

### US-08 — Manter histórico de notificações
**Como** usuário autenticado,  
**Eu quero** que notificações lidas permaneçam visíveis no painel (em estado visualmente diferenciado),  
**Para que** eu possa consultar o histórico recente.

### US-09 — Não perder notificações ao reconectar
**Como** usuário autenticado,  
**Eu quero** que notificações enviadas enquanto estava offline ou com a aba fechada apareçam ao reconectar,  
**Para que** eu não perca nenhuma informação importante.

---

## Funcionalidades Principais

### F-01 — Entrega em tempo real via SSE

O servidor mantém uma conexão SSE persistente por aba autenticada do usuário. Quando um evento relevante ocorre, o servidor entrega uma notificação pelo canal SSE sem necessidade de polling.

**Requisitos funcionais:**

- **RF-001**: O sistema deve entregar notificações ao browser em até 2 segundos após o evento de domínio ser publicado.
- **RF-002**: A conexão SSE deve ser mantida enquanto o usuário estiver autenticado e com a aba aberta.
- **RF-003**: A autenticação do endpoint SSE deve usar o mesmo mecanismo Bearer token dos demais endpoints da API.
- **RF-004**: O sistema deve suportar múltiplas abas abertas do mesmo usuário — todas devem receber as notificações.
- **RF-005**: Ao reconectar, o cliente deve enviar o `Last-Event-ID` e o servidor deve fazer replay das notificações perdidas desde aquele evento.

---

### F-02 — Badge de não-lidas no ícone de sino

O ícone de sino no header exibe um badge numérico vermelho com a contagem de notificações não-lidas.

**Requisitos funcionais:**

- **RF-006**: O badge deve exibir o número exato de notificações não-lidas do usuário.
- **RF-007**: O badge deve desaparecer quando `unreadCount === 0`.
- **RF-008**: O badge deve ser atualizado em tempo real ao receber novas notificações via SSE (sem reload).
- **RF-009**: O badge deve ser atualizado imediatamente (optimistic update) ao marcar notificações como lidas.

---

### F-03 — Dropdown de notificações

Ao clicar no sino, um painel dropdown exibe as notificações recentes sem sair da página.

**Requisitos funcionais:**

- **RF-010**: O dropdown deve exibir as 10 notificações mais recentes do usuário, ordenadas da mais recente para a mais antiga.
- **RF-011**: Notificações não-lidas devem ser visualmente distintas das lidas (indicador colorido + fundo diferenciado por tipo).
- **RF-012**: Notificações lidas devem permanecer visíveis com opacidade reduzida.
- **RF-013**: O dropdown deve exibir para cada notificação: título, corpo resumido e tempo relativo (ex: "2 min atrás").
- **RF-014**: O dropdown deve exibir um link "Ver histórico completo" que navega para `/notificacoes`.
- **RF-015**: O botão "Marcar todas lidas" deve estar desabilitado quando não há notificações não-lidas.

---

### F-04 — Marcar como lida

**Requisitos funcionais:**

- **RF-016**: Clicar em uma notificação não-lida no dropdown deve marcá-la como lida imediatamente (optimistic update).
- **RF-017**: O badge deve decrementar em 1 imediatamente ao clicar em uma notificação não-lida.
- **RF-018**: Clicar em "Marcar todas lidas" deve zerar o badge e atualizar o estado de todas as notificações do usuário.
- **RF-019**: Clicar em uma notificação já lida não deve produzir efeito visível adicional.

---

### F-05 — Tipos de notificação suportados

**Requisitos funcionais:**

- **RF-020**: O sistema deve suportar o tipo `CHECK_IN_APPROVED` gerado automaticamente quando um admin valida um check-in.
- **RF-021**: O sistema deve suportar o tipo `CHECK_IN_REJECTED` gerado automaticamente quando um admin rejeita um check-in.
- **RF-022**: O sistema deve suportar o tipo `SECURITY_ALERT` gerado por eventos de segurança da conta (ex: bloqueio por tentativas excessivas de login).
- **RF-023**: Notificações do tipo `SECURITY_ALERT` não devem ser hard-deletadas imediatamente — devem usar soft delete para fins de auditoria.

---

### F-06 — Persistência e histórico

**Requisitos funcionais:**

- **RF-024**: Todas as notificações devem ser persistidas no banco de dados antes de serem entregues via SSE.
- **RF-025**: O endpoint `GET /api/v1/notifications` deve retornar a lista paginada (cursor-based) de notificações do usuário autenticado.
- **RF-026**: O endpoint `GET /api/v1/notifications/unread-count` deve retornar a contagem exata de não-lidas.
- **RF-027**: Notificações excluídas (soft delete) não devem aparecer na listagem.

---

## Experiência do Usuário

### Jornada principal: receber e ler uma notificação

1. Admin valida o check-in do membro → badge aparece/incrementa no sino do membro em ≤2s
2. Membro clica no sino → dropdown abre mostrando a notificação não-lida com indicador colorido
3. Membro clica na notificação → item fica com opacidade reduzida, badge decrementa imediatamente
4. Dropdown fecha ao clicar fora

### Jornada: voltar após ausência

1. Usuário abre o browser após período offline
2. SSE reconecta automaticamente com `Last-Event-ID`
3. Servidor replica as notificações perdidas
4. Badge mostra total acumulado de não-lidas

### Diferenciação visual por tipo

| Tipo | Cor do dot | Fundo do item |
|---|---|---|
| `CHECK_IN_APPROVED` | Verde | Verde escuro translúcido |
| `CHECK_IN_REJECTED` | Vermelho | Vermelho escuro translúcido |
| `SECURITY_ALERT` | Amarelo | Amarelo escuro translúcido |

---

## Restrições Técnicas de Alto Nível

- O sistema deve funcionar com múltiplas instâncias do servidor (escalonamento horizontal)
- A autenticação do SSE deve ser compatível com o mecanismo Bearer token já em uso na plataforma
- Notificações de segurança devem ser retidas por no mínimo 90 dias antes de poderem ser removidas
- O sistema deve degradar graciosamente se Redis ou RabbitMQ estiverem temporariamente indisponíveis (notificação já persistida no Postgres é fonte da verdade)
- A integração deve seguir o padrão Clean Architecture já estabelecido no projeto (domain / application / infra)

---

## Fora de Escopo

- **Producer de promoções**: o sistema suporta o tipo `PROMOTION` no schema, mas nenhuma lógica para criá-las será implementada nesta fase
- **Push notifications** (Web Push API / service workers): notificações quando o usuário está offline no browser
- **Email notifications**: já existem em bounded context separado, não serão afetadas
- **Página `/notificacoes`**: o dropdown inclui link "Ver histórico", mas a página dedicada com filtros/busca é implementação futura
- **Broadcast de promoções**: tabela `broadcast_notifications` não será criada nesta fase
- **Notificações para admin**: somente membros recebem notificações de check-in; admins recebem alertas de segurança como qualquer usuário autenticado
