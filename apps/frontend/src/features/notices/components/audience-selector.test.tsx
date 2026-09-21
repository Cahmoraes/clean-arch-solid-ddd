import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, test, vi } from "vitest"
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"
import { AudienceSelector } from "./audience-selector"

function renderSelector(
	props: Partial<{ value: NoticeAudience; disabled: boolean }> = {},
) {
	const onChange = vi.fn()
	render(
		<AudienceSelector
			value={props.value ?? "ALL"}
			onChange={onChange}
			disabled={props.disabled}
		/>,
	)
	return { onChange }
}

function radio(name: string) {
	return screen.getByRole("radio", { name })
}

function StatefulSelector({ initial }: { initial: NoticeAudience }) {
	const [value, setValue] = useState<NoticeAudience>(initial)
	return <AudienceSelector value={value} onChange={setValue} />
}

describe("AudienceSelector", () => {
	test("FR-001 e FR-004: renderiza um grupo Público-alvo com os três rádios", () => {
		renderSelector()

		const group = screen.getByRole("group", { name: "Público-alvo" })
		const radios = within(group).getAllByRole("radio")
		expect(radios.map((item) => item.getAttribute("value"))).toEqual([
			"ALL",
			"MEMBERS",
			"ADMINS",
		])
		expect(radio("Todos")).toBeInTheDocument()
		expect(radio("Alunos")).toBeInTheDocument()
		expect(radio("Administradores")).toBeInTheDocument()
	})

	test("FR-002: o valor inicial ALL aparece como o único selecionado", () => {
		renderSelector({ value: "ALL" })

		expect(radio("Todos")).toBeChecked()
		expect(radio("Alunos")).not.toBeChecked()
		expect(radio("Administradores")).not.toBeChecked()
	})

	test("reflete um value diferente do padrão", () => {
		renderSelector({ value: "MEMBERS" })

		expect(radio("Alunos")).toBeChecked()
		expect(radio("Todos")).not.toBeChecked()
	})

	test("clicar em Alunos chama onChange com MEMBERS", async () => {
		const { onChange } = renderSelector()

		await userEvent.click(radio("Alunos"))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith("MEMBERS")
	})

	test("clicar no texto do cartão Administradores chama onChange com ADMINS", async () => {
		const { onChange } = renderSelector()

		await userEvent.click(screen.getByText("Somente administradores ativos"))

		expect(onChange).toHaveBeenCalledWith("ADMINS")
	})

	test("FR-004: as setas do teclado trocam a seleção entre os cartões", async () => {
		render(<StatefulSelector initial="ALL" />)

		await userEvent.tab()
		expect(radio("Todos")).toHaveFocus()

		await userEvent.keyboard("{ArrowRight}")
		expect(radio("Alunos")).toBeChecked()
		expect(radio("Todos")).not.toBeChecked()

		await userEvent.keyboard("{ArrowRight}")
		expect(radio("Administradores")).toBeChecked()

		await userEvent.keyboard("{ArrowLeft}")
		expect(radio("Alunos")).toBeChecked()
	})

	test("FR-003: cada opção exibe e expõe a sua descrição", () => {
		renderSelector()

		expect(screen.getByText("Alunos e administradores ativos")).toBeVisible()
		expect(radio("Todos")).toHaveAccessibleDescription(
			"Alunos e administradores ativos",
		)
		expect(radio("Alunos")).toHaveAccessibleDescription("Somente alunos ativos")
		expect(radio("Administradores")).toHaveAccessibleDescription(
			"Somente administradores ativos",
		)
	})

	test("o cartão selecionado é destacado com a borda primary", () => {
		renderSelector({ value: "MEMBERS" })

		expect(radio("Alunos").closest("label")).toHaveClass("border-primary")
		expect(radio("Todos").closest("label")).not.toHaveClass("border-primary")
	})

	test("desabilitado: os rádios ficam inertes e onChange não é chamado", async () => {
		const { onChange } = renderSelector({ disabled: true })

		expect(radio("Todos")).toBeDisabled()
		expect(radio("Alunos")).toBeDisabled()
		expect(radio("Administradores")).toBeDisabled()
		await userEvent.click(radio("Alunos"))
		expect(onChange).not.toHaveBeenCalled()
	})
})
