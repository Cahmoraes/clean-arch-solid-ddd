import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import type { UserProfileUseCase } from '@/user/application/use-case/user-profile.usecase'

import { UserRoutes } from './routes/user-routes'

const userProfileRequestSchema = z.object({
  userId: z.string(),
})

export type UserProfilePayload = z.infer<typeof userProfileRequestSchema>

@injectable()
export class UserProfileController implements Controller {
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
