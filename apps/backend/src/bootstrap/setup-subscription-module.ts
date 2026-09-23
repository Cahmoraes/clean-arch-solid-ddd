import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"

import { type ModuleControllers, resolve } from "./server-build"

export function setupSubscriptionModule(): ModuleControllers {
	const controllers = [
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreateSubscription),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.UpdatePlan),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.InactivatePlan),
		resolve(SUBSCRIPTION_TYPES.CONTROLLERS.ReactivatePlan),
	]
	const workers = [resolve(SUBSCRIPTION_TYPES.WORKERS.StripeWebhook)]
	return { controllers, workers }
}
