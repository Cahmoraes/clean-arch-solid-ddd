import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'

import { LogoutUseCase, type LogoutUseCaseInput } from './logout.usecase'

describe('LogoutUseCase', () => {
  let sut: LogoutUseCase

  beforeEach(() => {
    sut = container.get(TYPES.UseCases.Logout)
  })

  test('Deve fazer o logout de um usuário', async () => {
    const input: LogoutUseCaseInput = {
      userId: 'any-user-id',
    }
    const { userId } = await sut.execute(input)
    expect(userId).toBe(input.userId)
  })
})
