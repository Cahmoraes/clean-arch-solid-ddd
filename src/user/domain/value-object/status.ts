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

import type { User } from '../user'

export const StatusTypes = {
  ACTIVATED: 'activated',
  SUSPENDED: 'suspended',
} as const

export type StatusTypes = (typeof StatusTypes)[keyof typeof StatusTypes]

export abstract class UserStatus {
  abstract readonly type: StatusTypes
  constructor(protected readonly user: User) {}

  abstract activate(): void
  abstract suspend(): void
}

class ActivatedStatus extends UserStatus {
  readonly type: StatusTypes = 'activated'

  public activate(): void {
    return
  }

  public suspend(): void {
    const userStatus = UserStatusFactory.create(this.user, 'suspended')
    this.user.changeStatus(userStatus)
  }
}

class SuspendedStatus extends UserStatus {
  readonly type: StatusTypes = 'suspended'

  public activate(): void {
    const userStatus = UserStatusFactory.create(this.user, 'activated')
    this.user.changeStatus(userStatus)
  }

  public suspend(): void {
    return
  }
}

export class UserStatusFactory {
  static create(user: User, statusType: StatusTypes): UserStatus {
    switch (statusType) {
      case 'activated':
        return new ActivatedStatus(user)
      case 'suspended':
        return new SuspendedStatus(user)
      default:
        return new ActivatedStatus(user)
    }
  }
}
