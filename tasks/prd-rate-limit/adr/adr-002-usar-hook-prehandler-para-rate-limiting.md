# ADR002 — Usar Hook preHandler para Execução do Rate Limiting

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Configuraremos o plugin `@fastify/rate-limit` com `hook: 'preHandler'` em vez do padrão `hook: 'onRequest'`, para que o rate limiting execute após a autenticação JWT.

## Contexto

O ciclo de vida de hooks do Fastify executa na ordem: `onRequest` → `preParsing` → `preValidation` → `preHandler` → handler. No backend atual, a autenticação JWT (`AuthenticateHandler`) é registrada como hook `onRequest` e popula `request.user.sub` com `{ id, email, role, jwi }`.

O rate limiting precisa acessar `request.user` para duas funcionalidades:
1. **keyGenerator por userId** — rotas autenticadas devem ter contadores individualizados por usuário, não por IP
2. **Multiplicador de limite por role** — administradores (ADMIN) recebem limites 3x maiores que membros (MEMBER)

Se o rate limiting executasse no `onRequest` (padrão do plugin), ele rodaria antes ou em paralelo com a autenticação, e `request.user` ainda não existiria — toda a lógica cairia no fallback de IP.

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Hook `preHandler`
  - Prós: `request.user` já está populado pelo JWT, permitindo keyGenerator por userId e max dinâmico por role; body já parseado e validado; compatível com o fluxo existente de `AdminRoleCheck` e `CheckSessionRevokedHandler` que também rodam em `preHandler`
  - Contras: rate limiting executa mais tarde no ciclo — requests maliciosas consomem mais recursos antes de serem bloqueadas (parsing de body, validação)

- **Opção 2** — Hook `onRequest` (padrão do plugin)
  - Prós: bloqueio mais cedo no ciclo, menor consumo de recursos para requests bloqueadas
  - Contras: `request.user` não existe neste ponto; impossibilita keyGenerator por userId e multiplicador por role; toda a lógica diferenciada seria perdida, reduzindo o rate limiting a apenas IP-based

- **Opção 3** — Dois registros do plugin (onRequest para auth, preHandler para demais)
  - Prós: rotas de auth bloqueadas cedo (por IP), demais rotas com userId
  - Contras: complexidade duplicada de configuração, dois stores separados, risco de conflito de headers, manutenção difícil

## Consequências

- Positivo: permite rate limiting inteligente baseado em identidade do usuário e role
- Positivo: alinhado com o fluxo existente de hooks do projeto (auth em onRequest, autorizações em preHandler)
- Positivo: simplicidade — único registro do plugin com configuração unificada
- Negativo: requests bloqueadas consomem recursos de parsing/validação antes do bloqueio (overhead considerado aceitável dado o tempo de janela de 15 minutos)
