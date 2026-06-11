# Task 9: Gerar tipos compartilhados com `DELETE /users/{userId}` [RF-018]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-06

## Visão Geral

Regenera os tipos OpenAPI compartilhados (`@repo/api-types`) a partir do spec do backend, expondo o novo endpoint `DELETE /users/{userId}` para o frontend tipar a chamada do hook `useDeleteUser` (task-10). É um passo de geração de código — não há lógica a escrever, mas o resultado precisa conter o path novo.

## Arquivos

- Modify: `packages/api-types/**` (gerado por `generate:types`)

### Conformidade com as Skills Padrão

- use skill `no-workarounds`: o tipo deve vir da geração real a partir do OpenAPI; não edite o arquivo gerado à mão para "forçar" o path.

## Passos

- **Step 1: Garantir que o backend expõe o endpoint no OpenAPI**

A task-06 registrou a rota `DELETE /users/:userId` com `makeDeleteUserSwaggerSchema()`. Confirme que o controller está no bootstrap (task-06, Step 5).

- **Step 2: Rodar a geração de tipos**

Run: `pnpm generate:types`
Expected: o comando exporta o spec OpenAPI do backend e regenera o client em `packages/api-types`. Pode exigir o backend de pé conforme o script — siga o comportamento do script (se ele sobe um servidor efêmero, nenhuma ação extra é necessária).

- **Step 3: Verificar que o path foi gerado**

Run: `grep -R "/users/{userId}" packages/api-types/ | head`
Expected: o path `/users/{userId}` aparece com o método `delete` no tipo `paths` gerado.

> Se o path não aparecer, o problema está no schema do controller (task-06) — volte e confirme `params: deleteUserSchema` e o registro no bootstrap. Não edite o arquivo gerado manualmente.

- **Step 4: Validar tipos do frontend**

Run: `pnpm --filter frontend tsc:check`
Expected: passa (nenhum consumidor novo ainda; apenas confirma que os tipos gerados são válidos).

- **Step 5: Commit**

```bash
git add packages/api-types/
git commit -m "chore(api-types): regenerate types with DELETE /users/{userId}"
```

## Critérios de Sucesso

- O tipo `paths` em `@repo/api-types` inclui `DELETE /users/{userId}` (RF-018).
- `pnpm --filter frontend tsc:check` passa.
