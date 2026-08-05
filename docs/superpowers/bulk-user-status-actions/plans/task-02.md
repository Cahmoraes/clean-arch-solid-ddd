# Task 2: BulkChangeUserStatusUseCase — revalidação de política de autorização [FR-009]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** capable
**Depends on:** task-01

## Visão Geral

O front-end pode enviar uma seleção de usuários que o admin logado não está autorizado a
gerenciar (ex.: outro admin, o super admin, ou o próprio requester). O backend NUNCA pode
confiar apenas na seleção do cliente — precisa revalidar, servidor-side, cada candidato
contra `UserManagementPolicy.canChangeStatus` (a mesma policy já usada por
`SuspendUserUseCase`/`ActiveUserUseCase`, reaproveitada aqui sem duplicar a regra). Esta
task cria `BulkChangeUserStatusUseCase` com a etapa de busca + filtro de elegibilidade:
buscar o requester, buscar os candidatos via `usersOfIds` (Task 01), filtrar em memória
com a policy, e retornar quais IDs são elegíveis (`eligibleIds`) e quantos foram barrados
pela política (`skippedCount`). A escrita em banco propriamente dita (o `updateManyStatus`
sobre `eligibleIds`) é completada na Task 03, que estende este mesmo arquivo.

## Arquivos

- Create: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o tipo de retorno usa `Either<NotAllowedToManageUserError, BulkChangeUserStatusResult>` e `StatusTypes` — union types e genéricos que precisam ser modelados com precisão para o Either funcionar corretamente nos dois branches (Task 02 e Task 03).
- `security-review`: esta é a superfície crítica de autorização da feature — qualquer falha na revalidação de `UserManagementPolicy.canChangeStatus` sobre cada candidato individual permitiria a um admin comum alterar o status de outro admin ou do super admin via seleção em massa, contornando a policy já aplicada nas rotas unitárias (`/users/suspend`, `/users/activate`).
- `context7`: verificar a assinatura atual de `inversify` (`@injectable`/`@inject`) usada no restante do módulo `user` antes de decorar a nova classe, para manter consistência com `SuspendUserUseCase`/`ActiveUserUseCase`.
- `vitest`: os testes seguem a convenção `describe`/`test` em português já usada em `suspend-user.usecase.test.ts`.
- `test-antipatterns`: os testes instanciam `BulkChangeUserStatusUseCase` diretamente com `new` (sem container de DI, já que os bindings só são registrados na Task 04) e usam `InMemoryUserRepository` real — nunca mockar `UserManagementPolicy` ou o repositório, pois isso testaria o mock em vez do comportamento real de autorização.

## Passos

- **Step 1: Escrever o teste falho — seleção mista exclui inelegíveis**

Criar `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts`:

```ts
import { CacheDBMemory } from "@/shared/infra/database/redis/cache-db-memory"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { User } from "@/user/domain/user"
import {
	BulkChangeUserStatusUseCase,
	type BulkChangeUserStatusUseCaseInput,
} from "./bulk-change-user-status.usecase"

function restoreUser(
	id: string,
	role: "ADMIN" | "MEMBER",
	isSuperAdmin = false,
): User {
	return User.restore({
		id,
		name: `User ${id}`,
		email: `${id}@test.com`,
		role,
		status: "activated",
		createdAt: new Date(),
		isSuperAdmin,
	})
}

describe("BulkChangeUserStatusUseCase", () => {
	let sut: BulkChangeUserStatusUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		userRepository = new InMemoryUserRepository()
		sut = new BulkChangeUserStatusUseCase(userRepository, new CacheDBMemory())
	})

	test("exclui de eligibleIds o próprio requester, outro admin e o super admin, contabilizando em skippedCount", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("other-admin-id", "ADMIN"))
		await userRepository.save(restoreUser("root-id", "ADMIN", true))
		await userRepository.save(restoreUser("member-id", "MEMBER"))

		const input: BulkChangeUserStatusUseCaseInput = {
			requesterId: "admin-id",
			userIds: ["admin-id", "other-admin-id", "root-id", "member-id"],
			targetStatus: "suspended",
		}

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.eligibleIds).toEqual(["member-id"])
		expect(result.value.skippedCount).toBe(3)
		expect(result.value.requestedCount).toBe(4)
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "exclui de eligibleIds o próprio requester"`
Expected: FAIL — módulo `./bulk-change-user-status.usecase` não existe (`Cannot find module`).

