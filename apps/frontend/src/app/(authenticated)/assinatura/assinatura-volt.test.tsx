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
