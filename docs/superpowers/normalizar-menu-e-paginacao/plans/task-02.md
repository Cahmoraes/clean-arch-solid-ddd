# Task 2: Backend — Use cases de academias repassam paginação

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Atualizar os use cases `FetchAllGymsUseCase` e `SearchGymUseCase` para consumir o novo retorno `{ items, total }` de `GymRepository.fetchGyms` (produzido na task-01) e expor, por sua vez, um shape `{ data, pagination: { total, page, limit } }` para os controllers consumirem (na task-03). O DTO por item de cada use case permanece com os mesmos campos já existentes hoje — apenas o envelope externo muda de "array bruto" para "objeto com `data` e `pagination`".

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`
- Modify: `apps/backend/src/gym/application/use-case/search-gym.usecase.ts`
- Modify: `apps/backend/src/gym/application/use-case/search-gym.usecase.test.ts`
- Create: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts`

### Conformidade com as Skills Padrão

- `test-antipatterns`: os testes novos/atualizados devem validar o comportamento observável do use case (dados retornados e metadados de paginação), não mockar `GymRepository` de forma que o teste apenas reafirme a implementação — usar os repositórios in-memory reais via os factories já existentes no bounded context.
- `vitest`: seguir a estrutura de `describe`/`it`, `beforeEach` e matchers já convencionados nos demais arquivos `*.usecase.test.ts` do backend.
- `refactoring`: alterar o shape de retorno dos dois use cases é uma mudança de contrato coordenada — deve ser feita preservando o DTO por item já existente (sem renomear ou remover campos que os controllers/testes atuais dependem, além do necessário).

## Passos

- **Step 1: Escrever o teste que falha para `FetchAllGymsUseCase`**

Crie `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts`, espelhando os factories já usados em `search-gym.usecase.test.ts` (`create-and-save-gym.ts` e `setup-in-memory-repositories.ts`):

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import { FetchAllGymsUseCase } from '@/gym/application/use-case/fetch-all-gyms.usecase'
import { createAndSaveGym } from 'test/factories/create-and-save-gym'
import { setupInMemoryRepositories } from 'test/factories/setup-in-memory-repositories'
import { env } from '@/shared/infra/env'

describe('FetchAllGymsUseCase', () => {
  let sut: FetchAllGymsUseCase
  let gymRepository: ReturnType<typeof setupInMemoryRepositories>['gymRepository']

  beforeEach(() => {
    const repositories = setupInMemoryRepositories()
    gymRepository = repositories.gymRepository
    sut = new FetchAllGymsUseCase(gymRepository)
  })

  it('retorna data e pagination.total corretos quando há registros', async () => {
    await createAndSaveGym(gymRepository, { title: 'Academia A' })
    await createAndSaveGym(gymRepository, { title: 'Academia B' })
    await createAndSaveGym(gymRepository, { title: 'Academia C' })

    const result = await sut.execute({ page: 1 })

    expect(result.data).toHaveLength(3)
    expect(result.pagination.total).toBe(3)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
  })

  it('retorna data vazio e pagination.total 0 quando não há registros', async () => {
    const result = await sut.execute({ page: 1 })

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
  })

  it('respeita a paginação: a segunda página retorna itens diferentes e pagination.page correto', async () => {
    for (let i = 0; i < 25; i++) {
      await createAndSaveGym(gymRepository, { title: `Academia ${i}` })
    }

    const page1 = await sut.execute({ page: 1 })
    const page2 = await sut.execute({ page: 2 })

    expect(page1.data).toHaveLength(20)
    expect(page2.data).toHaveLength(5)
    expect(page2.pagination.page).toBe(2)
    expect(page2.pagination.total).toBe(25)
    const page1Ids = page1.data.map((gym) => gym.id)
    const page2Ids = page2.data.map((gym) => gym.id)
    expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids))
  })
})
```

Ajuste os imports de `createAndSaveGym`/`setupInMemoryRepositories` para os paths exatos usados em `search-gym.usecase.test.ts` (abra esse arquivo como referência de import) e o construtor de `FetchAllGymsUseCase` conforme a assinatura real (pode receber o repositório diretamente ou via um container/factory — replique o padrão já usado nos testes existentes de use case de gym).

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- fetch-all-gyms.usecase.test.ts`
Expected: FAIL — hoje `sut.execute(...)` retorna um array bruto (`Gym[]` mapeado para DTOs), então `result.data` é `undefined` e `result.pagination` também é `undefined`.

- **Step 3: Atualizar o teste existente de `SearchGymUseCase` (também falhando após a task-01)**

Abra `apps/backend/src/gym/application/use-case/search-gym.usecase.test.ts` e troque as asserções do formato antigo pelo novo envelope `{ data, pagination }`:

```typescript
// antes:
// const result = await sut.execute({ name: 'Academia', page: 1 })
// expect(result[0].title).toBe('Academia A')
// expect(result).toHaveLength(3)

// depois:
const result = await sut.execute({ name: 'Academia', page: 1 })
expect(result.data[0].title).toBe('Academia A')
expect(result.data).toHaveLength(3)
expect(result.pagination.total).toBe(3)
expect(result.pagination.page).toBe(1)
expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
```

Aplique essa troca em TODAS as ocorrências do arquivo que hoje acessam `result` como array (`result[0]`, `result.length`, `.map`, etc.), substituindo por `result.data[...]`, e adicione as novas asserções de `result.pagination` em pelo menos um teste representativo (o caso feliz com múltiplos resultados) e no teste de lista vazia (`result.data` igual a `[]` e `result.pagination.total` igual a `0`). Preserve o import de `env` se ainda não existir, adicionando `import { env } from '@/shared/infra/env'` no topo do arquivo.

