# ADR003 — Criar Conexão Redis Dedicada para Rate Limiting

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Criaremos uma instância ioredis dedicada exclusivamente para o rate limiting, separada da instância `RedisAdapter`/`CacheDB` usada pelo cache da aplicação.

## Contexto

O projeto já possui uma infraestrutura Redis (`RedisAdapter`) registrada no IoC via `CacheDBProvider`, usada para cache de dados (perfis de usuário, tokens revogados). O plugin `@fastify/rate-limit` aceita uma instância ioredis como parâmetro `redis` para armazenar contadores de taxa.

A questão é: reusar a instância existente ou criar uma dedicada? Durante cenários de ataque, o rate limiting gera volume elevado de operações Redis (leitura + incremento atômico por request). Além disso, o `RedisAdapter` possui lógica customizada de fallback para `CacheDBMemory`, cooldown de reconexão e retry strategy — comportamentos que não se aplicam ao rate limiting.

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Conexão ioredis dedicada
  - Prós: isolamento total — problemas no cache não afetam rate limiting e vice-versa; configuração de retry e timeout pode ser otimizada para o caso de uso específico; durante ataques, o volume de operações de rate limiting não degrada o cache da aplicação; lifecycle independente
  - Contras: uma conexão Redis adicional para gerenciar (connect/disconnect no shutdown); custo marginal de memória no Redis server

- **Opção 2** — Reusar instância `CacheDB`/`RedisAdapter` do IoC
  - Prós: sem conexão adicional, reutiliza infraestrutura existente, fallback para memória já implementado
  - Contras: acoplamento entre cache e rate limiting; lógica de fallback do `RedisAdapter` (CacheDBMemory com NodeCache) não é compatível com o protocolo do plugin; durante ataques, operações de rate limiting podem saturar a conexão compartilhada, degradando funcionalidades de cache (ex: perfis de usuário, tokens revogados)

## Consequências

- Positivo: isolamento de falha — problemas no rate limiting não afetam cache e vice-versa
- Positivo: permite configuração de retry/timeout otimizada para rate limiting
- Positivo: o plugin `@fastify/rate-limit` gerencia internamente os comandos Redis, sem necessidade de adaptar a interface `CacheDB`
- Negativo: uma conexão Redis adicional para gerenciar no lifecycle do servidor
- Negativo: duplicação parcial de configuração de conexão (host, porta)
