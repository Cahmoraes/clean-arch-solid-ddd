# ADR004 — Adotar Política Fail-Open para Rate Limiting (skipOnError)

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Configuraremos o plugin `@fastify/rate-limit` com `skipOnError: true` (política fail-open), permitindo que requests sejam processadas normalmente caso o Redis esteja indisponível.

## Contexto

O rate limiting depende do Redis para armazenar e consultar contadores de taxa. Em caso de falha do Redis (queda de conexão, timeout, manutenção), o sistema precisa decidir entre duas políticas:

- **Fail-open**: requests passam sem rate limiting — prioriza disponibilidade
- **Fail-closed**: requests são bloqueadas ou retornam erro — prioriza segurança

O backend é uma API que serve tanto o frontend quanto integrações externas. Uma indisponibilidade total da API causaria impacto direto em todos os usuários, enquanto a ausência temporária de rate limiting representa um risco de segurança circunscrito e temporário.

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Fail-open (`skipOnError: true`)
  - Prós: a API continua funcionando normalmente durante falhas do Redis; impacto limitado a uma janela de tempo sem proteção de rate limiting; alinhado com a prática de mercado para APIs que priorizam disponibilidade; o Redis do projeto já possui fallback e reconexão automática no `RedisAdapter`
  - Contras: durante a janela de indisponibilidade do Redis, o sistema fica desprotegido contra ataques de força bruta e abuso

- **Opção 2** — Fail-closed (`skipOnError: false`)
  - Prós: garantia de que nenhuma request passa sem rate limiting; postura de segurança mais conservadora
  - Contras: falha do Redis derruba efetivamente toda a API; transforma um problema de infraestrutura em indisponibilidade total; penaliza todos os usuários legítimos por um problema que pode ser transitório

- **Opção 3** — Fail-closed com fallback in-memory
  - Prós: mantém algum rate limiting mesmo sem Redis
  - Contras: rate limiting in-memory não funciona em ambiente distribuído (múltiplas instâncias); complexidade adicional de implementação; plugin `@fastify/rate-limit` não suporta fallback automático entre stores

## Consequências

- Positivo: disponibilidade da API preservada durante falhas do Redis
- Positivo: alinhado com o princípio de resiliência — degradação graceful em vez de falha total
- Positivo: configuração simples — uma única flag no plugin
- Negativo: janela de vulnerabilidade durante indisponibilidade do Redis (mitigação: monitoramento de saúde do Redis já existente via `CacheHealthProvider`)
- Negativo: ataques durante a janela de falha não seriam contidos pelo rate limiting da aplicação (mitigação parcial: rate limiting a nível de proxy/Nginx, fora do escopo desta implementação)
