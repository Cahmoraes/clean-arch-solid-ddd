import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError } from 'zod-validation-error'

import type { ValidateCheckInUseCase } from '@/check-in/application/use-case/validate-check-in.usecase'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { Logger } from '@/shared/infra/decorator/logger'
import { TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { CheckInRoutes } from './routes/check-in-routes'

const validateCheckInRequestSchema = z.object({
  checkInId: z.string(),
})

type ValidateCheckInPayload = z.infer<typeof validateCheckInRequestSchema>

@injectable()
export class ValidateCheckInController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.ValidateCheckIn)
    private readonly validateCheckInUseCase: ValidateCheckInUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅',
  })
  public async init(): Promise<void> {
    this.server.register('post', CheckInRoutes.VALIDATE, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedRequest = this.parseBodyPayload(req.body)
    if (parsedRequest.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedRequest.value.message,
      })
    }
    const result = await this.validateCheckInUseCase.execute(
      parsedRequest.value,
    )
    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.CONFLICT,
        message: result.value.message,
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: result.value,
    })
  }

  private parseBodyPayload(
    body: unknown,
  ): Either<Error, ValidateCheckInPayload> {
    const parsedBody = validateCheckInRequestSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
