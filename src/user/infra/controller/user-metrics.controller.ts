import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { UserMetricsUseCase } from '@/user/application/use-case/user-metrics.usecase'
import { Logger } from '@/shared/infra/decorator/logger'
import { TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import { UserRoutes } from './routes/user-routes'

@injectable()
export class UserMetricsController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.UserMetrics)
    private readonly userMetrics: UserMetricsUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅ | 🔒',
  })
  public async init(): Promise<void> {
    this.server.register('get', UserRoutes.METRICS, {
      callback: this.callback,
      isProtected: true,
    })
  }

  private async callback(req: FastifyRequest) {
    const {
      sub: { id },
    } = req.user
    const metrics = await this.userMetrics.execute({ userId: id })
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: metrics,
    })
  }
}
