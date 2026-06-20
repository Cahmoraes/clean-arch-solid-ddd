import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { PermissionsTab } from "./permissions-tab"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

describe("PermissionsTab", () => {
	test("exibe a role atual do usuário", () => {
		render(
			<PermissionsTab
				user={buildUser({ role: "ADMIN" })}
				canPromoteToAdmin={false}
				canDemoteFromAdmin={true}
				isPending={false}
				onPromote={vi.fn()}
				onDemote={vi.fn()}
			/>,
		)
		expect(screen.getByText("Administrador")).toBeInTheDocument()
	})

	test("dispara onPromote ao clicar em tornar administrador", async () => {
		const user = userEvent.setup()
		const onPromote = vi.fn()
		render(
			<PermissionsTab
				user={buildUser({ role: "MEMBER" })}
				canPromoteToAdmin={true}
				canDemoteFromAdmin={false}
				isPending={false}
				onPromote={onPromote}
				onDemote={vi.fn()}
			/>,
		)
		await user.click(
			screen.getByRole("button", { name: /tornar administrador/i }),
		)
		expect(onPromote).toHaveBeenCalledTimes(1)
	})

	test("não renderiza ações quando nenhuma é permitida", () => {
		render(
			<PermissionsTab
				user={buildUser()}
				canPromoteToAdmin={false}
				canDemoteFromAdmin={false}
				isPending={false}
				onPromote={vi.fn()}
				onDemote={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})
})
