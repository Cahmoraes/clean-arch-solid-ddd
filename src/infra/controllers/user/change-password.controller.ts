import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { ChangePasswordUseCase } from '@/application/user/use-case/change-password.usecase'
import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { Logger } from '@/infra/decorators/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const changePasswordSchema = z.object({
  newRawPassword: z.string().min(6),
})

type ChangePasswordPayload = z.infer<typeof changePasswordSchema>

@injectable()
export class ChangePasswordController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.ChangePassword)
    private readonly changePassword: ChangePasswordUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅ | 🔒',
  })
  public async init() {
    this.server.register('patch', UserRoutes.CHANGE_PASSWORD, {
      callback: this.callback,
      isProtected: true,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyOrError = this.parseBodyOrError(req.body)
    if (parsedBodyOrError.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        message: parsedBodyOrError.value.message,
      })
    }
    const result = await this.changePassword.execute({
      userId: this.extractUserId(req),
      newRawPassword: parsedBodyOrError.value.newRawPassword,
    })
    if (result.isFailure()) {
      return ResponseFactory.CONFLICT({
        message: result.value.message,
      })
    }
    return ResponseFactory.NO_CONTENT()
  }

  private parseBodyOrError(
    body: unknown,
  ): Either<ValidationError, ChangePasswordPayload> {
    const parsedBody = changePasswordSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }

  private extractUserId(req: FastifyRequest): string {
    return req.user.sub.id
  }
}
