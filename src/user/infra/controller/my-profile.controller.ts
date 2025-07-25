import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { SHARED_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import type { UserProfileUseCase } from '@/user/application/use-case/user-profile.usecase'

import { UserRoutes } from './routes/user-routes'

@injectable()
export class MyProfileController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(USER_TYPES.UseCases.UserProfile)
    private readonly userProfile: UserProfileUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅ | 🔒',
  })
  public async init(): Promise<void> {
    this.server.register(
      'get',
      UserRoutes.ME,
      {
        callback: this.callback,
        isProtected: true,
      },
      {
        tags: ['user'],
        description: 'Get the profile of the authenticated user',
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    )
  }

  private async callback(req: FastifyRequest) {
    const user = req.user
    const result = await this.userProfile.execute({ userId: user.sub.id })
    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'User not found',
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: result.value,
    })
  }
}
