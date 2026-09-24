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

	test("FR-001, FR-002: status vira faixa lateral, papel continua como único pill", () => {
		const user = buildUser({ status: "activated", role: "MEMBER" })
		render(
			<ul>
				<UserRow user={user} />
			</ul>,
		)

		// FR-002: um único pill visível (papel) — o pill de status não existe mais
		expect(screen.getByText("Membro")).toBeInTheDocument()
		expect(screen.queryByText("Ativo")?.className).not.toMatch(/rounded-full/)

		// FR-001: a faixa lateral usa a cor do tom, e o texto continua acessível
		const row = screen.getByText(user.name).closest("li")
		expect(row).toHaveClass("border-l-success")
		expect(screen.getByText("Ativo")).toHaveClass("sr-only")
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

	test("aplica cor de marcado (não de destaque) quando checked é verdadeiro sem isSelected", () => {
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow user={adminUser} selectable checked={true} />
			</ul>,
		)

		const row = screen.getByTestId(`user-row-${adminUser.id}`)

		expect(row.className).toContain("bg-selected-tint")
		expect(row.className).not.toContain("border-accent")
		expect(row.className).not.toContain("bg-accent/10")
	})

	// Regressão do finding de review (rodada final): checked/isMarkedOnly
	// suprimia a faixa de status junto com isSelected, deixando o status
	// (texto sr-only) sem nenhum sinal visual para usuário vidente durante
	// seleção em massa. O spec (D1) só prevê a supressão no destaque.
	test("mantém a faixa de status visível quando a linha está apenas marcada (checked, sem isSelected)", () => {
		const adminUser = buildUser({ status: "activated" })

		render(
			<ul>
				<UserRow user={adminUser} selectable checked={true} />
			</ul>,
		)

		const row = screen.getByTestId(`user-row-${adminUser.id}`)

		expect(row.className).toContain("border-l-success")
	})

	// Regressão reportada pelo usuário: selecionar (isSelected) um usuário
	// inativo trocava a faixa de status para verde (border-accent), como se
	// o usuário estivesse ativo. A faixa lateral deve sempre refletir o
	// status real, independente do destaque de seleção.
	test("mantém a faixa de status real (vermelha) quando um usuário inativo está selecionado", () => {
		const adminUser = buildUser({ status: "suspended" })

		render(<UserRow user={adminUser} isSelected checked={false} />)

		const row = screen.getByTestId(`user-row-${adminUser.id}`)

		expect(row.className).toContain("border-l-destructive")
		expect(row.className).toContain("border-accent")
	})
})

describe("cor de destaque vs. marcado e contraste do e-mail", () => {
	test("FR-003, FR-004: destaque e marcado usam cores de fundo distintas", () => {
		const user = buildUser({ status: "activated", role: "MEMBER" })

		const { rerender } = render(
			<UserRow user={user} isSelected checked={false} />,
		)
		const highlightedRow = screen.getByText(user.name).closest("li")
		expect(highlightedRow).toHaveClass("bg-accent/10")
		expect(highlightedRow).not.toHaveClass("bg-selected-tint")

		rerender(<UserRow user={user} isSelected={false} checked />)
		const markedRow = screen.getByText(user.name).closest("li")
		expect(markedRow).toHaveClass("bg-selected-tint")
		expect(markedRow).not.toHaveClass("bg-accent/10")
	})

	test("FR-005: e-mail sobe para highlight-foreground só no destaque", () => {
		const user = buildUser({ status: "activated", role: "MEMBER" })

		const { rerender } = render(
			<UserRow user={user} isSelected checked={false} />,
		)
		expect(screen.getByText(user.email)).toHaveClass(
			"text-highlight-foreground",
		)

		rerender(<UserRow user={user} isSelected={false} checked />)
		expect(screen.getByText(user.email)).toHaveClass("text-subtle")
		expect(screen.getByText(user.email)).not.toHaveClass(
			"text-highlight-foreground",
		)
	})

	// Regressão do finding de contraste (code review task-02): o e-mail em destaque usa
	// --color-highlight-foreground (calibrado para >=4.5:1 sobre o card selecionado) em vez de
	// alterar o token --color-muted-foreground global (usado em ~75 outros arquivos do app).
	// Os valores reais de contraste são verificados em src/app/contrast-tokens.test.tsx.
	test("FR-005: e-mail em destaque não usa mais o token antigo de contraste insuficiente no dark", () => {
		const user = buildUser({ status: "activated", role: "MEMBER" })
		render(<UserRow user={user} isSelected checked={false} />)

		expect(screen.getByText(user.email)).not.toHaveClass(
			"text-muted-foreground",
		)
	})
})

describe("UserRow — direção Noite neon", () => {
	test("linha selecionada usa contorno e fundo suave em ciano e mantém a faixa de status de 3px", () => {
		const user = buildUser({ status: "activated" })
		render(<UserRow user={user} isSelected />)
		const row = screen.getByTestId(`user-row-${user.id}`)
		expect(row).toHaveClass("border-accent", "bg-accent/10", "border-l-[3px]")
		expect(row).toHaveClass("border-l-success")
	})

	test("a faixa lateral acompanha o status: bloqueado em âmbar e inativo em vermelho", () => {
		const locked = buildUser({ id: "u2", status: "locked" })
		const suspended = buildUser({ id: "u3", status: "suspended" })
		render(
			<ul>
				<UserRow user={locked} />
				<UserRow user={suspended} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u2")).toHaveClass("border-l-warning")
		expect(screen.getByTestId("user-row-u3")).toHaveClass(
			"border-l-destructive",
		)
	})
})
