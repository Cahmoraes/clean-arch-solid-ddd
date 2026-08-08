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
		isSuperAdmin: false,
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

	test("status Inativo (suspenso) renderiza com ícone semântico (tone danger)", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "suspended" })} />
			</ul>,
		)
		const badge = screen.getByText("Inativo").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})

	test("status Bloqueado (locked) renderiza com ícone semântico (tone warning)", () => {
		render(
			<ul>
				<UserRow user={buildUser({ status: "locked" })} />
			</ul>,
		)
		const badge = screen.getByText("Bloqueado").closest("span")
		expect(badge).not.toBeNull()
		const icon = (badge as HTMLElement).querySelector("svg")
		expect(icon).toBeInTheDocument()
		expect(icon).toHaveClass("lucide-triangle-alert")
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

	test("aplica aria-pressed quando isSelected é verdadeiro", () => {
		render(
			<ul>
				<UserRow user={buildUser()} onSelect={() => {}} isSelected={true} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u1")).toHaveAttribute(
			"aria-pressed",
			"true",
		)
	})
})

describe("seleção em massa", () => {
	test("exibe o checkbox quando selectable é true e chama onToggleSelect ao marcar", async () => {
		const user = userEvent.setup()
		const onToggleSelect = vi.fn()
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow user={adminUser} selectable onToggleSelect={onToggleSelect} />
			</ul>,
		)

		const checkbox = screen.getByRole("checkbox")
		await user.click(checkbox)

		expect(onToggleSelect).toHaveBeenCalledTimes(1)
		expect(onToggleSelect).toHaveBeenCalledWith(adminUser, true)
	})

	test("fica disabled quando selectDisabled é true e não dispara onToggleSelect", async () => {
		const user = userEvent.setup()
		const onToggleSelect = vi.fn()

		render(
			<ul>
				<UserRow
					user={buildUser()}
					selectable
					selectDisabled
					onToggleSelect={onToggleSelect}
				/>
			</ul>,
		)

		const checkbox = screen.getByRole("checkbox")
		expect(checkbox).toBeDisabled()

		await user.click(checkbox)

		expect(onToggleSelect).not.toHaveBeenCalled()
	})

	test("clicar no checkbox não aciona onSelect do card", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const onToggleSelect = vi.fn()

		render(
			<ul>
				<UserRow
					user={buildUser()}
					selectable
					onSelect={onSelect}
					onToggleSelect={onToggleSelect}
				/>
			</ul>,
		)

		await user.click(screen.getByRole("checkbox"))

		expect(onToggleSelect).toHaveBeenCalledTimes(1)
		expect(onSelect).not.toHaveBeenCalled()
	})

	test("quando selectable e onSelect coexistem, o checkbox não fica aninhado dentro do wrapper role=button", () => {
		render(
			<ul>
				<UserRow user={buildUser()} selectable onSelect={() => {}} />
			</ul>,
		)

		const checkbox = screen.getByRole("checkbox")
		const rowButton = screen.getByRole("button")

		expect(rowButton.contains(checkbox)).toBe(false)
		expect(rowButton).toHaveAttribute("aria-pressed")
	})

	test("aplica destaque visual quando checked é verdadeiro", () => {
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow user={adminUser} selectable checked={true} />
			</ul>,
		)

		const row = screen.getByTestId(`user-row-${adminUser.id}`)

		expect(row.className).toContain("border-accent")
		expect(row.className).toContain("bg-accent/40")
	})
})
