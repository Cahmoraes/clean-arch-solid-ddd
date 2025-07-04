import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import {
  createAndSaveUser,
  type CreateAndSaveUserProps,
} from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import type { InMemoryCheckInRepository } from '@/shared/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { USER_TYPES } from '@/shared/infra/ioc/types'

import {
  DeleteUserUseCase,
  type DeleteUserUseCaseInput,
} from './delete-user.usecase'

describe('DeleteUserUseCase', () => {
  let sut: DeleteUserUseCase
  let userRepository: InMemoryUserRepository
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(() => {
    container.snapshot()
    const repositories = setupInMemoryRepositories()
    userRepository = repositories.userRepository
    checkInRepository = repositories.checkInRepository
    sut = container.get(USER_TYPES.UseCases.DeleteUser)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve deletar um usuário', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'john@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    const input: DeleteUserUseCaseInput = {
      userId: user.id!,
    }
    const result = await sut.execute(input)
    expect(result.isSuccess()).toBe(true)
    const foundUser = await userRepository.userOfId(user.id!)
    expect(foundUser).toBeNull()
  })

  test('Não deve deletar um usuário inexistente', async () => {
    const input: DeleteUserUseCaseInput = {
      userId: 'inexistent-id',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Não deve deletar um usuário que possui check-ins', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'john@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    await createAndSaveCheckIn({
      checkInRepository,
      gymId: 'gym-id',
      id: 'check-in-id',
      userId: user.id!,
    })
    const input: DeleteUserUseCaseInput = {
      userId: user.id!,
    }
    const result = await sut.execute(input)
    expect(result.isSuccess()).toBe(false)
    // console.log(data)
  })
})
