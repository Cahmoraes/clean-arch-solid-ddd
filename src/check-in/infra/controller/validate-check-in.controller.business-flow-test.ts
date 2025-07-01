import request from 'supertest'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { isValidDate } from 'test/is-valid-date'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { serverBuild } from '@/bootstrap/server-build'
import { CheckInRoutes } from '@/check-in/infra/controller/routes/check-in-routes'
import { InMemoryCheckInRepository } from '@/shared/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

describe('Validar CheckIn', () => {
  let server: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository

  beforeAll(async () => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    await container.unbind(CHECKIN_TYPES.Repositories.CheckIn)
    container
      .bind(CHECKIN_TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    await container.unbind(USER_TYPES.Repositories.User)
    container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
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
