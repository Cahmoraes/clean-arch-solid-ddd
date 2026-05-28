/**
 * // Métodos principais
user.suspend()     // Suspender usuário
user.activate()    // Ativar usuário
user.deactivate()  // Desativar usuário

// Métodos de consulta
user.isActive()    // Verificar se está ativo
user.isSuspended() // Verificar se está suspenso
user.isInactive()  // Verificar se está inativo
 */

import type { User } from "../user"

export const StatusTypes = {
	ACTIVATED: "activated",
	SUSPENDED: "suspended",
	LOCKED: "locked",
} as const

export type StatusTypes = (typeof StatusTypes)[keyof typeof StatusTypes]

export abstract class UserStatus {
	abstract readonly type: StatusTypes
	constructor(protected readonly user: User) {}

	abstract activate(): void
	abstract suspend(): void
	abstract lock(): void
}

class ActivatedStatus extends UserStatus {
	readonly type: StatusTypes = "activated"

	public activate(): void {
		return
	}

	public suspend(): void {
		const userStatus = UserStatusFactory.create(this.user, "suspended")
		this.user._changeStatus(userStatus)
	}

	public lock(): void {
		const userStatus = UserStatusFactory.create(this.user, "locked")
		this.user._changeStatus(userStatus)
	}
}

class SuspendedStatus extends UserStatus {
	readonly type: StatusTypes = "suspended"

	public activate(): void {
		const userStatus = UserStatusFactory.create(this.user, "activated")
		this.user._changeStatus(userStatus)
	}

	public suspend(): void {
		return
	}

	public lock(): void {
		return
	}
}

class LockedStatus extends UserStatus {
	readonly type: StatusTypes = "locked"

	public activate(): void {
		const userStatus = UserStatusFactory.create(this.user, "activated")
		this.user._changeStatus(userStatus)
	}

	public suspend(): void {
		const userStatus = UserStatusFactory.create(this.user, "suspended")
		this.user._changeStatus(userStatus)
	}

	public lock(): void {
		return
	}
}

export class UserStatusFactory {
	static create(user: User, statusType: StatusTypes): UserStatus {
		switch (statusType) {
			case "activated":
				return new ActivatedStatus(user)
			case "suspended":
				return new SuspendedStatus(user)
			case "locked":
				return new LockedStatus(user)
			default:
				return new ActivatedStatus(user)
		}
	}
}
