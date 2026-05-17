# Task 8: Gerar tipos compartilhados de API [RF-020]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Depois que os dois novos endpoints (`POST /password/forgot` e `POST /password/reset`) estiverem registrados e funcionando, exporta o schema OpenAPI do backend e regenera os tipos TypeScript do pacote `@repo/api-types`, garantindo que o frontend consuma tipos corretos para as novas rotas.

## Arquivos

- Modified by scripts: `packages/api-types/src/` (auto-gerado — não edite manualmente)

### Conformidade com as Skills Padrão

- NUNCA edite manualmente arquivos dentro de `packages/api-types/src/` — eles são 100% gerados

## Passos

- [ ] **Step 1: Confirmar que o backend está buildado e as rotas novas existem**

```bash
cd apps/backend
pnpm build
```

Esperado: build termina sem erros.

Verifique que as rotas estão registradas executando um dry-run do servidor:

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros de TypeScript.

- [ ] **Step 2: Gerar tipos compartilhados**

Na raiz do monorepo:

```bash
pnpm generate:types
```

Este comando:
1. Inicia o servidor Fastify brevemente para exportar o schema OpenAPI
2. Gera os tipos TypeScript em `packages/api-types/src/`
3. Inclui os novos endpoints `/password/forgot` e `/password/reset`

Esperado: comando termina com sucesso e sem erros.

- [ ] **Step 3: Verificar que os novos tipos aparecem**

```bash
grep -r "password/forgot\|password/reset\|ForgotPassword\|ResetPassword" packages/api-types/src/
```

Esperado: os novos caminhos e types aparecem nos arquivos gerados.

- [ ] **Step 4: Verificar TypeScript do pacote api-types**

```bash
cd packages/api-types
pnpm tsc:check 2>/dev/null || npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add packages/api-types/
git commit -m "feat(api-types): regenerate types with forgot/reset password routes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-020: tipos para `POST /password/forgot` e `POST /password/reset` disponíveis em `@repo/api-types`
- Nenhum arquivo em `packages/api-types/src/` foi editado manualmente
- `pnpm generate:types` termina sem erros
