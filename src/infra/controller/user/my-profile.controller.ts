import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { UserProfileUseCase } from '@/application/user/use-case/user-profile.usecase'
import { Logger } from '@/infra/decorator/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

@injectable()
export class MyProfileController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.UserProfile)
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
