import { ContainerModule } from "inversify"
import { SubscriptionLifecycleServiceImpl } from "@/subscription/application/service/subscription-lifecycle.service"
import { ActivateSubscriptionUseCase } from "@/subscription/application/use-case/activate-subscription.usecase"
import { CancelSubscriptionUseCase } from "@/subscription/application/use-case/cancel-subscription.usecase"
import { CreateCustomer } from "@/subscription/application/use-case/create-customer.usecase"
import { CreateSubscriptionUseCase } from "@/subscription/application/use-case/create-subscription.usecase"
import { HandlePaymentFailedUseCase } from "@/subscription/application/use-case/handle-payment-failed.usecase"
import { CreateCustomerController } from "@/subscription/infra/controller/create-customer-controller"
import { CreateSubscriptionController } from "@/subscription/infra/controller/create-subscription.controller"
import { StripeWebhookController } from "@/subscription/infra/controller/stripe-webhook.controller"
import { StripeWebhookWorker } from "@/subscription/infra/worker/stripe-webhook-worker"
import { SUBSCRIPTION_TYPES } from "../service-identifier/subscription-types"
import { StripeWebhookEventRepositoryProvider } from "./stripe-webhook-event-repository-provider"
import { SubscriptionGatewayProvider } from "./subscription-gateway-provider"
import { SubscriptionRepositoryProvider } from "./subscription-repository-provider"

export const subscriptionModule = new ContainerModule(({ bind }): void => {
	bind(SUBSCRIPTION_TYPES.GATEWAYS.Stripe)
		.toDynamicValue(SubscriptionGatewayProvider.provide)
		.inSingletonScope()
	bind(SUBSCRIPTION_TYPES.REPOSITORIES.Subscription)
		.toDynamicValue(SubscriptionRepositoryProvider.provide)
		.inSingletonScope()
	bind(SUBSCRIPTION_TYPES.REPOSITORIES.StripeWebhookEvent)
		.toDynamicValue(StripeWebhookEventRepositoryProvider.provide)
		.inSingletonScope()
	bind(SUBSCRIPTION_TYPES.SERVICES.Lifecycle)
		.to(SubscriptionLifecycleServiceImpl)
		.inSingletonScope()
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.CreateCustomer).to(
		CreateCustomerController,
	)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.CreateSubscription).to(
		CreateSubscriptionController,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.CreateCustomer).to(CreateCustomer)
	bind(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription).to(
		CreateSubscriptionUseCase,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.ActivateSubscription).to(
		ActivateSubscriptionUseCase,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.CancelSubscription).to(
		CancelSubscriptionUseCase,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.HandlePaymentFailed).to(
		HandlePaymentFailedUseCase,
	)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.StripeWebhook).to(StripeWebhookController)
	bind(SUBSCRIPTION_TYPES.WORKERS.StripeWebhook)
		.to(StripeWebhookWorker)
		.inSingletonScope()
})
