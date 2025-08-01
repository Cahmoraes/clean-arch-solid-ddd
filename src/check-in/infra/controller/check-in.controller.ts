import { inject, injectable } from 'inversify'
import { z } from 'zod'
import type { ValidationError } from 'zod-validation-error'
import { fromError } from 'zod-validation-error'

import type { CheckInUseCase } from '@/check-in/application/use-case/check-in.usecase'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { CHECKIN_TYPES, SHARED_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { CheckInRoutes } from './routes/check-in-routes'

const checkInRequestSchema = z.object({
  userId: z.string(),
  gymId: z.string(),
  userLatitude: z.number(),
  userLongitude: z.number(),
})

type CheckInPayload = z.infer<typeof checkInRequestSchema>

@injectable()
export class CheckInController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(CHECKIN_TYPES.UseCases.CheckIn)
    private readonly checkIn: CheckInUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅',
  })
  async init() {
    this.server.register('post', CheckInRoutes.CREATE, {
      callback: this.callback,
      isProtected: true,
      onlyAdmin: true,
    })
  }

  private async callback(req: any) {
    const parsedBodyOrError = this.parseBody(req.body)
    if (parsedBodyOrError.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedBodyOrError.value.message,
      })
    }
    const result = await this.checkIn.execute({
      userId: parsedBodyOrError.value.userId,
      gymId: parsedBodyOrError.value.gymId,
      userLatitude: parsedBodyOrError.value.userLatitude,
      userLongitude: parsedBodyOrError.value.userLongitude,
    })
    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.CONFLICT,
        message: result.value.message,
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.CREATED,
      body: {
        message: 'Check-in created',
        id: result.value.checkInId,
        date: result.value.date,
      },
    })
  }

  private parseBody(body: unknown): Either<ValidationError, CheckInPayload> {
    const parsedBody = checkInRequestSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
