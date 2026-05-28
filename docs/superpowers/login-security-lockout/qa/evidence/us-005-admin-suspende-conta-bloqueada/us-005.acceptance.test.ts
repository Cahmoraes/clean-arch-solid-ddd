/**
 * Acceptance test — US-005: Admin suspende conta bloqueada
 *
 * RF-016: O admin pode suspender uma conta com status `locked`,
 * transicionando-a para `suspended`.
 *
 * Este teste verifica que:
 * 1. LockedStatus.suspend() transiciona para SuspendedStatus (domínio)
 * 2. SuspendUserUseCase persiste a transição locked → suspended (aplicação)
 */

import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import { StatusTypes } from "@/user/domain/value-object/status"
import type {
  SuspendUserUseCase,
  SuspendUserUseCaseInput,
} from "@/user/application/use-case/suspend-user.usecase"

// ─── Domain-level: state machine ───────────────────────────────────────────

describe("US-005 — RF-016: LockedStatus state machine (domínio)", () => {
  test("LockedStatus.suspend() deve retornar SuspendedStatus", async () => {
    const user = User.restore({
      id: "locked-user-id",
      name: "Locked User",
      email: "locked@example.com",
      password: "hashed_password",
      role: "MEMBER",
      status: StatusTypes.LOCKED,
      createdAt: new Date(),
    })

    expect(user.isLocked).toBe(true)
    user.suspend()
    expect(user.isSuspend).toBe(true)
    expect(user.status).toBe(StatusTypes.SUSPENDED)
    expect(user.isActive).toBe(false)
    expect(user.isLocked).toBe(false)
  })

  test("LockedStatus.suspend() não deve manter status locked após chamada", async () => {
    const user = User.restore({
      id: "locked-user-id-2",
      name: "Locked User 2",
      email: "locked2@example.com",
      password: "hashed_password",
      role: "MEMBER",
      status: StatusTypes.LOCKED,
      createdAt: new Date(),
    })

    user.suspend()
    expect(user.isLocked).toBe(false)
    expect(user.isSuspend).toBe(true)
  })
})

// ─── Application-level: SuspendUserUseCase ─────────────────────────────────

describe("US-005 — RF-016: SuspendUserUseCase com conta locked (aplicação)", () => {
  let sut: SuspendUserUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    sut = container.get(USER_TYPES.UseCases.SuspendUser)
  })

  afterEach(() => {
    container.restore()
  })

  test("deve suspender um usuário com status locked (RF-016)", async () => {
    const lockedUser = User.restore({
      id: "locked-target-id",
      name: "Locked Target",
      email: "lockedtarget@example.com",
      password: "hashed_password",
      role: "MEMBER",
      status: StatusTypes.LOCKED,
      createdAt: new Date(),
    })

    await userRepository.save(lockedUser)

    const input: SuspendUserUseCaseInput = { userId: "locked-target-id" }
    const result = await sut.execute(input)

    expect(result.isSuccess()).toBe(true)

    const updatedUser = await userRepository.userOfId("locked-target-id")
    expect(updatedUser).not.toBeNull()
    expect(updatedUser!.status).toBe(StatusTypes.SUSPENDED)
    expect(updatedUser!.isSuspend).toBe(true)
    expect(updatedUser!.isLocked).toBe(false)
    expect(updatedUser!.isActive).toBe(false)
  })

  test("transição locked → suspended não deve ser reversível autonomamente pelo usuário", async () => {
    // Após suspensão, SuspendedStatus.activate() permite reativação apenas por admin
    // Este teste valida que o status persiste como suspended no repositório
    const lockedUser = User.restore({
      id: "locked-persist-id",
      name: "Locked Persist",
      email: "lockedpersist@example.com",
      password: "hashed_password",
      role: "MEMBER",
      status: StatusTypes.LOCKED,
      createdAt: new Date(),
    })

    await userRepository.save(lockedUser)
    await sut.execute({ userId: "locked-persist-id" })

    const userAfterSuspend = await userRepository.userOfId("locked-persist-id")
    expect(userAfterSuspend!.status).toBe(StatusTypes.SUSPENDED)
    // Status permanece suspended — não volta para activated nem locked automaticamente
    expect(userAfterSuspend!.status).not.toBe(StatusTypes.ACTIVATED)
    expect(userAfterSuspend!.status).not.toBe(StatusTypes.LOCKED)
  })
})
