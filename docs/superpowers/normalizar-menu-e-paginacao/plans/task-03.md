# Task 3: Backend — Controllers de academias respondem com paginação

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-02

## Visão Geral

Atualizar `FetchAllGymsController` e `SearchGymController` para responder com o envelope `{ gyms, pagination }` (em vez do array bruto atual), refletindo o novo shape `{ data, pagination }` exposto pelos use cases na task-02. Os schemas Zod de resposta de cada controller devem ser atualizados para validar o novo formato, seguindo o mesmo estilo de anotação `.meta()` já usado em `fetch-users.controller.ts`. As rotas HTTP não mudam.

## Arquivos

- Modify: `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/search-gym.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/fetch-all-gyms.business-flow-test.ts`
- Modify: `apps/backend/src/gym/infra/controller/search-gym.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `zod`: os schemas de resposta (`fetchAllGymsResponseSchema`/equivalente e o schema de `search-gym`) devem validar precisamente o novo envelope `{ gyms, pagination: { total, page, limit } }`, com `.meta()` para documentação OpenAPI no mesmo estilo já usado em `fetch-users.controller.ts`.
- `test-antipatterns`: os testes de business-flow devem validar o comportamento HTTP observável (corpo da resposta, status code), não detalhes internos do use case — já é o padrão desses arquivos, apenas ajustando as asserções ao novo shape.
- `vitest`: manter a estrutura de describe/it dos testes de business-flow já existentes.
- `refactoring`: a alteração de `isGymNotFound` (de aceitar um array para aceitar o objeto `{ data, pagination }`) deve preservar exatamente a mesma semântica de "resultado vazio" que tinha antes.

## Passos

- **Step 1: Atualizar os testes de business-flow de `fetch-all-gyms` para o novo shape (e confirmar que falham)**

Abra `apps/backend/src/gym/infra/controller/fetch-all-gyms.business-flow-test.ts` e troque as asserções que hoje leem `response.body` como array para `response.body.gyms`, adicionando asserções de `response.body.pagination`:

```typescript
// antes:
// expect(response.body).toHaveLength(3)
// expect(response.body[0].title).toBe('Academia A')

// depois:
expect(response.body.gyms).toHaveLength(3)
expect(response.body.gyms[0].title).toBe('Academia A')
expect(response.body.pagination).toEqual({
  total: 3,
  page: 1,
  limit: 20,
})
```

E no teste de lista vazia:

```typescript
// antes:
// expect(response.body).toEqual([])

// depois:
expect(response.body).toEqual({
  gyms: [],
  pagination: { total: 0, page: 1, limit: 20 },
})
```

Ajuste os valores literais de `total`/`page`/`limit` conforme o cenário exato de cada teste do arquivo (o `limit` deve corresponder ao valor real de `env.ITEMS_PER_PAGE` usado no ambiente de teste — confirme lendo o arquivo `.env.test`/setup de teste se `20` não for o valor correto).

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/gym/infra/controller/fetch-all-gyms.business-flow-test.ts`
Expected: FAIL — `response.body.gyms` é `undefined` porque o controller ainda responde com o array bruto em `response.body`.

- **Step 2: Atualizar os testes de business-flow de `search-gym` para o novo shape (e confirmar que falham)**

Aplique o mesmo padrão de troca em `apps/backend/src/gym/infra/controller/search-gym.business-flow-test.ts`:

```typescript
// antes:
// expect(response.body).toHaveLength(2)

// depois:
expect(response.body.gyms).toHaveLength(2)
expect(response.body.pagination).toEqual({
  total: 2,
  page: 1,
  limit: 20,
})
```

E no teste de "nenhum resultado encontrado" (que hoje provavelmente espera 404 ou array vazio — preserve o status code atual, ajuste apenas o corpo se o teste checar `response.body`):

```typescript
// se o teste atual verifica corpo vazio/array vazio em caso de não encontrado, ajuste para:
expect(response.body).toEqual({
  gyms: [],
  pagination: { total: 0, page: 1, limit: 20 },
})
```

Ajuste `total`/`page`/`limit` conforme os dados de setup exatos de cada teste do arquivo.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/gym/infra/controller/search-gym.business-flow-test.ts`
Expected: FAIL — `response.body.gyms` é `undefined`.

- **Step 3: Implementar o novo shape em `FetchAllGymsController`**

Em `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`, atualize o schema Zod de resposta e o corpo retornado:

```typescript
import { z } from 'zod'

