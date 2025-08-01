import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { CreateGymUseCase } from '@/gym/application/use-case/create-gym.usecase'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { GYM_TYPES, SHARED_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'

import { GymRoutes } from './routes/gym-routes'

const createGymSchema = z.object({
  cnpj: z.string(),
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
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(GYM_TYPES.UseCases.CreateGym)
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
