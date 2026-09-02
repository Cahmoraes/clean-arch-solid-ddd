# Task 3: Regenerar tipos compartilhados da API de clima [FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

A Task 1 alterou o schema Zod de resposta de `GET /weather` para incluir `latitude`/`longitude`. Esta task roda a geração de tipos existente (`pnpm generate:types`) para exportar o novo spec OpenAPI do backend e regenerar `packages/api-types/index.d.ts`, garantindo que `paths["/weather"]["get"]["responses"][200]["content"]["application/json"]` (tipo consumido por `useWeatherQuery` no frontend) inclua `latitude: number` e `longitude: number`. Nenhum código é escrito manualmente — o trabalho é executar o gerador e validar o artefato produzido.

## Arquivos

- Modify: `apps/backend/docs/openapi-spec.json` (gerado por `openapi:export`)
- Modify: `packages/api-types/index.d.ts` (gerado por `openapi:generate-client`)

### Conformidade com as Skills Padrão

- `no-workarounds`: não editar `index.d.ts` manualmente para "adiantar" o campo — o arquivo deve ser 100% produto do gerador, senão a próxima geração real diverge silenciosamente.
- `typescript-advanced`: validar que o tipo gerado para `latitude`/`longitude` é `number` (não `number | undefined` nem `any`), refletindo o schema Zod obrigatório da Task 1.

## Passos

- **Step 1: Write the failing check**

Antes de gerar, confirme que o tipo atual do endpoint ainda não tem os campos novos:

Run: `grep -n "latitude" packages/api-types/index.d.ts`
Expected: FAIL — nenhuma ocorrência (`grep` retorna sem saída e código de saída 1), confirmando que o artefato está desatualizado em relação à Task 1.

- **Step 2: Export the OpenAPI spec from the backend**

Run: `pnpm --filter backend openapi:export`
Expected: o arquivo `apps/backend/docs/openapi-spec.json` é reescrito; a definição do path `/weather` no JSON passa a incluir `latitude` e `longitude` no schema de resposta 200 (o script `apps/backend/scripts/export-openapi-spec.ts` inicializa o container DI, monta o servidor Fastify e escreve o spec Swagger resultante em `docs/openapi-spec.json` a partir do `cwd` de `apps/backend`).

- **Step 3: Generate the shared client types**

Run: `pnpm --filter @repo/api-types openapi:generate-client`
Expected: `packages/api-types/index.d.ts` é reescrito a partir do spec exportado no Step 2.

- **Step 4: Run test to verify it passes**

Run: `grep -n "latitude" packages/api-types/index.d.ts`
Expected: PASS — pelo menos uma ocorrência de `latitude` dentro da definição do path `/weather`, com o comentário JSDoc gerado a partir de `.meta({ description: "Latitude of the resolved location" })` (mesmo padrão usado hoje para `city`/`temperature`, ver `packages/api-types/index.d.ts` linhas próximas a `"/weather"`).

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/backend/docs/openapi-spec.json packages/api-types/index.d.ts
git commit -m "chore(api-types): regenerate shared types with weather latitude/longitude"
```

## Critérios de Sucesso

- `apps/backend/docs/openapi-spec.json` reflete o schema de resposta atual de `GET /weather`, incluindo `latitude`/`longitude`.
- `packages/api-types/index.d.ts` expõe `latitude: number` e `longitude: number` no tipo de resposta 200 de `/weather`, sem edição manual do arquivo.
- O comando `pnpm generate:types` (raiz) roda ambos os passos em sequência sem erro quando executado depois da Task 1.
