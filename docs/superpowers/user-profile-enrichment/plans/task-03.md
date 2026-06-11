# Task 3: Regenerar shared API types [RF-005, RF-009, RF-010]

**Status:** DONE
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Após as mudanças no backend (Tasks 1 e 2), regenerar os tipos OpenAPI compartilhados no pacote `@repo/api-types`. Verificar que os novos campos (`createdAt`, `status`) aparecem no tipo `GET /users/me` e que o endpoint `PATCH /users/me` foi adicionado.

## Arquivos

- Modify: `packages/api-types/index.d.ts` (gerado automaticamente via script)

### Conformidade com as Skills Padrão

- no-workarounds: sempre usar `pnpm generate:types` — nunca editar `index.d.ts` manualmente

## Passos

- [ ] **Step 1: Verificar que o backend está rodando e exportando o spec corretamente**

O script `generate:types` inicia o servidor backend temporariamente para exportar o OpenAPI spec. Confirme que não há erros de compilação antes de rodar:

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros de TypeScript.

- [ ] **Step 2: Regenerar os tipos**

Na raiz do monorepo:

```bash
pnpm generate:types
```

Esperado: script completa sem erros e atualiza `packages/api-types/index.d.ts`.

- [ ] **Step 3: Verificar os novos campos no tipo gerado**

```bash
grep -n "createdAt\|status.*activated\|patch.*users.*me\|PATCH.*me" packages/api-types/index.d.ts | head -20
```

Esperado: você deve ver referências a `createdAt`, `"activated" | "suspended"` (ou similar), e uma entrada para `PATCH /users/me`.

- [ ] **Step 4: Verificar type-check do frontend com os novos tipos**

```bash
cd apps/frontend
pnpm tsc:check
```

Esperado: zero erros. Se houver erros relacionados a `createdAt` ou `status` em arquivos existentes, corrija-os (provavelmente em `apps/frontend/src/features/profile/api/index.ts` — o tipo `Me` agora inclui os novos campos, o que é compatível, mas pode requerer ajuste no uso).

- [ ] **Step 5: Commit**

```bash
git add packages/api-types/index.d.ts
git commit -m "chore(api-types): regenerate types with createdAt, status and PATCH /users/me

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `packages/api-types/index.d.ts` inclui `createdAt: string` e `status` no response de `GET /users/me` [RF-005]
- `packages/api-types/index.d.ts` inclui endpoint `PATCH /users/me` com body `{ name: string }` e response `{ name: string }` [RF-009, RF-010]
- `pnpm tsc:check` no frontend sem novos erros