const gymSummarySchema = z.object({
  id: z.string().meta({ description: 'ID da academia' }),
  title: z.string().meta({ description: 'Nome da academia' }),
  description: z.string().meta({ description: 'Descrição da academia' }),
  phone: z.string().meta({ description: 'Telefone de contato' }),
  address: z.string().meta({ description: 'Endereço da academia' }),
  imageKey: z.string().nullable().meta({ description: 'Chave da imagem no storage' }),
  latitude: z.number().meta({ description: 'Latitude' }),
  longitude: z.number().meta({ description: 'Longitude' }),
})

const fetchAllGymsResponseSchema = z.object({
  gyms: z.array(gymSummarySchema).meta({ description: 'Lista de academias da página atual' }),
  pagination: z.object({
    total: z.number().meta({ description: 'Total de academias que satisfazem o filtro' }),
    page: z.number().meta({ description: 'Página atual' }),
    limit: z.number().meta({ description: 'Itens por página' }),
  }).meta({ description: 'Metadados de paginação' }),
}).meta({ description: 'Resposta paginada de academias' })
```

E no handler do controller, troque o corpo de resposta:

```typescript
// antes:
// return reply.status(200).send(result)

// depois:
const result = await this.fetchAllGymsUseCase.execute(input)
return reply.status(200).send({ gyms: result.data, pagination: result.pagination })
```

Preserve o nome exato da classe do schema Zod já usado no arquivo (pode já existir um schema chamado diferente de `gymSummarySchema` — reutilize/renomeie mantendo a estrutura de campos), e o estilo exato de `.meta()` conforme `fetch-users.controller.ts` usa (confira se lá é `.meta({ description: ... })` ou outro formato de metadados OpenAPI, e replique fielmente).

- **Step 4: Rodar o teste de `fetch-all-gyms` e confirmar sucesso**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/gym/infra/controller/fetch-all-gyms.business-flow-test.ts`
Expected: PASS — todas as asserções de `response.body.gyms`/`response.body.pagination` passam.

- **Step 5: Implementar o novo shape em `SearchGymController` e atualizar `isGymNotFound`**

Em `apps/backend/src/gym/infra/controller/search-gym.controller.ts`, atualize o schema de resposta (mesmo padrão do Step 3, mas SEM o campo `address` no item, conforme `SearchGymUseCaseOutput_DTO` da task-02) e a função `isGymNotFound`:

```typescript
// antes:
// function isGymNotFound(result: SearchGymUseCaseOutput[]): boolean {
//   return !result.length
// }

// depois:
function isGymNotFound(result: SearchGymUseCaseOutput): boolean {
  return !result.data.length
}
```

E no handler:

```typescript
const result = await this.searchGymUseCase.execute(input)

if (isGymNotFound(result)) {
  return reply.status(200).send({ gyms: [], pagination: result.pagination })
}

return reply.status(200).send({ gyms: result.data, pagination: result.pagination })
```

Ajuste o status code exato do branch de "não encontrado" conforme o comportamento atual do arquivo real (se hoje ele já responde 200 com corpo vazio, preserve 200; se responde outro código, preserve esse código e apenas ajuste o corpo).

- **Step 6: Rodar o teste de `search-gym` e confirmar sucesso**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/gym/infra/controller/search-gym.business-flow-test.ts`
Expected: PASS.

- **Step 7: Rodar tsc:check**

Run: `pnpm --filter backend tsc:check`
Expected: PASS — sem erros de tipo em todo o backend (nenhum consumidor pendente após esta task).

- **Step 8: Commit**

```bash
git add apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts \
  apps/backend/src/gym/infra/controller/search-gym.controller.ts \
  apps/backend/src/gym/infra/controller/fetch-all-gyms.business-flow-test.ts \
  apps/backend/src/gym/infra/controller/search-gym.business-flow-test.ts
git commit -m "feat(gym): controllers de listagem/busca respondem com gyms e pagination"
```

## Critérios de Sucesso

- `GET /gyms` responde `{ gyms: GymSummary[], pagination: { total, page, limit } }`.
- `GET /gyms/search/:name` responde o mesmo envelope, com o DTO por item sem o campo `address`.
- `isGymNotFound` recebe o objeto `{ data, pagination }` e verifica `!result.data.length`.
- Rotas `GymRoutes.LIST = "/gyms"` e `GymRoutes.SEARCH = "/gyms/search/:name"` inalteradas.
- `npx vitest run --config ./test/vite.config.business-flow.ts` para os dois arquivos de teste desta task passa 100%.
- `pnpm --filter backend tsc:check` passa sem erros.
