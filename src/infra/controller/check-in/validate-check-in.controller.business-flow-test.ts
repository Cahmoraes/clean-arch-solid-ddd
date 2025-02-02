import request from 'supertest'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { isValidDate } from 'test/is-valid-date'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { serverBuild } from '@/bootstrap/server-build'
import { CheckInRoutes } from '@/infra/controller/routes/check-in-routes'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

describe('Validate CheckIn', () => {
  let server: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository

  beforeAll(async () => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
    server = await serverBuild()
    await server.ready()
  })

  afterAll(async () => {
    container.restore()
    await server.close()
  })

  test('should validate a check-in', async () => {
    const user = await createAndSaveUser({ userRepository })
    const checkIn = await createAndSaveCheckIn({
      id: 'check-in-id',
      checkInRepository,
      userId: user.id!,
    })
    const response = await request(server.server)
      .post(CheckInRoutes.VALIDATE)
      .send({
        checkInId: checkIn.id!,
      })
    expect(response.status).toBe(HTTP_STATUS.OK)
    const responseBody = response.body
    expect(responseBody).toHaveProperty('validatedAt')
    expect(isValidDate(responseBody.validatedAt)).toBeTruthy()
  })

  test('should return 400 for invalid check-in ID', async () => {
    const response = await request(server.server)
      .post(CheckInRoutes.VALIDATE)
      .send({
        checkInId: 'invalid-id',
      })

    expect(response.status).toBe(HTTP_STATUS.CONFLICT)
  })
})
