export const RoleValues = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const

export type RoleTypes = (typeof RoleValues)[keyof typeof RoleValues]

export class Role {
  private readonly _value: RoleTypes

  private constructor(role: RoleTypes = 'MEMBER') {
    this._value = role
  }

  public static create(role: RoleTypes = 'MEMBER'): Role {
    return new Role(role)
  }

  public static restore(role: RoleTypes): Role {
    return new Role(role)
  }

  get value(): RoleTypes {
    return this._value
  }
}
