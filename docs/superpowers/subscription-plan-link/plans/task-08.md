# Task 8: Regenerar tipos da API em @repo/api-types

**Status:** PENDING

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** cheap

**Depends on:** task-05, task-06, task-07

## Visão Geral

As três rotas novas do backend (`GET /subscriptions/me`, `PATCH /subscriptions/me/plan`, `POST /subscriptions/me/cancel`) precisam existir como tipos em `@repo/api-types` para o frontend consumi-las sem casts. Esta task regenera o artefato a partir do spec OpenAPI exportado pelo backend e confirma que os três caminhos e o formato do contrato estão presentes; o arquivo gerado nunca é editado à mão.

## Arquivos

- Modify: `packages/api-types/index.d.ts` (artefato gerado por `pnpm generate:types`)

## Interfaces

- **Consome:** rotas registradas nas tasks 5, 6 e 7 (controllers `GetMySubscriptionController`, `ChangeSubscriptionPlanController`, `ScheduleSubscriptionCancellationController` com os schemas de resposta zod `mySubscriptionResponseSchema` / `nullableMySubscriptionResponseSchema`); script raiz `generate:types` (`backend openapi:export && @repo/api-types openapi:generate-client`).
- **Produz:** entradas em `paths` de `@repo/api-types`: `paths["/subscriptions/me"]["get"]` (200: `MySubscription | null`), `paths["/subscriptions/me/plan"]["patch"]` (body `{ priceId: string }`, 200: `MySubscription`) e `paths["/subscriptions/me/cancel"]["post"]` (200: `MySubscription`), onde `MySubscription = { id: string; state: "active" | "cancel_scheduled" | "expired"; plan: { id: string; name: string; priceId: string } | null; currentPeriodStart: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean }`.

### Conformidade com as Skills Padrão

- `no-workarounds`: o artefato é regenerado pelo gerador oficial; se o resultado estiver errado, corrige-se a fonte (schema zod do backend), nunca o `index.d.ts` gerado.

## Passos

- **Step 1: Confirm how the artifact is produced and versioned**

Confirme em `package.json` da raiz que existe o script `generate:types` e em `packages/api-types/package.json` o script `openapi:generate-client` (`tsx scripts/generate-client.ts`). Confirme que o artefato é versionado: `git ls-files packages/api-types` deve listar `packages/api-types/index.d.ts` (o `.gitignore` do pacote também cita `index.d.ts`, mas o arquivo já está rastreado, então as mudanças aparecem no `git status`). Confirme que `scripts/export-openapi-spec.ts` do backend constrói o servidor via o mesmo bootstrap dos controllers (basta o controller registrado para a rota entrar no spec) e se a exportação exige serviços de infra ligados (banco, Redis); se exigir, suba com `pnpm --filter backend docker:up` antes do Step 3.

- **Step 2: Write the failing check (os caminhos ainda não existem no artefato)**

Run: `rg -c '"/subscriptions/me' packages/api-types/index.d.ts`
Expected: FAIL: nenhuma correspondência (código de saída 1 e nenhuma contagem), porque o artefato ainda não contém as rotas novas.

- **Step 3: Regenerate the artifact**

Run: `pnpm generate:types`
Expected: o backend exporta o spec OpenAPI e o cliente de tipos é regenerado sem erro. Revise o `git diff packages/api-types/index.d.ts`: a diferença deve conter apenas as três rotas novas e o que elas referenciam; se aparecerem mudanças não relacionadas (por exemplo, no `GET /plans`), investigue a origem no backend em vez de editar o arquivo gerado.

- **Step 4: Run the check to verify it passes**

Run: `rg -n '"/subscriptions/me"|"/subscriptions/me/plan"|"/subscriptions/me/cancel"|cancel_scheduled' packages/api-types/index.d.ts`
Expected: PASS: ao menos quatro correspondências (as três chaves de `paths` e o enum `"active" | "cancel_scheduled" | "expired"` do campo `state`). Confirme visualmente que `"/subscriptions/me"` tem `get`, `"/subscriptions/me/plan"` tem `patch` com body `priceId` e `"/subscriptions/me/cancel"` tem `post`, e que a resposta 200 de `GET` admite `null`.

- **Step 5: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add packages/api-types/index.d.ts
git commit -m "chore(api-types): regenerate types for subscription me endpoints"
```

## Critérios de Sucesso

- `paths["/subscriptions/me"]`, `paths["/subscriptions/me/plan"]` e `paths["/subscriptions/me/cancel"]` existem em `packages/api-types/index.d.ts`.
- O tipo de `state` é exatamente `"active" | "cancel_scheduled" | "expired"` e `plan` aceita `null`.
- O diff do artefato contém só o que as rotas novas introduzem; `GET /plans` permanece igual.
