import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type {
  SearchGymUseCase,
  SearchGymUseCaseOutput,
} from '@/gym/application/use-case/search-gym.usecase'
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
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { GymRoutes } from './routes/gym-routes'

const searchGymRequestSchema = z.object({
  name: z.string(),
})

export type SearchGymPayload = z.infer<typeof searchGymRequestSchema>

const searchGymParamsSchema = z.object({
  page: z.coerce.number().optional(),
})

export type SearchGymParams = z.infer<typeof searchGymParamsSchema>

@injectable()
export class SearchGymController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(GYM_TYPES.UseCases.SearchGym)
    private readonly searchGymUseCase: SearchGymUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅',
  })
  public async init() {
    this.server.register('get', GymRoutes.SEARCH, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyOrError = this.parseParams(req.params)
    if (parsedBodyOrError.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedBodyOrError.value.message,
      })
    }
    const result = await this.searchGymUseCase.execute({
      name: parsedBodyOrError.value.name,
      page: this.parseQuery(req.query),
    })
    if (this.isGymNotFound(result)) {
      return ResponseFactory.create({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Gym not found',
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: result,
    })
  }

  private parseParams(
    params: unknown,
  ): Either<ValidationError, SearchGymPayload> {
    const parsedBody = searchGymRequestSchema.safeParse(params)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }

  private parseQuery(query?: unknown): number | undefined {
    return searchGymParamsSchema.parse(query).page
  }

  private isGymNotFound(result: SearchGymUseCaseOutput[]): boolean {
    return !result.length
  }
}
