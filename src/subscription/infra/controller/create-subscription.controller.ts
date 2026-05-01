import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { fromError, type ValidationError } from "zod-validation-error"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { Controller } from "@/shared/infra/controller/controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SUBSCRIPTION_TYPES } from "@/shared/infra/ioc/module/service-identifier/subscription-types"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { BillingCustomerNotProvisionedError } from "@/subscription/application/error/billing-customer-not-provisioned-error"
import type { CreateSubscriptionUseCase } from "@/subscription/application/use-case/create-subscription.usecase"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

const createSubscriptionRequestSchema = z.object({
	priceId: z.string().min(1),
	paymentMethodId: z.string().min(1),
})

type CreateSubscriptionPayload = z.infer<typeof createSubscriptionRequestSchema>

@injectable()
export class CreateSubscriptionController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(SUBSCRIPTION_TYPES.USE_CASES.CreateSubscription)
		private readonly createSubscription: CreateSubscriptionUseCase,
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅ | 🔒" })
	public async init(): Promise<void> {
		await this.httpServer.register(
			"post",
			SubscriptionRoutes.CREATE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseResult = this.parseBodyOrError(req.body)
		if (parseResult.isFailure()) {
			return ResponseFactory.BAD_REQUEST({
				message: parseResult.value.message,
			})
		}
		const userId = req.user.sub.id
		const user = await this.userRepository.userOfId(userId)
		if (!user?.billingCustomerId) {
			return ResponseFactory.CONFLICT({
				message: new BillingCustomerNotProvisionedError(userId).message,
			})
		}
		const result = await this.createSubscription.execute({
			userId,
			customerId: user.billingCustomerId,
			priceId: parseResult.value.priceId,
			paymentMethodId: parseResult.value.paymentMethodId,
		})
		if (result.isFailure()) return this.createResponseError(result.value)
		return ResponseFactory.CREATED({ body: result.value })
	}

	private createResponseError(
		error: BillingCustomerNotProvisionedError | Error,
	) {
		if (error instanceof BillingCustomerNotProvisionedError) {
			return ResponseFactory.CONFLICT({ message: error.message })
		}
		return ResponseFactory.INTERNAL_SERVER_ERROR({ message: error.message })
	}

	private parseBodyOrError(
		body: unknown,
	): Either<ValidationError, CreateSubscriptionPayload> {
		const parsed = createSubscriptionRequestSchema.safeParse(body)
		if (!parsed.success) return failure(fromError(parsed.error))
		return success(parsed.data)
	}
}

function makeSwaggerSchema(): Schema {
	return {
		tags: ["subscriptions"],
		summary: "Create a Stripe subscription for the authenticated user",
		description:
			"Creates a Stripe subscription using a Payment Method tokenized on the frontend.",
		body: {
			type: "object",
			properties: {
				priceId: { type: "string" },
				paymentMethodId: { type: "string" },
			},
		},
		response: {
			201: {
				description: "Subscription created",
				type: "object",
				properties: {
					subscriptionId: { type: "string" },
					status: { type: "string" },
				},
			},
			400: {
				description: "Invalid body",
				type: "object",
				properties: { message: { type: "string" } },
			},
			401: {
				description: "Unauthorized",
				type: "object",
				properties: { message: { type: "string" } },
			},
			409: {
				description: "Billing customer not provisioned",
				type: "object",
				properties: { message: { type: "string" } },
			},
		},
	}
}
