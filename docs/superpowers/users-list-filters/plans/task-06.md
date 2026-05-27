# Task 6: Shared — Regenerar tipos da API [RF-003, RF-007]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Executa `pnpm generate:types` na raiz do monorepo para exportar o novo schema OpenAPI do backend (incluindo `GET /users/stats` e os novos params de `GET /users`) e gerar os tipos TypeScript em `@repo/api-types`. O frontend depende desses tipos para `useUserStats` e `useUsers`.

## Arquivos

- Modify: `packages/api-types/` (gerado automaticamente)

### Conformidade com as Skills Padrão

- Nenhuma skill específica — tarefa de tooling puro

## Passos

- [ ] **Step 1: Garantir que o backend compila**

```bash
pnpm --filter backend build
```

Esperado: build concluído sem erros. Se houver erros, corrija antes de prosseguir (as Tasks 1–5 devem estar completas).

- [ ] **Step 2: Regenerar os tipos**

Na raiz do monorepo:

```bash
pnpm generate:types
```

Esperado: o comando inicia o servidor backend, exporta o schema OpenAPI e gera os novos tipos em `packages/api-types/`.

- [ ] **Step 3: Verificar que os novos tipos existem**

```bash
grep -n "users/stats\|role.*MEMBER.*ADMIN\|status.*active.*inactive" packages/api-types/src/index.ts | head -20
```

Esperado: linhas referenciando o endpoint `/users/stats` e os novos parâmetros de filtro.

- [ ] **Step 4: Verificar tipos do frontend**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros (os hooks ainda não foram criados — erros de import dos hooks novos são esperados apenas após a Task 8).

## Critérios de Sucesso

- `packages/api-types/` atualizado com o schema de `GET /users/stats`
- `GET /users` no schema inclui os params `role` e `status`
- `pnpm --filter backend build` passa sem erros antes da geração
