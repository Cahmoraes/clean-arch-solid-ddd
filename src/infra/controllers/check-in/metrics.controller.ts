import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { UserMetricsUseCase } from '@/application/use-case/user-metrics.usecase'
import { type Either, left, right } from '@/domain/value-object/either'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/shared/ioc/types'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { CheckInRoutes } from '../routes/check-in-routes'

const metricsRequestSchema = z.object({
  userId: z.string(),
})

type MetricsRequestPayload = z.infer<typeof metricsRequestSchema>

@injectable()
export class MetricsController implements Controller {
  constructor(
    @inject(TYPES.UseCases.UserMetrics)
    private readonly getMetricsUseCase: UserMetricsUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  public async handle(server: HttpServer): Promise<void> {
    server.register(
      'get',
      CheckInRoutes.METRICS,
      async (req: FastifyRequest) => {
        const parsedRequest = this.parseParamsPayload(req.params)
        if (parsedRequest.isLeft()) {
          return ResponseFactory.create({
            status: HTTP_STATUS.BAD_REQUEST,
            message: parsedRequest.value.message,
          })
        }
        const metrics = await this.getMetricsUseCase.execute(
          parsedRequest.value,
        )
        return ResponseFactory.create({
          status: HTTP_STATUS.OK,
          body: metrics,
        })
      },
    )
  }

  private parseParamsPayload(
    params: unknown,
  ): Either<ValidationError, MetricsRequestPayload> {
    const result = metricsRequestSchema.safeParse(params)
    if (!result.success) return left(fromError(result.error))
    return right(result.data)
  }
}
