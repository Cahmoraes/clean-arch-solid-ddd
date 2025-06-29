import { inject, injectable } from 'inversify'

import type { HealthCheckImpl } from '../health/health-check.impl'
import { TYPES } from '../ioc/types'
import type { HttpServer } from '../server/http-server'
import type { Controller } from './controller'
import { ResponseFactory } from './factory/response-factory'
import { HealthCheckRoutes } from './routes/health-check-routes'

@injectable()
export class HealthCheckController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(TYPES.HealthCheck.Service)
    private readonly healthCheckService: HealthCheckImpl,
  ) {
    this.bindMethods()
  }

  private bindMethods(): void {
    this.callback = this.callback.bind(this)
  }

  public async init(): Promise<void> {
    this.httpServer.register('get', HealthCheckRoutes.check, {
      callback: this.callback,
    })
  }

  private async callback() {
    const healthStatus = await this.healthCheckService.check()
    return ResponseFactory.OK({
      healthStatus,
    })
  }
}
