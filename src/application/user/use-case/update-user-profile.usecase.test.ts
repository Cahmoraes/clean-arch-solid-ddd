import {
  createAndSaveUser,
  type CreateAndSaveUserProps,
} from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InvalidEmailError } from '@/domain/user/error/invalid-email-error'
import { InvalidNameLengthError } from '@/domain/user/error/invalid-name-length-error'
import type { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'

import {
  UpdateUserProfileUseCase,
  type UpdateUserProfileUseCaseInput,
} from './update-user-profile.usecase'

describe('UpdateUserProfile', () => {
  let sut: UpdateUserProfileUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    userRepository = (await setupInMemoryRepositories()).userRepository
    sut = container.get(UpdateUserProfileUseCase, { autobind: true })
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve atualizar o perfil de um usuário', async () => {
    const userId = 'any_user_id'
    const createAndSaveUserProps: CreateAndSaveUserProps = {
      userRepository,
      name: 'john doe',
      email: 'john@doe.com',
      password: 'any_password',
      id: userId,
    }
    await createAndSaveUser(createAndSaveUserProps)
    const input: UpdateUserProfileUseCaseInput = {
      userId,
      name: 'Martin Fowler',
      email: 'martin@fowler.com',
    }
    await sut.execute(input)
    const userMemory = await userRepository.userOfId(userId)
    expect(userMemory?.email).toBe(input.email)
    expect(userMemory?.name).toBe(input.name)
  })

  test('Não deve atualizar o perfil de um usuário não existente', async () => {
    const userId = 'any_user_id'
    const input: UpdateUserProfileUseCaseInput = {
      userId,
      name: 'Martin Fowler',
      email: 'martin@fowler.com',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Não deve atualizar o perfil de um usuário com nome inválido', async () => {
    const userId = 'any_user_id'
    const createAndSaveUserProps: CreateAndSaveUserProps = {
      userRepository,
      name: 'john doe',
      email: 'john@doe.com',
      password: 'any_password',
      id: userId,
    }
    await createAndSaveUser(createAndSaveUserProps)
    const input: UpdateUserProfileUseCaseInput = {
      userId,
      name: '',
      email: 'martin@fowler.com',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toEqual([expect.any(InvalidNameLengthError)])
    const userMemory = await userRepository.userOfId(userId)
    expect(userMemory?.email).toBe('john@doe.com')
    expect(userMemory?.name).toBe('john doe')
  })

  test('Não deve atualizar o perfil de um usuário com e-mail inválido', async () => {
    const userId = 'any_user_id'
    const createAndSaveUserProps: CreateAndSaveUserProps = {
      userRepository,
      name: 'john doe',
      email: 'john@doe.com',
      password: 'any_password',
      id: userId,
    }
    await createAndSaveUser(createAndSaveUserProps)
    const input: UpdateUserProfileUseCaseInput = {
      userId,
      name: 'Martin Fowler',
      email: '',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toEqual([expect.any(InvalidEmailError)])
    const userMemory = await userRepository.userOfId(userId)
    expect(userMemory?.email).toBe('john@doe.com')
    expect(userMemory?.name).toBe('john doe')
  })
})
