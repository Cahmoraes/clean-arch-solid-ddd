import { render, screen } from "@testing-library/react"
import { Users } from "lucide-react"
import { describe, expect, test } from "vitest"
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
})
