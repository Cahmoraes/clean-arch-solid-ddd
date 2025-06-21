import { injectable } from 'inversify'

import type { HealthStatus } from './health-check.types'

@injectable()
export class HealthCheckService {
  constructor() {}

  public async checkHealth(): Promise<HealthStatus> {}
}
