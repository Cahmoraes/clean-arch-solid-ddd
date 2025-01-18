import ExtendedSet from '@cahmoraes93/extended-set'
import { faker } from '@faker-js/faker'
import { injectable } from 'inversify'

import type {
  FetchUsersInput,
  FetchUsersOutput,
  UserDAO,
} from '@/application/dao/user-dao'
import type { RoleTypes } from '@/domain/value-object/role'

export interface CreateUserInput {
  id?: string
  email?: string
  name?: string
  role?: RoleTypes
  createdAt?: string
}

@injectable()
export class UserDAOMemory implements UserDAO {
  public usersData: ExtendedSet<Required<CreateUserInput>>

  constructor() {
    this.usersData = new ExtendedSet()
  }

  public bulkCreateFakeUsers(quantity: number): void {
    for (let i = 0; i < quantity; i++) {
      this.createFakeUser()
    }
  }

  public createFakeUser(createUserInput?: CreateUserInput): FetchUsersOutput {
    const fakeUser = {
      id: faker.string.uuid(),
      role: faker.helpers.arrayElement(['ADMIN', 'MEMBER']),
      createdAt: faker.date.recent().toISOString(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      ...createUserInput,
    }
    this.usersData.add(fakeUser)
    return fakeUser
  }

  public async fetchUsers(input: FetchUsersInput): Promise<FetchUsersOutput[]> {
    return this.usersData
      .toArray()
      .slice((input.page - 1) * input.limit, input.page * input.limit)
  }
}
