import { ContainerModule } from "inversify"
import { SubscriptionLifecycleServiceImpl } from "@/subscription/application/service/subscription-lifecycle.service"
import { ActivateSubscriptionUseCase } from "@/subscription/application/use-case/activate-subscription.usecase"
import { CancelSubscriptionUseCase } from "@/subscription/application/use-case/cancel-subscription.usecase"
import { CreateCustomer } from "@/subscription/application/use-case/create-customer.usecase"
import { CreatePlanUseCase } from "@/subscription/application/use-case/create-plan.usecase"
import { CreateSubscriptionUseCase } from "@/subscription/application/use-case/create-subscription.usecase"
import { HandlePaymentFailedUseCase } from "@/subscription/application/use-case/handle-payment-failed.usecase"
import { InactivatePlanUseCase } from "@/subscription/application/use-case/inactivate-plan.usecase"
import { ListActivePlansUseCase } from "@/subscription/application/use-case/list-active-plans.usecase"
import { ListPlansAdminUseCase } from "@/subscription/application/use-case/list-plans-admin.usecase"
import { ReactivatePlanUseCase } from "@/subscription/application/use-case/reactivate-plan.usecase"
import { UpdatePlanUseCase } from "@/subscription/application/use-case/update-plan.usecase"
import { CreatePlanController } from "@/subscription/infra/controller/admin/create-plan.controller"
import { InactivatePlanController } from "@/subscription/infra/controller/admin/inactivate-plan.controller"
import { ListPlansAdminController } from "@/subscription/infra/controller/admin/list-plans-admin.controller"
import { ReactivatePlanController } from "@/subscription/infra/controller/admin/reactivate-plan.controller"
import { UpdatePlanController } from "@/subscription/infra/controller/admin/update-plan.controller"
import { CreateCustomerController } from "@/subscription/infra/controller/create-customer-controller"
import { CreateSubscriptionController } from "@/subscription/infra/controller/create-subscription.controller"
import { ListPlansController } from "@/subscription/infra/controller/list-plans.controller"
import { StripeWebhookController } from "@/subscription/infra/controller/stripe-webhook.controller"
import { StripeWebhookWorker } from "@/subscription/infra/worker/stripe-webhook-worker"
import { SUBSCRIPTION_TYPES } from "../service-identifier/subscription-types"
import { PlanRepositoryProvider } from "./plan-repository-provider"
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
	bind(SUBSCRIPTION_TYPES.REPOSITORIES.Plan)
		.toDynamicValue(PlanRepositoryProvider.provide)
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
	bind(SUBSCRIPTION_TYPES.USE_CASES.ListActivePlans).to(ListActivePlansUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans).to(ListPlansController)
	bind(SUBSCRIPTION_TYPES.USE_CASES.CreatePlan).to(CreatePlanUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.CreatePlan).to(CreatePlanController)
	bind(SUBSCRIPTION_TYPES.USE_CASES.UpdatePlan).to(UpdatePlanUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.UpdatePlan).to(UpdatePlanController)
	bind(SUBSCRIPTION_TYPES.USE_CASES.InactivatePlan).to(InactivatePlanUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.InactivatePlan).to(
		InactivatePlanController,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.ReactivatePlan).to(ReactivatePlanUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.ReactivatePlan).to(
		ReactivatePlanController,
	)
	bind(SUBSCRIPTION_TYPES.USE_CASES.ListPlansAdmin).to(ListPlansAdminUseCase)
	bind(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlansAdmin).to(
		ListPlansAdminController,
	)
	bind(SUBSCRIPTION_TYPES.WORKERS.StripeWebhook)
		.to(StripeWebhookWorker)
		.inSingletonScope()
})
