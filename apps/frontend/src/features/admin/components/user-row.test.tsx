import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserRow } from "./user-row"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	}
}

describe("UserRow", () => {
	test("renderiza nome, e-mail e label legível para role MEMBER", () => {
		render(
			<ul>
				<UserRow user={buildUser()} />
			</ul>,
		)
		expect(screen.getByText("Ana")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent("Membro")
	})

	test("renderiza label legível para role ADMIN", () => {
		render(
			<ul>
				<UserRow user={buildUser({ role: "ADMIN" })} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent(
			"Administrador",
		)
	})

	test("mantém o valor original para roles desconhecidas", () => {
		render(
			<ul>
				<UserRow user={buildUser({ role: "OWNER" as AdminUser["role"] })} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent("OWNER")
	})

	test("exibe badge verde com texto ativo para usuário ativado", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "activated" })} />
			</ul>,
		)

		const statusBadge = screen.getByTestId("user-row-u1-status")
		expect(statusBadge).toHaveTextContent("Ativo")
		expect(statusBadge).toHaveClass(
			"border-green-200",
			"bg-green-50",
			"text-green-700",
		)
	})

	test("exibe badge vermelho com texto inativo para usuário suspenso", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "suspended" })} />
			</ul>,
		)

		const statusBadge = screen.getByTestId("user-row-u1-status")
		expect(statusBadge).toHaveTextContent("Inativo")
		expect(statusBadge).toHaveClass(
			"border-red-200",
			"bg-red-50",
			"text-red-700",
		)
	})

	test("chama onSelect com os dados do usuário ao clicar na linha", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow user={adminUser} onSelect={onSelect} />
			</ul>,
		)

		await user.click(screen.getByTestId("user-row-u1"))

		expect(onSelect).toHaveBeenCalledTimes(1)
		expect(onSelect).toHaveBeenCalledWith(adminUser)
	})

	test("chama onSelect ao pressionar Enter na linha", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow user={adminUser} onSelect={onSelect} />
			</ul>,
		)

		const rowElement = screen.getByTestId("user-row-u1")
		rowElement.focus()
		await user.keyboard("{Enter}")

		expect(onSelect).toHaveBeenCalledTimes(1)
		expect(onSelect).toHaveBeenCalledWith(adminUser)
	})

	test("não torna a linha interativa quando onSelect não é informado", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()

		render(
			<ul>
				<UserRow user={buildUser()} />
			</ul>,
		)

		const rowElement = screen.getByTestId("user-row-u1")
		await user.click(rowElement)

		expect(onSelect).not.toHaveBeenCalled()
		expect(rowElement).not.toHaveAttribute("role", "button")
		expect(rowElement).not.toHaveAttribute("tabindex")
	})
})
