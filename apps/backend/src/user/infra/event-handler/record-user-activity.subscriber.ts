import { inject, injectable } from "inversify"
import type { DomainEvent } from "@/shared/domain/event/domain-event"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event"
import { GoogleAccountLinkedEvent } from "@/user/domain/event/google-account-linked-event"
import { LoginSucceededEvent } from "@/user/domain/event/login-succeeded.event"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import { UserRoleChangedEvent } from "@/user/domain/event/user-role-changed.event"
import { UserStatusChangedEvent } from "@/user/domain/event/user-status-changed.event"

const ROLE_LABELS: Record<string, string> = {
	ADMIN: "Administrador",
	MEMBER: "Membro",
}

const STATUS_CHANGE_DESCRIPTIONS: Record<string, string> = {
	activated: "Conta reativada",
	suspended: "Conta suspensa",
	locked: "Conta bloqueada",
}

@injectable()
export class RecordUserActivitySubscriber {
	private readonly boundHandle: (event: DomainEvent<unknown>) => Promise<void>

	constructor(
		@inject(USER_TYPES.Repositories.UserActivity)
		private readonly userActivityRepository: UserActivityRepository,
	) {
		this.boundHandle = this.handle.bind(this)
	}

	public subscribe(): void {
		DomainEventPublisher.instance.subscribe(
			EVENTS.LOGIN_SUCCEEDED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.PASSWORD_CHANGED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.GOOGLE_ACCOUNT_LINKED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.USER_PROFILE_UPDATED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.USER_ROLE_CHANGED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.subscribe(
			EVENTS.USER_STATUS_CHANGED,
			this.boundHandle,
		)
	}

	public unsubscribe(): void {
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.LOGIN_SUCCEEDED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.PASSWORD_CHANGED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.GOOGLE_ACCOUNT_LINKED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.ACCOUNT_LOCKED_BY_SECURITY,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_PROFILE_UPDATED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_ROLE_CHANGED,
			this.boundHandle,
		)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.USER_STATUS_CHANGED,
			this.boundHandle,
		)
	}

	private async handle(event: DomainEvent<unknown>): Promise<void> {
		let recordInput: RecordUserActivityInput | null = null
		try {
			recordInput = this.toRecordInput(event)
			if (!recordInput) return
			await this.userActivityRepository.record(recordInput)
		} catch (error) {
			console.error(
				`[RecordUserActivitySubscriber] Falha ao registrar atividade userId=${recordInput?.userId ?? "desconhecido"} type=${recordInput?.type ?? "desconhecido"}:`,
				error,
			)
		}
	}

	private toRecordInput(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		return (
			this.fromLoginSucceeded(event) ??
			this.fromPasswordChanged(event) ??
			this.fromGoogleAccountLinked(event) ??
			this.fromAccountLockedBySecurity(event) ??
			this.fromUserProfileUpdated(event) ??
			this.fromUserRoleChanged(event) ??
			this.fromUserStatusChanged(event) ??
			null
		)
	}

	private fromLoginSucceeded(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof LoginSucceededEvent)) return null
		return {
			userId: event.payload.userId,
			type: "LOGIN",
			description: "Login realizado",
			occurredAt: event.date,
		}
	}

	private fromPasswordChanged(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof PasswordChangedEvent)) return null
		return {
			userId: event.payload.userId,
			type: "PASSWORD_CHANGED",
			description: "Senha alterada",
			occurredAt: event.date,
		}
	}

	private fromGoogleAccountLinked(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof GoogleAccountLinkedEvent)) return null
		return {
			userId: event.payload.userId,
			type: "GOOGLE_LINKED",
			description: "Conta Google vinculada",
			occurredAt: event.date,
		}
	}

	private fromAccountLockedBySecurity(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof AccountLockedBySecurityEvent)) return null
		return {
			userId: event.payload.userId,
			type: "ACCOUNT_LOCKED",
			description: "Conta bloqueada por segurança",
			occurredAt: event.date,
		}
	}

	private fromUserProfileUpdated(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof UserProfileUpdatedEvent)) return null
		return {
			userId: event.payload.userId,
			type: "PROFILE_UPDATED",
			description: "Perfil atualizado",
			occurredAt: event.date,
		}
	}

	private fromUserRoleChanged(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof UserRoleChangedEvent)) return null
		const roleLabel =
			ROLE_LABELS[event.payload.newRole] ?? event.payload.newRole
		return {
			userId: event.payload.userId,
			type: "ROLE_CHANGED",
			description: `Role alterada para ${roleLabel}`,
			metadata: {
				previousRole: event.payload.previousRole,
				newRole: event.payload.newRole,
			},
			occurredAt: event.date,
		}
	}

	private fromUserStatusChanged(
		event: DomainEvent<unknown>,
	): RecordUserActivityInput | null {
		if (!(event instanceof UserStatusChangedEvent)) return null
		const description =
			STATUS_CHANGE_DESCRIPTIONS[event.payload.newStatus] ??
			event.payload.newStatus
		return {
			userId: event.payload.userId,
			type: "STATUS_CHANGED",
			description,
			metadata: {
				previousStatus: event.payload.previousStatus,
				newStatus: event.payload.newStatus,
			},
			occurredAt: event.date,
		}
	}
}
