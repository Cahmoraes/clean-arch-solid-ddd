# Task 1: Backend — GymRepository retorna total de registros

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Alterar o contrato de `GymRepository.fetchGyms` para retornar, além da lista de itens da página atual, a contagem total de registros que satisfazem o filtro (`{ items, total }`). Essa contagem é o insumo necessário para o frontend calcular `totalPages` e exibir paginação numerada em `/academias`, replicando o padrão que `/admin/usuarios` já usa. Esta task cobre apenas a camada de repositório (interface + implementação Prisma + implementação in-memory) — os use cases e controllers que consomem `fetchGyms` são ajustados nas tasks 2 e 3.

## Arquivos

- Modify: `apps/backend/src/gym/application/repository/gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.test.ts` (criar se não existir; se existir, adicionar/atualizar os testes de `fetchGyms`)

### Conformidade com as Skills Padrão

- `test-antipatterns`: garantir que os testes de `fetchGyms` (in-memory) validem comportamento observável (itens retornados, `total` correto) e não detalhes internos de implementação (como a estrutura do `ExtendedSet`), evitando testes acoplados a implementação.
- `vitest`: usar os matchers e a estrutura de describe/it do Vitest já convencionada no backend para os testes unitários de repositório.
- `refactoring`: a extração do `where` para uma variável local no `PrismaGymRepository` (para reuso entre `findMany` e `count`) é uma refatoração de eliminação de duplicação (DRY) que deve preservar o comportamento externo observável.

## Passos

- **Step 1: Escrever o teste que falha para o repositório in-memory**

Abra (ou crie) `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.test.ts`. Adicione (ou confirme que já existe, adaptando ao novo contrato) um teste cobrindo o novo retorno `{ items, total }`:

```typescript
import { describe, expect, it } from 'vitest'
import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { Gym } from '@/gym/enterprise/entities/gym'

function makeGym(overrides: Partial<Parameters<typeof Gym.create>[0]> = {}) {
  return Gym.create({
    title: 'Academia Teste',
    description: 'Descrição',
    phone: '11999999999',
    latitude: -23.55052,
    longitude: -46.633308,
    ...overrides,
  })
}

describe('InMemoryGymRepository.fetchGyms', () => {
  it('retorna items e total corretos quando há mais registros do que o tamanho da página', async () => {
    const sut = new InMemoryGymRepository()
    for (let i = 0; i < 25; i++) {
      await sut.save(makeGym({ title: `Academia ${i}` }))
    }

    const result = await sut.fetchGyms({ page: 1 })

    expect(result.total).toBe(25)
    expect(result.items).toHaveLength(20)
  })

  it('retorna a segunda página com os itens restantes e o mesmo total', async () => {
    const sut = new InMemoryGymRepository()
    for (let i = 0; i < 25; i++) {
      await sut.save(makeGym({ title: `Academia ${i}` }))
    }

    const result = await sut.fetchGyms({ page: 2 })

    expect(result.total).toBe(25)
    expect(result.items).toHaveLength(5)
  })

  it('retorna items vazio e total 0 quando não há registros', async () => {
    const sut = new InMemoryGymRepository()

    const result = await sut.fetchGyms({ page: 1 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})
```

Ajuste os nomes de campos do `Gym.create` (`title`, `description`, `phone`, `latitude`, `longitude`) e a assinatura de `sut.save`/`fetchGyms` conforme o código real do arquivo `in-memory-gym-repository.ts` e da entidade `Gym` — preserve a factory de criação já usada nos demais testes do bounded context de gym, se ela existir (ex.: em `test/factories`), reaproveitando-a no lugar de `makeGym` caso já exista uma equivalente.

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- in-memory-gym-repository.test.ts`
Expected: FAIL — `result.total` é `undefined` (o retorno atual de `fetchGyms` é um array bruto, não um objeto `{ items, total }`), erro do tipo `TypeError: Cannot read properties of undefined` ou falha de asserção `expect(undefined).toBe(25)`.

- **Step 3: Implementar o novo contrato na interface `GymRepository`**

Em `apps/backend/src/gym/application/repository/gym-repository.ts`, adicione a interface `FetchGymsOutput` e altere a assinatura de `fetchGyms`:

```typescript
export interface FetchGymsOutput {
  items: Gym[]
  total: number
}

