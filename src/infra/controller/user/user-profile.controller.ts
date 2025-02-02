import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { UserProfileUseCase } from '@/application/user/use-case/user-profile.usecase'
import { Logger } from '@/infra/decorator/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const userProfileRequestSchema = z.object({
  userId: z.string(),
})

export type UserProfilePayload = z.infer<typeof userProfileRequestSchema>

@injectable()
export class UserProfileController implements Controller {
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
  async init() {
    this.server.register('get', UserRoutes.PROFILE, {
      callback: this.callback,
      isProtected: true,
    })
  }

  private async callback(req: FastifyRequest) {
    const { userId } = this.parseParamsOrThrow(req.params)
    const result = await this.userProfile.execute({ userId })
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

  private parseParamsOrThrow(params: unknown): UserProfilePayload {
    return userProfileRequestSchema.parse(params)
  }
}
