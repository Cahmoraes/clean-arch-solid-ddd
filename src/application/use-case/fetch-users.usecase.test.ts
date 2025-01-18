import { UserDAOMemory } from '@/infra/database/dao/user-dao-memory'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import {
  FetchUsersUseCase,
  type FetchUsersUseCaseInput,
} from './fetch-users.usecase'

describe('FetchUsersUseCase', () => {
  let sut: FetchUsersUseCase
  let userDAO: UserDAOMemory

  beforeEach(() => {
    container.snapshot()
    sut = container.resolve(FetchUsersUseCase)
    userDAO = container.get(TYPES.DAO.User)
    userDAO.bulkCreateFakeUsers(10)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve buscar usuários cadastrados', async () => {
    const input: FetchUsersUseCaseInput = {
      page: 1,
      limit: 10,
    }
    console.log(sut)
    const result = await sut.execute(input)
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(10)
    console.log(result)
  })
})
