# Task 8: Remover JWT default key inseguro ('private-key-example')

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → MEDIUM-1

## Visão Geral

`PRIVATE_KEY` tem o valor padrão `"private-key-example"` no schema Zod. Se não configurada em produção, a aplicação assina JWTs com uma chave conhecida publicamente — qualquer atacante que conheça esse valor pode forjar tokens. A correção remove o default e exige mínimo de 32 caracteres, forçando falha explícita na inicialização se `PRIVATE_KEY` não estiver configurada.

## Arquivos

- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/.env.test`
- Modify: `apps/backend/.env.development`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: remover o default inseguro, não apenas documentar que deve ser trocado.
</skills>

## Passos

- [ ] **Step 1: Gerar uma chave aleatória para usar nos ambientes de desenvolvimento/test**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar o output (64 chars hex). Você vai usar este valor nos próximos steps.

> Exemplo de saída: `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2`  
> Use **seu próprio valor gerado**, não este exemplo.

- [ ] **Step 2: Atualizar o schema Zod para remover o default e exigir mínimo 32 chars**

Em `apps/backend/src/shared/infra/env/index.ts`, linha 14, alterar:

```ts
// ANTES
PRIVATE_KEY: z.string().default("private-key-example"),

// DEPOIS
PRIVATE_KEY: z.string().min(32),
```

- [ ] **Step 3: Atualizar `.env.test` com a nova chave**

Em `apps/backend/.env.test`, substituir:

```
# ANTES
PRIVATE_KEY=private-key-example

# DEPOIS — use o valor gerado no Step 1 (exemplo abaixo com placeholder)
PRIVATE_KEY=<seu-valor-hex-de-64-chars-gerado-no-step-1>
```

- [ ] **Step 4: Atualizar `.env.development` com a nova chave**

Em `apps/backend/.env.development`, substituir:

```
# ANTES
PRIVATE_KEY='private-key-example'

# DEPOIS
PRIVATE_KEY=<seu-valor-hex-de-64-chars-gerado-no-step-1>
```

> Pode usar o mesmo valor do `.env.test` — são ambientes de desenvolvimento local, não produção.

- [ ] **Step 5: Executar os testes para verificar que o env carrega corretamente**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam. Se `Invalid environment variables` aparecer, verificar se `PRIVATE_KEY` no `.env.test` tem pelo menos 32 chars.

- [ ] **Step 6: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend
git add src/shared/infra/env/index.ts .env.test .env.development
git commit -m "fix(security): remove insecure JWT default key from env schema

PRIVATE_KEY no longer has a default value. Requires min 32 chars.
Application fails fast at startup if not configured. Test and dev
environments updated with randomly-generated keys.

MEDIUM-1 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `PRIVATE_KEY: z.string().min(32)` em `env/index.ts` (sem `.default()`)
- `.env.test` tem `PRIVATE_KEY` com 32+ chars não sendo `private-key-example`
- `.env.development` tem `PRIVATE_KEY` com 32+ chars não sendo `private-key-example`
- `pnpm --filter backend test:run` passa
- `tsc:check` sem erros
