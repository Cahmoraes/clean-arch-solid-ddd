import { inject, injectable } from 'inversify'
import { z } from 'zod'
import type { ValidationError } from 'zod-validation-error'
import { fromError } from 'zod-validation-error'

import type { CheckInUseCase } from '@/application/use-case/check-in.usecase'
import { type Either, left, right } from '@/domain/value-object/either'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/shared/ioc/types'

import { ResponseFactory } from '../factory/response-factory'
import { CheckInRoutes } from '../routes/check-in-routes'

const checkInRequestSchema = z.object({
  userId: z.string(),
  gymId: z.string(),
  userLatitude: z.number(),
  userLongitude: z.number(),
})

type CheckInPayload = z.infer<typeof checkInRequestSchema>

@injectable()
export class CheckInController {
  constructor(
    @inject(TYPES.UseCases.CheckIn)
    private readonly checkIn: CheckInUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('post', CheckInRoutes.CREATE, async (req) => {
      const parsedBodyOrError = this.parseBody(req.body)
      if (parsedBodyOrError.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.BAD_REQUEST,
          message: parsedBodyOrError.value.message,
        })
      }
      const { userId, gymId, userLatitude, userLongitude } =
        parsedBodyOrError.value
      const result = await this.checkIn.execute({
        userId,
        gymId,
        userLatitude,
        userLongitude,
      })
      if (result.isLeft()) {
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
    })
  }

  private parseBody(body: unknown): Either<ValidationError, CheckInPayload> {
    const parsedBody = checkInRequestSchema.safeParse(body)
    if (!parsedBody.success) return left(fromError(parsedBody.error))
    return right(parsedBody.data)
  }
}
