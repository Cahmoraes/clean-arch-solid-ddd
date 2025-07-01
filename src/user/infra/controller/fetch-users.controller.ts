import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { Logger } from '@/shared/infra/decorator/logger'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import { PresenterFactory } from '@/shared/infra/presenter/presenter-factory'
import type { HttpServer } from '@/shared/infra/server/http-server'
import type { FetchUsersUseCase } from '@/user/application/use-case/fetch-users.usecase'

import { UserRoutes } from './routes/user-routes'

const fetchUsersRequestSchema = z.object({
  limit: z.coerce.number(),
  page: z.coerce.number(),
})

type FetchUsersRequest = z.infer<typeof fetchUsersRequestSchema>

@injectable()
export class FetchUsersController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.FetchUsers)
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
    const parsedQueryParamsOrError = this.parseQueryOrError(req.query)
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

  private parseQueryOrError(
    body: unknown,
  ): Either<ValidationError, FetchUsersRequest> {
    const parsedQueryParams = fetchUsersRequestSchema.safeParse(body)
    if (!parsedQueryParams.success) {
      return failure(fromError(parsedQueryParams.error))
    }
    return success(parsedQueryParams.data)
  }

  private presenter(header?: string) {
    const presenter = PresenterFactory.create(header)
    return presenter
  }
}
