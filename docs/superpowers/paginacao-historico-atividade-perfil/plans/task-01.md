# Task 1: Paginar o caso de uso e as fontes de atividades [FR-002, FR-004]

**Status:** DONE
**PRD:** `../prd/prd-paginacao-historico-atividade-perfil.md`
**Spec:** `../specs/paginacao-historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Substituir a operação “últimos N eventos” por uma operação de página no port `UserActivityDao`, no caso de uso e nas implementações Prisma/in-memory. O resultado deve carregar no máximo 20 itens, calcular o total das duas fontes e preservar a ordenação global por `occurredAt` com `id` como desempate estável.

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/dao/user-activity-dao.ts`
- Modify: `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts`
- Modify: `apps/backend/src/user/infra/controller/get-user-activity.controller.ts`
- Test: `apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts`
- Test: `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: definir os contratos de página e DTOs sem casts frouxos, mantendo os tipos compartilhados entre port, caso de uso e DAOs.
- `test-antipatterns`: escrever testes contra comportamento observável do caso de uso/DAO, sem adicionar métodos de produção exclusivos para teste ou mockar a lógica que está sendo validada.

## Passos

- **Step 1: Write the failing test**

Adicionar ao teste do caso de uso um cenário de segunda página com 21 itens e verificar o contrato completo:

```ts
const result = await sut.execute({ userId: "user-1", page: 2 })

expect(result.isSuccess()).toBe(true)
expect(result.forceSuccess().value.pagination).toEqual({
	page: 2,
	pageSize: 20,
	total: 21,
	totalPages: 2,
})
expect(result.forceSuccess().value.events).toHaveLength(1)
```

Adicionar aos testes in-memory e Prisma uma coleção com eventos dos dois tipos de fonte, timestamps iguais e IDs distintos; solicitar `page=2`, `pageSize=20` e verificar que o desempate por `id` é estável e que apenas a faixa 21–40 é retornada.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run --config test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts`

Expected: FAIL because `execute` and `UserActivityDao` still accept only `userId`/`limit` and the result does not contain `pagination`.

- **Step 3: Write minimal implementation**

No port `apps/backend/src/user/application/persistence/dao/user-activity-dao.ts`, adicionar os contratos e substituir o método:

```ts
export interface UserActivityPagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

export interface UserActivityPage {
	items: UserActivityItem[]
	pagination: UserActivityPagination
}

export interface UserActivityDao {
	findActivityPage(
		userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage>
}
```

No caso de uso, aceitar `page?: number`, normalizar ausência para 1, fixar `pageSize = 20`, chamar `findActivityPage`, mapear `occurredAt` para ISO e retornar `events` mais os quatro metadados. Na implementação Prisma, calcular `skip = (page - 1) * pageSize` e `sourceTake = skip + pageSize`; executar em paralelo as duas buscas limitadas por `sourceTake` e os dois `count`, mesclar, ordenar por timestamp descendente e `id` descendente, aplicar `.slice(skip, skip + pageSize)` e somar os totais. Atualizar a implementação in-memory com a mesma semântica. Adaptar o consumidor administrativo do port (`get-user-activity.controller.ts`, `user-activity-dao-provider.ts`, módulo e business-flow) apenas para a nova assinatura interna, preservando sua resposta pública sem paginação e seu fluxo de administrador. Confirmar no provider e no módulo que os bindings Inversify existentes continuam compatíveis, sem criar novos serviços.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run --config test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts`

Expected: PASS for the use case and in-memory DAO pagination scenarios.

- **Step 5: Commit** *(sequential execution only)*

```bash
git add apps/backend/src/user/application/persistence/dao/user-activity-dao.ts apps/backend/src/user/application/use-case/get-user-activity.usecase.ts apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts apps/backend/src/user/infra/controller/get-user-activity.controller.ts apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.test.ts apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts
git commit -m "Paginar fontes do historico de atividades"
```

## Critérios de Sucesso

- O caso de uso e ambos os DAOs retornam no máximo 20 itens e metadados corretos para primeira, intermediária, última e página vazia.
- O merge preserva a ordem decrescente e o desempate estável entre eventos e check-ins.
- FR-002 e FR-004 estão cobertos pelos testes unitários e de integração sem alterar captura ou persistência dos eventos.
