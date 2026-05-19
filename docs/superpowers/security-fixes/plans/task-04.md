# Task 4: Swagger UI Desabilitado em Produção

**Status:** DONE
**PRD:** N/A
**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`

## Visão Geral

O `FastifyAdapter` registra o `fastifySwaggerUI` incondicionalmente em todos os ambientes, expondo a especificação OpenAPI completa (endpoints, schemas, auth requirements) em `/documentation` em produção. Isso fornece ao atacante um mapa detalhado da API.

A correção é envolver o registro do `fastifySwaggerUI` com um guard `if (!isProduction())`. A função `isProduction()` já existe em `apps/backend/src/shared/infra/env/index.ts`.

> **Nota de arquitetura:** `fastifySwagger` (gerador da spec) continua sendo registrado sempre — ele é necessário para geração de tipos e validação interna. Apenas `fastifySwaggerUI` (a interface web em `/documentation`) é desabilitada em produção.

## Arquivos

- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar a função `isProduction()` já existente — não inventar nova lógica de detecção de ambiente

## Passos

- [ ] **Step 1: Localizar a função isProduction no env**

```bash
grep -n "isProduction\|isDevelopment" apps/backend/src/shared/infra/env/index.ts
```

Esperado:
```
53: export function isDevelopment(): boolean {
57: export function isProduction(): boolean {
```

Confirme que `isProduction()` retorna `env.NODE_ENV === "production"` — essa é a função que usaremos.

- [ ] **Step 2: Adicionar import de isProduction e adicionar o guard no fastify-adapter.ts**

Abra `apps/backend/src/shared/infra/server/fastify-adapter.ts`.

**Adicionar import** — adicione `isProduction` ao import existente de `"../env"`:

**Antes:**
```typescript
import { env } from "../env"
```

**Depois:**
```typescript
import { env, isProduction } from "../env"
```

**Modificar o método `registerSwaggerEarly()`:**

**Antes:**
```typescript
private registerSwaggerEarly(): void {
  this._server.register(fastifySwagger, FastifySwaggerSetupFactory.create())
  this._server.register(
    fastifySwaggerUI,
    FastifySwaggerUISetupFactory.create(),
  )
}
```

**Depois:**
```typescript
private registerSwaggerEarly(): void {
  this._server.register(fastifySwagger, FastifySwaggerSetupFactory.create())
  if (!isProduction()) {
    this._server.register(
      fastifySwaggerUI,
      FastifySwaggerUISetupFactory.create(),
    )
  }
}
```

- [ ] **Step 3: Executar lint e type check**

```bash
pnpm --filter backend biome:fix && pnpm --filter backend tsc:check
```

Esperado: zero erros em ambos.

- [ ] **Step 4: Executar todos os testes para confirmar que não quebrou nada**

Os testes rodam com `NODE_ENV=test`, logo `isProduction()` retorna `false` e o Swagger UI continua sendo registrado durante testes — comportamento correto.

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 5: Verificar manualmente que a rota /documentation é acessível em test**

```bash
pnpm --filter backend test:run -- -t "documentation"
```

Se não houver teste específico, apenas confirme que os testes existentes não quebram (Swagger UI ativo em `NODE_ENV=test` é o comportamento esperado durante desenvolvimento e testes).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/shared/infra/server/fastify-adapter.ts
git commit -m "security: disable Swagger UI in production

Register fastifySwaggerUI only when !isProduction(). The OpenAPI spec
generator (fastifySwagger) remains active in all environments for
internal validation. Only the /documentation web UI is gated.

Closes OWASP A05:2021 – Security Misconfiguration finding.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `fastify-adapter.ts` importa `isProduction` de `"../env"`
- `fastifySwaggerUI` só é registrado quando `!isProduction()`
- `fastifySwagger` continua sendo registrado incondicionalmente
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros
- `pnpm --filter backend test:run` passa 100%
- Em produção (`NODE_ENV=production`), `GET /documentation` retorna 404
