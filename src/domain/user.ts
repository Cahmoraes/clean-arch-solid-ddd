import type { Optional } from '@/@types/optional'

import { Password } from './password'

export interface UserProps {
  name: string
  email: string
  password: Password
  createdAt: Date
}

type UserPropsWithoutPassword = Omit<UserProps, 'password'>

export type CreateUserProps = Optional<
  UserPropsWithoutPassword,
  'createdAt'
> & {
  password: string
}

export type RestoreUserProps = Omit<UserPropsWithoutPassword, 'password'> & {
  password: string
  updatedAt?: Date
}

export class User {
  private readonly _name: string
  private readonly _email: string
  private readonly _password: Password
  private readonly _createdAt: Date

  private constructor(userDto: UserProps) {
    this._name = userDto.name
    this._email = userDto.email
    this._password = userDto.password
    this._createdAt = userDto.createdAt
  }

  public static async create(createUser: CreateUserProps) {
    const password = await Password.create(createUser.password)
    const createdAt = new Date()
    return new User({ ...createUser, createdAt, password: password })
  }

  public static restore(restoreUser: RestoreUserProps) {
    return new User({
      email: restoreUser.email,
      name: restoreUser.name,
      password: Password.restore(restoreUser.password),
      createdAt: restoreUser.createdAt,
    })
  }

  get name() {
    return this._name
  }

  get email() {
    return this._email
  }

  get password() {
    return this._password.value
  }

  get createdAt() {
    return this._createdAt
  }
}
