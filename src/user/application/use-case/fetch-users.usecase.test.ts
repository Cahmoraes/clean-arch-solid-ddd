import {
  type CreateUserInput,
  UserDAOMemory,
} from '@/infra/database/dao/in-memory/user-dao-memory'
import { RedisAdapter } from '@/infra/database/redis/redis-adapter'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import {
  FetchUsersUseCase,
  type FetchUsersUseCaseInput,
} from './fetch-users.usecase'

describe('FetchUsersUseCase', () => {
  let sut: FetchUsersUseCase
  let userDAO: UserDAOMemory
  let redisAdapter: RedisAdapter

  beforeEach(async () => {
    container.snapshot()
    const userDAOMemory = new UserDAOMemory()
    container.rebindSync(TYPES.DAO.User).toConstantValue(userDAOMemory)
    redisAdapter = container.get(TYPES.Redis)
    sut = container.get(TYPES.UseCases.FetchUsers)
    userDAO = container.get(TYPES.DAO.User)
  })

  afterEach(async () => {
    container.restore()
    await redisAdapter.clear()
  })

  test('Deve buscar 10 usuários cadastrados na primeira página', async () => {
    const totalItems = 10
    userDAO.bulkCreateFakeUsers(totalItems)
    const input: FetchUsersUseCaseInput = {
      page: 1,
      limit: 10,
    }
    const result = await sut.execute(input)
    expect(result.pagination.total).toBe(totalItems)
    expect(result.pagination.page).toBe(1)
    const userData = result.data[0]
    expect(userData.id).toBeDefined()
    expect(userData.role).toBeDefined()
    expect(userData.createdAt).toBeDefined()
    expect(userData.name).toBeDefined()
    expect(userData.email).toBeDefined()
  })

  test('Deve buscar 20 usuários cadastrados na segunda página', async () => {
    const totalItems = 40
    userDAO.bulkCreateFakeUsers(totalItems)
    const input: FetchUsersUseCaseInput = {
      page: 2,
      limit: 20,
    }
    const result = await sut.execute(input)
    expect(result.pagination.total).toBe(totalItems)
  })

  test('Deve retornar um total de 0 caso não existam usuários', async () => {
    const totalItems = 0
    userDAO.clear()
    const input: FetchUsersUseCaseInput = {
      page: 1,
      limit: 20,
    }
    const result = await sut.execute(input)
    expect(result.pagination.total).toBe(totalItems)
  })

  test('Deve retornar uma lista contendo apenas um usuário', async () => {
    const totalItems = 1
    const fakeUser: CreateUserInput = {
      id: 'any_id',
      role: 'ADMIN',
      createdAt: '2021-08-01T00:00:00.000Z',
      name: 'any_name',
      email: 'any_email',
    }

    userDAO.createFakeUser(fakeUser)
    const input: FetchUsersUseCaseInput = {
      page: 1,
      limit: 20,
    }
    const result = await sut.execute(input)
    expect(result.pagination.total).toBe(totalItems)
    expect(result.data[0]).toEqual(fakeUser)
  })
})
