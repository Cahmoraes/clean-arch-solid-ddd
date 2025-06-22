import { inject, injectable } from 'inversify'

import type { HealthCheckService } from '../health/health-check.service'
import { TYPES } from '../ioc/types'
import type { Controller } from './controller'

@injectable()
export class HealthCheckController implements Controller {
  constructor(
    @inject(TYPES.HealthCheck.Service)
    private readonly healthCheckService: HealthCheckService,
  ) {}

  public async init(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
