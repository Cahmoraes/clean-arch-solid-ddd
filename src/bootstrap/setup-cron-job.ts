import type { CronJob } from '@/shared/infra/cron/cron-job'
import type { Task } from '@/shared/infra/cron/task/task'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'

export function setupCronJob(): void {
  const cronJob = container.get<CronJob>(SHARED_TYPES.CronJob)
  const updateUserProfileCache = container.get<Task>(
    SHARED_TYPES.Task.UpdateUserProfileCache,
  )
  const EVERY_ONE_MINUTE = '* * * * *'
  cronJob.schedule(EVERY_ONE_MINUTE, updateUserProfileCache.execute)
}
