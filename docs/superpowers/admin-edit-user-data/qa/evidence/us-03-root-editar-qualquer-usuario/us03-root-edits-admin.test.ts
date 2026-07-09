// QA acceptance test — US-03 (root edita qualquer usuário, incluindo outros admins)
// Executar com: pnpm --filter backend exec vitest --run --config ./test/vite.config.app-domain.ts \
//   ../../docs/superpowers/admin-edit-user-data/qa/evidence/us-03-root-editar-qualquer-usuario/us03-root-edits-admin.acceptance-test.ts
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import { User } from "@/user/domain/user"
import type {
	SuspendUserUseCase,
	SuspendUserUseCaseInput,
} from "@/user/application/use-case/suspend-user.usecase"
import type {
	UpdateUserProfileUseCase,
	UpdateUserProfileUseCaseInput,
} from "@/user/application/use-case/update-user-profile.usecase"

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

const ROOT_ID = "root-id"
const OTHER_ADMIN_ID = "other-admin-id"

describe("US-03: root edita qualquer usuário, incluindo outros admins", () => {
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		await userRepository.save(restoreUser(ROOT_ID, "ADMIN", true))
		await userRepository.save(restoreUser(OTHER_ADMIN_ID, "ADMIN"))
	})

	afterEach(() => {
		container.restore()
	})

	test("FR-007: root edita nome/email de outro administrador com sucesso", async () => {
		const sut = container.get<UpdateUserProfileUseCase>(
			USER_TYPES.UseCases.UpdateUserProfile,
		)
		const input: UpdateUserProfileUseCaseInput = {
			requesterId: ROOT_ID,
			userId: OTHER_ADMIN_ID,
			name: "Novo Nome Admin",
			email: "novo-admin@test.com",
		}
		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId(OTHER_ADMIN_ID)
		expect(updated?.name).toBe("Novo Nome Admin")
		expect(updated?.email).toBe("novo-admin@test.com")
	})

	test("FR-007: root altera status (suspende) outro administrador com sucesso", async () => {
		const sut = container.get<SuspendUserUseCase>(
			USER_TYPES.UseCases.SuspendUser,
		)
		const input: SuspendUserUseCaseInput = {
			requesterId: ROOT_ID,
			userId: OTHER_ADMIN_ID,
		}
		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId(OTHER_ADMIN_ID)
		expect(updated?.isActive).toBe(false)
	})
})
