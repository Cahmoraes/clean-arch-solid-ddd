# Task 2: Backend DAO — PrismaUserDAO

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Atualizar `PrismaUserDAO.fetchAndCountUsers()` para aplicar filtro LIKE case-insensitive no Prisma quando `query` estiver presente, usando `OR [name contains, email contains]` com `mode: 'insensitive'`. O `total()` também deve refletir apenas os registros filtrados. Não há testes unitários para esta classe (depende de banco de dados real); o comportamento será validado nos testes de business flow da Task 3.

**Pré-requisito:** Task 1 concluída (`FetchUsersInput` já tem `query?: string`).

## Arquivos

- Modify: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`

## Conformidade com as Competências Padrão

- `no-workarounds`: filtro aplicado na query Prisma (server-side), não em memória após busca

## Passos

- [ ] **Step 1: Substituir o conteúdo de `PrismaUserDAO`**

Abrir `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts` e substituir pelo conteúdo abaixo:

```typescript
import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
} from "@/user/application/persistence/dao/user-dao"

@injectable()
export class PrismaUserDAO implements UserDAO {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient,
	) {}

	public async fetchAndCountUsers(
		input: FetchUsersInput,
	): Promise<FetchUsersOutput> {
		const where = input.query
			? {
					OR: [
						{
							name: {
								contains: input.query,
								mode: "insensitive" as const,
							},
						},
						{
							email: {
								contains: input.query,
								mode: "insensitive" as const,
							},
						},
					],
				}
			: undefined
		const usersData = await this.prisma.user.findMany({
			select: {
				email: true,
				id: true,
				name: true,
				role: true,
				status: true,
				created_at: true,
			},
			where,
			take: input.limit,
			skip: (input.page - 1) * input.limit,
		})
		return {
			total: await this.total(input.query),
			usersData: usersData.map((userData) => ({
				id: userData.id,
				email: userData.email,
				name: userData.name,
				role: userData.role,
				status: userData.status,
				createdAt: userData.created_at.toISOString(),
			})),
		}
	}

	private total(query?: string): Promise<number> {
		if (!query) return this.prisma.user.count()
		return this.prisma.user.count({
			where: {
				OR: [
					{ name: { contains: query, mode: "insensitive" } },
					{ email: { contains: query, mode: "insensitive" } },
				],
			},
		})
	}
}
```

- [ ] **Step 2: Verificar TypeScript e lint**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix
```

Resultado esperado: zero erros.

- [ ] **Step 3: Rodar os testes unitários para confirmar que nada quebrou**

```bash
pnpm --filter backend test:run
```

Resultado esperado: todos os testes passando.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts && git commit -m "feat(user): adiciona filtro LIKE case-insensitive no PrismaUserDAO

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `PrismaUserDAO.fetchAndCountUsers()` aplica cláusula `where OR [name contains, email contains]` quando `query` está presente
- Sem `query`: comportamento idêntico ao original (sem filtro)
- `total()` conta apenas os registros que passam pelo filtro
- `tsc:check` e `biome:fix` passam sem erros
