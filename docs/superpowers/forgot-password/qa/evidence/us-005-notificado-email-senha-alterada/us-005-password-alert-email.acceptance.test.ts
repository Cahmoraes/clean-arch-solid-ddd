import { createHash, randomBytes } from "node:crypto"
import { setupUserModule } from "../../../../../../apps/backend/src/bootstrap/setup-user-module"
import {
	DomainEventPublisher,
	type Subscriber,
} from "../../../../../../apps/backend/src/shared/domain/event/domain-event-publisher"
import { RevokedTokenDAOMemory } from "../../../../../../apps/backend/src/shared/infra/database/dao/in-memory/revoked-token-dao-memory"
import { InMemoryPasswordResetTokenStore } from "../../../../../../apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import type { InMemoryUserRepository } from "../../../../../../apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { MailerGatewayMemory } from "../../../../../../apps/backend/src/shared/infra/gateway/mailer-gateway-memory"
import { container } from "../../../../../../apps/backend/src/shared/infra/ioc/container"
import {
	AUTH_TYPES,
	USER_TYPES,
} from "../../../../../../apps/backend/src/shared/infra/ioc/types"
import type { ResetPasswordUseCase } from "../../../../../../apps/backend/src/user/application/use-case/reset-password.usecase"
import { PasswordChangedEvent } from "../../../../../../apps/backend/src/user/domain/event/password-changed-event"
import type { SendPasswordAlertEmailNotification } from "../../../../../../apps/backend/src/user/infra/email/send-password-alert-email.notification"
import { createAndSaveUser } from "../../../../../../apps/backend/test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "../../../../../../apps/backend/test/factory/setup-in-memory-repositories"

const PASSWORD_RESET_TTL = 900

function makeTokenPair(): { rawToken: string; tokenHash: string } {
	const rawToken = randomBytes(32).toString("hex")
	const tokenHash = createHash("sha256").update(rawToken).digest("hex")
	return { rawToken, tokenHash }
}

describe("US-005 - alerta por email após reset de senha", () => {
	let sut: ResetPasswordUseCase
	let userRepository: InMemoryUserRepository
	let tokenStore: InMemoryPasswordResetTokenStore
	let notification: SendPasswordAlertEmailNotification | null = null

	beforeEach(() => {
		container.snapshot()

		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository

		tokenStore = new InMemoryPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)

		container
			.rebind(AUTH_TYPES.DAO.RevokedToken)
			.toConstantValue(new RevokedTokenDAOMemory())

		sut = container.get<ResetPasswordUseCase>(USER_TYPES.UseCases.ResetPassword)
	})

	afterEach(() => {
		notification?.unsubscribe()
		notification = null
		container.restore()
	})

	test("deve publicar PasswordChangedEvent ao concluir reset com sucesso", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "reset-password-alert@example.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		let receivedEvent: PasswordChangedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof PasswordChangedEvent) {
				receivedEvent = event
			}
		}
		DomainEventPublisher.instance.subscribe("passwordChanged", subscriber)

		try {
			const result = await sut.execute({
				token: rawToken,
				newPassword: "NewPass456!",
			})

			expect(result.isSuccess()).toBe(true)
		} finally {
			DomainEventPublisher.instance.unsubscribe("passwordChanged", subscriber)
		}

		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userEmail: "reset-password-alert@example.com",
				}),
			}),
		)
	})

	test("deve enviar email de alerta quando setupUserModule registra a notificação", async () => {
		const mailer = container.get(MailerGatewayMemory)
		mailer.sentEmails.length = 0

		setupUserModule()
		notification = container.get<SendPasswordAlertEmailNotification>(
			USER_TYPES.Notifications.SendPasswordAlertEmail,
		)

		await DomainEventPublisher.instance.publish(
			new PasswordChangedEvent({
				userEmail: "bootstrap-alert@example.com",
				userName: "Bootstrap User",
			}),
		)

		expect(mailer.sentEmails).toHaveLength(1)
		expect(mailer.sentEmails[0]).toEqual(
			expect.objectContaining({
				to: "bootstrap-alert@example.com",
				subject: "Aviso de segurança: senha definida na sua conta",
			}),
		)
		expect(mailer.sentEmails[0].html).toContain("bootstrap-alert@example.com")
		expect(mailer.sentEmails[0].html).toContain("Bootstrap User")
	})
})
