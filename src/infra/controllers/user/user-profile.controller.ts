import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { AuthToken } from '@/application/interfaces/auth-token'
import type { UserProfileUseCase } from '@/application/use-case/user-profile.usecase'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'
import { PreHandlerAuthenticate } from '../services/pre-handler-authenticate'

const userProfileRequestSchema = z.object({
  userId: z.string(),
})

export type UserProfilePayload = z.infer<typeof userProfileRequestSchema>

@injectable()
export class UserProfileController implements Controller {
  constructor(
    @inject(TYPES.UseCases.UserProfile)
    private readonly userProfile: UserProfileUseCase,
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
    this.callback = this.callback.bind(this)
    this.preHandler = this.preHandler.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('get', UserRoutes.PROFILE, {
      callback: this.callback,
      preHandler: this.preHandler,
    })
  }

  private async callback(req: FastifyRequest) {
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
  }

  private parseParamsOrThrow(params: unknown): UserProfilePayload {
    return userProfileRequestSchema.parse(params)
  }

  private async preHandler(
    request: any,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) {
    const preHandlerAuthenticate = new PreHandlerAuthenticate({
      request,
      reply,
      done,
      authToken: this.authToken,
    })
    preHandlerAuthenticate.execute()
  }
}
