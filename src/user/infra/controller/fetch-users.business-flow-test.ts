import request from 'supertest'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import { UserDAOMemory } from '@/shared/infra/database/dao/in-memory/user-dao-memory'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { UserRoutes } from './routes/user-routes'

describe('Buscar Usuários', () => {
  let fastifyServer: FastifyAdapter
  let userDAO: UserDAOMemory

  beforeEach(async () => {
    container.snapshot()
    const userDAOMemory = new UserDAOMemory()
    container.rebindSync(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
    userDAO = userDAOMemory
    userDAO = container.get(USER_TYPES.DAO.User)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve retornar os usuários da página 1 em JSON', async () => {
    const fakeId = 'fake_id'
    userDAO.createFakeUser({
      name: 'any_name',
      email: 'any_email',
      id: fakeId,
    })
    userDAO.bulkCreateFakeUsers(19)
    const response = await request(fastifyServer.server)
      .get(UserRoutes.FETCH)
      .query({
        limit: 10,
        page: 1,
      })
      .set('Accept', 'application/json')

    expect(response.body.users.length).toBe(10)
    expect(response.body.pagination).toEqual({
      limit: 10,
      page: 1,
      total: 20,
    })
    expect(response.body.users[0].id).toBe(fakeId)
    expect(response.status).toBe(200)
  })

  test('Deve retornar os usuários da página 2', async () => {
    const fakeId = 'fake_id'
    userDAO.createFakeUser({
      name: 'any_name',
      email: 'any_email',
      id: fakeId,
    })
    userDAO.bulkCreateFakeUsers(19)
    const response = await request(fastifyServer.server)
      .get(UserRoutes.FETCH)
      .query({
        limit: 10,
        page: 2,
      })

    expect(response.body.users.length).toBe(10)
    expect(response.body.pagination).toEqual({
      limit: 10,
      page: 2,
      total: 20,
    })
    expect(response.status).toBe(200)
    expect(response.body.users[0].id).not.toBe(fakeId)
  })

  test('Deve retornar os usuários da página 1 em CSV', async () => {
    const fakeId = 'fake_id'
    userDAO.createFakeUser({
      name: 'any_name',
      email: 'any_email',
      id: fakeId,
    })
    userDAO.bulkCreateFakeUsers(19)
    const response = await request(fastifyServer.server)
      .get(UserRoutes.FETCH)
      .query({
        limit: 10,
        page: 1,
      })
      .set('Accept', 'text/csv')

    expect(response.body.users).toEqual(expect.stringContaining(fakeId))
    expect(response.body.pagination).toEqual({
      limit: 10,
      page: 1,
      total: 20,
    })
    expect(response.status).toBe(200)
  })
})
