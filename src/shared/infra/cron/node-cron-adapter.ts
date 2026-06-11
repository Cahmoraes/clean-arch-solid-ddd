import { injectable } from "inversify"
import nodeCron from "node-cron"

import type { CronJob } from "./cron-job"

@injectable()
export class NodeCronAdapter implements CronJob {
	private readonly nodeCron = nodeCron

	public schedule(timer: string, callback: CallableFunction): void {
		this.nodeCron.schedule(timer, () => {
			callback()
		})
	}
}
