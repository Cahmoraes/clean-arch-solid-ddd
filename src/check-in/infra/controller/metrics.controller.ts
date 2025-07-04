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
import { SHARED_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import type { UserMetricsUseCase } from '@/user/application/use-case/user-metrics.usecase'

import { CheckInRoutes } from './routes/check-in-routes'

const metricsRequestSchema = z.object({
  userId: z.string(),
})

type MetricsRequestPayload = z.infer<typeof metricsRequestSchema>

@injectable()
export class MetricsController implements Controller {
  constructor(
    @inject(USER_TYPES.UseCases.UserMetrics)
    private readonly userMetricsUseCase: UserMetricsUseCase,
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
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
    this.server.register('get', CheckInRoutes.METRICS, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedRequest = this.parseParamsPayload(req.params)
    if (parsedRequest.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedRequest.value.message,
      })
    }
    const metrics = await this.userMetricsUseCase.execute(parsedRequest.value)
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: metrics,
    })
  }

  private parseParamsPayload(
    params: unknown,
  ): Either<ValidationError, MetricsRequestPayload> {
    const result = metricsRequestSchema.safeParse(params)
    if (!result.success) return failure(fromError(result.error))
    return success(result.data)
  }
}
