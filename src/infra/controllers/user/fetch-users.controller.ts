import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { FetchUsersUseCase } from '@/application/use-case/fetch-users.usecase'
import { type Either, failure, success } from '@/domain/value-object/either'
import { Logger } from '@/infra/decorators/logger'
import { TYPES } from '@/infra/ioc/types'
import { PresenterFactory } from '@/infra/presenters/presenter-factory'
import type { HttpServer } from '@/infra/server/http-server'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const fetchUsersRequestSchema = z.object({
  limit: z.coerce.number(),
  page: z.coerce.number(),
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
    this.callback = this.callback.bind(this)
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
      return ResponseFactory.BAD_REQUEST({
        message: parsedQueryParamsOrError.value.message,
      })
    }
    const { limit, page } = parsedQueryParamsOrError.value
    const result = await this.fetchUsers.execute({
      limit,
      page,
    })
    return ResponseFactory.OK({
      body: {
        users: this.presenter(req.headers['accept']).format(result.data),
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

  private presenter(header?: string) {
    console.log('accept', header)
    const presenter = PresenterFactory.create(header)
    return presenter
  }
}
