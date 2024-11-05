import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { CreateGymUseCase } from '@/application/use-case/create-gym.usecase'
import { type Either, left, right } from '@/domain/value-object/either'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/shared/ioc/types'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { GymRoutes } from '../routes/gym-routes'

export interface CreateGymUseCaseInput {
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
}

const createGymSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
})

type CreateGymPayload = z.infer<typeof createGymSchema>

@injectable()
export class CreateGymController implements Controller {
  constructor(
    @inject(TYPES.UseCases.CreateGym)
    private readonly createGymUseCase: CreateGymUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  public async handle(server: HttpServer): Promise<void> {
    server.register('post', GymRoutes.CREATE, async (req) => {
      const parsedBodyOrError = this.parseBody(req.body)
      if (parsedBodyOrError.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.BAD_REQUEST,
          message: parsedBodyOrError.value.message,
        })
      }
      const result = await this.createGymUseCase.execute(
        parsedBodyOrError.value,
      )
      if (result.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.CONFLICT,
          message: result.value.message,
        })
      }
      return ResponseFactory.create({
        status: HTTP_STATUS.CREATED,
        body: {
          message: 'Gym created',
          id: result.value.gymId,
        },
      })
    })
  }

  private parseBody(body: unknown): Either<ValidationError, CreateGymPayload> {
    const parsedBody = createGymSchema.safeParse(body)
    if (!parsedBody.success) return left(fromError(parsedBody.error))
    return right(parsedBody.data)
  }
}
