import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import type { ActiveUserUseCase } from '@/user/application/use-case/active-user.usecase'

import { UserRoutes } from './routes/user-routes'

const activateUserSchema = z.object({
  userId: z.string().uuid(),
})

type ActivateUserPayload = z.infer<typeof activateUserSchema>

@injectable()
export class ActivateUserController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(TYPES.UseCases.ActivateUser)
    private readonly activeUser: ActiveUserUseCase,
  ) {
    this.bindMethod()
  }

  private bindMethod() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅',
  })
  public async init(): Promise<void> {
    this.httpServer.register('patch', UserRoutes.ACTIVATE_USER, {
      callback: this.callback,
    })
  }

  public async callback(req: FastifyRequest) {
    const parseBodyResult = this.parseBodyResult(req.body)
    if (parseBodyResult.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        body: parseBodyResult.value.message,
      })
    }
    const result = await this.activeUser.execute({
      userId: parseBodyResult.value.userId,
    })
    if (result.isFailure()) {
      return ResponseFactory.UNPROCESSABLE_ENTITY({
        body: result.value.message,
      })
    }
    return ResponseFactory.OK()
  }

  private parseBodyResult(
    body: unknown,
  ): Either<ValidationError, ActivateUserPayload> {
    const parseBody = activateUserSchema.safeParse(body)
    if (!parseBody.success) return failure(fromError(parseBody.error))
    return success(parseBody.data)
  }
}
