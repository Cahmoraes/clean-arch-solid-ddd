import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserRow } from "./user-row"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	}
}

describe("UserRow VOLT", () => {
	test("exibe nome, e-mail e badge de role Membro", () => {
		render(
			<ul>
				<UserRow user={buildUser()} />
			</ul>,
		)
		expect(screen.getByText("Ana Silva")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByText("Membro")).toBeInTheDocument()
	})

	test("exibe badge de role Admin para usuário ADMIN", () => {
		render(
			<ul>
				<UserRow user={buildUser({ role: "ADMIN" })} />
			</ul>,
		)
		expect(screen.getByText("Admin")).toBeInTheDocument()
	})

	test("exibe status Ativo para usuário ativado", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "activated" })} />
			</ul>,
		)
		expect(screen.getByText("Ativo")).toBeInTheDocument()
	})

	test("exibe status Inativo para usuário suspenso", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "suspended" })} />
			</ul>,
		)
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("exibe status Bloqueado para usuário locked", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "locked" })} />
			</ul>,
		)
		expect(screen.getByText("Bloqueado")).toBeInTheDocument()
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
