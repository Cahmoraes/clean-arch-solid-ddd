import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { SearchGymUseCase } from '@/application/use-case/search-gym.usecase'
import { type Either, left, right } from '@/domain/value-object/either'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/shared/ioc/types'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { GymRoutes } from '../routes/gym-routes'

const searchGymRequestSchema = z.object({
  name: z.string(),
})

export type SearchGymPayload = z.infer<typeof searchGymRequestSchema>

@injectable()
export class SearchGymController implements Controller {
  constructor(
    @inject(TYPES.UseCases.SearchGym)
    private readonly searchGymUseCase: SearchGymUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('get', GymRoutes.SEARCH, async (req) => {
      const parsedBodyOrError = this.parseParams(req.params)
      if (parsedBodyOrError.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.BAD_REQUEST,
          message: parsedBodyOrError.value.message,
        })
      }
      const result = await this.searchGymUseCase.execute(
        parsedBodyOrError.value,
      )
      if (result.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.NOT_FOUND,
          message: result.value.message,
        })
      }
      return ResponseFactory.create({
        status: HTTP_STATUS.OK,
        body: result.value,
      })
    })
  }

  private parseParams(
    params: unknown,
  ): Either<ValidationError, SearchGymPayload> {
    const parsedBody = searchGymRequestSchema.safeParse(params)
    if (!parsedBody.success) return left(fromError(parsedBody.error))
    return right(parsedBody.data)
  }
}