- **Step 3: Implementação mínima — busca do requester, filtro de elegibilidade**

Criar `apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts`:

```ts
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import type { StatusTypes } from "@/user/domain/value-object/status"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface BulkChangeUserStatusUseCaseInput {
	requesterId: string
	userIds: string[]
	targetStatus: StatusTypes
}

export interface BulkChangeUserStatusResult {
	eligibleIds: string[]
	skippedCount: number
	requestedCount: number
}

export type BulkChangeUserStatusUseCaseOutput = Promise<
	Either<NotAllowedToManageUserError, BulkChangeUserStatusResult>
>

@injectable()
export class BulkChangeUserStatusUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: BulkChangeUserStatusUseCaseInput,
	): BulkChangeUserStatusUseCaseOutput {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const candidates = await this.userRepository.usersOfIds(input.userIds)

		const eligibleIds: string[] = []
		let skippedCount = 0
		for (const candidate of candidates) {
			if (UserManagementPolicy.canChangeStatus(requester, candidate)) {
				eligibleIds.push(candidate.id)
			} else {
				skippedCount++
			}
		}

		return success({
			eligibleIds,
			skippedCount,
			requestedCount: input.userIds.length,
		})
	}
}
```

(O parâmetro `cacheDB` ainda não é usado nesta task — será consumido na Task 03 para
invalidar o cache após a escrita. Mantê-lo no construtor agora evita uma mudança de
assinatura pública entre as duas tasks.)

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "exclui de eligibleIds o próprio requester"`
Expected: PASS

- **Step 5: Escrever o teste falho — seleção 100% elegível**

Adicionar ao mesmo arquivo de teste:

```ts
	test("seleção 100% elegível não gera skippedCount", async () => {
		await userRepository.save(restoreUser("admin-id", "ADMIN"))
		await userRepository.save(restoreUser("member-1", "MEMBER"))
		await userRepository.save(restoreUser("member-2", "MEMBER"))

		const result = await sut.execute({
			requesterId: "admin-id",
			userIds: ["member-1", "member-2"],
			targetStatus: "activated",
		})

		expect(result.isSuccess()).toBe(true)
		if (!result.isSuccess()) return
		expect(result.value.eligibleIds.sort()).toEqual(["member-1", "member-2"])
		expect(result.value.skippedCount).toBe(0)
		expect(result.value.requestedCount).toBe(2)
	})
```

- **Step 6: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "seleção 100% elegível"`
Expected: PASS

- **Step 7: Rodar a suíte completa e o type-check**

Run: `pnpm --filter backend test:run`
Expected: PASS (todos os testes, incluindo os dois novos)

Run: `pnpm --filter backend tsc:check`
Expected: sem erros de tipo

- **Step 8: Commit**

```bash
git add apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.ts apps/backend/src/user/application/use-case/bulk-change-user-status.usecase.test.ts
git commit -m "feat: cria BulkChangeUserStatusUseCase com revalidação de política de autorização"
```

## Critérios de Sucesso

- `BulkChangeUserStatusUseCase.execute({ requesterId, userIds, targetStatus })` retorna `failure(new NotAllowedToManageUserError())` quando o requester não existe.
- Cada candidato buscado via `usersOfIds` é revalidado individualmente contra `UserManagementPolicy.canChangeStatus(requester, candidate)` — nenhuma seleção do cliente é confiada sem essa revalidação (FR-009).
- Usuários inelegíveis (self, outro admin quando requester não é root, super admin) são excluídos de `eligibleIds` e contabilizados em `skippedCount`, nunca lançam erro nem interrompem o processamento dos demais.
- Uma seleção 100% elegível retorna `skippedCount: 0` e `eligibleIds` com todos os IDs da seleção.
- `pnpm --filter backend test:run` e `pnpm --filter backend tsc:check` passam sem erros.
