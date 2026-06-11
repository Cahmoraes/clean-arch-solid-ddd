# Task 4: Corrigir CORS para allowlist explícita via CORS_ORIGINS

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → HIGH-2

## Visão Geral

`origin: true` no `@fastify/cors` reflete qualquer `Origin` da request. Combinado com `credentials: true`, permite que qualquer site faça requests autenticados em nome do usuário (data exfiltration). A correção introduz a variável de ambiente `CORS_ORIGINS` como allowlist de origens permitidas e substitui `origin: true` por uma função de callback.

Requests sem header `Origin` (como supertest, curl, server-to-server) continuam funcionando sem alteração nos testes existentes.

## Arquivos

- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/.env.test` (adicionar `CORS_ORIGINS=`)
- Modify: `apps/backend/.env.development` (adicionar `CORS_ORIGINS=http://localhost:3000`)

<skills>
### Compliance with Standard Skills

- `no-workarounds`: allowlist explícita, não regex ou wildcard.
</skills>

## Passos

- [ ] **Step 1: Executar testes para confirmar baseline**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -5
```
Expected: todos os testes passam antes da mudança.

- [ ] **Step 2: Adicionar `CORS_ORIGINS` ao schema Zod de env**

Em `apps/backend/src/shared/infra/env/index.ts`, adicionar após `GOOGLE_CLIENT_ID`:

```ts
// ANTES (linha ~26)
GOOGLE_CLIENT_ID: z.string().optional(),

// DEPOIS
GOOGLE_CLIENT_ID: z.string().optional(),
CORS_ORIGINS: z.string().optional(),
```

- [ ] **Step 3: Atualizar `setupCORS` em fastify-adapter.ts**

Em `apps/backend/src/shared/infra/server/fastify-adapter.ts`, localizar o método `setupCORS` e substituir:

```ts
// ANTES
private async setupCORS(): Promise<void> {
  await this._server.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
}

// DEPOIS
private async setupCORS(): Promise<void> {
  const allowedOrigins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  await this._server.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error("Not allowed by CORS"), false)
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
}
```

- [ ] **Step 4: Adicionar `CORS_ORIGINS` aos arquivos de ambiente**

Em `apps/backend/.env.example`, adicionar após `HOST`:
```
CORS_ORIGINS=https://app.seudominio.com,https://admin.seudominio.com
```

Em `apps/backend/.env.test`, adicionar:
```
CORS_ORIGINS=
```
> Valor vazio: testes usam supertest (sem `Origin` header), então o check `!origin` permite a passagem.

Em `apps/backend/.env.development`, adicionar:
```
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 5: Executar todos os testes e verificar que passam**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam. Supertest não envia `Origin`, portanto a condição `!origin` garante que nada quebre.

- [ ] **Step 6: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend
git add src/shared/infra/env/index.ts \
        src/shared/infra/server/fastify-adapter.ts \
        .env.example .env.test .env.development
git commit -m "fix(security): restrict CORS to explicit allowlist via CORS_ORIGINS

Replaces origin: true with allowlist-based callback reading
CORS_ORIGINS env var (comma-separated). Server-to-server requests
(no Origin header) are allowed. Existing tests unaffected.

HIGH-2 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `origin: true` não existe mais em `fastify-adapter.ts`
- `CORS_ORIGINS` está no schema Zod (opcional)
- Todos os testes existentes continuam passando
- `tsc:check` sem erros
