import { injectable } from 'inversify'

import type { UnitOfWork } from './unit-of-work'

@injectable()
export class TestingUnitOfWork implements UnitOfWork {
  public async performTransaction(callback: CallableFunction): Promise<any> {
    return callback()
  }
}
