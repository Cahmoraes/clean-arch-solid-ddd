import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { CreateGymUseCase } from '@/application/gym/use-case/create-gym.usecase'
import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { Logger } from '@/infra/decorator/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { GymRoutes } from '../routes/gym-routes'

const createGymSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
})

export type CreateGymPayload = z.infer<typeof createGymSchema>

@injectable()
export class CreateGymController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.CreateGym)
    private readonly createGymUseCase: CreateGymUseCase,
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
    this.server.register('post', GymRoutes.CREATE, {
      callback: this.callback,
      isProtected: true,
      onlyAdmin: true,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyOrError = this.parseBody(req.body)
    if (parsedBodyOrError.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        message: parsedBodyOrError.value.message,
      })
    }
    const result = await this.createGymUseCase.execute(parsedBodyOrError.value)
    if (result.isFailure()) {
      return ResponseFactory.CONFLICT({
        message: result.value.message,
      })
    }
    return ResponseFactory.CREATED({
      body: {
        message: 'Gym created',
        id: result.value.gymId,
      },
    })
  }

  private parseBody(body: unknown): Either<ValidationError, CreateGymPayload> {
    const parsedBody = createGymSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
