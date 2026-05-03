# ADR001 — Adotar @fastify/rate-limit como Plugin de Rate Limiting

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Adotaremos o plugin oficial `@fastify/rate-limit` para implementar o controle de taxa de requisições no backend Fastify, em vez de desenvolver uma solução customizada.

## Contexto

O backend expõe endpoints HTTP sem qualquer mecanismo de controle de taxa, tornando-o vulnerável a ataques de força bruta, enumeração de credenciais e consumo abusivo de recursos. É necessário introduzir rate limiting de forma compatível com o ecossistema Fastify existente, com suporte a Redis como store distribuído, configuração per-route, headers RFC 6585 e integração com o ciclo de vida de hooks do Fastify.

Critérios de decisão:
- Compatibilidade nativa com Fastify 5.x
- Suporte a Redis como store distribuído (via ioredis, já usado no projeto)
- Configuração granular por rota (limites diferenciados para rotas de autenticação)
- Headers de rate limiting conformes com IETF (RFC 6585 e draft-ietf-httpapi-ratelimit-headers)
- `keyGenerator` customizável (por IP ou userId)
- `max` como função para limites dinâmicos por role (ADMIN vs MEMBER)
- Callbacks de evento (`onExceeded`) para logging e publicação de eventos
- Maturidade e manutenção ativa da biblioteca

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Plugin oficial `@fastify/rate-limit`
  - Prós: mantido pelo time Fastify, suporte nativo a Redis via ioredis, headers RFC automáticos, configuração per-route via `config.rateLimit`, `keyGenerator` e `max` como função, callbacks `onExceeded`/`onExceeding`, opção `skipOnError` para resiliência, benchmark score alto (93.1), 93 code snippets documentados
  - Contras: dependência externa adicional, configuração do hook precisa ser ajustada para `preHandler` (ver ADR002)

- **Opção 2** — Implementação customizada com middleware Fastify
  - Prós: controle total sobre a lógica, sem dependência externa
  - Contras: reinventar funcionalidades já resolvidas (headers RFC, store Redis, TTL automático, per-route config), maior superfície de bugs, custo de manutenção elevado, sem comunidade para suporte

- **Opção 3** — Rate limiting a nível de proxy reverso (Nginx)
  - Prós: desacoplado da aplicação, performático
  - Contras: não permite limites por userId/role (apenas IP), dificulta integração com eventos de domínio (logging, RabbitMQ), fora do controle da aplicação, explicitamente fora do escopo do PRD

## Consequências

- Positivo: solução pronta, testada e mantida pela comunidade Fastify
- Positivo: headers RFC automáticos sem implementação manual
- Positivo: suporte nativo a Redis distribuído, alinhado com a infraestrutura existente
- Positivo: configuração declarativa per-route reduz complexidade
- Negativo: dependência externa que deve acompanhar major releases do Fastify
- Negativo: abstrações do plugin podem limitar customizações muito específicas no futuro