export interface GymRepository {
  // ...outros métodos existentes preservados sem alteração...
  fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput>
}
```

Preserve `FetchGymsInput` e quaisquer outros métodos da interface exatamente como estão hoje — apenas o tipo de retorno de `fetchGyms` muda de `Promise<Gym[]>` para `Promise<FetchGymsOutput>`.

- **Step 4: Implementar no `InMemoryGymRepository`**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`, ajuste `fetchGyms` para computar e retornar `total` preservando a filtragem/paginação manual já existente (baseada em `ExtendedSet`/slice):

```typescript
async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
  const filteredGyms = this.gyms /* preserve exatamente a mesma cadeia de filtragem já existente aqui */
  const all = filteredGyms.toArray()
  const items = all.slice(
    (input.page - 1) * env.ITEMS_PER_PAGE,
    input.page * env.ITEMS_PER_PAGE,
  )
  return { items, total: all.length }
}
```

Ajuste os nomes exatos das variáveis intermediárias (`this.gyms`, o método de filtragem usado, o import de `env`) conforme o arquivo real — o objetivo é preservar 100% da lógica de filtragem/paginação já existente, apenas envolvendo o retorno final em `{ items, total }` em vez de retornar `items` isoladamente.

- **Step 5: Rodar o teste e confirmar sucesso**

Run: `pnpm --filter backend test:run -- in-memory-gym-repository.test.ts`
Expected: PASS — os 3 testes (25 registros/página 1, página 2, vazio) passam.

- **Step 6: Implementar no `PrismaGymRepository` e validar com `tsc:check`**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`, extraia o filtro `where` para uma variável local ANTES de montar as chamadas ao Prisma, e use `Promise.all` para buscar itens e contagem com o MESMO filtro:

```typescript
async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
  const where = input.title
    ? { title: { contains: input.title, mode: 'insensitive' as const } }
    : undefined

  const skip = (input.page - 1) * env.ITEMS_PER_PAGE
  const take = env.ITEMS_PER_PAGE

  const [gymData, total] = await Promise.all([
    prismaClient.gym.findMany({ where, skip, take }),
    prismaClient.gym.count({ where }),
  ])

  return { items: gymData.map(this.createGym), total }
}
```

Ajuste os nomes exatos de `where`/`skip`/`take`, o operador de filtro (`contains`/`mode: 'insensitive'`) e o nome do client (`prismaClient`) conforme o arquivo real — a regra inegociável é: NÃO duplicar a expressão do `where` entre `findMany` e `count`; ambos devem referenciar a mesma variável `where`, pois divergência entre os dois filtros quebraria a consistência entre `items` e `total`.

Rode a checagem de tipos, que deve apontar quaisquer consumidores desatualizados (a serem corrigidos nas tasks 2 e 3):

Run: `pnpm --filter backend tsc:check`
Expected: erros de tipo esperados apenas nos arquivos que consomem `fetchGyms` fora desta task (use cases `fetch-all-gyms.usecase.ts` e `search-gym.usecase.ts`, corrigidos na task-02). Nenhum erro deve aparecer nos 3 arquivos desta task.

- **Step 7: Commit**

```bash
git add apps/backend/src/gym/application/repository/gym-repository.ts \
  apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.test.ts
git commit -m "feat(gym): fetchGyms retorna total de registros no repositório"
```

## Critérios de Sucesso

- `GymRepository.fetchGyms` retorna `Promise<{ items: Gym[]; total: number }>` em vez de `Promise<Gym[]>`.
- `PrismaGymRepository.fetchGyms` usa uma única variável `where` compartilhada entre `findMany` e `count` — sem duplicação do filtro.
- `InMemoryGymRepository.fetchGyms` preserva a lógica de filtragem/paginação manual já existente e adiciona `total` corretamente.
- `pnpm --filter backend test:run -- in-memory-gym-repository.test.ts` passa com os 3 novos testes.
- `pnpm --filter backend tsc:check` não apresenta erros nos 3 arquivos desta task (erros em consumidores externos são esperados e resolvidos na task-02).
