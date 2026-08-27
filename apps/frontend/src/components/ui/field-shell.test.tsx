import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { FieldShell, MASKED_INPUT_CLASS } from "./field-shell"

describe("FieldShell", () => {
	test("aplica o anel de foco duplo no input mascarado via MASKED_INPUT_CLASS", () => {
		render(
			<FieldShell id="cnpj" label="CNPJ">
				<input id="cnpj" className={MASKED_INPUT_CLASS} />
			</FieldShell>,
		)
		expect(screen.getByLabelText("CNPJ")).toHaveClass("focus-ring-duplo")
	})
})
