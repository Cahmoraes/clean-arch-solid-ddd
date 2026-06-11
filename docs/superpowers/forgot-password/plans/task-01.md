# Task 1: Extend RevokedTokenDAO para revogação em massa por usuário [RF-012]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

O `RevokedTokenDAO` atual só revoga sessões individuais por JWI. Para invalidar TODAS as sessões de um usuário após o reset de senha, adicionamos dois métodos à interface e suas implementações, e estendemos o `CheckSessionRevokedHandler` para verificar a revogação user-level.

## Arquivos

- Modify: `apps/backend/src/session/application/dao/revoked-token-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/redis/redis-revoked-token-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.ts`
- Modify: `apps/backend/src/shared/infra/server/services/check-session-revoked.ts`
- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`

### Conformidade com as Skills Padrão

- no-workarounds: evite patch de interface só para testes; a extensão é real e necessária
- test-antipatterns: não mocke `RevokedTokenDAO` – use `RevokedTokenDAOMemory` em testes

## Passos

- [ ] **Step 1: Extender a interface `RevokedTokenDAO`**

Abra `apps/backend/src/session/application/dao/revoked-token-dao.ts` e adicione os dois novos métodos:

```ts
export interface RevokedTokenData {
  jwi: string
  userId: string
  revokedAt: string
  expiresIn: string
}

export interface RevokedTokenDAO {
  revokedTokenById(id: string): Promise<RevokedTokenData | null>
  revoke(session: RevokedTokenData, ttl?: number): Promise<void>
  delete(session: RevokedTokenData): Promise<void>
  revokeAllForUser(userId: string, ttl: number): Promise<void>
  isAllRevokedForUser(userId: string): Promise<boolean>
}
```

- [ ] **Step 2: Implementar em `RevokedTokenDAOMemory`**

Abra `apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.ts`:

```ts
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
  RevokedTokenDAO,
  RevokedTokenData,
} from "@/session/application/dao/revoked-token-dao"

@injectable()
export class RevokedTokenDAOMemory implements RevokedTokenDAO {
  public revokedTokenData = new ExtendedSet<RevokedTokenData>()
  private revokedUsers = new Set<string>()

  public async revoke(session: RevokedTokenData): Promise<void> {
    this.revokedTokenData.add(session)
  }

  public async revokedTokenById(id: string): Promise<RevokedTokenData | null> {
    return this.revokedTokenData.find((session) => id === session.jwi)
  }

  public async delete(session: RevokedTokenData): Promise<void> {
    this.revokedTokenData.delete(session)
  }

  public async revokeAllForUser(userId: string, _ttl: number): Promise<void> {
    this.revokedUsers.add(userId)
  }

  public async isAllRevokedForUser(userId: string): Promise<boolean> {
    return this.revokedUsers.has(userId)
  }
}
```

- [ ] **Step 3: Implementar em `RedisRevokedTokenDAO`**

Abra `apps/backend/src/shared/infra/database/dao/redis/redis-revoked-token-dao.ts` e adicione os dois métodos ao final da classe (antes do fechamento `}`):

```ts
  public async revokeAllForUser(userId: string, ttl: number): Promise<void> {
    await this.cacheDB.set(`user:revoked:${userId}`, "1", ttl)
  }

  public async isAllRevokedForUser(userId: string): Promise<boolean> {
    const value = await this.cacheDB.get<string>(`user:revoked:${userId}`)
    return value !== null
  }
```

- [ ] **Step 4: Estender `CheckSessionRevokedHandlerExecute` e `execute()`**

Abra `apps/backend/src/shared/infra/server/services/check-session-revoked.ts`:

```ts
import type { FastifyReply, FastifyRequest } from "fastify"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao"
import { container } from "../../ioc/container"
import { AUTH_TYPES } from "../../ioc/types"
import { HTTP_STATUS } from "../http-status"

export interface CheckSessionRevokedHandlerConstructor {
  request: FastifyRequest
  reply: FastifyReply
}

