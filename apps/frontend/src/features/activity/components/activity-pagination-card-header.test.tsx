import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { ActivityPaginationCardHeader } from "./activity-pagination-card-header"

function buildPagination(
	overrides: Partial<{
		page: number
		pageSize: number
		total: number
		totalPages: number
	}> = {},
) {
	return {
		page: 1,
		pageSize: 20,
		total: 120,
		totalPages: 6,
		...overrides,
	}
}

describe("ActivityPaginationCardHeader", () => {
	test("renderiza seletor acessível de itens por página com valor atual", () => {
		render(
			<ActivityPaginationCardHeader
				pagination={buildPagination({ pageSize: 50 })}
				isTransitioning={false}
				onPageChange={vi.fn()}
				onPageSizeChange={vi.fn()}
				pageSize={50}
				testIdPrefix="activity-top"
			/>,
		)

		const select = screen.getByRole("combobox", {
			name: "Itens por página",
		})
		expect(select).toHaveValue("50")
		expect(screen.getByRole("option", { name: "10" })).toBeInTheDocument()
		expect(screen.queryByText("50 por página")).not.toBeInTheDocument()
		expect(screen.getByRole("option", { name: "20" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "50" })).toBeInTheDocument()
	})

	test("chama onPageSizeChange ao alterar o controle nativo", async () => {
		const user = userEvent.setup()
		const onPageSizeChange = vi.fn()
		render(
			<ActivityPaginationCardHeader
				pagination={buildPagination()}
				isTransitioning={false}
				onPageChange={vi.fn()}
				onPageSizeChange={onPageSizeChange}
				pageSize={20}
				testIdPrefix="activity-top"
			/>,
		)

		await user.selectOptions(
			screen.getByRole("combobox", { name: "Itens por página" }),
			"10",
		)

		expect(onPageSizeChange).toHaveBeenCalledWith(10)
	})
})
