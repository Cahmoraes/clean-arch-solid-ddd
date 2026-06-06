# Task 10: Regenerar tipos OpenAPI + validar dependency-cruiser [FR-006, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-03, task-09

## Visão Geral

Regenera o spec OpenAPI e os tipos compartilhados (`@repo/api-types`) a partir do backend já com os novos endpoints e o campo `imageKey` nas respostas (FR-006, FR-013), e valida as regras de dependência (Clean Architecture) com o dependency-cruiser. Mantém o contrato em sincronia; o frontend desta feature consome via `extended-paths` (task-11), então não há mudança de código de consumo aqui.

## Arquivos

- Generated: `packages/api-types/**` (saída de `pnpm generate:types`)
- Generated/Modify: `apps/backend/src/shared/infra/openapi/generated/api-types.d.ts` (se o script exportar para o backend)

### Conformidade com as Skills Padrão

- use no-workarounds: validação arquitetural via dependency-cruiser, sem suprimir regras.

## Passos

- **Step 1: Garantir o backend verde antes de gerar**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend test:run`
Expected: todos os testes unitários passam.

- **Step 2: Validar as regras de dependência (Clean Architecture)**

Run: `pnpm --filter backend fit:validate-dependencies`
Expected: zero violações. As portas `ImageProcessor`/`ImageStorage` vivem em `application/` e as implementações em `infra/` — Domain/Application não importam Infra.

> Se houver violação apontando import de infra a partir de application, revise: o use case deve importar apenas as interfaces de `@/gym/application/storage/*`, nunca `@/shared/infra/storage/*`.

- **Step 3: Regenerar o spec OpenAPI e os tipos do client**

Run: `pnpm generate:types`
Expected: executa `openapi:export` + `openapi:generate-client`; atualiza `packages/api-types`. Os paths `PUT /gyms/{gymId}` e `POST /gyms/{gymId}/image` e o campo `imageKey` nas respostas de leitura passam a existir no spec.

- **Step 4: Verificar build do pacote de tipos e do frontend**

Run: `pnpm --filter @repo/api-types build`
Expected: build sem erros (caso o pacote tenha etapa de build; se não houver, ignore).

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros (o frontend usa `extended-paths`, então não quebra com a regeneração).

- **Step 5: Commit**

```bash
git add packages/api-types apps/backend/src/shared/infra/openapi/generated
git commit -m "chore(api-types): regenerate OpenAPI types for gym update + image endpoints"
```

## Critérios de Sucesso

- `pnpm --filter backend fit:validate-dependencies` sem violações.
- `pnpm generate:types` regenera o contrato incluindo os novos endpoints e `imageKey`. [FR-006, FR-013]
- `pnpm --filter frontend tsc:check` permanece verde.