export interface CheckSessionRevokedHandlerExecute {
  jwi: string
  userId: string
}

export class CheckSessionRevokedHandler {
  private readonly request: FastifyRequest
  private readonly reply: FastifyReply
  private readonly sessionDAO: RevokedTokenDAO

  constructor(props: CheckSessionRevokedHandlerConstructor) {
    this.request = props.request
    this.reply = props.reply
    this.sessionDAO = container.get<RevokedTokenDAO>(
      AUTH_TYPES.DAO.RevokedToken,
    )
  }

  public async execute(
    input: CheckSessionRevokedHandlerExecute,
  ): Promise<void> {
    const sessionFound = await this.sessionDAO.revokedTokenById(input.jwi)
    if (sessionFound) {
      this.reply
        .status(HTTP_STATUS.UNAUTHORIZED)
        .send({ message: "Session already revoked" })
      return
    }
    const userRevoked = await this.sessionDAO.isAllRevokedForUser(input.userId)
    if (userRevoked) {
      this.reply
        .status(HTTP_STATUS.UNAUTHORIZED)
        .send({ message: "Session already revoked" })
    }
  }
}
```

- [ ] **Step 5: Passar `userId` na chamada em `fastify-adapter.ts`**

Localize o método `checkSessionRevoked` em `apps/backend/src/shared/infra/server/fastify-adapter.ts` (em torno da linha 244) e altere a chamada `execute`:

```ts
// ANTES:
await checkSessionRevoked.execute({
  jwi: request.user.sub.jwi,
})

// DEPOIS:
await checkSessionRevoked.execute({
  jwi: request.user.sub.jwi,
  userId: request.user.sub.id,
})
```

- [ ] **Step 6: Escrever testes unitários para os novos métodos**

Crie `apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.test.ts`:

```ts
import { RevokedTokenDAOMemory } from "./revoked-token-dao-memory"

describe("RevokedTokenDAOMemory – revokeAllForUser / isAllRevokedForUser", () => {
  let sut: RevokedTokenDAOMemory

  beforeEach(() => {
    sut = new RevokedTokenDAOMemory()
  })

  test("isAllRevokedForUser retorna false para usuário não revogado", async () => {
    await expect(sut.isAllRevokedForUser("user-1")).resolves.toBe(false)
  })

  test("revokeAllForUser marca o usuário como revogado", async () => {
    await sut.revokeAllForUser("user-1", 900)
    await expect(sut.isAllRevokedForUser("user-1")).resolves.toBe(true)
  })

  test("não afeta outros usuários", async () => {
    await sut.revokeAllForUser("user-1", 900)
    await expect(sut.isAllRevokedForUser("user-2")).resolves.toBe(false)
  })
})
```

- [ ] **Step 7: Executar testes para verificar se passam**

```bash
cd apps/backend
pnpm test:run -- --reporter=verbose src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.test.ts
```

Esperado: todos os testes passam (3 testes).

- [ ] **Step 8: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros de tipo.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/session/application/dao/revoked-token-dao.ts \
        apps/backend/src/shared/infra/database/dao/redis/redis-revoked-token-dao.ts \
        apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.ts \
        apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory.test.ts \
        apps/backend/src/shared/infra/server/services/check-session-revoked.ts \
        apps/backend/src/shared/infra/server/fastify-adapter.ts
git commit -m "feat(session): extend RevokedTokenDAO with user-level bulk revocation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `RevokedTokenDAO` tem 5 métodos (3 existentes + 2 novos)
- `RevokedTokenDAOMemory` e `RedisRevokedTokenDAO` implementam todos os 5 métodos
- `CheckSessionRevokedHandler.execute()` verifica JWI e user-level revocation
- `fastify-adapter.ts` passa `userId` para o execute
- `pnpm tsc:check` e `pnpm test:run` passam sem erros
- Critério RF-012: após `revokeAllForUser`, `isAllRevokedForUser` retorna `true`
