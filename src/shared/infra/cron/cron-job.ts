export interface CronJob {
  schedule(timer: string, callback: CallableFunction): void
}
