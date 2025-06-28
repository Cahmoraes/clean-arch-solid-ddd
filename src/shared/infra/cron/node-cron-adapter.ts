import { injectable } from 'inversify'
import nodeCron from 'node-cron'

import type { CronJob } from './cron-job'

@injectable()
export class NodeCronAdapter implements CronJob {
  private readonly nodeCron = nodeCron

  public async schedule(
    timer: string,
    callback: CallableFunction,
  ): Promise<void> {
    this.nodeCron.schedule(timer, () => {
      callback()
    })
  }
}
