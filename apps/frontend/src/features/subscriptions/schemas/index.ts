import { z } from "zod"

export const createSubscriptionSchema = z.object({
	priceId: z.string().min(1, "Selecione um plano."),
	paymentMethodId: z.string().min(1, "Informe um método de pagamento."),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

export const createSubscriptionResponseSchema = z.object({
	subscriptionId: z.string().min(1),
	status: z.string().min(1),
})

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>

export const DEMO_PAYMENT_METHOD_ID = "pm_demo_card_visa" as const
