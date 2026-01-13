import type { ResolutionContext } from "inversify"

import { isProduction } from "@/shared/infra/env"
import { StripeSubscriptionGateway } from "@/shared/infra/gateway/stripe-subscription-gateway"
import { TestingSubscriptionGateway } from "@/shared/infra/gateway/testing-subscription-gateway"
import type { SubscriptionGateway } from "@/subscription/gateway/subscription-gateway"

export class SubscriptionGatewayProvider {
	public static provide(context: ResolutionContext): SubscriptionGateway {
		return isProduction()
			? context.get(StripeSubscriptionGateway, { autobind: true })
			: context.get(TestingSubscriptionGateway, { autobind: true })
	}
}
