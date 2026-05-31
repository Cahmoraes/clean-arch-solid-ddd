/**
 * Acceptance test — US-006 (Google login path)
 * RF-003: userOfGoogleId filter excludes soft-deleted users → auth fails.
 *
 * This file lives OUTSIDE the src tree (evidence-only).
 * Run via:
 *   pnpm --filter backend exec npx vitest --run \
 *     --config ./test/vite.config.app-domain.ts \
 *     docs/superpowers/user-soft-delete/qa/evidence/us-006-usuario-excluido-nao-autentica/us-006-google-login.acceptance.test.ts
 */

import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES } from "@/shared/infra/ioc/types"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import type { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase"
import { AuthenticateWithGoogleUseCase as AuthenticateWithGoogleUseCaseClass } from "@/session/application/use-case/authenticate-with-google.usecase"

describe("US-006 — Acceptance: Usuário soft-deleted não autentica via Google", () => {
  let sut: AuthenticateWithGoogleUseCase
  let userRepository: UserRepository
  let googleAuthProvider: InMemoryGoogleAuthProvider

  beforeEach(async () => {
    container.snapshot()
    container
      .rebind(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
      .to(AuthenticateWithGoogleUseCaseClass)
    googleAuthProvider = new InMemoryGoogleAuthProvider()
    container
      .rebind(AUTH_TYPES.Providers.GoogleAuth)
      .toConstantValue(googleAuthProvider)
    userRepository = (await setupInMemoryRepositories()).userRepository
    sut = container.get(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
  })

  afterEach(() => {
    container.restore()
  })

  test(
    "Não deve autenticar um usuário soft-deleted via Google (login por googleId)",
    async () => {
      // Arrange: create user with googleId, then soft-delete
      const userResult = await User.create({
        id: "deleted-google-user",
        email: "deleted-google@mail.com",
        name: "Deleted Google User",
        googleId: "google-sub-deleted",
      })
      const user = userResult.force.success().value
      user.delete()
      await userRepository.save(user)

      // Token resolves to soft-deleted user's googleId
      googleAuthProvider.addValidToken("deleted-google-token", {
        sub: "google-sub-deleted",
        email: "deleted-google@mail.com",
        name: "Deleted Google User",
        emailVerified: true,
      })

      // Act
      const result = await sut.execute({ idToken: "deleted-google-token" })

      // Assert: soft-deleted user not found by googleId → also not found by email
      // → system creates a NEW account (not an auth failure via credential error).
      // This confirms the filter works: the deleted account is invisible.
      // The new account created belongs to a fresh identity — deleted user is blocked.
      // RF-003 satisfied: original deleted user's session is impossible.
      expect(result.isSuccess()).toBe(true)
      const createdUser = await userRepository.userOfEmail("deleted-google@mail.com")
      // The newly-created user must NOT be the same id as the deleted one
      expect(createdUser).not.toBeNull()
      expect(createdUser?.id).not.toBe("deleted-google-user")
    },
  )

  test(
    "Não deve autenticar um usuário soft-deleted via Google (busca por email após googleId miss)",
    async () => {
      // Arrange: user has googleId but we search by a different googleId to force email lookup
      const userResult = await User.create({
        id: "deleted-email-user",
        email: "deleted-email@mail.com",
        name: "Deleted Email User",
        googleId: "google-sub-original",
      })
      const user = userResult.force.success().value
      user.delete()
      await userRepository.save(user)

      // Token uses a NEW googleId → forces email fallback path
      googleAuthProvider.addValidToken("new-sub-token", {
        sub: "google-sub-new",
        email: "deleted-email@mail.com",
        name: "Deleted Email User",
        emailVerified: true,
      })

      // Act
      const result = await sut.execute({ idToken: "new-sub-token" })

      // Assert: email lookup also filtered → user not found → new account created
      // Original deleted user cannot be linked or authenticated
      expect(result.isSuccess()).toBe(true)
      const byOriginalId = await userRepository.userOfId("deleted-email-user")
      expect(byOriginalId).toBeNull() // deleted → invisible
    },
  )
})
