# Task 1: Corrigir bcrypt cost factor inseguro (PASSWORD_SALT=2)

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → CRITICAL-1

## Visão Geral

O `PASSWORD_SALT` está definido como `2` (padrão no schema Zod e nos arquivos `.env.test` e `.env.example`). Com cost factor 2, bcrypt é ~4096× mais fraco que o padrão seguro de 12. Esta task eleva o mínimo para 10 e o padrão para 12, e atualiza todos os arquivos de configuração relevantes.

## Arquivos

- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/.env.test`
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/.env.development`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: corrigir a causa raiz (valor no schema Zod e nos envs), não apenas um env var.
- `test-antipatterns`: não mockar bcrypt — o salt baixo já garante velocidade nos testes.
</skills>

## Passos

- [ ] **Step 1: Verificar baseline de testes**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose 2>&1 | tail -20
```
Expected: todos os testes passam antes da mudança.

- [ ] **Step 2: Atualizar o schema Zod para exigir mínimo 10 e padrão 12**

Em `apps/backend/src/shared/infra/env/index.ts`, linha 13, alterar:

```ts
// ANTES
PASSWORD_SALT: z.coerce.number().default(2),

// DEPOIS
PASSWORD_SALT: z.coerce.number().min(10).default(12),
```

- [ ] **Step 3: Atualizar .env.test**

Em `apps/backend/.env.test`, alterar linha `PASSWORD_SALT=2`:

```
PASSWORD_SALT=10
```

> Nota: use 10 (mínimo seguro) em vez de 12 para manter os testes rápidos — bcrypt com salt=10 leva ~10ms, aceitável para testes.

- [ ] **Step 4: Atualizar .env.example**

Em `apps/backend/.env.example`, alterar linha `PASSWORD_SALT=2`:

```
PASSWORD_SALT=12
```

- [ ] **Step 5: Atualizar .env.development**

Em `apps/backend/.env.development`, adicionar ou atualizar `PASSWORD_SALT`:

```
PASSWORD_SALT=10
```

- [ ] **Step 6: Executar os testes e verificar que todos passam**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam. Se `Password.create` nos testes ficar lento, isso é esperado — bcrypt com salt=10 leva ~10ms/hash, aceitável.

- [ ] **Step 7: Verificar build e typecheck**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend build 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
cd apps/backend
git add src/shared/infra/env/index.ts .env.test .env.example .env.development
git commit -m "fix(security): increase bcrypt cost factor from 2 to min 10

PASSWORD_SALT now requires minimum 10, defaults to 12.
Test environments use 10 for acceptable test performance.

CRITICAL-1 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `z.coerce.number().min(10).default(12)` em `env/index.ts`
- `.env.test` tem `PASSWORD_SALT=10`
- `.env.example` tem `PASSWORD_SALT=12`
- Todos os testes continuam passando
- `tsc:check` e `build` sem erros
