# Relatório de Code Review — Rate Limiting no Backend

**Data:** 2026-05-03
**Feature:** Rate Limiting (`tasks/prd-rate-limit/`)
**Branch:** `monorepo-migration` (commits `f27a774`, `04d69b2`)
**Status:** ✅ APROVADO COM OBSERVAÇÕES

---

## 1. Resumo das Alterações

| Tipo | Arquivos |
|------|----------|
| **Criados** | `rate-limit-config.ts`, `rate-limit-plugin.ts`, `rate-limit-config.test.ts`, `rate-limit-plugin.test.ts`, `rate-limit.business-flow-test.ts` |
| **Modificados** | `fastify-adapter.ts`, `http-server.ts`, `exchanges.ts`, `package.json`, 4 controllers (auth/activate/create-user/refresh-token), `health-check-controller.ts`, `stripe-webhook.controller.ts` |
| **Total** | 11 arquivos modificados, 5 arquivos criados, +82 linhas no diff tracked |

---

## 2. Conformidade com Tech Spec

| Requisito | Status | Notas |
|-----------|--------|-------|
| Plugin `@fastify/rate-limit` oficial | ✅ | v10.3.0 instalada |
| Hook `preHandler` (após JWT auth) | ✅ | Conforme especificado |
| `keyGenerator` (IP vs userId) | ✅ | Implementado corretamente |
| `max` dinâmico por role (ADMIN 3x) | ✅ | Global e per-route |
| `onExceeded` (log + RabbitMQ best-effort) | ⚠️ | Promise não tratada (ver bug #1) |
| `skipOnError: true` (fail-open) | ✅ | Conforme |
| `max: Infinity` em testes | ✅ | Transparente para testes existentes |
| Redis dedicado | ✅ | Conexão separada do CacheDB |
| Per-route overrides (auth 20/15min) | ✅ | 4 rotas configuradas |
| Exclusões (health, webhook) | ✅ | `rateLimit: false` |
| Exchange `RATE_LIMIT_EXCEEDED` | ✅ | Adicionado |
| Lifecycle Redis no `close()` | ✅ | `RateLimitPlugin.disconnect()` |

---

## 3. Completude das Tasks

| Task | Subtarefas | Status |
|------|-----------|--------|
| 1.0 — Config base | 7/7 | ✅ Completa |
| 2.0 — Plugin core | 8/8 | ✅ Completa |
| 3.0 — Integração FastifyAdapter | 6/6 | ✅ Completa |
| 4.0 — Testes integração + gate | 12/12 | ✅ Completa |

---

## 4. Resultados dos Testes

| Suíte | Resultado |
|-------|-----------|
| `tsc:check` | ✅ Zero erros |
| `test` (unit) | ✅ 308/308 (55 arquivos) |
| `test:business-flow` | ✅ 63/63 (21 arquivos) |
| Novos testes config | ✅ 8 testes |
| Novos testes plugin | ✅ 7 testes |
| Novos testes integração | ✅ 6 testes |

---

## 5. Findings

### 🔴 BUG-001 — Promise não tratada em `onExceeded` (Severidade: Major)

**Arquivo:** `rate-limit-plugin.ts`, linhas 104-108
**Descrição:** O callback `onExceeded` chama `queue.publish()` sem `await` e sem `.catch()`. Como `Queue.publish()` retorna `Promise<void>`, se a Promise rejeitar (ex: RabbitMQ down), o `try/catch` síncrono NÃO captura a rejeição. Isso pode causar um **unhandled Promise rejection**.

```typescript
// ATUAL (problemático)
try {
    queue.publish(EXCHANGES.RATE_LIMIT_EXCEEDED, event)
} catch {
    // NÃO captura rejeições de Promise!
}
```

**Correção sugerida:**
```typescript
// CORRIGIDO
queue.publish(EXCHANGES.RATE_LIMIT_EXCEEDED, event).catch(() => {
    // best-effort: silently ignore publish failures
})
```

**Impacto:** Em produção, se o RabbitMQ estiver offline e o rate limit for excedido, cada requisição bloqueada geraria um unhandled rejection. Em cenário de ataque com muitas requisições, isso pode gerar flood de erros no runtime.

---

### 🟡 OBS-001 — Estado estático no `RateLimitPlugin` (Severidade: Minor)

**Arquivo:** `rate-limit-plugin.ts`, linha 15
**Descrição:** `redisClient` é um campo `static`, criando estado global compartilhado. Aceitável para um plugin singleton, mas dificulta testes isolados do `register()`.
**Impacto:** Baixo — padrão consistente com o design de plugin singleton.

### 🟡 OBS-002 — Testes de integração usam Fastify standalone (Severidade: Minor)

**Arquivo:** `rate-limit.business-flow-test.ts`
**Descrição:** Os testes criam uma instância Fastify isolada em vez de usar `serverBuildForTest()`. Isso é uma decisão pragmática necessária (produção usa `max: Infinity` em testes), mas significa que o `RateLimitPlugin.register()` real não é exercitado nos business-flow tests.
**Mitigação:** Os testes unitários cobrem o plugin isoladamente, e o gate completo (test + business-flow + build) valida regressão.

---

### 🟢 Pontos Positivos

1. **Arquitetura limpa** — Separação clara: config → plugin → integração → testes
2. **Admin multiplier elegante** — `resolveRateLimitConfig` converte `max` numérico em função admin-aware automaticamente, evitando duplicação
3. **Fail-open correto** — `skipOnError: true` garante disponibilidade mesmo com Redis offline
4. **Cobertura de testes abrangente** — 21 novos testes cobrindo config, plugin e integração HTTP
5. **Transparência para testes existentes** — `max: Infinity` mantém 308 testes existentes intactos
6. **Exclusão correta de rotas** — Health check e webhook Stripe sem rate limiting
7. **Lifecycle management** — Redis dedicado encerrado corretamente no shutdown

---

## 6. Veredicto

### ✅ APROVADO COM OBSERVAÇÕES

A implementação está completa, bem arquitetada e alinhada com a Tech Spec e o PRD. Todos os testes passam (371 no total). O **BUG-001** (Promise não tratada no `onExceeded`) deve ser corrigido antes do merge — é uma correção de 1 linha que previne unhandled rejections em produção.
