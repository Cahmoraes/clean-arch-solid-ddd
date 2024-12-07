import request from 'supertest'
import { isValidDate } from 'test/is-valid-date'

import { serverBuild } from '@/bootstrap/server-build'
import { Gym, type GymCreateProps } from '@/domain/gym'
import { User, type UserCreateProps } from '@/domain/user'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { CheckInRoutes } from '../routes/check-in-routes'

describe('CheckIn', () => {
  let fastifyServer: FastifyAdapter
  let gymRepository: InMemoryGymRepository
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    container.rebind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    container.rebind(TYPES.Repositories.User).toConstantValue(userRepository)
    fastifyServer = serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve realizar um check-in', async () => {
    const user = await createAndSaveUser()
    const gym = await createAndSaveGym()

    const response = await request(fastifyServer.server)
      .post(CheckInRoutes.CREATE)
      .send({
        userId: user.id,
        gymId: gym.id,
        userLatitude: -27.0747279,
        userLongitude: -49.4889672,
      })

    expect(response.body.message).toBe('Check-in created')
    expect(response.body.id).toBeDefined()
    expect(isValidDate(response.body.date)).toBeTruthy()
  })

  async function createAndSaveUser() {
    const input: UserCreateProps = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'securepassword123',
    }
    const userOrError = User.create(input)
    const user = userOrError.forceSuccess().value
    await userRepository.save(user)
    return userRepository.users.toArray()[0]
  }

  async function createAndSaveGym() {
    const input: GymCreateProps = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -27.0747279,
      longitude: -49.4889672,
      phone: '11971457899',
      id: 'fake_id',
    }
    const gym = Gym.create(input).forceSuccess().value
    await gymRepository.save(gym)
    return gymRepository.gyms.toArray()[0]
  }
})
