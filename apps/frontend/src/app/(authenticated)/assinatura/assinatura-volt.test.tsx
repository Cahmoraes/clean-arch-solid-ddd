import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@/features/subscriptions/api/use-create-subscription", () => ({
	useCreateSubscription: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
		error: null,
		data: undefined,
		reset: vi.fn(),
	}),
}))

vi.mock("@/features/subscriptions/api/use-plans", () => ({
	usePlans: () => ({
		data: [
			{
				id: "plan-mensal",
				name: "Premium Mensal",
				priceId: "price_demo_monthly",
				priceLabel: "R$ 49,90/mês",
				tagline: "Tagline mensal.",
				features: ["Check-ins ilimitados"],
			},
		],
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
	}),
}))

vi.mock(
	"@/features/subscriptions/api/use-my-subscription",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/features/subscriptions/api/use-my-subscription")
		>()),
		useMySubscription: () => ({
			data: null,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		}),
	}),
)

import SubscriptionPage from "./page"

describe("Assinatura VOLT", () => {
	test("exibe o banner de cobranca", () => {
		renderWithProviders(<SubscriptionPage />)
		expect(screen.getByTestId("billing-banner")).toBeInTheDocument()
	})

	test("renderiza a grade de planos", () => {
		renderWithProviders(<SubscriptionPage />)
		expect(screen.getByTestId("plan-grid")).toBeInTheDocument()
	})
})
