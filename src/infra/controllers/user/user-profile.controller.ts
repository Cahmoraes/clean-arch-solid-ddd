import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { UserProfileUseCase } from '@/application/use-case/user-profile.usecase'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/infra/ioc/types'

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
    @inject(TYPES.UseCases.UserProfile)
    private readonly userProfile: UserProfileUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('get', UserRoutes.PROFILE, async (req) => {
      const { userId } = this.parseParamsOrThrow(req.params)
      const result = await this.userProfile.execute({ userId })
      if (result.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.NOT_FOUND,
          message: 'User not found',
        })
      }
      return ResponseFactory.create({
        status: HTTP_STATUS.OK,
        body: result.value,
      })
    })
  }
  private parseParamsOrThrow(params: unknown): UserProfilePayload {
    return userProfileRequestSchema.parse(params)
  }
}
