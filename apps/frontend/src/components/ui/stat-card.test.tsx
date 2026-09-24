import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Users } from "@/components/ui/pixel-icons"
import { StatCard } from "./stat-card"

describe("StatCard", () => {
	test("exibe valor e label", () => {
		render(<StatCard icon={Users} value="312" label="Membros ativos" />)
		expect(screen.getByText("312")).toBeInTheDocument()
		expect(screen.getByText("Membros ativos")).toBeInTheDocument()
	})
	test("exibe delta com direção up", () => {
		render(
			<StatCard
				icon={Users}
				value="312"
				label="Membros"
				delta={{ value: "+4%", direction: "up" }}
			/>,
		)
		expect(screen.getByText("+4%")).toBeInTheDocument()
	})

	test("valor do StatCard usa font-display 38/48px, nunca font-mono", () => {
		render(<StatCard icon={Users} label="Check-ins" value="42" />)
		const value = screen.getByText("42")
		expect(value).toHaveClass("font-display")
		expect(value).toHaveClass("text-[38px]")
		expect(value).toHaveClass("md:text-[48px]")
		expect(value).not.toHaveClass("font-mono")
	})
})