Run: `pnpm --filter backend test:run -- search-gym.usecase.test.ts`
Expected: FAIL — `result.data` é `undefined` porque `SearchGymUseCase.execute` ainda retorna o array bruto.

- **Step 4: Implementar o novo shape em `FetchAllGymsUseCase`**

Em `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`:

```typescript
import { env } from '@/shared/infra/env'

export interface FetchAllGymsUseCaseOutput_DTO {
  id: string
  title: string
  description: string
  phone: string
  address: string
  imageKey: string | null
  latitude: number
  longitude: number
}

export interface FetchAllGymsUseCaseOutput {
  data: FetchAllGymsUseCaseOutput_DTO[]
  pagination: {
    total: number
    page: number
    limit: number
  }
}

export class FetchAllGymsUseCase {
  constructor(private readonly gymRepository: GymRepository) {}

  async execute(input: FetchAllGymsUseCaseInput): Promise<FetchAllGymsUseCaseOutput> {
    const { items, total } = await this.gymRepository.fetchGyms(input)

    const data = items.map((gym) => ({
      id: gym.id,
      title: gym.title,
      description: gym.description,
      phone: gym.phone,
      address: gym.address,
      imageKey: gym.imageKey,
      latitude: gym.latitude,
      longitude: gym.longitude,
    }))

    return {
      data,
      pagination: {
        total,
        page: input.page,
        limit: env.ITEMS_PER_PAGE,
      },
    }
  }
}
```

Ajuste os nomes exatos dos campos do DTO conforme os getters já existentes na entidade `Gym` e o tipo de `FetchAllGymsUseCaseInput` conforme o arquivo real (preserve exatamente os campos já mapeados hoje: `id, title, description, phone, address, imageKey, latitude, longitude` — não adicione nem remova campos do DTO por item).

- **Step 5: Rodar o teste de `FetchAllGymsUseCase` e confirmar sucesso**

Run: `pnpm --filter backend test:run -- fetch-all-gyms.usecase.test.ts`
Expected: PASS — os 3 testes passam.

- **Step 6: Implementar o novo shape em `SearchGymUseCase`**

Em `apps/backend/src/gym/application/use-case/search-gym.usecase.ts`, aplique o mesmo padrão, mas SEM o campo `address` no DTO por item (confirmado do código real que já omite esse campo neste use case):

```typescript
import { env } from '@/shared/infra/env'

export interface SearchGymUseCaseOutput_DTO {
  id: string
  title: string
  description: string
  phone: string
  imageKey: string | null
  latitude: number
  longitude: number
}

export interface SearchGymUseCaseOutput {
  data: SearchGymUseCaseOutput_DTO[]
  pagination: {
    total: number
    page: number
    limit: number
  }
}

export class SearchGymUseCase {
  constructor(private readonly gymRepository: GymRepository) {}

  async execute(input: SearchGymUseCaseInput): Promise<SearchGymUseCaseOutput> {
    const { items, total } = await this.gymRepository.fetchGyms(input)

    const data = items.map((gym) => ({
      id: gym.id,
      title: gym.title,
      description: gym.description,
      phone: gym.phone,
      imageKey: gym.imageKey,
      latitude: gym.latitude,
      longitude: gym.longitude,
    }))

    return {
      data,
      pagination: {
        total,
        page: input.page,
        limit: env.ITEMS_PER_PAGE,
      },
    }
  }
}
```

Preserve o nome exato de `SearchGymUseCaseInput` e a forma como `input` (contendo `name`/`title` e `page`) é repassado para `gymRepository.fetchGyms` conforme o arquivo real.

- **Step 7: Rodar todos os testes de use case de gym e confirmar sucesso**

Run: `pnpm --filter backend test:run -- fetch-all-gyms.usecase.test.ts search-gym.usecase.test.ts`
Expected: PASS — todos os testes de ambos os arquivos passam.

Run: `pnpm --filter backend tsc:check`
Expected: sem erros nos arquivos desta task; erros remanescentes (se houver) restritos aos controllers consumidores, corrigidos na task-03.

- **Step 8: Commit**

```bash
git add apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts \
  apps/backend/src/gym/application/use-case/search-gym.usecase.ts \
  apps/backend/src/gym/application/use-case/search-gym.usecase.test.ts \
  apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts
git commit -m "feat(gym): use cases de listagem/busca retornam data e pagination"
```

## Critérios de Sucesso

- `FetchAllGymsUseCase.execute` e `SearchGymUseCase.execute` retornam `{ data, pagination: { total, page, limit } }`.
- DTO por item de `FetchAllGymsUseCaseOutput_DTO` mantém `id, title, description, phone, address, imageKey, latitude, longitude`.
- DTO por item de `SearchGymUseCaseOutput_DTO` mantém os mesmos campos SEM `address`.
- `fetch-all-gyms.usecase.test.ts` (novo) cobre: dados presentes, lista vazia e paginação em duas páginas.
- `search-gym.usecase.test.ts` atualizado usa `result.data`/`result.pagination` em vez de tratar `result` como array.
- `pnpm --filter backend test:run -- fetch-all-gyms.usecase.test.ts search-gym.usecase.test.ts` passa 100%.
- `pnpm --filter backend tsc:check` não apresenta erros nos arquivos desta task.
