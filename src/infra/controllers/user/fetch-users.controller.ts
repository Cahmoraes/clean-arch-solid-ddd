import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { FetchUsersUseCase } from '@/application/use-case/fetch-users.usecase'
import { type Either, failure, success } from '@/domain/value-object/either'
import { Logger } from '@/infra/decorators/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const fetchUsersRequestSchema = z.object({
  limit: z.number(),
  page: z.number(),
})

type FetchUsersRequest = z.infer<typeof fetchUsersRequestSchema>

@injectable()
export class FetchUsersController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(TYPES.UseCases.FetchUsers)
    private readonly fetchUsers: FetchUsersUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind
  }

  @Logger({
    message: '✅',
  })
  public async init(): Promise<void> {
    this.httpServer.register('get', UserRoutes.FETCH, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedQueryParamsOrError = this.parseBodyOrError(req.query)
    if (parsedQueryParamsOrError.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedQueryParamsOrError.value.message,
      })
    }
    const { limit, page } = parsedQueryParamsOrError.value
    const result = await this.fetchUsers.execute({
      limit,
      page,
    })
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: {
        users: result.data,
        pagination: result.pagination,
      },
    })
  }

  private parseBodyOrError(
    body: unknown,
  ): Either<ValidationError, FetchUsersRequest> {
    const parsedQueryParams = fetchUsersRequestSchema.safeParse(body)
    if (!parsedQueryParams.success) {
      return failure(fromError(parsedQueryParams.error))
    }
    return success(parsedQueryParams.data)
  }
}
