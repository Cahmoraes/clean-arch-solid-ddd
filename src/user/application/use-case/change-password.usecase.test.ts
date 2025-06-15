import {
  createAndSaveUser,
  type CreateAndSaveUserProps,
} from 'test/factory/create-and-save-user'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import { QueueMemoryAdapter } from '@/shared/infra/queue/queue-memory-adapter'

import { PasswordUnchangedError } from '../error/password-unchanged-error'
import { UserNotFoundError } from '../error/user-not-found-error'
import {
  ChangePasswordUseCase,
  ChangePasswordUseCaseInput,
} from './change-password.usecase'

describe('ChangePasswordUseCase', () => {
  let sut: ChangePasswordUseCase
  let userRepository: InMemoryUserRepository
  let queue: QueueMemoryAdapter

  beforeEach(async () => {
    container.snapshot()
    const repositories = await setupInMemoryRepositories()
    userRepository = repositories.userRepository
    queue = new QueueMemoryAdapter()
    await container.unbind(TYPES.Queue)
    container.bind(TYPES.Queue).toConstantValue(queue)
    sut = container.get(ChangePasswordUseCase, { autobind: true })
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve alterar o password de um usuário', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'john@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    const input: ChangePasswordUseCaseInput = {
      userId: user.id!,
      newRawPassword: '654321',
    }
    const result = await sut.execute(input)
    expect(result).toBeDefined()
    expect(result.value).toBeNull()
    expect(user.checkPassword(input.newRawPassword)).toBe(true)
    expect(queue.queues.has('passwordChanged')).toBe(true)
    expect(queue.queues.size).toBe(1)
  })

  test('Não deve alterar o password de um usuário inexistente', async () => {
    const input: ChangePasswordUseCaseInput = {
      userId: 'invalid-id',
      newRawPassword: '654321',
    }
    const result = await sut.execute(input)
    expect(result).toBeDefined()
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  test('Deve falhar ao tentar alterar o password com uma senha inválida', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'jane@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    const input: ChangePasswordUseCaseInput = {
      userId: user.id!,
      newRawPassword: '',
    }
    const result = await sut.execute(input)
    expect(result).toBeDefined()
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(Error) // Assuming there's a validation error class
  })

  test('Deve falhar ao tentar alterar o password com um userId inválido', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'jane@mail.com',
      password: '123456',
    }
    await createAndSaveUser(createUserProps)
    const input: ChangePasswordUseCaseInput = {
      userId: 'invalid-id',
      newRawPassword: '654321',
    }
    const result = await sut.execute(input)
    expect(result).toBeDefined()
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  test('Deve alterar o password de um usuário e verificar se o antigo não funciona mais', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'john.doe@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    const input: ChangePasswordUseCaseInput = {
      userId: user.id!,
      newRawPassword: '654321',
    }
    const result = await sut.execute(input)
    expect(result).toBeDefined()
    expect(result.value).toBeNull()
    expect(user.checkPassword(input.newRawPassword)).toBe(true)
    expect(user.checkPassword('123456')).toBe(false)
  })

  test('Não deve criar deve alterar para o mesmo password', async () => {
    const createUserProps: CreateAndSaveUserProps = {
      userRepository,
      email: 'john.doe@mail.com',
      password: '123456',
    }
    const user = await createAndSaveUser(createUserProps)
    const input: ChangePasswordUseCaseInput = {
      userId: user.id!,
      newRawPassword: '123456',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBeTruthy()
    expect(result.value).toBeInstanceOf(PasswordUnchangedError)
  })
})
